import { createTools } from "./tools.mjs";
import { jsonResult } from "./json-result.mjs";
import { fail } from "../starrcore/store.mjs";
import { installChatContext } from "./chat-context.mjs";
import { installUsageBudget } from "../conversation/budget.mjs";

// 兼容管理员显式绑定的宿主会话；工具只能注册到该 Agent 自身的作用域。
export function installBoundSessions(ctx, store, bindings, definitions) {
  const attached = new Map();
  const listeners = [];
  let closed = false;
  const detach = (agent) => {
    const entry = attached.get(agent?.id);
    if (!entry || entry.agent !== agent) return;
    attached.delete(agent.id);
    entry.disposers.reverse().forEach((remove) => remove?.());
  };
  const clear = () => {
    for (const { agent } of [...attached.values()]) detach(agent);
  };
  ctx.inject?.(["agents"], (child) => {
    if (closed || !child.agents?.list) return;
    const attach = (agent) => {
      if (closed || !agent) return;
      const characterId = Object.hasOwn(bindings, agent.id)
        ? bindings[agent.id]
        : undefined;
      const preset = agent.ctx
        ?.get?.("agentPresets")
        ?.composedPreset(agent.ctx);
      const current = attached.get(agent.id);
      if (
        current &&
        current.agent === agent &&
        current.characterId === characterId &&
        preset !== "starr-qqchat"
      )
        return;
      if (current) detach(current.agent);
      // QQ 预设自行提供工具与可信角色绑定，不叠加普通会话的兼容绑定。
      if (!characterId || preset === "starr-qqchat") return;
      if (!agent.ctx?.tools?.register) return;
      store.character(characterId);
      store.conversations.ensure({
        sessionId: agent.id,
        characterId,
        platform: "web",
        type: "web",
      });
      const entry = { agent, characterId, disposers: [] };
      try {
        entry.disposers.push(
          installChatContext(agent.ctx, store, () =>
            store.character(characterId),
          ),
        );
        entry.disposers.push(
          installUsageBudget(
            agent.ctx,
            store,
            () => store.character(characterId),
            () => agent,
          ),
        );
        for (const definition of definitions)
          entry.disposers.push(
            agent.ctx.tools.register({
              ...definition,
              execute: (args, exec) => {
                if (closed || attached.get(agent.id) !== entry)
                  throw fail("此会话的 starr 绑定已停止", 409);
                if (exec.agent?.id !== agent.id)
                  throw fail("此 starr 工具不属于当前宿主会话", 403);
                exec.signal?.throwIfAborted();
                return jsonResult(
                  createTools(store, {
                    characterId,
                    sessionId: agent.id,
                    signal: exec.signal,
                  })[definition.name](args),
                );
              },
            }),
          );
        attached.set(agent.id, entry);
      } catch (error) {
        entry.disposers.reverse().forEach((remove) => remove?.());
        throw error;
      }
    };
    listeners.push(child.on("agent/created", ({ agent }) => attach(agent)));
    listeners.push(child.on("agent/disposed", ({ agent }) => detach(agent)));
    listeners.push(
      child.on("agent-preset/selected", (sessionId) =>
        attach(child.agents.get(sessionId)),
      ),
    );
    child.effect(() => {
      for (const agent of child.agents.list()) attach(agent);
      return clear;
    });
  });
  return {
    close() {
      if (closed) return;
      closed = true;
      listeners.reverse().forEach((remove) => remove?.());
      clear();
    },
  };
}
