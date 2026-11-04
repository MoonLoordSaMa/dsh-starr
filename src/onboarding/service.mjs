import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fail } from "../starrcore/store.mjs";
import { checkSnowLuma, localPort } from "./diagnostics.mjs";

const steps = [
  "snowluma",
  "character",
  "persona",
  "memory",
  "bili",
  "media",
  "review",
];
const empty = (store) => ({
  revision: 0,
  step: 0,
  completedAt: null,
  characterId: null,
  draft: {
    name: "starr",
    persona: "",
    timezone: "Asia/Shanghai",
    memoryRoot: path.join(store.dataRoot, "memory"),
    backupRoot: path.join(store.dataRoot, "backups"),
    allowExistingVault: false,
    httpPort: 3000,
    wsPort: 3001,
    snowluma: "later",
    bili: "later",
    media: "later",
    qqProvider: "",
    qqModel: "",
    qqTokenEnv: "SNOWLUMA_TOKEN",
    qqPrivateUsers: "",
    qqGroups: "",
    qqEnabled: false,
  },
  checks: {},
});
const draftKeys = new Set(Object.keys(empty({ dataRoot: "." }).draft));

export class Onboarding {
  constructor(store, host = {}) {
    this.store = store;
    this.host = host;
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS onboarding (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)",
    );
  }
  read() {
    const row = this.store.db
      .prepare("SELECT data FROM onboarding WHERE id=1")
      .get();
    if (!row) return empty(this.store);
    const state = JSON.parse(row.data);
    return {
      ...empty(this.store),
      ...state,
      draft: { ...empty(this.store).draft, ...state.draft },
    };
  }
  status() {
    const state = this.read();
    return {
      ...state,
      steps,
      required: !this.store.installation(),
      preset: this.host.presetStatus?.() ?? {
        status: "standalone",
        detail: "独立预览不注册 DSH 预设，请在 DSH 中安装插件",
      },
      installed: Boolean(this.store.installation()),
    };
  }
  write(next, revision) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.read();
      if (revision !== current.revision)
        throw fail("新手调试进度已变化，请重新载入后继续", 409);
      next.revision = current.revision + 1;
      this.store.db
        .prepare(
          "INSERT INTO onboarding VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .run(JSON.stringify(next));
      this.store.db.exec("COMMIT");
    } catch (error) {
      this.store.db.exec("ROLLBACK");
      throw error;
    }
    return this.status();
  }
  save({ revision, step, draft = {}, characterId } = {}) {
    const state = this.read();
    if (!Number.isInteger(step) || step < 0 || step >= steps.length)
      throw fail("调试步骤无效");
    if (!draft || typeof draft !== "object" || Array.isArray(draft))
      throw fail("调试资料格式无效");
    for (const [key, value] of Object.entries(draft)) {
      if (!draftKeys.has(key)) throw fail("未定义的调试字段");
      if (["allowExistingVault", "qqEnabled"].includes(key)) {
        if (typeof value !== "boolean") throw fail("现有 Obsidian 库选项无效");
      } else if (key.endsWith("Port")) localPort(value);
      else if (
        typeof value !== "string" ||
        value.length > (key === "persona" ? 20000 : 2000)
      )
        throw fail("调试字段格式或长度不正确");
      if (
        ["snowluma", "bili", "media"].includes(key) &&
        !["later", "configure"].includes(value)
      )
        throw fail("接入方式无效");
    }
    const merged = { ...state.draft, ...draft };
    const checks = { ...state.checks };
    if (
      merged.httpPort !== state.draft.httpPort ||
      merged.wsPort !== state.draft.wsPort ||
      merged.qqTokenEnv !== state.draft.qqTokenEnv
    )
      delete checks.snowluma;
    if (
      merged.qqProvider !== state.draft.qqProvider ||
      merged.qqModel !== state.draft.qqModel
    )
      delete checks.model;
    if (characterId !== undefined) this.store.character(characterId);
    if (characterId && characterId !== state.characterId) delete checks.memory;
    return this.write(
      {
        ...state,
        step,
        draft: merged,
        checks,
        characterId: characterId ?? state.characterId,
        completedAt:
          characterId && characterId !== state.characterId
            ? null
            : state.completedAt,
      },
      revision,
    );
  }
  async snow(options = {}) {
    const state = this.read();
    const result = this.host.qq
      ? await this.host.qq.check({
          ...state.draft,
          tokenEnv: state.draft.qqTokenEnv,
          token: options.token,
        })
      : await checkSnowLuma(state.draft);
    return this.write(
      { ...state, checks: { ...state.checks, snowluma: result } },
      state.revision,
    );
  }
  create({ revision }) {
    const state = this.read();
    if (revision !== state.revision)
      throw fail("新手调试进度已变化，请重新载入", 409);
    // 重试使用已创建角色，禁止再次初始化或覆盖已有角色。
    if (state.characterId) return this.status();
    if (this.store.installation())
      throw fail("已有记忆库，请先选择现有角色；新角色可在控制台创建", 409);
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      if (this.read().revision !== revision)
        throw fail("新手调试进度已变化，请重新载入", 409);
      const created = this.store.setup(state.draft, { transaction: false });
      const next = {
        ...state,
        characterId: created.character.id,
        revision: state.revision + 1,
      };
      this.store.db
        .prepare(
          "INSERT INTO onboarding VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .run(JSON.stringify(next));
      this.store.db.exec("COMMIT");
    } catch (error) {
      this.store.db.exec("ROLLBACK");
      throw error;
    }
    return this.status();
  }
  inspectMemory() {
    const state = this.read();
    if (!state.characterId) throw fail("请先创建或选择角色", 409);
    const installation = this.store.installation();
    const db = this.store.memory(state.characterId);
    const directories = [installation.memoryRoot, installation.backupRoot].map(
      (directory) => {
        fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
        const probe = path.join(
          directory,
          `.starr-check-${crypto.randomUUID()}`,
        );
        try {
          fs.writeFileSync(probe, "starr-directory-check", { flag: "wx" });
          if (fs.readFileSync(probe, "utf8") !== "starr-directory-check")
            throw fail("目录写入校验失败", 409);
        } finally {
          if (fs.existsSync(probe)) fs.unlinkSync(probe);
        }
        return {
          path: directory,
          writable: true,
          obsidian: fs.existsSync(path.join(directory, ".obsidian")),
        };
      },
    );
    const result = {
      status: "verified",
      detail: "记忆库与备份目录的读写检查通过，记忆数据库完整性正常",
      checkedAt: new Date().toISOString(),
      directories,
      database: db.prepare("PRAGMA quick_check").get().quick_check,
    };
    if (result.database !== "ok") throw fail("记忆数据库检查未通过", 409);
    return this.write(
      { ...state, checks: { ...state.checks, memory: result } },
      state.revision,
    );
  }
  async preset() {
    return this.host.checkPreset?.() ?? this.status().preset;
  }
  async models() {
    return (
      this.host.modelCatalog?.() ?? {
        providers: [],
        detail: "独立预览未连接 DSH 模型服务，请在 DSH 中配置",
      }
    );
  }
  async testModel() {
    const state = this.read();
    const result = (await this.host.checkModel?.({
      provider: state.draft.qqProvider,
      model: state.draft.qqModel,
    })) ?? { status: "unavailable", detail: "宿主模型服务未接入" };
    return this.write(
      { ...state, checks: { ...state.checks, model: result } },
      state.revision,
    );
  }
  finish({ revision }) {
    const state = this.read();
    if (!state.characterId || !this.store.installation())
      throw fail("请先创建或选择角色与记忆库", 409);
    if (!this.store.character(state.characterId).persona.trim())
      throw fail("请先在角色页面或人格步骤填写提示词", 409);
    if (state.checks.memory?.status !== "verified")
      throw fail("请先检查记忆库与备份目录", 409);
    if (
      state.draft.snowluma === "configure" &&
      (this.host.qq
        ? state.checks.snowluma?.status !== "verified"
        : !["reachable", "verified"].includes(state.checks.snowluma?.status))
    )
      throw fail("SnowLuma 协议检查未通过，可修正配置或选择稍后接入", 409);
    if (
      state.draft.qqEnabled &&
      state.draft.snowluma === "configure" &&
      (!state.draft.qqProvider ||
        !state.draft.qqModel ||
        !(state.draft.qqPrivateUsers.trim() || state.draft.qqGroups.trim()))
    )
      throw fail(
        "启用 QQ 自动回复前，请填写允许回复的 QQ 号或群号，并选择聊天模型",
        409,
      );
    this.host.qq?.validateOnboarding(state);
    return this.write(
      { ...state, step: 6, completedAt: new Date().toISOString() },
      revision,
    );
  }
}
