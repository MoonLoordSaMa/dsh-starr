import { fail, hash } from "../starrcore/store.mjs";
export const autonomyFields = [
  ...[
    ["comment", "允许角色主动评论视频"],
    ["dm", "允许角色主动私信已联系对象"],
    ["dynamic", "允许角色随对话发布文字动态"],
  ].map(([kind, label]) => [
    `bili.autonomy.${kind}`,
    label,
    "boolean",
    false,
    "bili-actions",
    kind === "dm"
      ? "仅管理员白名单内且已向本账号发来私信的用户；不能向陌生人群发。"
      : "独立于监听回复和定时活动开关；默认关闭，启用后按实际回执审计。",
    {},
  ]),
];
export class BiliAutonomy {
  constructor(service) {
    this.service = service;
    this.store = service.store;
    this.store.db.exec(
      "CREATE TABLE IF NOT EXISTS bili_autonomy_log(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,session_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,created INTEGER NOT NULL)",
    );
  }
  async execute(characterId, sessionId, { kind, text, bvid, target }, signal) {
    if (!["comment", "dm", "dynamic"].includes(kind))
      throw fail("不支持的B站主动操作");
    const session = this.store.conversations.get(sessionId);
    if (session.character_id !== characterId || session.paused)
      throw fail("会话未授权或已暂停", 403);
    const check = () => {
      signal?.throwIfAborted();
      const c = this.store.character(characterId).config;
      if (
        !c["bili.enabled"] ||
        !c[`bili.autonomy.${kind}`] ||
        this.store.conversations.get(sessionId).paused
      )
        throw fail("管理员未授权此B站主动操作", 403);
      const runtime = this.store.db
        .prepare("SELECT cooldown_until FROM bili_runtime WHERE character_id=?")
        .get(characterId);
      if (runtime?.cooldown_until > this.service.clock())
        throw fail("B站平台风险冷却尚未结束", 429);
      return c;
    };
    let c = check();
    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > Math.min(2000, c["bili.maxReplyChars"])
    )
      throw fail("正文为空或超过当前发言上限");
    const { client, account } = await this.service.connect(characterId, signal);
    let message;
    if (kind === "dm") {
      if (
        !String(c["bili.allowedUsers"])
          .split(/[,，\s]+/)
          .includes(target)
      )
        throw fail("私信对象未被管理员允许", 403);
      const row = this.store.db
        .prepare(
          "SELECT payload,session_id FROM bili_inbox WHERE character_id=? AND account=? AND json_extract(payload,'$.type')='dm' AND json_extract(payload,'$.userId')=? ORDER BY created DESC LIMIT 1",
        )
        .get(characterId, account.selfId, target);
      if (!row || this.store.conversations.get(row.session_id).paused)
        throw fail("该对象尚未联系本账号，或其会话已暂停", 403);
      message = JSON.parse(row.payload);
    } else if (kind === "comment") {
      const video = await client.video(bvid, signal);
      if (!/^\d+$/.test(video.aid)) throw fail("视频未返回真实稿件编号", 502);
      message = {
        type: "comment",
        userId: account.selfId,
        target: video.aid,
        comment: { oid: video.aid, type: "1", root: "0", parent: "0" },
      };
    }
    c = check();
    const db = this.store.db,
      now = this.service.clock(),
      id = hash(
        `${characterId}:${kind}:${bvid || target || ""}:${text}:${Math.floor(now / 86400000)}`,
      );
    const latest = db
      .prepare(
        "SELECT created FROM bili_sends WHERE character_id=? ORDER BY created DESC LIMIT 1",
      )
      .get(characterId);
    if (latest && now - latest.created < c["bili.globalGapSeconds"] * 1000)
      throw fail("B站发言间隔尚未释放", 429);
    if (
      db
        .prepare(
          "SELECT count(*) n FROM bili_sends WHERE character_id=? AND created>?",
        )
        .get(characterId, now - 86400000).n >= c["bili.dailyReplies"]
    )
      throw fail("B站发言额度已用尽", 429);
    if (db.prepare("SELECT 1 FROM bili_autonomy_log WHERE id=?").get(id))
      throw fail("相同内容今天已提交或待核对，不重复发送", 409);
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "INSERT INTO bili_autonomy_log VALUES(?,?,?,?,'sending',?,?)",
      ).run(
        id,
        characterId,
        sessionId,
        kind,
        JSON.stringify({ text, bvid, target }),
        now,
      );
      db.prepare(
        "INSERT INTO bili_sends VALUES(?,?,?,?,?,'sending',NULL,?)",
      ).run(
        id,
        characterId,
        sessionId,
        message?.userId || account.selfId,
        message?.target || "dynamic",
        now,
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    try {
      check();
      const result =
        kind === "dynamic"
          ? await client.publish(text, signal)
          : await client.send(account.selfId, message, text, signal);
      if (!result?.messageId)
        throw Object.assign(fail("平台没有返回内容编号，请人工核对", 502), {
          uncertain: true,
        });
      db.prepare("UPDATE bili_autonomy_log SET status=? WHERE id=?").run(
        result.status,
        id,
      );
      db.prepare("UPDATE bili_sends SET status=?,message_id=? WHERE id=?").run(
        result.status,
        result.messageId,
        id,
      );
      return {
        ...result,
        deliveryVerified: false,
        detail: "已取得平台内容编号；页面可见性仍受平台审核与权限影响",
      };
    } catch (e) {
      if (!this.store.closed) {
        const status = e.uncertain || signal?.aborted ? "uncertain" : "failed";
        db.prepare("UPDATE bili_autonomy_log SET status=? WHERE id=?").run(
          status,
          id,
        );
        db.prepare("UPDATE bili_sends SET status=? WHERE id=?").run(status, id);
        if (e.risk)
          db.prepare(
            "UPDATE bili_runtime SET cooldown_until=? WHERE character_id=?",
          ).run(now + c["bili.riskCooldownMinutes"] * 60000, characterId);
      }
      throw e;
    }
  }
}
