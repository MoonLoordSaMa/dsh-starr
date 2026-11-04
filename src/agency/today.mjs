import { UsageBudget } from "../conversation/budget.mjs";

const exists = (db, name) =>
  !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
// 控制台为管理员视图，不向角色提供跨会话原文。
export function todayOverview(store, characterId, clock = Date.now()) {
  const c = store.character(characterId).config,
    db = store.db;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: c["agency.timezone"],
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(clock);
  const since = clock - 48 * 3600000;
  const events = [];
  const take = (name, query, convert) => {
    if (!exists(db, name)) return;
    for (const row of db.prepare(query).all(characterId, since)) {
      const event = convert(row);
      if (
        new Intl.DateTimeFormat("en-CA", {
          timeZone: c["agency.timezone"],
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(event.time) === day
      )
        events.push(event);
    }
  };
  take(
    "agency_runs",
    "SELECT * FROM agency_runs WHERE character_id=? AND created>? ORDER BY created DESC LIMIT 100",
    (r) => ({
      id: r.id,
      time: r.created,
      kind: "主动目的",
      status: r.status,
      title:
        store.goals(characterId).find((g) => g.id === r.goal_id)?.title ||
        "主动机会",
      reason: r.reason,
      detail: r.error || JSON.parse(r.result || "null")?.reason || "",
      requests: r.requests,
      actions: r.actions,
    }),
  );
  take(
    "bili_activities",
    "SELECT * FROM bili_activities WHERE character_id=? AND created>? ORDER BY created DESC LIMIT 100",
    (r) => ({
      id: r.id,
      time: r.created,
      kind: r.kind === "watch" ? "B站阅读" : "B站动态",
      status: r.status,
      title: r.kind === "watch" ? "按兴趣阅读视频资料" : "按授权准备动态",
      reason: "管理员配置的作息与活动",
      detail: JSON.parse(r.data || "{}").error || "详情见B站活动记录",
    }),
  );
  take(
    "bili_autonomy_log",
    "SELECT * FROM bili_autonomy_log WHERE character_id=? AND created>? ORDER BY created DESC LIMIT 100",
    (r) => ({
      id: r.id,
      time: r.created,
      kind: "B站自主互动",
      status: r.status,
      title:
        { dm: "发出私信", comment: "参与评论", dynamic: "发布动态" }[r.kind] ||
        "平台互动",
      reason: "逐项平台授权与角色选择",
      detail: "受理不等于公开可见；详情见B站互动记录",
    }),
  );
  take(
    "bridge_log",
    "SELECT * FROM bridge_log WHERE character_id=? AND created>? AND status<>'baseline' ORDER BY created DESC LIMIT 100",
    (r) => ({
      id: r.id,
      time: r.created,
      kind: "星桥分享",
      status: r.status,
      title: r.kind === "video" ? "分享阅读所得" : "同步已授权内容",
      reason: "星桥目标与时间规则",
      detail: r.error || "详情见星桥记录",
    }),
  );
  take(
    "memory_jobs",
    "SELECT * FROM memory_jobs WHERE character_id=? AND created>? ORDER BY created DESC LIMIT 100",
    (r) => ({
      id: r.id,
      time: r.created,
      kind: "记忆整理",
      status: r.status,
      title:
        {
          diary: "记录日记",
          organize: "整理记忆",
          weekly: "周概览",
          monthly: "月概览",
          yearly: "年概览",
          backup: "备份记忆",
          projection: "同步笔记",
        }[r.kind] || r.kind,
      reason: "管理员配置的定时整理",
      detail: r.error || "",
    }),
  );
  const memory = store
    .memory(characterId)
    .prepare(
      "SELECT id,title,kind,created FROM records WHERE created>? AND id NOT IN(SELECT record_id FROM record_archive) ORDER BY created DESC LIMIT 300",
    )
    .all(new Date(since).toISOString())
    .filter(
      (r) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: c["agency.timezone"],
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(Date.parse(r.created)) === day,
    );
  events.push(
    ...memory.map((r) => ({
      id: r.id,
      time: Date.parse(r.created),
      kind: "留下记忆",
      status: "saved",
      title: r.title,
      reason: r.kind === "diary" ? "今日记录" : "按权重留下的经历与资料",
      detail: "可在记忆页查看原文与来源",
    })),
  );
  return {
    day,
    timezone: c["agency.timezone"],
    events: events.sort((a, b) => b.time - a.time).slice(0, 120),
    usage: new UsageBudget(store).status(characterId),
    counts: {
      memories: memory.length,
      diary: memory.filter((r) => r.kind === "diary").length,
      proactive: events.filter(
        (e) => e.kind === "主动目的" && e.status === "sent",
      ).length,
    },
    limits: {
      decisions: c["agency.dailyDecisions"],
      actions: c["agency.dailyActions"],
      tokens: c["agency.maxTokens"],
    },
  };
}
