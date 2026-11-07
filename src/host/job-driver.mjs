import { fileWorkspace } from "./native-files.mjs";
import { fail } from "../starrcore/store.mjs";
import { jobKinds } from "../jobs/config.mjs";
import { UsageBudget } from "../conversation/budget.mjs";
import crypto from "node:crypto";
import { conversationDelivery } from "./chat-delivery.mjs";
export function periodTitle(
  kind,
  slot,
  date = new Date(),
  zone = "Asia/Shanghai",
) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const local = `${parts.year}-${parts.month}-${parts.day}`;
  const day = new Date(
    (/^\d{4}-\d{2}-\d{2}/.exec(slot || "")?.[0] || local) + "T12:00:00Z",
  );
  if (kind === "yearly") return `${day.getUTCFullYear() - 1} 年概览`;
  if (kind === "monthly") day.setUTCMonth(day.getUTCMonth() - 1, 15);
  if (kind === "weekly") {
    day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
    const year = day.getUTCFullYear(),
      start = new Date(Date.UTC(year, 0, 1));
    return `${year}-W${String(Math.ceil(((day - start) / 86400000 + 1) / 7)).padStart(2, "0")} 周概览`;
  }
  return `${day.toISOString().slice(0, 7)} 月概览`;
}
export function createJobDriver(ctx, store) {
  const budget = new UsageBudget(store);
  const active = new Set();
  return {
    async run(input) {
      const {
        characterId,
        sessionId,
        kind,
        slot,
        eventKey,
        provider,
        model,
        signal,
      } = input;
      store.db
        .prepare("INSERT OR IGNORE INTO qq_session_bindings VALUES(?,?)")
        .run(sessionId, characterId);
      const { agent } = await ctx.agents.create({
        sessionId,
        meta: {
          cwd: fileWorkspace(store, characterId, { create: true }),
          agentPreset: "starr-qqchat",
        },
        agentOptions: { provider, model },
        setup: async (agentCtx) => {
          await ctx.agentPresets.mount(agentCtx, "starr-qqchat");
        },
        signal,
      });
      active.add(agent);
      const cancel = () =>
        agent.cancel({ kind: "hook", reason: "记忆任务中止" });
      signal.addEventListener("abort", cancel, { once: true });
      try {
        signal.throwIfAborted();
        const deliveryId = crypto.randomUUID(),
          preview = store.conversations.context(sessionId);
        store.conversations.recordDelivery(sessionId, deliveryId, preview);
        const summary = ["organize", "weekly", "monthly", "yearly"].includes(
            kind,
          ),
          title = periodTitle(
            kind,
            slot,
            new Date(),
            store.character(characterId).config["agency.timezone"],
          );
        agent.followup({
          id: deliveryId,
          role: "user",
          source: { kind: "user" },
          content: [
            {
              type: "text",
              text: conversationDelivery(
                preview,
                `执行 ${jobKinds[kind]}，时段 ${slot}。只依据工具可见且真实发生的记忆，不虚构经历。先检索当前角色资料，再用 starr_memory_write 写入 ${summary ? `summary，标题使用“${title}”` : "diary"}，eventKey 固定为 ${eventKey}；适合的真实关联可用 starr_memory_link 建立。自我概览使用self类型，summary只保存年、月、周概览。无足够资料也请明确记录“本时段资料不足”，不能把最终正文当作已落盘。不要发送平台消息或执行管理操作。`,
              ),
            },
          ],
        });
        await agent.whenIdle();
        signal.throwIfAborted();
        budget.capture(characterId, agent);
        const db = store.memory(characterId),
          record = db
            .prepare("SELECT id,title FROM records WHERE event_key=?")
            .get(`${sessionId}:${eventKey}`.slice(0, 300));
        if (!record)
          throw fail("模型回合已结束，但没有按任务标识保存记忆", 502);
        return { recordId: record.id, title: record.title };
      } finally {
        signal.removeEventListener("abort", cancel);
        active.delete(agent);
      }
    },
    close() {
      for (const agent of active)
        agent.cancel({ kind: "hook", reason: "记忆驱动关闭" });
      active.clear();
    },
  };
}
