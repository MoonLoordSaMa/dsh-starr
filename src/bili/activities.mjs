import crypto from "node:crypto";
import { fail } from "../starrcore/store.mjs";
import { mediaServices } from "../runtime/media-services.mjs";
const f = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  key.startsWith("bili.watch.")
    ? "bili-watch"
    : key.startsWith("bili.preferences.")
      ? "bili-preferences"
      : key.startsWith("bili.share.")
        ? "bili-share"
        : Object.keys(dynamicKinds).some((kind) =>
              key.startsWith(`bili.dynamics.${kind}.`),
            )
          ? `bili-dynamic-${key.split(".")[2]}`
          : "bili-dynamics",
  help,
  extra,
];
export const dynamicKinds = {
  best: "晨间精选",
  game: "午间游戏",
  anime: "午后二次元",
  gaming: "晚间随记",
};
export const activityFields = [
  f(
    "bili.watch.visual",
    "定时浏览时读取视频关键帧",
    "boolean",
    false,
    "开启后使用已配置的视觉模型分析视频前30秒内片段，可能产生模型费用；关闭则只阅读资料与字幕。",
  ),
  f(
    "bili.watch.enabled",
    "定时浏览与记录",
    "boolean",
    false,
    "在设定窗口取热门视频资料，由模型阅读标题、简介与可用字幕并记录。未读取画面时不会声称已完整观看。",
  ),
  f(
    "bili.watch.windows",
    "浏览时间窗口",
    "text",
    "20:00-23:00",
    "多个窗口以逗号分隔，按角色时区，支持跨午夜。",
  ),
  f(
    "bili.watch.dailyMax",
    "近24小时最多浏览轮数",
    "number",
    2,
    "按模型实际启动轮次计数。",
    { min: 1, max: 24, integer: true },
  ),
  f(
    "bili.watch.gapMinutes",
    "两轮最少间隔（分钟）",
    "number",
    180,
    "不会每个监听周期都唤起模型。",
    { min: 5, max: 1440, integer: true },
  ),
  f(
    "bili.watch.skipChance",
    "跳过本次窗口的概率",
    "number",
    0.2,
    "每个最短间隔只判断一次，跳过后保留决定。",
    { min: 0, max: 1 },
  ),
  f(
    "bili.watch.candidates",
    "本轮候选最多条数",
    "number",
    8,
    "先用兴趣排序，模型再选择阅读；最多 20 条。",
    { min: 1, max: 20, integer: true },
  ),
  f(
    "bili.preferences.like",
    "喜欢的主题",
    "text",
    "",
    "逗号或换行分隔，用于候选排序与阅读指引。",
    { bot: true },
  ),
  f(
    "bili.preferences.dislike",
    "不喜欢的主题",
    "text",
    "",
    "包含这些词的候选会降低排序。",
    { bot: true },
  ),
  f(
    "bili.preferences.keywords",
    "额外兴趣关键词",
    "text",
    "",
    "用于标题与简介匹配。",
    { bot: true },
  ),
  f(
    "bili.preferences.likeWeight",
    "喜好匹配权重",
    "number",
    3,
    "标题和简介中匹配每个喜好词增加的排序权重。",
    { min: 0, max: 10 },
  ),
  f(
    "bili.preferences.dislikeWeight",
    "避开主题权重",
    "number",
    5,
    "匹配不喜欢的主题时扣除的排序权重。",
    { min: 0, max: 10 },
  ),
  f(
    "bili.share.enabled",
    "允许从浏览中分享视频",
    "boolean",
    false,
    "模型只能把本轮确实读过的视频发给一个指定用户；共用平台回复额度。",
  ),
  f(
    "bili.share.target",
    "分享接收者 mid",
    "text",
    "",
    "必须同时存在于 B站允许互动的用户列表；仅在对方已发来过私信后分享。",
  ),
  f(
    "bili.share.dailyMax",
    "近24小时分享上限",
    "number",
    3,
    "与回复额度分别计数，同一视频七天内不重复分享。",
    { min: 1, max: 30, integer: true },
  ),
  f(
    "bili.share.minScore",
    "分享最低评分",
    "number",
    75,
    "模型需给出 0–100 的评分与具体理由，低于阈值拒绝分享。",
    { min: 0, max: 100 },
  ),
  f(
    "bili.dynamics.enabled",
    "定时动态总开关",
    "boolean",
    false,
    "分别开启各类时段后，模型依据可用资料撰写并调用发布工具；未调用不假报成功。",
  ),
  f(
    "bili.dynamics.gapMinutes",
    "任意动态最短间隔（分钟）",
    "number",
    180,
    "所有类型共用此间隔，外发结果不明也计入。",
    { min: 1, max: 1440, integer: true },
  ),
  ...Object.entries(dynamicKinds).flatMap(([kind, label], index) => [
    f(
      `bili.dynamics.${kind}.enabled`,
      `${label} · 开启`,
      "boolean",
      false,
      "每个本地日期最多尝试一次；失败或结果不明不自动重新发布。",
    ),
    f(
      `bili.dynamics.${kind}.at`,
      `${label} · 发布时间`,
      "time",
      ["08:00", "12:00", "16:00", "21:00"][index],
      "按角色作息时区，到点后 60 分钟内可补跑。",
    ),
    f(
      `bili.dynamics.${kind}.minChars`,
      `${label} · 最少字数`,
      "number",
      20,
      "发送前检查，不够则明确拒绝。",
      { min: 1, max: 1000, integer: true },
    ),
    f(
      `bili.dynamics.${kind}.maxChars`,
      `${label} · 最多字数`,
      "number",
      500,
      "包含前缀；不会截断后强行发送。",
      { min: 1, max: 2000, integer: true },
    ),
    f(
      `bili.dynamics.${kind}.prefix`,
      `${label} · 固定前缀`,
      "text",
      "",
      "可留空，发送时由服务附加，不依赖模型记住。",
    ),
  ]),
];
const words = (value) =>
  String(value || "")
    .split(/[,，\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
export function inWindow(windows, time) {
  const current = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return String(windows)
    .split(/[,，\s]+/)
    .some((window) => {
      const [a, b] = window.split("-");
      if (!/^\d{2}:\d{2}$/.test(a || "") || !/^\d{2}:\d{2}$/.test(b || ""))
        return false;
      const start = Number(a.slice(0, 2)) * 60 + Number(a.slice(3)),
        end = Number(b.slice(0, 2)) * 60 + Number(b.slice(3));
      return start <= end
        ? current >= start && current <= end
        : current >= start || current <= end;
    });
}
export class BiliActivities {
  constructor(service) {
    this.service = service;
    this.store = service.store;
    this.store.db.exec(
      "CREATE TABLE IF NOT EXISTS bili_activities(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,kind TEXT NOT NULL,slot TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,created INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS bili_shares(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,bvid TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL);",
    );
  }
  list(characterId) {
    return this.store.db
      .prepare(
        "SELECT * FROM bili_activities WHERE character_id=? ORDER BY created DESC LIMIT 30",
      )
      .all(characterId);
  }
  async tick(characterId, client, account, signal) {
    const driver = this.service.activityDriver;
    if (!driver) return;
    const c = this.store.character(characterId).config,
      now = this.service.clock(),
      parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: c["agency.timezone"],
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(now)
          .filter((p) => p.type !== "literal")
          .map((p) => [p.type, p.value]),
      ),
      date = `${parts.year}-${parts.month}-${parts.day}`,
      time = `${parts.hour}:${parts.minute}`;
    if (c["agency.paused"]) return;
    if (c["bili.watch.enabled"] && inWindow(c["bili.watch.windows"], time)) {
      const rows = this.store.db
        .prepare(
          "SELECT * FROM bili_activities WHERE character_id=? AND kind='watch' AND created>? ORDER BY created DESC",
        )
        .all(characterId, now - 86400000);
      if (
        rows.filter((r) => r.status !== "skipped").length <
          c["bili.watch.dailyMax"] &&
        (!rows.length ||
          now - rows[0].created >= c["bili.watch.gapMinutes"] * 60000)
      )
        await this.run(
          characterId,
          "watch",
          `${date}:${time}`,
          client,
          account,
          signal,
        );
    }
    for (const kind of Object.keys(dynamicKinds)) {
      if (!c["bili.dynamics.enabled"] || !c[`bili.dynamics.${kind}.enabled`])
        continue;
      const at = c[`bili.dynamics.${kind}.at`],
        difference =
          Number(parts.hour) * 60 +
          Number(parts.minute) -
          Number(at.slice(0, 2)) * 60 -
          Number(at.slice(3));
      if (difference < 0 || difference > 60) continue;
      if (
        !this.store.db
          .prepare(
            "SELECT id FROM bili_activities WHERE character_id=? AND kind=? AND slot=?",
          )
          .get(characterId, kind, date)
      )
        await this.run(characterId, kind, date, client, account, signal);
    }
  }
  async run(characterId, kind, slot, client, account, signal) {
    signal = AbortSignal.any([signal, AbortSignal.timeout(180000)]);
    const c = this.store.character(characterId).config,
      db = this.store.db,
      id = crypto.randomUUID(),
      now = this.service.clock();
    db.prepare(
      "INSERT INTO bili_activities VALUES(?,?,?,?,'running','{}',?)",
    ).run(id, characterId, kind, slot, now);
    if (kind === "watch" && Math.random() < c["bili.watch.skipChance"]) {
      db.prepare("UPDATE bili_activities SET status='skipped' WHERE id=?").run(
        id,
      );
      return;
    }
    const sessionId = `session-starr-bili-activity-${id}`,
      material = [];
    let completed = false;
    this.store.conversations.ensure({
      sessionId,
      characterId,
      platform: "bili",
      type: kind === "watch" ? "watch" : "dynamic",
      account: account.selfId,
      target: `${kind}:${slot}`,
    });
    const check = () => {
      signal.throwIfAborted();
      const current = this.store.character(characterId).config;
      if (
        current["agency.paused"] ||
        !current["bili.enabled"] ||
        (kind === "watch" && !current["bili.watch.enabled"]) ||
        (kind !== "watch" &&
          (!current["bili.dynamics.enabled"] ||
            !current[`bili.dynamics.${kind}.enabled`]))
      )
        throw fail("管理员已停用该活动", 403);
      return current;
    };
    try {
      let candidates = [];
      if (kind === "watch") {
        const score = (v) => {
          const text = `${v.title} ${v.description}`.toLowerCase();
          return (
            [
              ...words(c["bili.preferences.like"]),
              ...words(c["bili.preferences.keywords"]),
            ].reduce(
              (n, w) =>
                n + (text.includes(w) ? c["bili.preferences.likeWeight"] : 0),
              0,
            ) -
            words(c["bili.preferences.dislike"]).reduce(
              (n, w) =>
                n +
                (text.includes(w) ? c["bili.preferences.dislikeWeight"] : 0),
              0,
            )
          );
        };
        candidates = (await client.candidates(signal))
          .sort((a, b) => score(b) - score(a))
          .slice(0, c["bili.watch.candidates"]);
      }
      await this.service.activityDriver.run({
        characterId,
        sessionId,
        kind,
        slot,
        candidates,
        preferences: {
          like: c["bili.preferences.like"],
          dislike: c["bili.preferences.dislike"],
        },
        provider: c["bili.provider"],
        model: c["bili.model"],
        signal,
        read: async ({ bvid }) => {
          check();
          if (!candidates.some((v) => v.bvid === bvid))
            throw fail("只能阅读本轮候选视频", 403);
          if (material.length >= 3 && !material.some((v) => v.bvid === bvid))
            throw fail("本轮最多细读三个视频");
          const video = await client.video(bvid, signal);
          if (check()["bili.watch.visual"]) {
            const runtime = mediaServices(this.store);
            if (!runtime.vision) throw fail("视频画面采集服务尚未接入", 409);
            video.visual = await this.service.watch(
              characterId,
              {
                bvid,
                seconds: 30,
                prompt:
                  "描述所见画面，供角色形成真实的观看感受；区分画面事实与个人解读",
              },
              runtime,
              signal,
            );
            video.visualVerified = video.visual.visualVerified;
            video.note =
              "已分析所列时间的关键帧；字幕与画面分别记录，不代表完整观看";
          }
          check();
          material.push(video);
          return video;
        },
        finish: ({ title, content, score = 0 }) => {
          check();
          if (completed) throw fail("本轮已记录", 409);
          if (kind !== "watch") throw fail("动态活动应发布或明确跳过");
          if (!material.length) throw fail("请先读取本轮真实视频资料");
          if (typeof score !== "number" || score < 0 || score > 100)
            throw fail("评分应为 0–100");
          const record = this.store.saveMemory(
            characterId,
            {
              title,
              content,
              kind: "interest",
              importance: Math.min(80, score),
              source: material.some((v) => v.visualVerified)
                ? "B站视频关键帧与资料阅读（部分片段）"
                : "B站资料阅读（标题、简介与可用字幕）",
              eventKey: `activity:${id}`,
            },
            { sessionId, visibility: "conversation" },
          );
          completed = true;
          return { recordId: record.id };
        },
        share: async ({ bvid, text, score }) => {
          const current = check();
          if (
            !current["bili.share.enabled"] ||
            !material.some((v) => v.bvid === bvid)
          )
            throw fail("分享未开启或未读取该视频", 403);
          if (
            typeof score !== "number" ||
            score < current["bili.share.minScore"] ||
            score > 100
          )
            throw fail("评分未达到分享阈值");
          const target = current["bili.share.target"],
            incoming = db
              .prepare(
                "SELECT * FROM bili_inbox WHERE character_id=? AND account=? AND json_extract(payload,'$.type')='dm' AND json_extract(payload,'$.userId')=? ORDER BY created DESC LIMIT 1",
              )
              .get(characterId, account.selfId, target);
          if (!incoming) throw fail("分享对象尚未向该账号发来私信", 403);
          if (
            db
              .prepare(
                "SELECT id FROM bili_shares WHERE character_id=? AND bvid=? AND created>?",
              )
              .get(characterId, bvid, now - 7 * 86400000)
          )
            throw fail("同一视频七天内已经分享或待核对", 409);
          if (
            db
              .prepare(
                "SELECT count(*) n FROM bili_shares WHERE character_id=? AND created>?",
              )
              .get(characterId, now - 86400000).n >=
            current["bili.share.dailyMax"]
          )
            throw fail("分享额度已用尽", 429);
          const message = JSON.parse(incoming.payload),
            session = this.store.conversations.get(incoming.session_id);
          if (
            !this.service.allowed(current, message) ||
            this.service.limit(characterId, session, message, current) ||
            session.paused
          )
            throw fail("当前分享对象未授权或仍在冷却", 403);
          if (
            typeof text !== "string" ||
            !text.trim() ||
            text.length > current["bili.maxReplyChars"] - 100
          )
            throw fail("分享短评过长或为空");
          const shareId = crypto.randomUUID();
          db.prepare("INSERT INTO bili_shares VALUES(?,?,?,'sending',?)").run(
            shareId,
            characterId,
            bvid,
            now,
          );
          db.prepare(
            "INSERT INTO bili_sends VALUES(?,?,?,?,?,'sending',NULL,?)",
          ).run(
            shareId,
            characterId,
            session.session_id,
            message.userId,
            message.target,
            now,
          );
          try {
            const result = await client.send(
              account.selfId,
              message,
              `${text}\nhttps://www.bilibili.com/video/${bvid}`,
              signal,
            );
            signal.throwIfAborted();
            if (this.service.closed) throw fail("B站活动服务已停止", 409);
            if (result?.status !== "sent" || !result.messageId)
              throw Object.assign(fail("视频分享没有取得明确消息编号", 502), {
                uncertain: true,
              });
            db.prepare("UPDATE bili_shares SET status=? WHERE id=?").run(
              result.status,
              shareId,
            );
            db.prepare(
              "UPDATE bili_sends SET status=?,message_id=? WHERE id=?",
            ).run(result.status, result.messageId, shareId);
            return result;
          } catch (error) {
            if (!this.service.closed) {
              db.prepare("UPDATE bili_shares SET status=? WHERE id=?").run(
                error.uncertain || signal.aborted ? "uncertain" : "failed",
                shareId,
              );
              db.prepare("UPDATE bili_sends SET status=? WHERE id=?").run(
                error.uncertain || signal.aborted ? "uncertain" : "failed",
                shareId,
              );
            }
            throw error;
          }
        },
        publish: async ({ text }) => {
          const current = check();
          if (kind === "watch" || completed)
            throw fail("本轮不能再次发布", 409);
          const output = current[`bili.dynamics.${kind}.prefix`] + text;
          if (
            typeof text !== "string" ||
            output.length < current[`bili.dynamics.${kind}.minChars`] ||
            output.length > current[`bili.dynamics.${kind}.maxChars`]
          )
            throw fail("动态正文不符合当前类型长度范围");
          const previous = db
            .prepare(
              "SELECT created FROM bili_activities WHERE character_id=? AND kind<>'watch' AND status IN ('sending','done','uncertain') ORDER BY created DESC LIMIT 1",
            )
            .get(characterId);
          if (
            previous &&
            now - previous.created < current["bili.dynamics.gapMinutes"] * 60000
          )
            throw fail("动态发布间隔尚未释放", 429);
          db.prepare(
            "UPDATE bili_activities SET status='sending' WHERE id=?",
          ).run(id);
          completed = true;
          try {
            const result = await client.publish(output, signal);
            signal.throwIfAborted();
            if (this.service.closed) throw fail("B站活动服务已停止", 409);
            if (result?.status !== "sent" || !result.messageId)
              throw Object.assign(fail("动态发布没有取得明确编号", 502), {
                uncertain: true,
              });
            db.prepare(
              "UPDATE bili_activities SET status='done',data=? WHERE id=?",
            ).run(JSON.stringify(result), id);
            return result;
          } catch (error) {
            if (!this.service.closed) {
              db.prepare(
                "UPDATE bili_activities SET status=?,data=? WHERE id=?",
              ).run(
                error.uncertain || signal.aborted ? "uncertain" : "failed",
                JSON.stringify({ error: error.code || error.message }),
                id,
              );
            }
            throw error;
          }
        },
        skip: ({ reason }) => {
          check();
          if (completed) throw fail("本轮已经完成", 409);
          if (
            typeof reason !== "string" ||
            !reason.trim() ||
            reason.length > 500
          )
            throw fail("请填写跳过理由");
          completed = true;
          db.prepare(
            "UPDATE bili_activities SET status='skipped',data=? WHERE id=?",
          ).run(JSON.stringify({ reason }), id);
          return { status: "skipped" };
        },
      });
      signal.throwIfAborted();
      if (this.service.closed) throw fail("B站活动服务已停止", 409);
      if (!completed) throw fail("模型未记录阅读、发布或说明跳过理由", 502);
      if (
        db.prepare("SELECT status FROM bili_activities WHERE id=?").get(id)
          .status === "running"
      )
        db.prepare(
          "UPDATE bili_activities SET status='done',data=? WHERE id=?",
        ).run(JSON.stringify({ videos: material.map((v) => v.bvid) }), id);
    } catch (error) {
      if (!this.service.closed) {
        db.prepare(
          "UPDATE bili_activities SET status='failed',data=? WHERE id=? AND status='running'",
        ).run(JSON.stringify({ error: error.code || error.message }), id);
      }
      throw error;
    }
  }
}
