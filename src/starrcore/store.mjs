import { DatabaseSync, backup as sqliteBackup } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { recycleAsset } from "../runtime/recycle.mjs";
import { Conversations } from "../conversation/service.mjs";
import { defaults, validatePatch } from "./config.mjs";
import {
  characterRoot as vaultCharacterRoot,
  characterFolder,
  notesRoot as vaultNotesRoot,
  attachmentsRoot as vaultAttachmentsRoot,
  readableNotePath,
  relativePath,
  safeName,
} from "./vault.mjs";
import {
  stateDefaults,
  normalizeState,
  evolveState,
  publicState,
  applyExperience,
  experienceDefinitions,
  driveDefinitions,
  evaluateIntentions,
} from "./organism.mjs";
export { stateDefaults } from "./organism.mjs";

export const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const id = () => crypto.randomUUID();
export const hash = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");
const now = () => new Date().toISOString();
const parse = (s, fallback = {}) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};
function text(value, label, limit = 20000) {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw fail(`${label}不能为空，且不能超过 ${limit} 字符`);
  return value.trim();
}
const num = (v, min = 0, max = 100) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    throw fail("数值超出范围");
  return v;
};
const within = (a, b) => {
  const rel = path.relative(a, b);
  return !rel || (!rel.startsWith("..") && !path.isAbsolute(rel));
};
export const kinds = [
  "moment",
  "person",
  "promise",
  "interest",
  "diary",
  "summary",
  "self",
];

export class StarrStore {
  constructor(dataRoot) {
    this.dataRoot = path.resolve(dataRoot);
    fs.mkdirSync(this.dataRoot, { recursive: true });
    this.db = new DatabaseSync(path.join(this.dataRoot, "installation.sqlite"));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS installation (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, name TEXT NOT NULL, persona TEXT NOT NULL, created TEXT NOT NULL, config TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS configuration_audit (id TEXT PRIMARY KEY, character_id TEXT NOT NULL REFERENCES characters(id), revision INTEGER NOT NULL, data TEXT NOT NULL, created TEXT NOT NULL);
    `);
    this.memories = new Map();
    this.conversations = new Conversations(this);
  }
  installation() {
    return parse(
      this.db.prepare("SELECT data FROM installation WHERE id=1").get()?.data,
      null,
    );
  }
  setup(
    {
      memoryRoot,
      backupRoot,
      name,
      persona = "",
      timezone = "Asia/Shanghai",
      allowExistingVault = false,
    },
    { transaction = true } = {},
  ) {
    if (this.installation())
      throw fail("已完成首次配置，不能重复覆盖目录", 409);
    if (typeof allowExistingVault !== "boolean")
      throw fail("现有 Obsidian 库选项必须为布尔值");
    validatePatch({ "agency.timezone": timezone });
    const characterName = text(name, "角色名", 40);
    if (typeof persona !== "string" || persona.length > 20000)
      throw fail("人格说明过长");
    if (
      !memoryRoot ||
      !backupRoot ||
      !path.isAbsolute(memoryRoot) ||
      !path.isAbsolute(backupRoot)
    )
      throw fail("请选择绝对目录");
    const roots = [memoryRoot, backupRoot].map((p) => path.resolve(p));
    for (const dir of roots) {
      let ancestor = dir;
      while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
      const resolved = path.join(
        fs.realpathSync(ancestor),
        path.relative(ancestor, dir),
      );
      if (path.resolve(resolved).toLowerCase() !== dir.toLowerCase())
        throw fail("目录包含联接或符号链接，请直接选择真实新目录");
      if (
        fs.existsSync(dir) &&
        fs.readdirSync(dir).length &&
        !(
          allowExistingVault &&
          dir === roots[0] &&
          fs
            .statSync(path.join(dir, ".obsidian"), { throwIfNoEntry: false })
            ?.isDirectory()
        )
      )
        throw fail("为保护现有数据，请选择空的新目录");
      if (dir === path.parse(dir).root || within(dir, this.dataRoot))
        throw fail("目录不能包含整个运行目录或磁盘");
    }
    if (within(roots[0], roots[1]) || within(roots[1], roots[0]))
      throw fail("记忆与备份目录不能重叠或互相嵌套");
    roots.forEach((p) => fs.mkdirSync(p, { recursive: true }));
    const installation = {
      memoryRoot: roots[0],
      backupRoot: roots[1],
      createdAt: now(),
      format: 1,
    };
    if (transaction) this.db.exec("BEGIN IMMEDIATE");
    let character;
    try {
      this.db
        .prepare("INSERT INTO installation VALUES(1,?)")
        .run(JSON.stringify(installation));
      character = this.createCharacter({
        name: characterName,
        persona,
        timezone,
      });
      if (transaction) this.db.exec("COMMIT");
    } catch (e) {
      if (transaction) this.db.exec("ROLLBACK");
      throw e;
    }
    return { installation, character };
  }
  listCharacters() {
    return this.db
      .prepare(
        "SELECT id,name,created,revision FROM characters ORDER BY created",
      )
      .all();
  }
  character(characterId) {
    const row = this.db
      .prepare("SELECT * FROM characters WHERE id=?")
      .get(characterId);
    if (!row) throw fail("角色不存在", 404);
    return {
      ...row,
      config: {
        ...defaults(),
        ...parse(row.config),
        "tts.local.idleSeconds": 300,
        "sing.local.idleSeconds": 300,
      },
    };
  }
  createCharacter({ name, persona = "", timezone = "Asia/Shanghai" }) {
    if (!this.installation()) throw fail("请先完成首次配置", 409);
    if (typeof persona !== "string" || persona.length > 20000)
      throw fail("人格说明过长");
    validatePatch({ "agency.timezone": timezone });
    const characterId = id(),
      config = { ...defaults(), "agency.timezone": timezone };
    this.db
      .prepare(
        "INSERT INTO characters(id,name,persona,created,config) VALUES(?,?,?,?,?)",
      )
      .run(
        characterId,
        text(name, "角色名", 40),
        persona,
        now(),
        JSON.stringify(config),
      );
    const installation = this.installation();
    if (installation.vaultLayout?.format === 2) {
      const layout = installation.vaultLayout;
      const folder = `${String(this.listCharacters().length).padStart(2, "0")}-${safeName(name, "角色", 24)}-${characterId.slice(0, 8)}`;
      this.db.prepare("UPDATE installation SET data=? WHERE id=1").run(
        JSON.stringify({
          ...installation,
          vaultLayout: {
            ...layout,
            characters: { ...layout.characters, [characterId]: folder },
          },
        }),
      );
    }
    return this.character(characterId);
  }
  updateCharacter(characterId, patch) {
    const c = this.character(characterId);
    if (patch.revision !== c.revision)
      throw fail("角色资料已更新，请刷新后再保存", 409);
    const name = text(patch.name, "角色名", 40);
    if (typeof patch.persona !== "string" || patch.persona.length > 20000)
      throw fail("人格说明过长");
    const result = this.db
      .prepare(
        "UPDATE characters SET name=?,persona=?,revision=revision+1 WHERE id=? AND revision=?",
      )
      .run(name, patch.persona, characterId, patch.revision);
    if (!result.changes) throw fail("角色资料已更新，请刷新后再保存", 409);
    return this.character(characterId);
  }
  configure(characterId, patch, { bot = false, revision } = {}) {
    const c = this.character(characterId);
    validatePatch(patch, { bot, current: c.config });
    if (revision !== c.revision)
      throw fail("配置已被其他操作修改，请重新加载", 409);
    const before = Object.fromEntries(
      Object.keys(patch).map((k) => [k, c.config[k]]),
    );
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db
        .prepare(
          "UPDATE characters SET config=?,revision=revision+1 WHERE id=? AND revision=?",
        )
        .run(JSON.stringify({ ...c.config, ...patch }), characterId, revision);
      if (!result.changes) throw fail("配置已被其他操作修改，请重新加载", 409);
      this.db
        .prepare("INSERT INTO configuration_audit VALUES(?,?,?,?,?)")
        .run(
          id(),
          characterId,
          revision + 1,
          JSON.stringify({ actor: bot ? "bot" : "user", before, after: patch }),
          now(),
        );
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    return this.character(characterId);
  }
  characterRoot(characterId) {
    this.character(characterId);
    return vaultCharacterRoot(this.installation(), characterId);
  }
  notesRoot(characterId) {
    this.character(characterId);
    return vaultNotesRoot(this.installation(), characterId);
  }
  attachmentsRoot(characterId) {
    this.character(characterId);
    return vaultAttachmentsRoot(this.installation(), characterId);
  }
  noteFile(characterId, record) {
    const db = this.memory(characterId),
      recordId = typeof record === "string" ? record : record.id;
    const row = db.prepare("SELECT * FROM records WHERE id=?").get(recordId);
    if (!row) throw fail("记忆不存在", 404);
    let relative = db
      .prepare("SELECT relative_path FROM note_paths WHERE record_id=?")
      .get(row.id)?.relative_path;
    if (!relative) {
      relative =
        this.installation().vaultLayout?.format === 2
          ? readableNotePath(row)
          : `${row.id}.md`;
      relativePath(relative);
      if (this.installation().vaultLayout?.format === 2)
        db.prepare("INSERT INTO note_paths VALUES(?,?)").run(row.id, relative);
    }
    return path.join(this.notesRoot(characterId), relativePath(relative));
  }
  noteLink(characterId, record) {
    if (this.installation().vaultLayout?.format !== 2)
      return typeof record === "string" ? record : record.id;
    return path
      .relative(
        this.installation().memoryRoot,
        this.noteFile(characterId, record),
      )
      .replaceAll("\\", "/")
      .replace(/\.md$/i, "");
  }
  noteIdFromLink(characterId, link) {
    let target;
    try {
      target = decodeURIComponent(String(link).split("#")[0])
        .replaceAll("\\", "/")
        .replace(/\.md$/i, "");
    } catch {
      return null;
    }
    const db = this.memory(characterId);
    if (db.prepare("SELECT 1 FROM records WHERE id=?").get(target))
      return target;
    const prefix = path
      .relative(this.installation().memoryRoot, this.notesRoot(characterId))
      .replaceAll("\\", "/");
    const matches = db
      .prepare("SELECT record_id,relative_path FROM note_paths")
      .all()
      .filter((row) => {
        const relative = row.relative_path.replace(/\.md$/i, "");
        return (
          target === `${prefix}/${relative}` ||
          target === relative ||
          target === path.posix.basename(relative)
        );
      });
    return matches.length === 1 ? matches[0].record_id : null;
  }
  memory(characterId) {
    this.character(characterId);
    if (this.memories.has(characterId)) return this.memories.get(characterId);
    const root = path.join(this.characterRoot(characterId), ".starr");
    fs.mkdirSync(root, { recursive: true });
    const db = new DatabaseSync(path.join(root, "memory.sqlite"));
    db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, kind TEXT NOT NULL, importance REAL NOT NULL, confidence REAL NOT NULL, anchor INTEGER NOT NULL, source TEXT NOT NULL, event_key TEXT UNIQUE, fingerprint TEXT NOT NULL, created TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, projection_hash TEXT);
      CREATE TABLE IF NOT EXISTS note_paths(record_id TEXT PRIMARY KEY REFERENCES records(id),relative_path TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS record_visibility(record_id TEXT PRIMARY KEY REFERENCES records(id),visibility TEXT NOT NULL,session_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS record_archive(record_id TEXT PRIMARY KEY REFERENCES records(id),reason TEXT NOT NULL,created TEXT NOT NULL);
      CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(title,content,content='records',content_rowid='rowid',tokenize='trigram');
      CREATE TRIGGER IF NOT EXISTS records_insert AFTER INSERT ON records BEGIN INSERT INTO records_fts(rowid,title,content) VALUES(new.rowid,new.title,new.content); END;
      CREATE TRIGGER IF NOT EXISTS records_update AFTER UPDATE OF title,content ON records BEGIN INSERT INTO records_fts(records_fts,rowid,title,content) VALUES('delete',old.rowid,old.title,old.content); INSERT INTO records_fts(rowid,title,content) VALUES(new.rowid,new.title,new.content); END;
      CREATE TABLE IF NOT EXISTS links(source TEXT REFERENCES records(id), target TEXT REFERENCES records(id), kind TEXT NOT NULL, weight REAL NOT NULL, PRIMARY KEY(source,target,kind));
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY, record_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, error TEXT, created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, type TEXT NOT NULL, data TEXT NOT NULL, created TEXT NOT NULL, event_key TEXT UNIQUE);
      CREATE TABLE IF NOT EXISTS goals(id TEXT PRIMARY KEY, title TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL, due TEXT, created TEXT NOT NULL, updated TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS expressions(id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL, hash TEXT NOT NULL UNIQUE, tags TEXT NOT NULL DEFAULT '', favorite INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL);
    `);
    db.prepare("INSERT OR IGNORE INTO state VALUES(1,?,1)").run(
      JSON.stringify({ ...stateDefaults, _updatedAt: now() }),
    );
    const stateRow = db.prepare("SELECT data FROM state WHERE id=1").get();
    const initialState = parse(stateRow.data);
    if (!initialState._updatedAt)
      db.prepare("UPDATE state SET data=? WHERE id=1").run(
        JSON.stringify({ ...normalizeState(initialState), _updatedAt: now() }),
      );
    if (
      !db
        .prepare("PRAGMA table_info(goals)")
        .all()
        .some((column) => column.name === "data")
    )
      db.exec("ALTER TABLE goals ADD COLUMN data TEXT NOT NULL DEFAULT '{}'");
    this.memories.set(characterId, db);
    return db;
  }
  saveMemory(characterId, input, scope) {
    const db = this.memory(characterId);
    if (
      scope &&
      this.character(characterId).config["memory.defaultVisibility"] ===
        "shared"
    )
      scope = { ...scope, visibility: "shared" };
    if (scope) {
      const session = this.conversations.get(scope.sessionId);
      if (
        session.character_id !== characterId ||
        !["conversation", "shared"].includes(scope.visibility)
      )
        throw fail("记忆会话范围无效", 403);
    }
    const title = text(input.title, "记忆标题", 150),
      content = text(input.content, "记忆正文", 40000);
    const kind = input.kind ?? "moment";
    if (!kinds.includes(kind)) throw fail("不支持的记忆类型");
    if (
      kind === "summary" &&
      !/^(?:\d{4}年?|\d{4}[-/](?:0?[1-9]|1[0-2])月?|\d{4}年(?:0?[1-9]|1[0-2])月|\d{4}[- ]?W(?:0?[1-9]|[1-4]\d|5[0-3])|\d{4}年第(?:0?[1-9]|[1-4]\d|5[0-3])周)(?:\s+|$|[·：:])/.test(
        title,
      )
    )
      throw fail(
        "概览标题请使用年份、月份或周次，例如2026 年概览、2026-11 月概览、2026-W45 周概览；自我介绍请选择自我概览",
      );
    const importance = num(input.importance ?? 50),
      confidence = num(input.confidence ?? 80),
      anchor = !!input.anchor;
    const source = text(input.source ?? "用户手动记录", "来源", 500),
      eventKey = input.eventKey ? text(input.eventKey, "事件标识", 300) : null;
    const fingerprint = hash(
      JSON.stringify({
        title,
        content,
        kind,
        source,
        importance,
        confidence,
        anchor,
        ...(scope ? { scope } : {}),
      }),
    );
    if (eventKey) {
      const old = db
        .prepare("SELECT * FROM records WHERE event_key=?")
        .get(eventKey);
      if (old) {
        if (old.fingerprint !== fingerprint)
          throw fail("同一事件标识已对应其他内容", 409);
        return { ...old, duplicate: true };
      }
    }
    const record = {
      id: id(),
      title,
      content,
      kind,
      importance,
      confidence,
      anchor: anchor ? 1 : 0,
      source,
      event_key: eventKey,
      fingerprint,
      created: now(),
    };
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "INSERT INTO records(id,title,content,kind,importance,confidence,anchor,source,event_key,fingerprint,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      ).run(...Object.values(record));
      if (scope) {
        db.prepare("INSERT INTO record_visibility VALUES(?,?,?)").run(
          record.id,
          scope.visibility,
          scope.sessionId,
        );
        db.prepare(
          "INSERT INTO audit(id,type,data,created) VALUES(?,?,?,?)",
        ).run(
          id(),
          "memory-scope",
          JSON.stringify({ recordId: record.id, actor: "bot", after: scope }),
          now(),
        );
      }
      db.prepare("INSERT INTO outbox(id,record_id,created) VALUES(?,?,?)").run(
        id(),
        record.id,
        now(),
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    this.flushProjection(characterId);
    return {
      ...record,
      revision: 1,
      ...(scope
        ? { visibility: scope.visibility, visibility_session: scope.sessionId }
        : {}),
    };
  }
  setMemoryVisibility(characterId, recordId, { visibility, revision }) {
    if (!["shared", "unclassified"].includes(visibility))
      throw fail("此入口只支持共享或撤销共享");
    const db = this.memory(characterId);
    db.exec("BEGIN IMMEDIATE");
    try {
      const record = db
        .prepare("SELECT revision FROM records WHERE id=?")
        .get(recordId);
      if (!record) throw fail("记忆不存在", 404);
      if (record.revision !== revision)
        throw fail("记忆已变化，请刷新后重试", 409);
      const before = db
        .prepare("SELECT * FROM record_visibility WHERE record_id=?")
        .get(recordId);
      const after = {
        visibility:
          visibility === "shared"
            ? "shared"
            : before?.session_id
              ? "conversation"
              : "unclassified",
        sessionId: before?.session_id || "",
      };
      db.prepare(
        "INSERT INTO record_visibility VALUES(?,?,?) ON CONFLICT(record_id) DO UPDATE SET visibility=excluded.visibility",
      ).run(recordId, after.visibility, after.sessionId);
      db.prepare(
        "UPDATE records SET revision=revision+1 WHERE id=? AND revision=?",
      ).run(recordId, revision);
      db.prepare("INSERT INTO audit(id,type,data,created) VALUES(?,?,?,?)").run(
        id(),
        "memory-scope",
        JSON.stringify({
          recordId,
          actor: "user",
          before,
          after,
          revision: revision + 1,
        }),
        now(),
      );
      db.exec("COMMIT");
      return {
        id: recordId,
        revision: revision + 1,
        visibility: after.visibility,
      };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  shareAllMemories(characterId, { restoreBatch } = {}) {
    const db = this.memory(characterId);
    db.exec(
      "CREATE TABLE IF NOT EXISTS memory_scope_batches(batch_id TEXT NOT NULL,record_id TEXT NOT NULL,before_data TEXT NOT NULL,after_revision INTEGER NOT NULL,PRIMARY KEY(batch_id,record_id))",
    );
    const batchId = id(),
      created = now();
    db.exec("BEGIN IMMEDIATE");
    try {
      const rows = restoreBatch
        ? db
            .prepare("SELECT * FROM memory_scope_batches WHERE batch_id=?")
            .all(restoreBatch)
        : db
            .prepare(
              "SELECT r.id,r.revision,v.visibility,v.session_id FROM records r LEFT JOIN record_visibility v ON r.id=v.record_id WHERE NOT EXISTS(SELECT 1 FROM record_archive a WHERE a.record_id=r.id) AND coalesce(v.visibility,'unclassified')<>'shared'",
            )
            .all();
      if (restoreBatch && !rows.length)
        throw fail("共享批次不存在或已经撤销", 404);
      for (const row of rows) {
        const recordId = restoreBatch ? row.record_id : row.id;
        if (restoreBatch) {
          const current = db
            .prepare("SELECT revision FROM records WHERE id=?")
            .get(recordId);
          if (current?.revision !== row.after_revision)
            throw fail("其中一条记忆已调整，请逐条确认共享范围", 409);
          const before = parse(row.before_data);
          if (before.visibility)
            db.prepare(
              "INSERT INTO record_visibility VALUES(?,?,?) ON CONFLICT(record_id) DO UPDATE SET visibility=excluded.visibility,session_id=excluded.session_id",
            ).run(recordId, before.visibility, before.session_id || "");
          else
            db.prepare("DELETE FROM record_visibility WHERE record_id=?").run(
              recordId,
            );
        } else {
          db.prepare("INSERT INTO memory_scope_batches VALUES(?,?,?,?)").run(
            batchId,
            recordId,
            JSON.stringify({
              visibility: row.visibility,
              session_id: row.session_id,
            }),
            row.revision + 1,
          );
          db.prepare(
            "INSERT INTO record_visibility VALUES(?,'shared',?) ON CONFLICT(record_id) DO UPDATE SET visibility='shared'",
          ).run(recordId, row.session_id || "");
        }
        db.prepare("UPDATE records SET revision=revision+1 WHERE id=?").run(
          recordId,
        );
        db.prepare(
          "INSERT INTO outbox(id,record_id,created) VALUES(?,?,?)",
        ).run(id(), recordId, created);
      }
      if (restoreBatch)
        db.prepare("DELETE FROM memory_scope_batches WHERE batch_id=?").run(
          restoreBatch,
        );
      db.prepare("INSERT INTO audit(id,type,data,created) VALUES(?,?,?,?)").run(
        id(),
        "memory-share-all",
        JSON.stringify({
          batchId,
          restoreBatch,
          count: rows.length,
          actor: "user",
        }),
        created,
      );
      db.exec("COMMIT");
      this.flushProjection(characterId);
      return {
        batchId: restoreBatch ? null : batchId,
        count: rows.length,
        restored: !!restoreBatch,
      };
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  listMemory(characterId, { q = "", kind = "", limit = 200 } = {}) {
    const db = this.memory(characterId),
      config = this.character(characterId).config;
    const terms = String(q).trim().split(/\s+/).filter(Boolean).slice(0, 12);
    const where = [
      "NOT EXISTS(SELECT 1 FROM record_archive a WHERE a.record_id=records.id)",
      ...(kind ? ["kind=?"] : []),
      ...terms.map(
        () =>
          "(instr(lower(title),lower(?))>0 OR instr(lower(content),lower(?))>0)",
      ),
    ];
    const args = [...(kind ? [kind] : []), ...terms.flatMap((t) => [t, t])];
    const rows = db
      .prepare(
        `SELECT records.*,v.visibility,v.session_id AS visibility_session FROM records LEFT JOIN record_visibility v ON records.id=v.record_id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created DESC LIMIT ?`,
      )
      .all(...args, Math.min(5000, Math.max(1, Number(limit) || 200)));
    return rows
      .map((r) => ({
        ...r,
        score: Math.round(
          r.importance *
            (r.anchor
              ? config["memory.anchorBoost"]
              : Math.pow(
                  2,
                  -Math.max(
                    0,
                    (Date.now() - Date.parse(r.created)) / 86400000,
                  ) / config["memory.halfLifeDays"],
                )),
        ),
      }))
      .sort((a, b) => b.score - a.score || b.created.localeCompare(a.created));
  }
  link(characterId, { source, target, kind = "explicit", weight = 1 }) {
    const db = this.memory(characterId);
    if (
      source === target ||
      !["explicit", "semantic", "sequence"].includes(kind)
    )
      throw fail("关联类型无效");
    for (const key of [source, target])
      if (!db.prepare("SELECT id FROM records WHERE id=?").get(key))
        throw fail("关联必须连接当前角色的已有记忆", 404);
    num(weight, 0, 1);
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "INSERT INTO links VALUES(?,?,?,?) ON CONFLICT(source,target,kind) DO UPDATE SET weight=excluded.weight",
      ).run(source, target, kind, weight);
      for (const key of [source, target])
        db.prepare(
          "INSERT INTO outbox(id,record_id,created) VALUES(?,?,?)",
        ).run(id(), key, now());
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    this.flushProjection(characterId);
    return this.graph(characterId);
  }
  graph(characterId) {
    const db = this.memory(characterId);
    return {
      nodes: this.listMemory(characterId, { limit: 5000 }),
      links: db
        .prepare(
          "SELECT * FROM links WHERE source NOT IN (SELECT record_id FROM record_archive) AND target NOT IN (SELECT record_id FROM record_archive)",
        )
        .all(),
    };
  }
  flushProjection(characterId) {
    if (!this.character(characterId).config["memory.projectionEnabled"]) return;
    const db = this.memory(characterId),
      root = this.notesRoot(characterId);
    fs.mkdirSync(root, { recursive: true });
    for (const job of db
      .prepare(
        "SELECT * FROM outbox WHERE status IN ('pending','failed') ORDER BY created LIMIT 100",
      )
      .all()) {
      try {
        const r = db
          .prepare("SELECT * FROM records WHERE id=?")
          .get(job.record_id);
        if (!r) throw new Error("记忆不存在");
        const file = this.noteFile(characterId, r);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (
          fs.existsSync(file) &&
          (!r.projection_hash ||
            hash(fs.readFileSync(file)) !== r.projection_hash)
        )
          throw new Error("笔记有外部修改，已保留原文件，等待人工合并");
        const links = db
          .prepare(
            "SELECT DISTINCT r.id,r.title FROM records r JOIN links l ON (l.source=r.id OR l.target=r.id) WHERE (l.source=? OR l.target=?) AND r.id<>? AND (l.kind='explicit' OR l.weight>=?)",
          )
          .all(
            r.id,
            r.id,
            r.id,
            this.character(characterId).config["memory.linkThreshold"] ?? 0.65,
          );
        const archived = !!db
          .prepare("SELECT 1 FROM record_archive WHERE record_id=?")
          .get(r.id);
        const aliases =
          this.installation().vaultLayout?.format === 2
            ? `aliases: [${JSON.stringify(r.id)}]\n`
            : "";
        const output = `---\nstarr_id: ${r.id}\n${aliases}revision: ${r.revision}\narchived: ${archived}\ntitle: ${JSON.stringify(r.title)}\nkind: ${r.kind}\nimportance: ${r.importance}\nsource: ${JSON.stringify(r.source)}\n---\n\n# ${r.title.replace(/\n/g, " ")}\n\n${r.content}\n\n${links.length ? "## 关联记忆\n\n" + links.map((l) => `- [[${this.noteLink(characterId, l)}|${l.title.replace(/[\[\]|\n]/g, " ")}]]`).join("\n") : ""}\n`;
        const temp = file + "." + id() + ".tmp";
        fs.writeFileSync(temp, output);
        fs.renameSync(temp, file);
        db.prepare("UPDATE records SET projection_hash=? WHERE id=?").run(
          hash(output),
          r.id,
        );
        db.prepare(
          "UPDATE outbox SET status='done',error=NULL,attempts=attempts+1 WHERE id=?",
        ).run(job.id);
      } catch (e) {
        db.prepare(
          "UPDATE outbox SET status='failed',error=?,attempts=attempts+1 WHERE id=?",
        ).run(e.message, job.id);
      }
    }
  }
  getState(characterId) {
    const row = this.memory(characterId)
      .prepare("SELECT * FROM state WHERE id=1")
      .get();
    return publicState(
      parse(row.data),
      row.revision,
      Date.now(),
      this.character(characterId).config["agency.timezone"],
    );
  }
  commitState(characterId, input, fingerprint, mutate) {
    const db = this.memory(characterId),
      eventKey = input.eventKey ? text(input.eventKey, "事件标识", 300) : id();
    db.exec("BEGIN IMMEDIATE");
    let result;
    try {
      const old = db
        .prepare("SELECT type,data FROM audit WHERE event_key=?")
        .get(eventKey);
      if (old) {
        const saved = parse(old.data);
        if (old.type !== "state" || saved.fingerprint !== fingerprint)
          throw fail("同一状态事件标识已对应其他内容", 409);
        db.exec("COMMIT");
        return { ...saved.result, duplicate: true };
      }
      const row = db.prepare("SELECT * FROM state WHERE id=1").get();
      if (input.revision !== row.revision)
        throw fail("状态已变化，请刷新后再调整", 409);
      const time = Date.now(),
        timezone = this.character(characterId).config["agency.timezone"];
      const before = publicState(parse(row.data), row.revision, time, timezone);
      const state = mutate(
        evolveState(parse(row.data), time, timezone),
        time,
        timezone,
      );
      state._updatedAt = new Date(time).toISOString();
      result = publicState(state, row.revision + 1, time, timezone);
      db.prepare("UPDATE state SET data=?,revision=revision+1 WHERE id=1").run(
        JSON.stringify(state),
      );
      db.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").run(
        id(),
        "state",
        JSON.stringify({
          before,
          after: result,
          fingerprint,
          result,
          experience: input.experience ?? null,
        }),
        new Date(time).toISOString(),
        eventKey,
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return result;
  }
  updateState(characterId, input) {
    const patch = input.values;
    if (
      !patch ||
      typeof patch !== "object" ||
      Array.isArray(patch) ||
      !Object.keys(patch).length
    )
      throw fail("状态变化必须是非空字段对象");
    for (const [key, value] of Object.entries(patch)) {
      if (!Object.hasOwn(stateDefaults, key)) throw fail("未知的状态维度");
      if (["emotion", "evidence"].includes(key)) text(value, key, 500);
      else num(value);
    }
    const fingerprint = hash(
      JSON.stringify({
        operation: "adjust",
        values: Object.fromEntries(
          Object.keys(patch)
            .sort()
            .map((key) => [key, patch[key]]),
        ),
      }),
    );
    return this.commitState(characterId, input, fingerprint, (state) =>
      normalizeState({ ...state, ...patch }),
    );
  }
  recordExperience(characterId, input) {
    if (!Object.hasOwn(experienceDefinitions, input.kind))
      throw fail("未知的经历类型");
    const intensity = num(input.intensity ?? 60),
      evidence = text(input.evidence, "经历与来源", 500);
    const eventKey = text(input.eventKey, "事件标识", 300);
    const experience = { kind: input.kind, intensity, evidence };
    const fingerprint = hash(
      JSON.stringify({ operation: "experience", ...experience }),
    );
    return this.commitState(
      characterId,
      { ...input, eventKey, experience },
      fingerprint,
      (state, time, timezone) =>
        applyExperience(state, input.kind, intensity, evidence, time, timezone),
    );
  }
  intentions(characterId) {
    return evaluateIntentions(
      this.getState(characterId),
      this.character(characterId).config,
      this.goals(characterId),
    );
  }
  stateHistory(characterId) {
    return this.memory(characterId)
      .prepare(
        "SELECT data,created FROM audit WHERE type='state' ORDER BY created DESC LIMIT 60",
      )
      .all()
      .map((r) => ({ ...r, ...parse(r.data) }));
  }
  goals(characterId) {
    return this.memory(characterId)
      .prepare("SELECT * FROM goals ORDER BY created DESC")
      .all()
      .map(({ data, ...row }) => ({ ...row, ...parse(data) }));
  }
  createGoal(characterId, input, trusted = {}) {
    const db = this.memory(characterId),
      t = now(),
      goal = {
        id: id(),
        title: text(input.title, "目的", 150),
        reason: text(input.reason, "来源与理由", 2000),
        status: "waiting",
        due: input.due ?? null,
        created: t,
        updated: t,
      };
    if (goal.due && !Number.isFinite(Date.parse(goal.due)))
      throw fail("到期时间无效");
    const drive = input.drive
      ? driveDefinitions.find((d) => d.id === input.drive)
      : null;
    if (input.drive && !drive) throw fail("未知的目的驱动力");
    const data = drive
      ? { drive: drive.id, action: drive.action, external: drive.external }
      : { drive: null, action: "consider", external: false };
    if (trusted.sessionId) {
      const session = this.conversations.get(trusted.sessionId);
      if (session.character_id !== characterId)
        throw fail("目的来源与角色不匹配", 403);
      data.originSession = session.session_id;
    }
    db.prepare(
      "INSERT INTO goals(id,title,reason,status,due,created,updated,data) VALUES(?,?,?,?,?,?,?,?)",
    ).run(...Object.values(goal), JSON.stringify(data));
    return { ...goal, ...data };
  }
  updateGoal(characterId, goalId, status) {
    if (!["waiting", "completed", "cancelled"].includes(status))
      throw fail("不支持的目的状态");
    const r = this.memory(characterId)
      .prepare("UPDATE goals SET status=?,updated=? WHERE id=?")
      .run(status, now(), goalId);
    if (!r.changes) throw fail("目的不存在", 404);
    return this.goals(characterId);
  }
  overview(characterId) {
    const db = this.memory(characterId);
    return {
      character: this.character(characterId),
      state: this.getState(characterId),
      memories: this.listMemory(characterId, { limit: 6 }),
      goals: this.goals(characterId),
      counts: {
        memories: db
          .prepare(
            "SELECT count(*) n FROM records WHERE id NOT IN(SELECT record_id FROM record_archive)",
          )
          .get().n,
        archived: db.prepare("SELECT count(*) n FROM record_archive").get().n,
        links: db.prepare("SELECT count(*) n FROM links").get().n,
        pending: db
          .prepare("SELECT count(*) n FROM outbox WHERE status!='done'")
          .get().n,
      },
    };
  }
  async backup(characterId) {
    const db = this.memory(characterId),
      backupId = now().replace(/[:.]/g, "-") + "-" + id().slice(0, 8),
      root = path.join(
        this.installation().backupRoot,
        characterFolder(this.installation(), characterId),
        backupId,
      );
    fs.mkdirSync(root, { recursive: true });
    await sqliteBackup(db, path.join(root, "memory.sqlite"));
    const notes = this.notesRoot(characterId);
    if (fs.existsSync(notes))
      fs.cpSync(notes, path.join(root, "notes"), { recursive: true });
    const attachments = this.attachmentsRoot(characterId);
    if (fs.existsSync(attachments))
      fs.cpSync(attachments, path.join(root, "attachments"), {
        recursive: true,
      });
    fs.writeFileSync(
      path.join(root, "character.json"),
      JSON.stringify(this.character(characterId), null, 2),
    );
    if (this.installation().vaultLayout)
      fs.writeFileSync(
        path.join(root, "vault-layout.json"),
        JSON.stringify(this.installation().vaultLayout, null, 2),
      );
    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else
          files.push({
            path: path.relative(root, p).replaceAll("\\", "/"),
            sha256: hash(fs.readFileSync(p)),
            bytes: fs.statSync(p).size,
          });
      }
    };
    walk(root);
    const manifest = {
      format: "starr-character-backup/1",
      characterId,
      created: now(),
      consistency: "SQLite 事务快照；笔记逐项复制；凭据不包含在备份中",
      files,
    };
    fs.writeFileSync(
      path.join(root, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    return { backupId, path: root, files: files.length };
  }
  health(characterId) {
    const db = this.memory(characterId);
    return {
      database: db.prepare("PRAGMA quick_check").get().quick_check,
      outbox: db
        .prepare(
          "SELECT id,status,error,attempts,created FROM outbox WHERE status!='done' ORDER BY created DESC LIMIT 30",
        )
        .all(),
      host: {
        status: "standalone",
        connected: false,
        detail: "独立核心未接入 DSH；请从 DSH 侧栏打开 starr 检查宿主",
      },
      media: { status: "unverified", detail: "连接配置与各能力需分别验证" },
    };
  }
  expressionRoot(characterId) {
    this.character(characterId);
    return path.join(
      this.attachmentsRoot(characterId),
      this.installation().vaultLayout?.format === 2 ? "表情" : "expressions",
    );
  }
  expressions(characterId) {
    return this.memory(characterId)
      .prepare("SELECT * FROM expressions ORDER BY favorite DESC,created DESC")
      .all();
  }
  addExpression(characterId, bytes, name) {
    if (!bytes.length || bytes.length > 10 * 1024 * 1024)
      throw fail("图片应为 1B–10MB");
    const mime = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : bytes[0] === 255 && bytes[1] === 216
        ? "image/jpeg"
        : bytes
              .subarray(0, 6)
              .toString()
              .match(/^GIF8[79]a$/)
          ? "image/gif"
          : bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP"
            ? "image/webp"
            : null;
    if (!mime) throw fail("只支持 PNG、JPEG、GIF、WebP 图片");
    let width = 0,
      height = 0;
    if (mime === "image/png" && bytes.length >= 24) {
      width = bytes.readUInt32BE(16);
      height = bytes.readUInt32BE(20);
    } else if (mime === "image/gif" && bytes.length >= 10) {
      width = bytes.readUInt16LE(6);
      height = bytes.readUInt16LE(8);
    } else if (mime === "image/jpeg")
      for (let i = 2; i + 9 < bytes.length;) {
        if (bytes[i] !== 255) {
          i++;
          continue;
        }
        const marker = bytes[i + 1],
          length = bytes.readUInt16BE(i + 2);
        if (
          marker >= 192 &&
          marker <= 207 &&
          ![196, 200, 204].includes(marker)
        ) {
          height = bytes.readUInt16BE(i + 5);
          width = bytes.readUInt16BE(i + 7);
          break;
        }
        if (length < 2) break;
        i += 2 + length;
      }
    if (mime === "image/webp" && bytes.length >= 30) {
      const type = bytes.subarray(12, 16).toString();
      if (type === "VP8X") {
        width = 1 + bytes.readUIntLE(24, 3);
        height = 1 + bytes.readUIntLE(27, 3);
      } else if (
        type === "VP8 " &&
        bytes.subarray(23, 26).toString("hex") === "9d012a"
      ) {
        width = bytes.readUInt16LE(26) & 16383;
        height = bytes.readUInt16LE(28) & 16383;
      } else if (type === "VP8L" && bytes[20] === 47) {
        const bits = bytes.readUInt32LE(21);
        width = (bits & 16383) + 1;
        height = ((bits >>> 14) & 16383) + 1;
      }
    }
    if (
      width * height >
      this.character(characterId).config["chat.media.maxPixels"]
    )
      throw fail("图片像素超过角色配置上限", 413);
    const db = this.memory(characterId),
      fingerprint = hash(bytes),
      old = db
        .prepare("SELECT * FROM expressions WHERE hash=?")
        .get(fingerprint);
    if (old) return { ...old, duplicate: true };
    const record = {
        id: id(),
        name: text(name, "表情名称", 150),
        mime,
        bytes: bytes.length,
        hash: fingerprint,
        tags: "",
        favorite: 0,
        created: now(),
      },
      root = this.expressionRoot(characterId);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, record.id), bytes, { flag: "wx" });
    db.prepare("INSERT INTO expressions VALUES(?,?,?,?,?,?,?,?)").run(
      ...Object.values(record),
    );
    return record;
  }
  updateExpression(characterId, expressionId, patch) {
    const db = this.memory(characterId),
      old = db
        .prepare("SELECT * FROM expressions WHERE id=?")
        .get(expressionId);
    if (!old) throw fail("表情不存在", 404);
    const name =
        patch.name === undefined ? old.name : text(patch.name, "表情名称", 150),
      tags =
        patch.tags === undefined
          ? old.tags
          : text(patch.tags || "未分类", "关键词", 500);
    db.prepare(
      "UPDATE expressions SET name=?,tags=?,favorite=? WHERE id=?",
    ).run(
      name,
      tags,
      patch.favorite === undefined ? old.favorite : patch.favorite ? 1 : 0,
      expressionId,
    );
    return this.expressions(characterId);
  }
  removeExpression(characterId, expressionId) {
    const db = this.memory(characterId),
      row = db
        .prepare("SELECT * FROM expressions WHERE id=?")
        .get(expressionId);
    if (!row) throw fail("表情不存在", 404);
    return recycleAsset(this.expressionRoot(characterId), row, () => {
      db.prepare("DELETE FROM expressions WHERE id=?").run(expressionId);
    });
  }
  expressionFile(characterId, expressionId) {
    const row = this.memory(characterId)
      .prepare("SELECT * FROM expressions WHERE id=?")
      .get(expressionId);
    if (!row) throw fail("表情不存在", 404);
    const file = path.join(this.expressionRoot(characterId), row.id);
    if (!fs.existsSync(file)) throw fail("表情原文件缺失，记录仍已保留", 410);
    return { file, mime: row.mime };
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    for (const db of this.memories.values()) db.close();
    this.db.close();
  }
}
