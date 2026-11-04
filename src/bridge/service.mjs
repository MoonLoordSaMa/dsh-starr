import crypto from "node:crypto";
import { fail, hash } from "../starrcore/store.mjs";
import { RuntimeLease } from "../runtime/lease.mjs";

const f = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  "bridge",
  help,
  extra,
];
export const bridgeFields = [
  f(
    "bridge.enabled",
    "启用 B站 → QQ 星桥",
    "boolean",
    false,
    "只发送公开视频资料或当前登录账号的公开动态，默认关闭。收件目标还必须在 QQ 接入允许名单中。",
  ),
  f(
    "bridge.targets",
    "明确授权的 QQ 目标",
    "text",
    "",
    "逗号分隔，例如 group:123456、private:123456；最多 10 个。不从角色记忆或模型输出推断目标。",
  ),
  f(
    "bridge.videos",
    "定时分享已读视频",
    "boolean",
    false,
    "从本角色已完成的 B站资料阅读中选择真实视频，不把私密日记转发出去。",
  ),
  f(
    "bridge.times",
    "视频分享时间",
    "text",
    "12:00,20:00",
    "按角色时区，在时间点后十分钟内最多执行一次；不会补发关机期间的历史分享。",
  ),
  f(
    "bridge.dynamics",
    "同步本账号新动态",
    "boolean",
    false,
    "只同步启用后发现的近一天公开动态；首次检查只建立水位，避免把旧动态刷到 QQ。",
  ),
  f(
    "bridge.pollSeconds",
    "动态检查间隔（秒）",
    "number",
    300,
    "失败保留原因，重启不会重复发送结果待核对的记录。",
    { min: 60, max: 3600, integer: true },
  ),
  f(
    "bridge.dailyMax",
    "近24小时外发总额度",
    "number",
    6,
    "所有目标合计，尝试也占用额度，不因网络失败无限重试。",
    { min: 1, max: 100, integer: true },
  ),
  f(
    "bridge.minGapSeconds",
    "两次星桥发送最小间隔（秒）",
    "number",
    60,
    "一次只向一个目标发送；其他目标等待后续检查。",
    { min: 10, max: 86400, integer: true },
  ),
];
const targets = (value) =>
  String(value || "")
    .split(/[,，\s]+/)
    .filter(Boolean);
export class PlatformBridge {
  constructor(store, { qq, bili, clock = Date.now } = {}) {
    this.store = store;
    this.qq = qq;
    this.bili = bili;
    this.clock = clock;
    this.active = false;
    this.closed = false;
    this.suspended = false;
    this.abort = new AbortController();
    this.lease = new RuntimeLease(store.dataRoot, "platform-bridge");
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS bridge_log(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,kind TEXT NOT NULL,item_id TEXT NOT NULL,target TEXT NOT NULL,status TEXT NOT NULL,message_id TEXT,error TEXT,created INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS bridge_watermarks(character_id TEXT PRIMARY KEY,last_poll INTEGER NOT NULL,initialized INTEGER NOT NULL);",
    );
  }
  status(characterId) {
    this.store.character(characterId);
    return {
      hostReady: !!(this.qq && this.bili),
      active: this.active,
      recent: this.store.db
        .prepare(
          "SELECT * FROM bridge_log WHERE character_id=? ORDER BY created DESC LIMIT 40",
        )
        .all(characterId),
      watermark:
        this.store.db
          .prepare("SELECT * FROM bridge_watermarks WHERE character_id=?")
          .get(characterId) || null,
    };
  }
  async diagnose(characterId) {
    const character = this.store.character(characterId),
      settings = this.qq?.settings().config;
    const database = this.store.memory(characterId);
    const shared = database
      .prepare(
        "SELECT count(*) n FROM records r JOIN record_visibility v ON v.record_id=r.id WHERE v.visibility='shared' AND NOT EXISTS(SELECT 1 FROM record_archive a WHERE a.record_id=r.id)",
      )
      .get().n;
    const memory = {
      database: database.prepare("PRAGMA quick_check").get().quick_check,
      shared,
      sessions: this.store.conversations.list(characterId).map((s) => ({
        platform: s.platform,
        type: s.type,
        paused: !!s.paused,
      })),
    };
    const qq =
      settings?.characterId === characterId
        ? await this.qq.check()
        : { status: "unconfigured", detail: "QQ尚未绑定同一角色" };
    const bili = this.bili
      ? await this.bili.check(characterId)
      : { status: "unavailable" };
    const destinations = [];
    for (const target of targets(character.config["bridge.targets"])) {
      try {
        this.authorize(characterId, target);
        destinations.push({ target, authorized: true });
      } catch (e) {
        destinations.push({ target, authorized: false, detail: e.message });
      }
    }
    return {
      checkedAt: new Date().toISOString(),
      qq,
      bili,
      memory,
      destinations,
      outboundVerified: false,
      detail:
        "已分别检查登录、角色绑定、记忆库与目标授权；未发送真实平台消息。共享记忆可由本角色QQ和B站会话检索，私密记忆仍受来源会话约束。",
    };
  }
  start() {
    if (this.closed) return;
    this.suspended = false;
    if (this.abort.signal.aborted) this.abort = new AbortController();
    if (this.timer || !this.lease.acquire()) return;
    this.store.db.exec(
      "UPDATE bridge_log SET status='uncertain',error='宿主在取得回执前退出，等待人工核对' WHERE status='sending'",
    );
    this.timer = setInterval(() => this.tick().catch(() => {}), 30000);
    this.timer.unref?.();
  }
  async tick(onlyCharacter) {
    if (this.closed || this.suspended || this.active || !this.qq || !this.bili)
      return;
    if (!this.lease.acquire()) throw fail("星桥已由另一个宿主管理", 409);
    this.active = true;
    try {
      for (const character of onlyCharacter
        ? [this.store.character(onlyCharacter)]
        : this.store.listCharacters()) {
        const c = this.store.character(character.id).config;
        if (!c["bridge.enabled"]) continue;
        try {
          await this.process(character.id, c);
        } catch (e) {
          if (this.closed || this.suspended || this.store.closed) throw e;
          const id = `check:${character.id}:${Math.floor(this.clock() / 300000)}`;
          this.store.db
            .prepare(
              "INSERT OR IGNORE INTO bridge_log VALUES(?,?,?,'','', 'failed',NULL,?,?)",
            )
            .run(id, character.id, "check", e.message, this.clock());
          if (onlyCharacter) throw e;
        }
      }
    } finally {
      this.active = false;
    }
    return onlyCharacter ? this.status(onlyCharacter) : undefined;
  }
  async process(characterId, c) {
    const settings = this.qq.settings().config;
    if (!settings.enabled || settings.characterId !== characterId)
      throw fail("请先在 QQ 接入启用同一角色", 409);
    const destinations = targets(c["bridge.targets"]);
    if (!destinations.length) throw fail("请明确设置星桥收件目标", 409);
    for (const target of destinations) this.authorize(characterId, target);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: c["agency.timezone"],
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(this.clock())
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value]),
    );
    const minute = Number(parts.hour) * 60 + Number(parts.minute),
      date = `${parts.year}-${parts.month}-${parts.day}`;
    if (c["bridge.videos"]) {
      const at = targets(c["bridge.times"]).find((time) => {
        const [h, m] = time.split(":").map(Number);
        return minute >= h * 60 + m && minute < h * 60 + m + 10;
      });
      if (at) {
        const rows = this.store.db
          .prepare(
            "SELECT data FROM bili_activities WHERE character_id=? AND kind='watch' AND status='done' AND created>? ORDER BY created DESC LIMIT 10",
          )
          .all(characterId, this.clock() - 86400000);
        let video;
        for (const row of rows) {
          try {
            const candidate = JSON.parse(row.data).videos?.find((v) =>
              /^BV[A-Za-z0-9]{10}$/.test(typeof v === "string" ? v : v.bvid),
            );
            if (candidate)
              video =
                typeof candidate === "string" ? { bvid: candidate } : candidate;
          } catch {}
          if (video) break;
        }
        if (video)
          for (const destination of destinations) {
            const result = await this.deliver(
              characterId,
              "video",
              `${date}:${at}`,
              destination,
              `${String(video.title || "今日拾趣").slice(0, 150)}\nhttps://www.bilibili.com/video/${video.bvid}`,
            );
            if (result.status === "sent") return;
          }
      }
    }
    if (!c["bridge.dynamics"]) return;
    const row = this.store.db
      .prepare("SELECT * FROM bridge_watermarks WHERE character_id=?")
      .get(characterId);
    if (row && this.clock() - row.last_poll < c["bridge.pollSeconds"] * 1000)
      return;
    const { client, account } = await this.bili.connect(characterId);
    const feed = await client.feed(account.selfId);
    if (this.closed || this.suspended) return;
    if (!row) {
      for (const item of feed)
        for (const destination of destinations)
          this.recordBaseline(characterId, item.id, destination);
      this.store.db
        .prepare("INSERT INTO bridge_watermarks VALUES(?,?,1)")
        .run(characterId, this.clock());
      return;
    }
    this.store.db
      .prepare("UPDATE bridge_watermarks SET last_poll=? WHERE character_id=?")
      .run(this.clock(), characterId);
    for (const item of feed.slice().reverse()) {
      if (
        item.time * 1000 < this.clock() - 86400000 ||
        item.author !== account.selfId
      )
        continue;
      for (const destination of destinations) {
        const result = await this.deliver(
          characterId,
          "dynamic",
          item.id,
          destination,
          `${item.text.slice(0, 500)}\nhttps://t.bilibili.com/${item.id}`,
        );
        if (result.status === "sent") return;
      }
    }
  }
  authorize(characterId, destination) {
    const [type, target] = String(destination).split(":"),
      settings = this.qq.settings().config,
      c = this.store.character(characterId).config;
    if (
      c["agency.paused"] ||
      !c["bridge.enabled"] ||
      !targets(c["bridge.targets"]).includes(destination) ||
      !["group", "private"].includes(type) ||
      !/^[1-9]\d{4,19}$/.test(target || "") ||
      !settings.enabled ||
      settings.characterId !== characterId ||
      !targets(
        type === "group" ? settings.groups : settings.privateUsers,
      ).includes(target)
    )
      throw fail("星桥目标没有同时获得平台与角色授权", 403);
    if (
      targets(c["chat.access.deniedGroups"]).includes(
        type === "group" ? target : "",
      ) ||
      targets(c["chat.access.deniedUsers"]).includes(
        type === "private" ? target : "",
      )
    )
      throw fail("该目标已被拒收规则拦截", 403);
    return { type, target, settings };
  }
  recordBaseline(characterId, itemId, destination) {
    const id = hash(`${characterId}:dynamic:${itemId}:${destination}`);
    this.store.db
      .prepare(
        "INSERT OR IGNORE INTO bridge_log VALUES(?,?,?, ?,?,'baseline',NULL,NULL,?)",
      )
      .run(id, characterId, "dynamic", itemId, destination, this.clock());
  }
  async deliver(characterId, kind, itemId, destination, text) {
    const { type, target, settings } = this.authorize(characterId, destination),
      c = this.store.character(characterId).config,
      db = this.store.db,
      id = hash(`${characterId}:${kind}:${itemId}:${destination}`);
    const old = db.prepare("SELECT status FROM bridge_log WHERE id=?").get(id);
    if (old) return old;
    const rows = db
      .prepare(
        "SELECT created FROM bridge_log WHERE character_id=? AND status<>'baseline' AND kind<>'check' AND created>? ORDER BY created DESC",
      )
      .all(characterId, this.clock() - 86400000);
    if (
      rows.length >= c["bridge.dailyMax"] ||
      (rows[0] &&
        this.clock() - rows[0].created < c["bridge.minGapSeconds"] * 1000)
    )
      return { status: "waiting" };
    if (this.closed) throw fail("星桥已关闭", 409);
    const token = await this.qq.secrets.read(settings.tokenEnv);
    if (this.closed || this.suspended || this.store.closed)
      throw fail("星桥已经停止", 409);
    const latest = this.authorize(characterId, destination);
    if (JSON.stringify(latest.settings) !== JSON.stringify(settings))
      throw fail("QQ 连接已变化，请重新检查星桥", 409);
    db.prepare(
      "INSERT INTO bridge_log VALUES(?,?,?,?,?,'sending',NULL,NULL,?)",
    ).run(id, characterId, kind, itemId, destination, this.clock());
    try {
      const result = await this.qq.action(
        { ...settings, token, signal: this.abort.signal },
        type === "group" ? "send_group_msg" : "send_private_msg",
        {
          [type === "group" ? "group_id" : "user_id"]: target,
          message: [{ type: "text", data: { text } }],
        },
      );
      if (!result?.message_id)
        throw Object.assign(fail("QQ 未返回消息编号，星桥结果待核对", 502), {
          uncertain: true,
        });
      if (!this.closed)
        db.prepare(
          "UPDATE bridge_log SET status='sent',message_id=? WHERE id=?",
        ).run(String(result.message_id), id);
      return { status: "sent", messageId: String(result.message_id) };
    } catch (e) {
      if (!this.closed)
        db.prepare("UPDATE bridge_log SET status=?,error=? WHERE id=?").run(
          e.uncertain ? "uncertain" : "failed",
          e.message,
          id,
        );
      throw e;
    }
  }
  stop() {
    this.suspended = true;
    this.abort.abort();
    clearInterval(this.timer);
    this.timer = null;
    if (this.lease.owned && !this.store.closed)
      this.store.db.exec(
        "UPDATE bridge_log SET status='uncertain' WHERE status='sending'",
      );
    this.lease.release();
  }
  close() {
    this.closed = true;
    this.stop();
  }
}
