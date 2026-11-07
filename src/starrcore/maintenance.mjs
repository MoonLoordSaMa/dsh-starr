import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fail, hash } from "./store.mjs";

export class MemoryMaintenance {
  constructor(store) {
    this.store = store;
  }
  db(characterId) {
    return this.store.memory(characterId);
  }
  update(characterId, input, sessionId) {
    if (
      !input ||
      typeof input !== "object" ||
      typeof input.id !== "string" ||
      !Number.isInteger(input.revision)
    )
      throw fail("请提供笔记编号和读到的修订号");
    const db = this.db(characterId);
    if (
      sessionId &&
      this.store.conversations.get(sessionId).character_id !== characterId
    )
      throw fail("会话与角色不匹配", 403);
    const row = db
      .prepare(
        "SELECT * FROM records WHERE id=? AND id NOT IN (SELECT record_id FROM record_archive)",
      )
      .get(input.id);
    if (
      !row ||
      (sessionId &&
        !this.store.conversations.visibleMemories(sessionId, {
          id: input.id,
          limit: 1,
        })[0])
    )
      throw fail("当前会话无法修改这条记忆", 404);
    if (row.kind === "diary") throw fail("日记原文受保护，请另写笔记补充", 403);
    if (row.revision !== input.revision)
      throw fail("记忆已变化，请读回最新修订后再修改", 409);
    const title = input.title ?? row.title,
      content = input.content ?? row.content;
    const reason = input.reason;
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 150 ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 40000
    )
      throw fail("请填写有效的笔记标题和正文");
    if (typeof reason !== "string" || !reason.trim() || reason.length > 500)
      throw fail("请简短说明修改依据");
    if (input.anchor !== undefined && typeof input.anchor !== "boolean")
      throw fail("长期保留标记无效");
    const anchor =
      input.anchor === undefined ? row.anchor : Number(input.anchor);
    const created = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = db
        .prepare(
          "UPDATE records SET title=?,content=?,anchor=?,revision=revision+1 WHERE id=? AND revision=?",
        )
        .run(title.trim(), content.trim(), anchor, row.id, row.revision);
      if (!result.changes) throw fail("记忆已变化，请刷新后重试", 409);
      db.prepare("INSERT INTO audit(id,type,data,created) VALUES(?,?,?,?)").run(
        crypto.randomUUID(),
        "memory-update",
        JSON.stringify({
          id: row.id,
          reason: reason.trim(),
          actor: sessionId || "user",
          before: row,
          after: {
            title: title.trim(),
            content: content.trim(),
            anchor,
            revision: row.revision + 1,
          },
        }),
        created,
      );
      db.prepare("INSERT INTO outbox(id,record_id,created) VALUES(?,?,?)").run(
        crypto.randomUUID(),
        row.id,
        created,
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    this.store.flushProjection(characterId);
    return {
      id: row.id,
      title: title.trim(),
      content: content.trim(),
      revision: row.revision + 1,
      anchor,
      originalPreserved: true,
    };
  }
  status(characterId) {
    const db = this.db(characterId);
    return {
      archived: db
        .prepare(
          "SELECT r.id,r.title,r.kind,r.revision,a.reason,a.created FROM records r JOIN record_archive a ON r.id=a.record_id ORDER BY a.created DESC LIMIT 100",
        )
        .all(),
      counts: db
        .prepare(
          "SELECT count(*) AS total,(SELECT count(*) FROM record_archive) AS archived,(SELECT count(*) FROM links) AS links FROM records",
        )
        .get(),
      recent: db
        .prepare(
          "SELECT type,data,created FROM audit WHERE type IN ('memory-update','memory-archive','memory-restore','memory-import','memory-reindex') ORDER BY created DESC LIMIT 20",
        )
        .all(),
    };
  }
  archive(characterId, { id, revision, reason, restore = false }, sessionId) {
    const db = this.db(characterId),
      row = db.prepare("SELECT * FROM records WHERE id=?").get(id);
    if (!row) throw fail("记忆不存在", 404);
    if (sessionId && row.kind === "diary")
      throw fail("日记受保护，角色不能归档或恢复日记", 403);
    const access =
      sessionId && this.store.conversations.memoryAccess(sessionId);
    const scope =
      sessionId &&
      db
        .prepare(
          "SELECT visibility,session_id FROM record_visibility WHERE record_id=?",
        )
        .get(id);
    const canRestore =
      restore &&
      access &&
      (scope?.visibility === "shared" ||
        scope?.session_id === access.scopeSessionId ||
        (access.legacy &&
          (!scope ||
            (scope.visibility === "unclassified" && !scope.session_id))));
    if (
      sessionId &&
      !canRestore &&
      !this.store.conversations.visibleMemories(sessionId, { id, limit: 1 })[0]
    )
      throw fail("当前会话不可操作这段记忆", 404);
    if (row.revision !== revision) throw fail("记忆已变化，请刷新后重试", 409);
    if (typeof reason !== "string" || !reason.trim() || reason.length > 500)
      throw fail("请说明归档或恢复的理由");
    db.exec("BEGIN IMMEDIATE");
    try {
      if (restore)
        db.prepare("DELETE FROM record_archive WHERE record_id=?").run(id);
      else
        db.prepare(
          "INSERT INTO record_archive VALUES(?,?,?) ON CONFLICT(record_id) DO UPDATE SET reason=excluded.reason",
        ).run(id, reason.trim(), new Date().toISOString());
      db.prepare("UPDATE records SET revision=revision+1 WHERE id=?").run(id);
      db.prepare("INSERT INTO audit(id,type,data,created) VALUES(?,?,?,?)").run(
        crypto.randomUUID(),
        restore ? "memory-restore" : "memory-archive",
        JSON.stringify({ id, reason, actor: sessionId || "user", before: row }),
        new Date().toISOString(),
      );
      db.prepare("INSERT INTO outbox(id,record_id,created) VALUES(?,?,?)").run(
        crypto.randomUUID(),
        id,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    this.store.flushProjection(characterId);
    return {
      id,
      revision: revision + 1,
      status: restore ? "restored" : "archived",
      originalPreserved: true,
    };
  }
  reindex(characterId) {
    const db = this.db(characterId);
    db.exec(
      "INSERT INTO records_fts(records_fts) VALUES('rebuild'); INSERT INTO records_fts(records_fts) VALUES('integrity-check');",
    );
    db.prepare("INSERT INTO audit(id,type,data,created) VALUES(?,?,?,?)").run(
      crypto.randomUUID(),
      "memory-reindex",
      JSON.stringify({
        records: db.prepare("SELECT count(*) AS n FROM records").get().n,
      }),
      new Date().toISOString(),
    );
    return { status: "rebuilt", ...this.status(characterId).counts };
  }
  topics(characterId) {
    // 只提出可解释的同词关联，不把推测写成事实，也不覆盖显式关系。
    const rows = this.store.listMemory(characterId, { limit: 1000 });
    const tokens = (r) =>
      new Set(
        (
          r.title.toLowerCase().match(/[a-z0-9]{3,}|[\p{Script=Han}]{2,}/gu) ||
          []
        ).flatMap((t) =>
          /\p{Script=Han}/u.test(t)
            ? Array.from({ length: t.length - 1 }, (_, i) => t.slice(i, i + 2))
            : [t],
        ),
      );
    const index = new Map(),
      pairs = new Map();
    for (const row of rows)
      for (const token of tokens(row)) {
        const previous = index.get(token) || [];
        for (const other of previous.slice(-25)) {
          const key = [row.id, other.id].sort().join(":");
          const pair = pairs.get(key) || {
            source: other.id,
            target: row.id,
            sourceTitle: other.title,
            targetTitle: row.title,
            evidence: [],
          };
          pair.evidence.push(token);
          pairs.set(key, pair);
        }
        previous.push(row);
        index.set(token, previous);
      }
    return {
      scanned: rows.length,
      limited: rows.length === 1000,
      suggestions: [...pairs.values()]
        .filter((r) => r.evidence.length >= 2)
        .sort((a, b) => b.evidence.length - a.evidence.length)
        .slice(0, 50)
        .map((r) => ({
          ...r,
          kind: "semantic",
          weight: Math.min(0.9, 0.5 + r.evidence.length * 0.05),
        })),
    };
  }
  notes(characterId) {
    return this.store.notesRoot(characterId);
  }
  external(characterId, id) {
    const row = this.db(characterId)
      .prepare("SELECT * FROM records WHERE id=?")
      .get(id);
    if (!row) throw fail("记忆不存在", 404);
    const file = this.store.noteFile(characterId, row),
      stat = fs.lstatSync(file, { throwIfNoEntry: false });
    if (!stat || !stat.isFile() || stat.isSymbolicLink() || stat.size > 131072)
      throw fail("笔记不存在、过大或不是普通文件", 409);
    const raw = fs.readFileSync(file, "utf8"),
      fileHash = hash(raw);
    const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
    if (!front || !front[1].split(/\r?\n/).includes(`starr_id: ${row.id}`))
      throw fail("笔记编号与当前角色记录不一致", 409);
    const body = raw.slice(front[0].length).trim(),
      heading = /^# ([^\r\n]+)\r?\n+([\s\S]*)$/.exec(body);
    if (!heading) throw fail("笔记需要保留一级标题与正文", 409);
    const title = heading[1].trim(),
      content = heading[2].split(/\r?\n## 关联记忆\r?\n/)[0].trimEnd();
    if (
      !title ||
      title.length > 150 ||
      !content.trim() ||
      content.length > 40000
    )
      throw fail("外部笔记标题或正文超过允许范围", 409);
    const links = [...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)]
      .map((m) => this.store.noteIdFromLink(characterId, m[1]))
      .filter(
        (target) =>
          target !== id &&
          this.db(characterId)
            .prepare("SELECT 1 FROM records WHERE id=?")
            .get(target),
      );
    return {
      id,
      title,
      content,
      fileHash,
      revision: row.revision,
      changed: fileHash !== row.projection_hash,
      before: { title: row.title, content: row.content },
      links: [...new Set(links)],
      warning:
        "导入只更新此记录的标题、正文并补充本角色显式双链；不更改权限、来源、重要度或删除原有关联",
    };
  }
  conflicts(characterId) {
    const db = this.db(characterId),
      rows = db
        .prepare(
          "SELECT id FROM records WHERE id IN (SELECT record_id FROM outbox WHERE status='failed') LIMIT 100",
        )
        .all();
    return rows.map(({ id }) => {
      try {
        return this.external(characterId, id);
      } catch (e) {
        return { id, error: e.message };
      }
    });
  }
  importExternal(characterId, { id, revision, fileHash }) {
    const current = this.external(characterId, id);
    if (current.revision !== revision || current.fileHash !== fileHash)
      throw fail("数据库或外部笔记已变化，请重新预览", 409);
    if (!current.changed) return { status: "unchanged" };
    const db = this.db(characterId),
      created = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("INSERT INTO audit(id,type,data,created) VALUES(?,?,?,?)").run(
        crypto.randomUUID(),
        "memory-import",
        JSON.stringify(current),
        created,
      );
      db.prepare(
        "UPDATE records SET title=?,content=?,revision=revision+1,projection_hash=? WHERE id=?",
      ).run(current.title, current.content, fileHash, id);
      for (const target of current.links)
        db.prepare("INSERT OR IGNORE INTO links VALUES(?,?,'explicit',1)").run(
          id,
          target,
        );
      for (const target of [id, ...current.links])
        db.prepare(
          "INSERT INTO outbox(id,record_id,created) VALUES(?,?,?)",
        ).run(crypto.randomUUID(), target, created);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    this.store.flushProjection(characterId);
    return {
      status: "imported",
      id,
      revision: revision + 1,
      previousContentInAudit: true,
    };
  }
  resync(characterId) {
    const db = this.db(characterId),
      rows = db.prepare("SELECT id FROM records ORDER BY created").all();
    const pending = db.prepare(
      "INSERT INTO outbox(id,record_id,created) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM outbox WHERE record_id=? AND status IN ('pending','failed'))",
    );
    for (const row of rows)
      pending.run(
        crypto.randomUUID(),
        row.id,
        new Date().toISOString(),
        row.id,
      );
    this.store.flushProjection(characterId);
    return {
      queued: rows.length,
      ...this.status(characterId),
      conflicts: this.conflicts(characterId),
    };
  }
}
