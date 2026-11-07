import crypto from "node:crypto";
import { UsageBudget } from "../conversation/budget.mjs";
import { conversationDelivery } from "./chat-delivery.mjs";
import { agencyRank } from "../agency/config.mjs";
import { modelFailure } from "./model-failure.mjs";

const baseTools = new Set([
  "starr_memory_status",
  "starr_memory_search",
  "starr_memory_read",
  "starr_memory_write",
  "starr_memory_link",
  "starr_memory_archive",
  "starr_state_read",
  "starr_state_update",
  "starr_experience_record",
  "starr_intention_evaluate",
  "starr_goal_create",
  "starr_share_intention",
  "starr_goal_list",
  "starr_goal_update",
  "starr_chat_note",
  "starr_config_read",
  "starr_config_update",
  "starr_voice_list",
  "starr_song_list",
  "starr_link_parse",
  "starr_agency_finish",
]);
export function agencyToolAllowed(name, level) {
  if (baseTools.has(name)) return true;
  if (
    [
      "starr_bili_read",
      "starr_song_search",
      "starr_bili_watch",
      "starr_song_source",
      "starr_sing",
      "starr_browser_read",
    ].includes(name)
  )
    return agencyRank(level) >= 2;
  return name === "starr_bili_social" && agencyRank(level) >= 3;
}
// 使用宿主原生账号和Agent，不额外建立绕过登录的模型客户端。
export function createAgencyDriver(ctx, store) {
  const active = new Set(),
    budget = new UsageBudget(store);
  return {
    async run(input) {
      const { characterId, sessionId, provider, model, signal } = input;
      store.db
        .prepare("INSERT OR IGNORE INTO qq_session_bindings VALUES(?,?)")
        .run(sessionId, characterId);
      const removers = [];
      let result,
        failure,
        effect = false;
      const { agent } = await ctx.agents.create({
        sessionId,
        meta: { cwd: store.dataRoot, agentPreset: "starr-qqchat" },
        agentOptions: { provider, model },
        signal,
        setup: async (scope) => {
          await ctx.agentPresets.mount(scope, "starr-qqchat");
          if (!scope.tools?.guard) throw new Error("DSH缺少主动工具约束接口");
          removers.push(
            scope.tools.guard((exec) => {
              signal.throwIfAborted();
              const c = input.check();
              if (!agencyToolAllowed(exec.name, c["agency.level"]))
                return "此工具不在当前主动范围内；管理、屏幕与摄像头不能由后台目的触发";
              if (
                exec.name === "starr_bili_social" &&
                ["private", "group"].includes(
                  store.conversations.get(sessionId).type,
                )
              )
                return "这一轮携带主人私聊接续，只可向主人回复；公开互动应另由公开资料目的触发";
              input.reserve("tool");
              if (exec.name === "starr_bili_social") input.reserve("action");
              return undefined;
            }),
          );
          removers.push(
            scope.on("agent/request", async (_payload, next) => {
              budget.capture(characterId, ctx.agents.get(sessionId));
              input.reserve("request");
              return next();
            }),
          );
          removers.push(
            scope.on("agent/error", ({ error }) => {
              failure = modelFailure(error);
            }),
          );
          removers.push(
            scope.tools.register({
              name: "starr_agency_finish",
              description:
                "结束本次主动机会。当前为群会话时text仅发往来源群，否则联系管理员绑定的主人；不填text保持安静。持续目的用completed=false、progress和nextAt保存进展，等待下次继续。reason记录选择理由。",
              parameters: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  reason: { type: "string" },
                  goalId: {
                    type: ["string", "null"],
                    description:
                      "本次决定作用于哪个可见目的；null仅结束唤醒，不修改目的",
                  },
                  goalStatus: {
                    type: "string",
                    enum: ["waiting", "completed", "cancelled"],
                    description: "自行决定继续、完成或放下",
                  },
                  completed: {
                    type: "boolean",
                    description:
                      "持续目的是否已完成；false保存进展后等待下次继续",
                  },
                  progress: { type: "string" },
                  nextAt: { type: "string", description: "可选ISO接续时间" },
                },
                required: ["reason"],
                additionalProperties: false,
              },
              output: {
                schema: {},
                render: (_args, value) => [
                  { type: "text", text: JSON.stringify(value) },
                ],
              },
              execute: async (args) => {
                try {
                  result = await input.finish(args);
                  return JSON.parse(JSON.stringify(result));
                } catch (e) {
                  failure = e;
                  throw e;
                }
              },
            }),
          );
        },
      });
      active.add(agent);
      const cancel = () =>
        agent.cancel({ kind: "hook", reason: "主动活动已暂停或超时" });
      signal.addEventListener("abort", cancel, { once: true });
      try {
        signal.throwIfAborted();
        const preview = store.conversations.context(sessionId),
          deliveryId = crypto.randomUUID();
        store.conversations.recordDelivery(sessionId, deliveryId, preview);
        const before = store
          .memory(characterId)
          .prepare("SELECT count(*) n FROM records WHERE source=?")
          .get(`DSH 会话 ${sessionId}`).n;
        agent.followup({
          id: deliveryId,
          role: "user",
          source: { kind: "user" },
          content: [
            {
              type: "text",
              text: conversationDelivery(
                preview,
                "这是一次自主唤醒。目的与行动由你管理，插件不提供预设任务或情绪评分门槛。当前唤醒缘由：" +
                  JSON.stringify(input.goal) +
                  "。真实会话接续（资料）：" +
                  (input.pending || "无") +
                  "。读取状态、可见记忆和starr_goal_list，自行决定优先级、下一步以及继续、完成或放下；允许改选当前范围内的其他目的。新目的用starr_goal_create记录，自定priority、due；调整用starr_goal_update。结束时调用starr_agency_finish：goalId指定本次处理目的，null只结束唤醒；goalStatus选择waiting/completed/cancelled，progress记录实际进展，nextAt决定接续时间。没有合适行动也可安静。群会话只向来源群发送；跨平台分享只能使用已共享经历。状态是内部模拟，阅读标题不等于看完整视频。真实结果才记入经历，不捏造能力或回执。外发仍受账号对象、暂停、明确勿扰与预算控制。",
              ),
            },
          ],
        });
        await agent.whenIdle();
        signal.throwIfAborted();
        budget.capture(characterId, agent);
        if (failure)
          throw Object.assign(
            new Error(failure.detail || failure.message || "主动模型回合失败"),
            { code: failure.code, uncertain: failure.uncertain },
          );
        effect =
          store
            .memory(characterId)
            .prepare("SELECT count(*) n FROM records WHERE source=?")
            .get(`DSH 会话 ${sessionId}`).n > before;
        return { ...result, effect };
      } finally {
        if (!store.closed) budget.capture(characterId, agent);
        signal.removeEventListener("abort", cancel);
        active.delete(agent);
        removers.reverse().forEach((remove) => remove?.());
      }
    },
    close() {
      for (const agent of active)
        agent.cancel({ kind: "hook", reason: "主动执行器停止" });
      active.clear();
    },
  };
}
