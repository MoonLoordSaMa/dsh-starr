import crypto from "node:crypto";
import { fail } from "../starrcore/store.mjs";
const f = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  "chat-slang",
  help,
  extra,
];
export const slangFields = [
  f(
    "slang.enabled",
    "记住这段对话的用语",
    "boolean",
    false,
    "角色可以根据当前对象实际消息提交词义与例子；不同对话的私有用语不会互相泄露。",
  ),
  f(
    "slang.minEvidence",
    "形成解释至少需要的消息数",
    "number",
    2,
    "必须提供本会话已收到的不同消息编号，不能靠编造例子通过门槛。",
    { min: 1, max: 20, integer: true },
  ),
  f(
    "slang.cooldownMinutes",
    "同一用语重新学习间隔（分钟）",
    "number",
    60,
    "避免同一个词连续提交，后续可以根据新证据修正解释。",
    { min: 0, max: 10080, integer: true },
  ),
  f(
    "slang.minConfidence",
    "最低理解置信度",
    "number",
    70,
    "模型给出的置信度低于此值时保留为候选，不自动注入。",
    { min: 0, max: 100 },
  ),
  f(
    "slang.injectMax",
    "上下文最多带入用语数",
    "number",
    3,
    "按当前话题匹配，同样受 starr 总注入预算约束。",
    { min: 0, max: 20, integer: true },
  ),
  f(
    "slang.definitionChars",
    "每条解释字符上限",
    "number",
    300,
    "提交时检查长度，完整词条仍可用工具查询。",
    { min: 50, max: 1000, integer: true },
  ),
];
export class Slang {
  constructor(store) {
    this.store = store;
  }
  db(characterId) {
    const db = this.store.memory(characterId);
    db.exec(
      "CREATE TABLE IF NOT EXISTS slang(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,term TEXT NOT NULL,definition TEXT NOT NULL,confidence REAL NOT NULL,evidence TEXT NOT NULL,updated INTEGER NOT NULL,UNIQUE(session_id,term));",
    );
    return db;
  }
  query(sessionId, q = "") {
    const session = this.store.conversations.get(sessionId),
      c = this.store.character(session.character_id).config;
    if (!c["slang.enabled"]) return [];
    if (typeof q !== "string" || q.length > 4000) throw fail("用语查询过长");
    return this.db(session.character_id)
      .prepare(
        "SELECT * FROM slang WHERE session_id=? ORDER BY updated DESC LIMIT 300",
      )
      .all(sessionId)
      .filter(
        (row) =>
          !q ||
          q.toLowerCase().includes(row.term.toLowerCase()) ||
          `${row.term} ${row.definition}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      )
      .slice(0, 20);
  }
  submit(sessionId, { term, definition, confidence, evidence }) {
    const session = this.store.conversations.get(sessionId),
      c = this.store.character(session.character_id).config;
    if (!c["slang.enabled"]) throw fail("管理员未允许学习会话用语", 403);
    if (
      typeof term !== "string" ||
      !term.trim() ||
      term.length > 80 ||
      typeof definition !== "string" ||
      !definition.trim() ||
      definition.length > c["slang.definitionChars"]
    )
      throw fail("词语或解释长度不符合配置");
    if (
      typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 100
    )
      throw fail("理解置信度应为 0–100");
    if (
      !Array.isArray(evidence) ||
      new Set(evidence).size < c["slang.minEvidence"] ||
      evidence.length > 20 ||
      evidence.some((id) => typeof id !== "string")
    )
      throw fail("请提供足够的本会话真实消息编号");
    for (const messageId of new Set(evidence)) {
      const row =
        session.platform === "qq"
          ? this.store.db
              .prepare(
                "SELECT payload FROM qq_inbox WHERE thread_key IN (SELECT key FROM qq_threads WHERE session_id=?) AND json_extract(payload,'$.messageId')=?",
              )
              .get(sessionId, messageId)
          : session.platform === "bili"
            ? this.store.db
                .prepare(
                  "SELECT payload FROM bili_inbox WHERE session_id=? AND json_extract(payload,'$.messageId')=?",
                )
                .get(sessionId, messageId)
            : null;
      if (
        !row ||
        !String(JSON.parse(row.payload).text)
          .toLowerCase()
          .includes(term.toLowerCase())
      )
        throw fail("证据必须来自本会话且确实出现过该词", 403);
    }
    const db = this.db(session.character_id),
      old = db
        .prepare("SELECT * FROM slang WHERE session_id=? AND term=?")
        .get(sessionId, term.trim());
    if (old && Date.now() - old.updated < c["slang.cooldownMinutes"] * 60000)
      throw fail("该用语仍在学习冷却中", 409);
    db.prepare(
      "INSERT INTO slang VALUES(?,?,?,?,?,?,?) ON CONFLICT(session_id,term) DO UPDATE SET definition=excluded.definition,confidence=excluded.confidence,evidence=excluded.evidence,updated=excluded.updated",
    ).run(
      old?.id || crypto.randomUUID(),
      sessionId,
      term.trim(),
      definition.trim(),
      confidence,
      JSON.stringify([...new Set(evidence)]),
      Date.now(),
    );
    return {
      term: term.trim(),
      status: confidence >= c["slang.minConfidence"] ? "learned" : "candidate",
    };
  }
}
