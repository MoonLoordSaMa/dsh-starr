import crypto from "node:crypto";
import { RuntimeLease } from "../runtime/lease.mjs";
import { UsageBudget } from "../conversation/budget.mjs";
import { ChatPolicy } from "../conversation/policy.mjs";
import { agencyRank, quietNow } from "./config.mjs";
import { modelFailure } from "../host/model-failure.mjs";

const fail = (message, status = 409) =>
  Object.assign(new Error(message), { status });
const ids = (v) =>
  String(v || "")
    .split(/[,，\s]+/)
    .filter(Boolean);
const table = (db, name) =>
  !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
const digest = (v) => crypto.createHash("sha256").update(v).digest("hex");

// 定时器只提出机会；每次请求、工具调用和外发都重新检查权限与预算。
export class Agency {
  constructor(store, { qq, driver, clock = Date.now } = {}) {
    this.store = store;
    this.qq = qq;
    this.driver = driver;
    this.clock = clock;
    this.budget = new UsageBudget(store);
    this.policy = new ChatPolicy(store);
    this.lease = new RuntimeLease(store.dataRoot, "agency");
    this.running = new Map();
    this.closed = false;
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS agency_runs(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,goal_id TEXT,session_id TEXT,status TEXT NOT NULL,reason TEXT NOT NULL,result TEXT,error TEXT,requests INTEGER NOT NULL DEFAULT 0,tools INTEGER NOT NULL DEFAULT 0,actions INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS agency_control(character_id TEXT PRIMARY KEY,reset_at INTEGER NOT NULL DEFAULT 0);`);
    store.agency = this;
  }
  rows(characterId) {
    return this.store.db
      .prepare(
        "SELECT * FROM agency_runs WHERE character_id=? ORDER BY created DESC,id DESC LIMIT 100",
      )
      .all(characterId);
  }
  counters(characterId) {
    const time = this.clock() - 86400000;
    const counts = this.store.db
      .prepare(
        "SELECT count(*) decisions,coalesce(sum(actions),0) actions FROM agency_runs WHERE character_id=? AND created>?",
      )
      .get(characterId, time);
    const usage = this.store.db
      .prepare(
        "SELECT coalesce(sum(input_tokens+output_tokens),0) tokens,coalesce(sum(missing),0) missingUsage FROM chat_usage WHERE character_id=? AND session_id IN(SELECT session_id FROM agency_runs WHERE character_id=?) AND created>?",
      )
      .get(characterId, characterId, time);
    return { ...counts, ...usage };
  }
  blockers(characterId, { ignoreBudget = false, runId } = {}) {
    const c = this.store.character(characterId).config,
      now = this.clock(),
      reasons = [];
    if (!c["agency.enabled"] || agencyRank(c["agency.level"]) < 1)
      reasons.push("当前仅观察，没有开启主动执行");
    if (c["agency.paused"]) reasons.push("后台主动活动已暂停");
    if (!this.driver) reasons.push("主动执行器尚未连接DSH宿主");
    if (quietNow(c, now)) reasons.push("现在是安静时段");
    const all = this.rows(characterId),
      other = all.filter((r) => r.id !== runId);
    if (
      other[0] &&
      now - other[0].created < c["agency.cooldownMinutes"] * 60000
    )
      reasons.push("主动行动仍在冷却");
    const reset =
      this.store.db
        .prepare("SELECT reset_at FROM agency_control WHERE character_id=?")
        .get(characterId)?.reset_at || 0;
    const recent = other.filter(
      (r) =>
        r.created >= reset && !["recovered", "cancelled"].includes(r.status),
    );
    if (
      recent.length >= c["agency.failureLimit"] &&
      recent
        .slice(0, c["agency.failureLimit"])
        .every((r) => ["failed", "uncertain"].includes(r.status))
    )
      reasons.push("连续失败，已停下等待管理员确认");
    const counters = this.counters(characterId);
    if (!ignoreBudget && counters.decisions >= c["agency.dailyDecisions"])
      reasons.push("近24小时主动评估预算已用完");
    if (counters.tokens >= c["agency.maxTokens"])
      reasons.push("近24小时主动模型令牌预算已用完");
    if (counters.missingUsage)
      reasons.push("宿主未报告部分主动请求用量，暂停新请求，避免未知消耗");
    try {
      this.budget.check(characterId);
    } catch (e) {
      reasons.push(e.message);
    }
    const owner = c["memory.ownerQQ"];
    if (owner && table(this.store.db, "qq_inbox")) {
      const rows = this.store.db
        .prepare(
          "SELECT i.payload,i.created,i.status FROM qq_inbox i JOIN qq_threads t ON t.key=i.thread_key WHERE t.character_id=? AND t.type='private' AND t.target=? ORDER BY i.seq DESC LIMIT 30",
        )
        .all(characterId, owner);
      if (rows.some((r) => ["pending", "processing"].includes(r.status)))
        reasons.push("主人还有来信待处理，先回应来信");
      if (rows[0] && now - rows[0].created < c["agency.recentMinutes"] * 60000)
        reasons.push("刚刚还在互动，先留一点空白");
      if (
        rows.some(
          (r) =>
            now - r.created < c["agency.busyHours"] * 3600000 &&
            /(?:我(?:现在|在)?(?:很)?忙|在忙|忙着|在开会|在上课|在工作|先忙|别打扰|不要打扰|勿扰|要睡了|去睡了|睡觉了|晚安)/.test(
              JSON.parse(r.payload).text,
            ),
        )
      )
        reasons.push("主人最近说忙或准备休息，暂不主动打扰");
    }
    return [...new Set(reasons)];
  }
  plan(characterId) {
    const evaluation = this.store.intentions(characterId),
      goals = this.store.goals(characterId),
      c = this.store.character(characterId).config;
    const active = goals.find(
      (g) =>
        g.status === "waiting" &&
        (!g.originSession ||
          this.store.conversations.memoryAccess(g.originSession).owner ||
          this.store.conversations.get(g.originSession).purpose ===
            "management") &&
        (!g.due || Date.parse(g.due) <= this.clock()) &&
        !this.store.db
          .prepare(
            "SELECT 1 FROM agency_runs WHERE character_id=? AND goal_id=?",
          )
          .get(characterId, g.id),
    );
    const candidate = evaluation.candidates.find(
      (g) =>
        g.score >= 60 &&
        (!g.external ||
          (g.id === "connection"
            ? agencyRank(c["agency.level"]) >= 1
            : agencyRank(c["agency.level"]) >= 2)) &&
        !g.blockers.length,
    );
    const goal =
      active ||
      (candidate
        ? {
            id: `auto:${candidate.id}:${Math.floor(this.clock() / 86400000)}`,
            title: candidate.title,
            reason: candidate.reason,
            action: candidate.action,
            drive: candidate.id,
            external: candidate.external,
            automatic: true,
          }
        : null);
    const blockers = this.blockers(characterId);
    if (goal?.action === "explore" && agencyRank(c["agency.level"]) < 2)
      blockers.push("此目的需要浏览级主动权限");
    if (goal?.action === "reach_out") {
      try {
        this.owner(characterId);
      } catch (e) {
        blockers.push(e.message);
      }
    }
    if (goal && evaluation.goals.find((g) => g.id === goal.id)?.blockers.length)
      blockers.push(...evaluation.goals.find((g) => g.id === goal.id).blockers);
    if (!goal) blockers.push("暂时没有需要行动的目的，可以安静");
    const id = goal ? digest(`${characterId}:${goal.id}`) : null;
    if (
      id &&
      this.store.db.prepare("SELECT 1 FROM agency_runs WHERE id=?").get(id)
    )
      blockers.push("这个目的已经评估过，本次不会重复执行");
    return {
      id,
      goal,
      blockers: [...new Set(blockers)],
      target:
        goal?.action === "reach_out"
          ? "可信主人QQ私聊"
          : "本角色资料与已授权能力",
      dryRun: true,
    };
  }
  owner(characterId) {
    const c = this.store.character(characterId).config,
      settings = this.qq?.settings().config,
      target = c["memory.ownerQQ"];
    if (
      !settings?.enabled ||
      settings.characterId !== characterId ||
      !target ||
      !ids(settings.privateUsers).includes(target) ||
      ids(c["chat.access.deniedUsers"]).includes(target)
    )
      throw fail("主人私聊尚未同时取得身份绑定与QQ允许名单授权", 403);
    const thread = this.store.db
      .prepare(
        "SELECT t.* FROM qq_threads t JOIN chat_sessions s ON s.session_id=t.session_id WHERE t.character_id=? AND t.type='private' AND t.target=? AND s.paused=0 ORDER BY s.updated DESC LIMIT 1",
      )
      .get(characterId, target);
    if (!thread || this.qq.state.status !== "connected")
      throw fail("需要主人先私聊联系一次，并保持QQ连接在线");
    return { settings, target, thread };
  }
  status(characterId) {
    const c = this.store.character(characterId).config;
    return {
      hostReady: !!this.driver,
      level: c["agency.level"],
      paused: c["agency.paused"],
      blockers: this.blockers(characterId),
      counters: this.counters(characterId),
      recent: this.rows(characterId).slice(0, 30),
    };
  }
  start(driver = this.driver) {
    this.driver = driver;
    if (this.timer) return;
    if (this.lease.acquire())
      this.store.db.exec(
        "UPDATE agency_runs SET status=CASE WHEN actions>0 THEN 'uncertain' ELSE 'recovered' END,error='上次宿主退出时尚未结束，未自动重试',updated=strftime('%s','now')*1000 WHERE status='running'",
      );
    this.timer = setInterval(() => this.tick(), 30000);
    this.timer.unref?.();
    this.tick();
  }
  tick() {
    if (this.closed || !this.store.installation() || !this.lease.acquire())
      return;
    for (const character of this.store.listCharacters()) {
      if (this.running.has(character.id)) {
        const c = this.store.character(character.id).config;
        if (!c["agency.enabled"] || c["agency.paused"])
          this.running.get(character.id).abort();
        continue;
      }
      if (this.running.size >= 1) continue;
      const plan = this.plan(character.id);
      if (!plan.blockers.length) this.run(character.id).catch(() => {});
    }
  }
  check(characterId, runId) {
    if (this.closed || this.store.closed) throw fail("主动执行器已关闭");
    const reasons = this.blockers(characterId, { ignoreBudget: true, runId });
    if (reasons.length) throw fail(reasons.join("；"), 403);
    const row = this.store.db
      .prepare("SELECT * FROM agency_runs WHERE id=?")
      .get(runId);
    if (this.closed || !row || row.status !== "running")
      throw fail("这次主动行动已停止");
    const goal = this.store
      .goals(characterId)
      .find((g) => g.id === row.goal_id);
    if (goal && goal.status !== "waiting")
      throw fail("目的已被管理员取消或完成", 403);
    return this.store.character(characterId).config;
  }
  reserve(characterId, runId, kind) {
    const c = this.check(characterId, runId),
      row = this.store.db
        .prepare("SELECT * FROM agency_runs WHERE id=?")
        .get(runId);
    if (kind === "request" && row.requests >= c["agency.maxRequests"])
      throw fail("本轮主动模型请求预算已用完", 429);
    if (kind === "tool" && row.tools >= c["agency.maxTools"])
      throw fail("本轮主动工具预算已用完", 429);
    if (
      kind === "action" &&
      this.counters(characterId).actions >= c["agency.dailyActions"]
    )
      throw fail("主动外发额度已用完", 429);
    if (kind === "action" && row.actions >= 1)
      throw fail("本次主动机会已尝试一次外发，不再追加或重发", 409);
    const column = { request: "requests", tool: "tools", action: "actions" }[
      kind
    ];
    if (!column) throw fail("未知主动预算种类");
    this.store.db
      .prepare(
        `UPDATE agency_runs SET ${column}=${column}+1,updated=? WHERE id=?`,
      )
      .run(this.clock(), runId);
  }
  async run(characterId) {
    if (this.closed || this.running.has(characterId) || !this.lease.acquire())
      throw fail("主动执行器忙碌或由另一宿主管理");
    const plan = this.plan(characterId);
    if (plan.blockers.length) throw fail(plan.blockers.join("；"), 403);
    const goal = plan.goal.automatic
      ? this.store.createGoal(characterId, plan.goal)
      : plan.goal;
    const sessionId = `session-starr-agency-${plan.id.slice(0, 32)}`,
      c = this.store.character(characterId).config;
    let binding = null;
    if (goal.action === "reach_out" || c["agency.level"] === "owner") {
      try {
        binding = this.owner(characterId);
      } catch (e) {
        if (goal.action === "reach_out") throw e;
      }
    }
    this.store.conversations.ensure({
      sessionId,
      characterId,
      platform: binding ? "qq" : "web",
      type: binding ? "private" : "web",
      account: binding
        ? this.store.conversations.get(binding.thread.session_id).account
        : "",
      target: binding?.target || "",
      title: `主动心事 · ${goal.title}`,
    });
    const q = this.qq?.settings().config || {},
      provider = q.provider || c["bili.provider"] || c["jobs.provider"],
      model = q.provider
        ? q.model
        : c["bili.provider"]
          ? c["bili.model"]
          : c["jobs.model"];
    const result = this.store.db
      .prepare(
        "INSERT OR IGNORE INTO agency_runs(id,character_id,goal_id,session_id,status,reason,created,updated) VALUES(?,?,?,?,'running',?,?,?)",
      )
      .run(
        plan.id,
        characterId,
        goal.id,
        sessionId,
        goal.reason,
        this.clock(),
        this.clock(),
      );
    if (!result.changes) return;
    const controller = new AbortController();
    this.running.set(characterId, controller);
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(120000),
    ]);
    let finished = false;
    const finish = async ({ text = "", reason }) => {
      if (finished) throw fail("本轮已经结束，不可重复提交");
      this.check(characterId, plan.id);
      signal.throwIfAborted();
      if (
        typeof reason !== "string" ||
        !reason.trim() ||
        reason.length > 500 ||
        typeof text !== "string" ||
        text.length > Math.min(c["chat.reply.maxChars"], 1000)
      )
        throw fail("请填写简短理由，主动私聊最多1000字符", 400);
      if (!text.trim()) {
        finished = true;
        return { status: "silent", reason };
      }
      const owner = this.owner(characterId);
      this.reserve(characterId, plan.id, "action");
      const allowance = this.policy.reserve(
        characterId,
        sessionId,
        "send",
        `agency:${plan.id}`,
      );
      if (!allowance.allowed) throw fail("会话外发额度已用完", 429);
      const token = await this.qq.secrets.read(owner.settings.tokenEnv);
      this.check(characterId, plan.id);
      signal.throwIfAborted();
      const latest = this.owner(characterId);
      if (JSON.stringify(owner.settings) !== JSON.stringify(latest.settings))
        throw fail("QQ连接在发送前发生变化");
      // 持久记录发送已开始。回执不明时不重复执行此目的。
      this.store.db.prepare("UPDATE agency_runs SET result=? WHERE id=?").run(
        JSON.stringify({
          status: "sending",
          text: text.trim(),
          target: "owner",
        }),
        plan.id,
      );
      let sent;
      try {
        sent = await this.qq.action(
          { ...owner.settings, token, signal },
          "send_private_msg",
          {
            user_id: owner.target,
            message: [{ type: "text", data: { text: text.trim() } }],
          },
        );
        if (!sent?.message_id)
          throw Object.assign(fail("平台未返回消息编号，主动外发待核对", 502), {
            uncertain: true,
          });
      } catch (e) {
        if (e.uncertain || signal.aborted) e.uncertain = true;
        throw e;
      }
      finished = true;
      const receipt = {
        status: "sent",
        messageId: String(sent.message_id),
        reason,
        text: text.trim(),
      };
      this.store.db
        .prepare("UPDATE agency_runs SET result=? WHERE id=?")
        .run(JSON.stringify(receipt), plan.id);
      return receipt;
    };
    try {
      if (!provider || !model) throw fail("请先配置DSH聊天模型");
      let pending = "";
      if (binding) {
        const s = this.store.conversations.get(binding.thread.session_id);
        pending = JSON.stringify({ 摘要: s.summary, 未完事项: s.pending });
      }
      const outcome = await this.driver.run({
        characterId,
        sessionId,
        provider,
        model,
        goal,
        pending,
        signal,
        finish,
        check: () => this.check(characterId, plan.id),
        reserve: (kind) => this.reserve(characterId, plan.id, kind),
      });
      signal.throwIfAborted();
      if (!finished) throw fail("模型没有提交行动或安静决定，已停止本轮", 502);
      const social = this.socialResult(sessionId);
      if (social?.status === "uncertain")
        throw Object.assign(fail("B站主动外发结果待核对，不重复发送"), {
          uncertain: true,
        });
      this.store.db
        .prepare(
          "UPDATE agency_runs SET status=?,result=?,updated=? WHERE id=?",
        )
        .run(
          outcome?.status === "sent"
            ? "sent"
            : social
              ? social.status
              : "silent",
          JSON.stringify({ ...outcome, ...(social ? { social } : {}) }),
          this.clock(),
          plan.id,
        );
      if (
        outcome?.status === "sent" ||
        social?.status === "accepted" ||
        social?.status === "sent" ||
        outcome?.effect
      )
        this.store.updateGoal(characterId, goal.id, "completed");
    } catch (e) {
      if (this.store.closed) return;
      const receipt = JSON.parse(
        this.store.db
          .prepare("SELECT result FROM agency_runs WHERE id=?")
          .get(plan.id).result || "null",
      );
      if (receipt?.status === "sent") {
        this.store.db
          .prepare("UPDATE agency_runs SET status='sent',updated=? WHERE id=?")
          .run(this.clock(), plan.id);
        this.store.updateGoal(characterId, goal.id, "completed");
        return this.store.db
          .prepare("SELECT * FROM agency_runs WHERE id=?")
          .get(plan.id);
      }
      const social = this.socialResult(sessionId);
      if (social && ["sent", "accepted"].includes(social.status)) {
        this.store.db
          .prepare(
            "UPDATE agency_runs SET status=?,result=?,updated=? WHERE id=?",
          )
          .run(
            social.status,
            JSON.stringify({ social }),
            this.clock(),
            plan.id,
          );
        this.store.updateGoal(characterId, goal.id, "completed");
        return this.store.db
          .prepare("SELECT * FROM agency_runs WHERE id=?")
          .get(plan.id);
      }
      const message = /MODEL_|TRANSPORT|AUTH|TIMEOUT|NETWORK/.test(e.code || "")
        ? modelFailure(e).detail
        : String(e.message || "主动行动失败").slice(0, 500);
      this.store.db
        .prepare("UPDATE agency_runs SET status=?,error=?,updated=? WHERE id=?")
        .run(
          e.uncertain ||
            social?.status === "uncertain" ||
            receipt?.status === "sending"
            ? "uncertain"
            : signal.aborted
              ? "cancelled"
              : "failed",
          message,
          this.clock(),
          plan.id,
        );
    } finally {
      this.running.delete(characterId);
    }
    if (this.store.closed) return;
    return this.store.db
      .prepare("SELECT * FROM agency_runs WHERE id=?")
      .get(plan.id);
  }
  pause(characterId) {
    const character = this.store.character(characterId);
    this.store.configure(
      characterId,
      { "agency.paused": true },
      { revision: character.revision },
    );
    this.running.get(characterId)?.abort();
    return this.status(characterId);
  }
  socialResult(sessionId) {
    if (!table(this.store.db, "bili_autonomy_log")) return null;
    return (
      this.store.db
        .prepare(
          "SELECT kind,status FROM bili_autonomy_log WHERE session_id=? ORDER BY created DESC LIMIT 1",
        )
        .get(sessionId) || null
    );
  }
  reset(characterId) {
    this.store.character(characterId);
    this.store.db
      .prepare(
        "INSERT INTO agency_control VALUES(?,?) ON CONFLICT(character_id) DO UPDATE SET reset_at=excluded.reset_at",
      )
      .run(characterId, this.clock());
    return this.status(characterId);
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    for (const controller of this.running.values()) controller.abort();
    this.lease.release();
  }
  close() {
    this.closed = true;
    this.stop();
    if (this.store.agency === this) delete this.store.agency;
  }
}
