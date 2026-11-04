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
  "starr_state_read",
  "starr_state_update",
  "starr_experience_record",
  "starr_intention_evaluate",
  "starr_goal_create",
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
                store.conversations.get(sessionId).type === "private"
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
                "结束本次主动机会。仅在确有内容时填写text联系管理员绑定的主人QQ；不填text表示保持安静，不发送消息。reason记录做或不做的理由。不要汇报工具过程。",
              parameters: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  reason: { type: "string" },
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
                  return result;
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
                `这是插件发起的一次自主机会，不是主人刚刚发来的消息。目的：${JSON.stringify(input.goal)}。主人上次会话接续（仅有关时自然提起）：${input.pending || "无"}。先判断是否值得做，没有新内容或对方可能忙时安静即可，不为了完成任务硬找话。允许范围以工具实际权限为准；读到标题简介不等于看过完整视频。身体状态是角色内部模拟，不代表真的吃饭睡觉。阅读或反思得到真实新内容时可保存记忆；需要跨平台自然接续时仅在已授权的共享范围保存。最后调用starr_agency_finish记录理由：有值得分享的话再填写text；保持安静则不填写text。最多一次主动外发，不能修改自己的授权、编写脚本、监视屏幕或主动联系陌生人。`,
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
