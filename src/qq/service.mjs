import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fail, hash } from "../starrcore/store.mjs";
import { localPort } from "../onboarding/diagnostics.mjs";
import { QQSecrets } from "./secrets.mjs";
import { ChatPolicy } from "../conversation/policy.mjs";
import { createQQCapabilities, downloadAttachment } from "./capabilities.mjs";
import { socialCapabilities } from "./social.mjs";
import { isProcessRunning } from "../runtime/lease.mjs";
import { setTimeout as pause } from "node:timers/promises";
import { replyDelay } from "../conversation/behavior.mjs";
import {
  OneBotConnection,
  onebotAction,
  checkOnebot,
  checkOnebotSocket,
} from "./onebot.mjs";

const defaults = {
  enabled: false,
  httpPort: 3000,
  wsPort: 3001,
  tokenEnv: "SNOWLUMA_TOKEN",
  privateUsers: "",
  groups: "",
  requireMention: true,
  provider: "",
  model: "",
  characterId: "",
  mergeMs: 1200,
};
const identifiers = (value) =>
  String(value || "")
    .split(/[,，\s]+/)
    .filter(Boolean);
function validate(value) {
  for (const key of Object.keys(value))
    if (!Object.hasOwn(defaults, key)) throw fail("QQ 配置包含未定义字段");
  for (const key of ["enabled", "requireMention"])
    if (typeof value[key] !== "boolean") throw fail("QQ 开关格式无效");
  localPort(value.httpPort);
  localPort(value.wsPort);
  for (const key of [
    "tokenEnv",
    "privateUsers",
    "groups",
    "provider",
    "model",
    "characterId",
  ])
    if (typeof value[key] !== "string" || value[key].length > 2000)
      throw fail("QQ 配置格式无效");
  if (value.tokenEnv && !/^[A-Z][A-Z0-9_]{1,100}$/.test(value.tokenEnv))
    throw fail("令牌环境变量名称无效");
  if (
    ![...identifiers(value.privateUsers), ...identifiers(value.groups)].every(
      (id) => /^[1-9]\d{4,19}$/.test(id),
    )
  )
    throw fail("允许回复的 QQ 号或群号格式无效");
  if (
    !Number.isInteger(value.mergeMs) ||
    value.mergeMs < 200 ||
    value.mergeMs > 5000
  )
    throw fail("消息合并时间应为 200–5000 毫秒");
  if (
    value.enabled &&
    (!value.characterId ||
      !value.provider ||
      !value.model ||
      !(value.privateUsers.trim() || value.groups.trim()))
  )
    throw fail("请先选择角色、聊天模型和允许回复的 QQ 号或群号");
  return value;
}

export function normalizeQQEvent(event, settings, selfId) {
  if (
    event.post_type !== "message" ||
    !["private", "group"].includes(event.message_type) ||
    !event.message_id ||
    !event.user_id
  )
    return null;
  if (String(event.self_id) !== selfId || String(event.user_id) === selfId)
    return null;
  const type = event.message_type,
    target = String(type === "private" ? event.user_id : event.group_id || "");
  if (
    !identifiers(
      type === "private" ? settings.privateUsers : settings.groups,
    ).includes(target)
  )
    return null;
  const segments = Array.isArray(event.message) ? event.message : [];
  const raw =
    typeof event.message === "string"
      ? event.message
      : typeof event.raw_message === "string"
        ? event.raw_message
        : "";
  const mentioned =
    segments.some(
      (segment) => segment.type === "at" && String(segment.data?.qq) === selfId,
    ) || raw.includes(`[CQ:at,qq=${selfId}]`);
  if (type === "group" && settings.requireMention && !mentioned) return null;
  const text = (
    segments.length
      ? segments
          .map((segment) =>
            segment.type === "text"
              ? String(segment.data?.text || "")
              : segment.type === "at"
                ? ""
                : segment.type === "image"
                  ? "[图片，尚未提供图片内容]"
                  : segment.type === "record"
                    ? "[语音，尚未转写]"
                    : segment.type === "forward"
                      ? "[合并转发，可按消息编号展开]"
                      : "",
          )
          .join("")
      : raw.replace(/\[CQ:[^\]]*\]/g, "")
  )
    .trim()
    .slice(0, 12000);
  if (!text) return null;
  return {
    key: hash(`${selfId}:${type}:${target}:${event.message_id}`),
    selfId,
    type,
    target,
    messageId: String(event.message_id),
    userId: String(event.user_id),
    senderName: String(
      event.sender?.card || event.sender?.nickname || "",
    ).slice(0, 80),
    mentioned,
    attachments: segments
      .filter((segment) => ["image", "record"].includes(segment.type))
      .slice(0, 10)
      .map((segment) => ({
        type: segment.type,
        url: typeof segment.data?.url === "string" ? segment.data.url : "",
      })),
    forwardId: String(
      segments.find((segment) => segment.type === "forward")?.data?.id || "",
    ),
    addressedToOther: segments.some(
      (segment) => segment.type === "at" && String(segment.data?.qq) !== selfId,
    ),
    text,
    time: Number(event.time) || Math.floor(Date.now() / 1000),
  };
}

export class QQService {
  constructor(
    store,
    {
      driver,
      secrets = new QQSecrets(store.dataRoot),
      connection = (options, handlers) =>
        new OneBotConnection(options, handlers),
      action = onebotAction,
      download = downloadAttachment,
    } = {},
  ) {
    this.store = store;
    this.policy = new ChatPolicy(store);
    this.driver = driver;
    this.secrets = secrets;
    this.connectionFactory = connection;
    this.action = action;
    this.download = download;
    this.closed = false;
    this.running = new Map();
    this.lastReceivedAt = null;
    this.state = { status: "stopped", code: null };
    this.generation = 0;
    this.mutations = Promise.resolve();
    this.lockPath = path.join(store.dataRoot, "qq-runtime.lock");
    store.db.exec(`
      CREATE TABLE IF NOT EXISTS qq_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS qq_session_bindings(session_id TEXT PRIMARY KEY,character_id TEXT NOT NULL REFERENCES characters(id));
      CREATE TABLE IF NOT EXISTS qq_threads(key TEXT PRIMARY KEY,character_id TEXT NOT NULL,session_id TEXT NOT NULL,type TEXT NOT NULL,target TEXT NOT NULL,started INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS qq_inbox(seq INTEGER PRIMARY KEY AUTOINCREMENT,event_key TEXT NOT NULL UNIQUE,thread_key TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,error TEXT,created INTEGER NOT NULL,batch_id TEXT);
      CREATE TABLE IF NOT EXISTS qq_sends(batch_id TEXT PRIMARY KEY,thread_key TEXT NOT NULL,text TEXT,status TEXT NOT NULL,message_id TEXT,created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS qq_send_parts(id TEXT PRIMARY KEY,batch_id TEXT NOT NULL,position INTEGER NOT NULL,status TEXT NOT NULL,message_id TEXT,created INTEGER NOT NULL);
    `);
  }
  settings() {
    const row = this.store.db
      .prepare("SELECT * FROM qq_settings WHERE id=1")
      .get();
    return {
      revision: row?.revision ?? 0,
      config: { ...defaults, ...(row ? JSON.parse(row.data) : {}) },
    };
  }
  status() {
    const settings = this.settings();
    return {
      ...settings,
      runtime: {
        ...this.state,
        hostReady: Boolean(this.driver),
        lastReceivedAt: this.lastReceivedAt,
        activeThreads: this.running.size,
      },
      secret: this.secrets.status(),
      counts: Object.fromEntries(
        this.store.db
          .prepare(
            "SELECT status,COUNT(*) AS count FROM qq_inbox GROUP BY status",
          )
          .all()
          .map((row) => [row.status, row.count]),
      ),
      recent: this.store.db
        .prepare(
          "SELECT seq,status,attempts,error,created FROM qq_inbox ORDER BY seq DESC LIMIT 12",
        )
        .all(),
    };
  }
  serialize(operation) {
    const next = this.mutations.then(() => {
      if (this.closed) throw fail("QQ 连接已关闭", 409);
      return operation();
    });
    this.mutations = next.catch(() => {});
    return next;
  }
  configure(input) {
    return this.serialize(() => this.configureNow(input));
  }
  async configureNow({ revision, patch = {}, token, clearToken = false }) {
    const current = this.settings();
    if (revision !== current.revision)
      throw fail("QQ 连接配置已更新，请重新读取后再保存", 409);
    if (!patch || typeof patch !== "object" || Array.isArray(patch))
      throw fail("QQ 配置格式无效");
    const config = validate({ ...current.config, ...patch });
    if (config.characterId) this.store.character(config.characterId);
    if (token && clearToken) throw fail("不能同时保存和清除令牌");
    if (token) await this.secrets.save(token);
    if (clearToken) this.secrets.clear();
    if (this.closed) throw fail("QQ 连接已关闭", 409);
    const after = this.settings();
    if (after.revision !== revision)
      throw fail("QQ 连接配置已变化，请重新读取", 409);
    this.store.db
      .prepare(
        "INSERT INTO qq_settings VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,data=excluded.data",
      )
      .run(revision + 1, JSON.stringify(config));
    this.syncOnboarding(config, current.config, Boolean(token || clearToken));
    await this.restart();
    return this.status();
  }
  syncOnboarding(config, previous, credentialChanged) {
    if (
      !this.store.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='onboarding'",
        )
        .get()
    )
      return;
    const row = this.store.db
      .prepare("SELECT data FROM onboarding WHERE id=1")
      .get();
    if (!row) return;
    const state = JSON.parse(row.data);
    if (!state.completedAt) return;
    const mapping = {
      httpPort: "httpPort",
      wsPort: "wsPort",
      qqTokenEnv: "tokenEnv",
      qqPrivateUsers: "privateUsers",
      qqGroups: "groups",
      qqProvider: "provider",
      qqModel: "model",
      qqEnabled: "enabled",
    };
    for (const [draftKey, configKey] of Object.entries(mapping))
      state.draft[draftKey] = config[configKey];
    if (config.enabled) state.draft.snowluma = "configure";
    if (
      credentialChanged ||
      ["httpPort", "wsPort", "tokenEnv"].some(
        (key) => config[key] !== previous[key],
      )
    )
      delete state.checks.snowluma;
    if (
      config.provider !== previous.provider ||
      config.model !== previous.model
    )
      delete state.checks.model;
    state.revision++;
    this.store.db
      .prepare("UPDATE onboarding SET data=? WHERE id=1")
      .run(JSON.stringify(state));
  }
  attachDriver(driver) {
    this.driver = driver;
    return this.restart();
  }
  retryFailed() {
    this.store.db.exec(
      "UPDATE qq_inbox SET status='uncertain',error='PARTIAL_SEND_REVIEW' WHERE status='failed' AND batch_id IN (SELECT batch_id FROM qq_send_parts WHERE status IN ('sent','sending','uncertain')); DELETE FROM qq_send_parts WHERE batch_id IN (SELECT batch_id FROM qq_inbox WHERE status='failed'); DELETE FROM qq_sends WHERE status='failed' AND batch_id IN (SELECT batch_id FROM qq_inbox WHERE status='failed'); UPDATE qq_inbox SET status='pending',attempts=0,next_at=0,error=NULL WHERE status='failed';",
    );
    this.pump();
    return this.status();
  }
  check(input = {}) {
    return this.serialize(() => this.checkNow(input));
  }
  async checkNow({ httpPort, wsPort, tokenEnv, token } = {}) {
    if (token) await this.secrets.save(token);
    const config = {
      ...this.settings().config,
      ...(httpPort !== undefined ? { httpPort } : {}),
      ...(wsPort !== undefined ? { wsPort } : {}),
      ...(tokenEnv !== undefined ? { tokenEnv } : {}),
    };
    validate(config);
    const accessToken = await this.secrets.read(config.tokenEnv);
    try {
      const account = await checkOnebot({ ...config, token: accessToken });
      await checkOnebotSocket({ ...config, token: accessToken });
      return {
        status: "verified",
        detail:
          "OneBot 协议与 QQ 在线状态已验证；完成向导并启用后才开始处理消息",
        checkedAt: new Date().toISOString(),
        accountVerified: true,
        replyVerified: false,
        selfId: account.selfId,
      };
    } catch (error) {
      return {
        status: "failed",
        code: error.code || "ONEBOT_TRANSPORT",
        detail: error.message,
        checkedAt: new Date().toISOString(),
        accountVerified: false,
        replyVerified: false,
      };
    }
  }
  async applyOnboarding(state) {
    const current = this.settings();
    return this.configure({
      revision: current.revision,
      patch: this.validateOnboarding(state),
    });
  }
  validateOnboarding(state) {
    const draft = state.draft;
    const config = {
      ...this.settings().config,
      enabled: draft.snowluma === "configure" && draft.qqEnabled === true,
      characterId: state.characterId,
      httpPort: draft.httpPort,
      wsPort: draft.wsPort,
      tokenEnv: draft.qqTokenEnv || "SNOWLUMA_TOKEN",
      privateUsers: draft.qqPrivateUsers || "",
      groups: draft.qqGroups || "",
      provider: draft.qqProvider || "",
      model: draft.qqModel || "",
    };
    return validate(config);
  }
  acquire() {
    try {
      if (fs.existsSync(this.lockPath)) {
        const owner = Number(fs.readFileSync(this.lockPath, "utf8"));
        if (isProcessRunning(owner)) return false;
        fs.unlinkSync(this.lockPath);
      }
      fs.writeFileSync(this.lockPath, String(process.pid), { flag: "wx" });
      this.ownsLock = true;
      return true;
    } catch {
      return false;
    }
  }
  async restart() {
    this.stop();
    const generation = this.generation;
    if (this.closed) return;
    const { config } = this.settings();
    if (!config.enabled) {
      this.state = { status: "stopped", code: null };
      return;
    }
    if (!this.driver) {
      this.state = { status: "unavailable", code: "HOST_UNAVAILABLE" };
      return;
    }
    if (!this.acquire()) {
      this.state = { status: "failed", code: "IN_USE" };
      return;
    }
    try {
      const token = await this.secrets.read(config.tokenEnv);
      if (this.closed || generation !== this.generation) return;
      // 取得独占运行锁之后才恢复，避免另一个宿主同时处理同一批次。
      this.store.db.exec(
        "UPDATE qq_sends SET status='uncertain' WHERE status='sending'; UPDATE qq_inbox SET status='pending' WHERE status='processing';",
      );
      this.store.db.exec(
        "UPDATE qq_inbox SET status=CASE WHEN (SELECT status FROM qq_sends s WHERE s.batch_id=qq_inbox.batch_id) IN ('sent','silent') THEN 'done' ELSE 'uncertain' END WHERE status='pending' AND batch_id IN (SELECT batch_id FROM qq_sends);",
      );
      this.abort = new AbortController();
      this.state = { status: "connecting", code: null };
      this.connection = this.connectionFactory(
        { ...config, token, signal: this.abort.signal },
        {
          onEvent: (event) => {
            if (
              !this.closed &&
              generation === this.generation &&
              this.settings().config.enabled
            )
              this.receive(event);
          },
          onState: (state) => {
            if (!this.closed && generation === this.generation) {
              this.state = state;
              if (state.status === "connected") {
                this.pump();
                this.catchUp(generation).catch(() => {});
              }
            }
          },
        },
      );
      this.connection.connect();
      this.timer = setInterval(() => this.pump(), 500);
      this.timer.unref?.();
    } catch (error) {
      if (!this.closed && generation === this.generation) {
        this.stop();
        this.state = {
          status: "failed",
          code: "SECRET_UNAVAILABLE",
          detail: error.message,
        };
      }
    }
  }
  async catchUp(generation) {
    if (this.historyBusy) return;
    const { config } = this.settings(),
      c = this.policy.config(config.characterId);
    if (!c["chat.history.enabled"]) return;
    this.historyBusy = true;
    try {
      const token = await this.secrets.read(config.tokenEnv);
      const objects = [
        ...identifiers(config.groups).map((id) => ["group", id]),
        ...(c["chat.history.includePrivate"]
          ? identifiers(config.privateUsers).map((id) => ["private", id])
          : []),
      ];
      for (const [type, id] of objects) {
        if (this.closed || generation !== this.generation) return;
        try {
          const data = await this.action(
            { ...config, token, signal: this.abort.signal },
            type === "group"
              ? "get_group_msg_history"
              : "get_friend_msg_history",
            {
              [type === "group" ? "group_id" : "user_id"]: id,
              count: c["chat.history.limit"],
            },
          );
          for (const item of (data?.messages || []).slice(
            -c["chat.history.limit"],
          )) {
            if (
              String(item.user_id || item.sender?.user_id || "") ===
              String(this.state.account.selfId)
            )
              continue;
            if (
              Number(item.time) * 1000 <
              Date.now() - c["chat.history.maxAgeMinutes"] * 60000
            )
              continue;
            if (this.closed || generation !== this.generation) return;
            this.receive(
              {
                ...item,
                post_type: "message",
                message_type: type,
                self_id: this.state.account.selfId,
                user_id: item.user_id || item.sender?.user_id || id,
                ...(type === "group" ? { group_id: id } : {}),
              },
              { observe: !c["chat.history.wake"] },
            );
          }
        } catch (error) {
          if (generation === this.generation)
            this.state = {
              ...this.state,
              historyError: error.code || "HISTORY_UNAVAILABLE",
            };
        }
      }
    } finally {
      this.historyBusy = false;
    }
  }
  receive(event, { observe = false } = {}) {
    if (this.closed || !this.state.account?.selfId) return;
    const { config } = this.settings();
    const message = normalizeQQEvent(event, config, this.state.account.selfId);
    if (!message) return;
    message.attachments = message.attachments.slice(
      0,
      this.policy.config(config.characterId)["chat.media.maxCount"],
    );
    if (!this.policy.accepts(message, this.policy.config(config.characterId)))
      return;
    const key = hash(
      `${message.selfId}:${config.characterId}:${message.type}:${message.target}`,
    );
    this.store.db
      .prepare("INSERT OR IGNORE INTO qq_threads VALUES(?,?,?,?,?,0)")
      .run(
        key,
        config.characterId,
        `session-${crypto.randomUUID()}`,
        message.type,
        message.target,
      );
    const thread = this.store.db
      .prepare("SELECT * FROM qq_threads WHERE key=?")
      .get(key);
    this.store.conversations.ensure({
      sessionId: thread.session_id,
      characterId: thread.character_id,
      platform: "qq",
      type: thread.type,
      account: message.selfId,
      target: message.target,
    });
    if (
      this.store.db
        .prepare("SELECT seq FROM qq_inbox WHERE event_key=?")
        .get(message.key)
    )
      return;
    const decision = observe
      ? { wake: false, reason: "HISTORY_OBSERVED" }
      : this.policy.incoming(message, thread.character_id, thread.session_id);
    this.store.db
      .prepare(
        "INSERT OR IGNORE INTO qq_inbox(event_key,thread_key,payload,created,status,error) VALUES(?,?,?,?,?,?)",
      )
      .run(
        message.key,
        key,
        JSON.stringify(message),
        Date.now(),
        decision.wake ? "pending" : "observed",
        decision.reason,
      );
    this.lastReceivedAt = new Date().toISOString();
  }
  pump() {
    if (this.closed || this.state.status !== "connected") return;
    const { config } = this.settings();
    if (!config.enabled) return;
    const threads = this.store.db
      .prepare(
        "SELECT DISTINCT t.* FROM qq_threads t JOIN qq_inbox i ON i.thread_key=t.key WHERE i.status='pending' AND i.next_at<=? AND t.character_id=? AND json_extract(i.payload,'$.selfId')=? LIMIT 8",
      )
      .all(Date.now(), config.characterId, this.state.account?.selfId || "");
    for (const thread of threads) {
      if (this.running.has(thread.key) || this.running.size >= 4) continue;
      if (
        this.store.db
          .prepare("SELECT paused FROM chat_sessions WHERE session_id=?")
          .get(thread.session_id)?.paused
      )
        continue;
      // 修改白名单后，历史队列也必须重新确认授权。
      if (
        !identifiers(
          thread.type === "private" ? config.privateUsers : config.groups,
        ).includes(thread.target)
      )
        continue;
      const first = this.store.db
        .prepare(
          "SELECT * FROM qq_inbox WHERE thread_key=? AND status='pending' AND next_at<=? ORDER BY seq LIMIT 1",
        )
        .get(thread.key, Date.now());
      if (!first) continue;
      if (JSON.parse(first.payload).selfId !== this.state.account?.selfId)
        continue;
      const characterConfig = this.policy.config(thread.character_id),
        batchLimit = characterConfig["chat.context.batchMessages"];
      let rows = first.batch_id
        ? this.store.db
            .prepare(
              "SELECT * FROM qq_inbox WHERE thread_key=? AND status='pending' AND batch_id=? ORDER BY seq",
            )
            .all(thread.key, first.batch_id)
        : this.store.db
            .prepare(
              "SELECT * FROM qq_inbox WHERE thread_key=? AND status='pending' AND batch_id IS NULL AND next_at<=? ORDER BY seq LIMIT ?",
            )
            .all(thread.key, Date.now(), batchLimit);
      if (
        !rows.length ||
        (rows.length < batchLimit &&
          Date.now() - rows.at(-1).created < config.mergeMs)
      )
        continue;
      rows = rows.filter((row) => {
        if (this.policy.accepts(JSON.parse(row.payload), characterConfig))
          return true;
        this.store.db
          .prepare(
            "UPDATE qq_inbox SET status='observed',error='ACCESS_POLICY' WHERE seq=?",
          )
          .run(row.seq);
        return false;
      });
      if (!rows.length) continue;
      const delay = this.policy.delay(thread, rows);
      const batchKey =
        rows[0].batch_id || hash(rows.map((row) => row.event_key).join(":"));
      const limit =
        delay ||
        this.policy.reserve(
          thread.character_id,
          thread.session_id,
          "wake",
          `wake:${batchKey}`,
        );
      if (limit.nextAt) {
        for (const row of rows)
          this.store.db
            .prepare("UPDATE qq_inbox SET next_at=?,error=? WHERE seq=?")
            .run(limit.nextAt, limit.reason, row.seq);
        continue;
      }
      const promise = this.process(thread, rows, config)
        .catch(() => {})
        .finally(() => this.running.delete(thread.key));
      this.running.set(thread.key, promise);
    }
  }
  async process(thread, rows, config) {
    const generation = this.generation;
    const current = () => !this.closed && generation === this.generation;
    const db = this.store.db;
    const batchId =
      rows[0].batch_id || hash(rows.map((row) => row.event_key).join(":"));
    const mark = (status, error = null, nextAt = 0) => {
      if (!current()) return;
      const statement = db.prepare(
        "UPDATE qq_inbox SET status=?,error=?,next_at=? WHERE seq=?",
      );
      for (const row of rows) statement.run(status, error, nextAt, row.seq);
    };
    const previous = db
      .prepare("SELECT * FROM qq_sends WHERE batch_id=?")
      .get(batchId);
    if (previous) {
      mark(
        previous.status === "sent" || previous.status === "silent"
          ? "done"
          : "uncertain",
        previous.status === "sent" ? null : "PREVIOUS_SEND",
      );
      return;
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      if (
        rows.some(
          (row) =>
            db.prepare("SELECT status FROM qq_inbox WHERE seq=?").get(row.seq)
              ?.status !== "pending",
        )
      ) {
        db.exec("ROLLBACK");
        return;
      }
      mark("processing");
      for (const row of rows)
        db.prepare(
          "UPDATE qq_inbox SET attempts=attempts+1,batch_id=? WHERE seq=?",
        ).run(batchId, row.seq);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    const signal = AbortSignal.any([
      this.abort.signal,
      AbortSignal.timeout(120000),
    ]);
    let settled = false,
      sending = false,
      sendFailure;
    const sendTexts = async (texts, quoteId, mediaSegments) => {
      if (settled || sending)
        throw fail("本批回复已发送或正在发送，不可重复提交", 409);
      const c = this.policy.config(thread.character_id);
      const pokeCount = db
        .prepare(
          "SELECT count(*) AS n FROM qq_social_log WHERE (id=? OR json_extract(data,'$.batchId')=?) AND status IN ('sending','accepted','uncertain')",
        )
        .get(`poke:${batchId}`, batchId).n;
      if (
        Array.isArray(texts) &&
        texts.length + pokeCount > c["chat.reply.maxOutboundPerTurn"]
      )
        throw fail("超过本轮总外发条数", 429);
      if (
        !Array.isArray(texts) ||
        !texts.length ||
        texts.length > c["chat.reply.burstMax"] ||
        (texts.length > 1 && !c["chat.reply.burstEnabled"])
      )
        throw fail("分条回复未开启或条数超过限制", 403);
      if (
        texts.some(
          (text) =>
            typeof text !== "string" ||
            !text.trim() ||
            text.length > c["chat.reply.maxChars"],
        )
      )
        throw fail(`每条 QQ 回复需要 1–${c["chat.reply.maxChars"]} 字符`);
      if (
        quoteId &&
        !db
          .prepare(
            "SELECT seq FROM qq_inbox WHERE thread_key=? AND json_extract(payload,'$.messageId')=?",
          )
          .get(thread.key, String(quoteId))
      )
        throw fail("不能引用当前会话之外的消息", 403);
      signal.throwIfAborted();
      sending = true;
      db.prepare("INSERT INTO qq_sends VALUES(?,?,?,'sending',NULL,?)").run(
        batchId,
        thread.key,
        texts.join("\n"),
        Date.now(),
      );
      try {
        const token = await this.secrets.read(config.tokenEnv);
        signal.throwIfAborted();
        const messageIds = [];
        for (let position = 0; position < texts.length; position++) {
          const text = texts[position].trim(),
            partId = `${batchId}:${position}`;
          const limit = this.policy.reserve(
            thread.character_id,
            thread.session_id,
            "send",
            `send:${partId}`,
          );
          if (!limit.allowed)
            throw Object.assign(
              fail("已达到配置的发送额度，本轮停止外发", 429),
              { code: "SEND_RATE_LIMIT" },
            );
          const delay = replyDelay(
            c,
            this.store.getState(thread.character_id),
            text.length,
            position,
          );
          if (delay > 0) await pause(delay, undefined, { signal });
          signal.throwIfAborted();
          if (
            rows.some(
              (row) =>
                !this.policy.accepts(
                  JSON.parse(row.payload),
                  this.policy.config(thread.character_id),
                ),
            )
          )
            throw Object.assign(fail("本批发送前收件范围已被管理员撤销", 403), {
              code: "ACCESS_POLICY",
            });
          db.prepare(
            "INSERT INTO qq_send_parts VALUES(?,?,?,'sending',NULL,?)",
          ).run(partId, batchId, position, Date.now());
          let result;
          try {
            result = await this.action(
              { ...config, token, signal },
              thread.type === "private" ? "send_private_msg" : "send_group_msg",
              {
                [thread.type === "private" ? "user_id" : "group_id"]:
                  thread.target,
                message: [
                  ...(quoteId
                    ? [{ type: "reply", data: { id: String(quoteId) } }]
                    : []),
                  ...(mediaSegments || [{ type: "text", data: { text } }]),
                ],
              },
            );
          } catch (error) {
            db.prepare("UPDATE qq_send_parts SET status=? WHERE id=?").run(
              error.uncertain ? "uncertain" : "failed",
              partId,
            );
            throw error;
          }
          if (!current()) return { status: "uncertain" };
          db.prepare(
            "UPDATE qq_send_parts SET status='sent',message_id=? WHERE id=?",
          ).run(String(result.message_id), partId);
          messageIds.push(String(result.message_id));
        }
        if (!current()) return { status: "uncertain" };
        db.prepare(
          "UPDATE qq_sends SET status='sent',message_id=? WHERE batch_id=?",
        ).run(messageIds.join(","), batchId);
        settled = true;
        return { status: "sent", messageId: messageIds[0], messageIds };
      } catch (error) {
        sendFailure = error;
        if (current())
          db.prepare("UPDATE qq_sends SET status=? WHERE batch_id=?").run(
            error.uncertain ? "uncertain" : "failed",
            batchId,
          );
        throw error;
      }
    };
    const reply = (text, quoteId) => sendTexts([text], quoteId);
    const lookup = (messageId) => {
      const row = db
        .prepare(
          "SELECT payload FROM qq_inbox WHERE thread_key=? AND json_extract(payload,'$.messageId')=?",
        )
        .get(thread.key, String(messageId));
      if (!row) throw fail("本会话未接收过该消息", 404);
      return JSON.parse(row.payload);
    };
    const publicMessage = (message) => ({
      ...message,
      attachments: (message.attachments || []).map((item, index) => ({
        type: item.type,
        index,
      })),
      forwardId: undefined,
    });
    const capabilities = createQQCapabilities({
      store: this.store,
      characterId: thread.character_id,
      lookup,
      signal,
      download: this.download,
      modelSelection: { provider: config.provider, model: config.model },
      action: async (name, params) =>
        this.action(
          {
            ...config,
            token: await this.secrets.read(config.tokenEnv),
            signal,
          },
          name,
          params,
        ),
      send: (segments, label) => sendTexts([label], undefined, segments),
    });
    Object.assign(
      capabilities,
      socialCapabilities({
        store: this.store,
        characterId: thread.character_id,
        thread,
        messages: rows.map((row) => JSON.parse(row.payload)),
        batchId,
        signal,
        action: async (name, params) => {
          signal.throwIfAborted();
          if (!current()) throw fail("旧连接已失效", 409);
          const settings = this.settings().config;
          if (
            !settings.enabled ||
            settings.characterId !== thread.character_id ||
            !String(
              thread.type === "group" ? settings.groups : settings.privateUsers,
            )
              .split(/[,，\s]+/)
              .includes(thread.target)
          )
            throw fail("QQ 对象授权已撤销", 403);
          const token = await this.secrets.read(settings.tokenEnv);
          signal.throwIfAborted();
          if (
            !current() ||
            JSON.stringify(settings) !== JSON.stringify(this.settings().config)
          )
            throw fail("QQ 连接已变化", 409);
          return this.action({ ...settings, token, signal }, name, params);
        },
      }),
    );
    const silence = (reason) => {
      signal.throwIfAborted();
      if (settled || sending) throw fail("本批已经完成回复，不能再次结束", 409);
      if (typeof reason !== "string" || !reason.trim() || reason.length > 500)
        throw fail("请填写简短的安静理由");
      db.prepare("INSERT INTO qq_sends VALUES(?,?,?,'silent',NULL,?)").run(
        batchId,
        thread.key,
        reason.trim(),
        Date.now(),
      );
      settled = true;
      return { status: "silent" };
    };
    try {
      let remaining = this.policy.config(thread.character_id)[
        "chat.context.batchChars"
      ];
      const initialMessages = rows.map((row) => {
        const message = publicMessage(JSON.parse(row.payload)),
          text = message.text.slice(0, remaining);
        remaining = Math.max(0, remaining - text.length);
        return {
          ...message,
          text,
          truncated: text.length < message.text.length,
        };
      });
      const result = await this.driver.run({
        thread: {
          key: thread.key,
          sessionId: thread.session_id,
          characterId: thread.character_id,
          type: thread.type,
          target: thread.target,
          account: rows[0] ? JSON.parse(rows[0].payload).selfId : "",
          started: Boolean(thread.started),
        },
        settings: config,
        input: {
          batchId,
          watermark: rows.at(-1).seq,
          messages: initialMessages,
        },
        reply,
        capabilities,
        burst: (texts) => sendTexts(texts),
        history: ({ limit = 30, messageId } = {}) => {
          const c = this.policy.config(thread.character_id);
          if (!c["chat.tools.history"]) throw fail("管理员未允许历史读取", 403);
          if (messageId) return publicMessage(lookup(messageId));
          if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > c["chat.context.recentMessages"]
          )
            throw fail("历史条数超过配置范围");
          return db
            .prepare(
              "SELECT seq,payload,status FROM qq_inbox WHERE thread_key=? ORDER BY seq DESC LIMIT ?",
            )
            .all(thread.key, limit)
            .reverse()
            .map((row) => ({
              ...publicMessage(JSON.parse(row.payload)),
              seq: row.seq,
              status: row.status,
            }));
        },
        wait: ({ milliseconds, reason }) => {
          signal.throwIfAborted();
          if (settled || sending) throw fail("本批已完成", 409);
          const result = this.policy.wait(
            thread.session_id,
            milliseconds,
            reason,
          );
          silence(reason);
          return result;
        },
        closeConversation: (input) => {
          signal.throwIfAborted();
          if (settled || sending) throw fail("本批已完成", 409);
          const result = this.policy.close(
            thread.session_id,
            input,
            rows.some((row) => /[?？]/.test(JSON.parse(row.payload).text)),
          );
          silence("本段会话已自然收尾");
          return result;
        },
        silence,
        prepared: () => {
          if (current())
            db.prepare("UPDATE qq_threads SET started=1 WHERE key=?").run(
              thread.key,
            );
        },
        signal,
      });
      if (!current()) return;
      db.prepare("UPDATE qq_threads SET started=1 WHERE key=?").run(thread.key);
      if (sendFailure) throw sendFailure;
      if (!settled)
        throw Object.assign(
          fail("模型回合结束但未调用 QQ 回复或安静工具", 502),
          { code: "NO_PLATFORM_REPLY" },
        );
      mark("done");
      this.state = {
        ...this.state,
        lastReplyAt: new Date().toISOString(),
        lastError: null,
        lastSessionId: result?.sessionId || thread.session_id,
      };
    } catch (error) {
      if (!current()) return;
      const send = db
        .prepare("SELECT status FROM qq_sends WHERE batch_id=?")
        .get(batchId);
      if (send?.status === "sent" || send?.status === "silent") {
        mark("done");
        return;
      }
      const code = /^[A-Z_]{1,60}$/.test(error.code || "")
        ? error.code
        : signal.aborted
          ? "INTERRUPTED"
          : "MODEL_FAILED";
      this.state = { ...this.state, lastError: code };
      if (send) {
        mark(send.status === "uncertain" ? "uncertain" : "failed", code);
        return;
      }
      const retry =
        Math.max(...rows.map((row) => row.attempts)) < 2 && !signal.aborted;
      mark(
        retry ? "pending" : "failed",
        code,
        retry ? Date.now() + 5000 * (rows[0].attempts + 1) : 0,
      );
    }
  }
  stop() {
    this.generation++;
    clearInterval(this.timer);
    this.connection?.close();
    this.abort?.abort();
    if (this.ownsLock) {
      this.ownsLock = false;
      try {
        if (fs.readFileSync(this.lockPath, "utf8") === String(process.pid))
          fs.unlinkSync(this.lockPath);
      } catch {}
    }
  }
  close() {
    this.closed = true;
    this.stop();
    this.driver?.close();
  }
}
