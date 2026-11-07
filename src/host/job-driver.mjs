import { taskAgent } from "./task-session.mjs";
import { fail } from "../starrcore/store.mjs";
import { jobKinds } from "../jobs/config.mjs";
import { UsageBudget } from "../conversation/budget.mjs";
import crypto from "node:crypto";
import { conversationDelivery } from "./chat-delivery.mjs";
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
      const { agent } = await taskAgent(ctx, store, {
        sessionId,
        characterId,
        title: `${store.character(characterId).name} · ${jobKinds[kind]}`,
        provider,
        model,
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
        agent.followup({
          id: deliveryId,
          role: "user",
          source: { kind: "user" },
          content: [
            {
              type: "text",
              text: conversationDelivery(
                preview,
                `为今天写一篇${jobKinds[kind]}，日期与时段 ${slot}。先检索当天真实经历，再用自己的语气写日记，kind=diary，eventKey固定为${eventKey}。只写真实发生和自己确实有的感受，旧事注明日期，不凑模板、不反复写“本时段资料不足”。若当天只有安静生活，可以简短如实写，不编造事件。必须用starr_memory_write保存；最终回复不能代替保存。普通记忆由你平时自主修订，不另写固定周月年回顾。不要发送平台消息或执行管理操作。`,
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
