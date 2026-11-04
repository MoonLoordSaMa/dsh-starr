import { fail } from "../starrcore/store.mjs";
const f = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  "chat-budget",
  help,
  extra,
];
export const budgetFields = [
  f(
    "chat.budget.enabled",
    "启用模型用量闸门",
    "boolean",
    false,
    "每次新模型请求前核对当前角色近24小时的已报告用量；不会中断已发出的请求。",
  ),
  f(
    "chat.budget.maxTokens",
    "近24小时最多令牌数",
    "number",
    1000000,
    "根据 DSH 的真实 usage 累计，0 表示不设令牌额度。",
    { min: 0, max: 100000000, integer: true },
  ),
  f(
    "chat.budget.maxCostCNY",
    "近24小时估算费用上限（元）",
    "number",
    10,
    "按下面单价计算估算值，不等于服务商账单；0 表示不设费用额度。",
    { min: 0, max: 100000 },
  ),
  f(
    "chat.budget.inputPrice",
    "未命中输入每百万令牌（元）",
    "number",
    2,
    "供当前角色会话的统一估算；混用不同价格模型时请采用保守单价。",
    { min: 0, max: 100000 },
  ),
  f(
    "chat.budget.cachedPrice",
    "缓存读取每百万令牌（元）",
    "number",
    0.2,
    "命中缓存的输入单独计算，不重复计入未命中价格。",
    { min: 0, max: 100000 },
  ),
  f(
    "chat.budget.outputPrice",
    "输出每百万令牌（元）",
    "number",
    3,
    "输出令牌包含服务报告的推理消耗时不会再重复加算。",
    { min: 0, max: 100000 },
  ),
  f(
    "chat.budget.requireUsage",
    "服务未报告用量时停止下一请求",
    "boolean",
    true,
    "启用用量闸门后生效；避免缺失 usage 却把消耗当作零。",
  ),
];
export class UsageBudget {
  constructor(store) {
    this.store = store;
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS chat_usage(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,session_id TEXT NOT NULL,input_tokens INTEGER NOT NULL,output_tokens INTEGER NOT NULL,cached_tokens INTEGER NOT NULL,missing INTEGER NOT NULL,cost REAL NOT NULL,created INTEGER NOT NULL);",
    );
  }
  capture(characterId, agent) {
    const c = this.store.character(characterId).config;
    for (const event of agent.session?.snapshotEvents?.() || []) {
      if (event.type !== "assistant/message") continue;
      const data = event.data || {},
        usage = data.usage,
        missing =
          !usage ||
          ![usage.inputTokens, usage.outputTokens].every(
            (n) => Number.isFinite(n) && n >= 0,
          );
      // 宿主可能将缓存读入单独报告；有总数时以总数减输出来还原完整输入。
      const input = missing
          ? 0
          : Math.max(
              Math.floor(usage.inputTokens),
              Number.isFinite(usage.totalTokens)
                ? Math.floor(usage.totalTokens - usage.outputTokens)
                : 0,
            ),
        output = missing ? 0 : Math.floor(usage.outputTokens),
        cached = missing
          ? 0
          : Math.min(
              input,
              Math.max(0, Math.floor(usage.cacheReadTokens || 0)),
            ),
        id = `${agent.id}:${event.seq ?? data.message?.id}`;
      if (id.endsWith(":undefined")) continue;
      const cost =
        ((input - cached) * c["chat.budget.inputPrice"] +
          cached * c["chat.budget.cachedPrice"] +
          output * c["chat.budget.outputPrice"]) /
        1000000;
      this.store.db
        .prepare(
          "INSERT INTO chat_usage VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET input_tokens=excluded.input_tokens,cached_tokens=excluded.cached_tokens,cost=excluded.cost WHERE chat_usage.input_tokens<>excluded.input_tokens OR chat_usage.cached_tokens<>excluded.cached_tokens",
        )
        .run(
          id,
          characterId,
          agent.id,
          input,
          output,
          cached,
          Number(missing),
          cost,
          typeof event.time === "number"
            ? event.time
            : Date.parse(event.timestamp || event.createdAt || "") ||
                Date.now(),
        );
    }
  }
  status(characterId) {
    this.store.character(characterId);
    return this.store.db
      .prepare(
        "SELECT coalesce(sum(input_tokens+output_tokens),0) AS tokens,coalesce(sum(cost),0) AS estimatedCostCNY,coalesce(sum(missing),0) AS missingUsage,count(*) AS requests FROM chat_usage WHERE character_id=? AND created>?",
      )
      .get(characterId, Date.now() - 86400000);
  }
  check(characterId) {
    const c = this.store.character(characterId).config;
    if (!c["chat.budget.enabled"]) return;
    const usage = this.status(characterId);
    if (c["chat.budget.requireUsage"] && usage.missingUsage)
      throw Object.assign(
        fail("模型服务没有报告用量，当前用量闸门停止新请求", 429),
        { code: "USAGE_MISSING" },
      );
    if (
      (c["chat.budget.maxTokens"] &&
        usage.tokens >= c["chat.budget.maxTokens"]) ||
      (c["chat.budget.maxCostCNY"] &&
        usage.estimatedCostCNY >= c["chat.budget.maxCostCNY"])
    )
      throw Object.assign(fail("已达到角色近24小时模型用量上限", 429), {
        code: "MODEL_BUDGET",
      });
  }
}
export function installUsageBudget(
  ctx,
  store,
  resolveCharacter,
  resolveAgent = () => ctx.agents?.requireInitiator?.(),
) {
  const budget = new UsageBudget(store),
    removers = [];
  removers.push(
    ctx.on?.("agent/request", async (payload, next) => {
      const agent = resolveAgent();
      if (!agent?.id) throw fail("模型用量检查缺少可信宿主会话", 409);
      const character = resolveCharacter(agent.id);
      budget.capture(character.id, agent);
      budget.check(character.id);
      return next();
    }),
  );
  removers.push(
    ctx.on?.("agent/status", ({ status }) => {
      if (status !== "idle") return;
      let agent;
      try {
        agent = resolveAgent();
      } catch {
        return;
      }
      if (agent?.id) budget.capture(resolveCharacter(agent.id).id, agent);
    }),
  );
  return () => removers.reverse().forEach((remove) => remove?.());
}
