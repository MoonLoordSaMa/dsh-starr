import { StarrStore, fail } from "../starrcore/store.mjs";
import { createTools } from "./tools.mjs";
import { jsonResult } from "./json-result.mjs";
import { toolSpecifications } from "./plugin.mjs";
import { Onboarding } from "../onboarding/service.mjs";
import { installChatContext } from "./chat-context.mjs";
import { installUsageBudget } from "../conversation/budget.mjs";

export const name = "starr-qq-session";
export const inject = ["tools", "systemPrompt", "agents"];

export function apply(ctx, config) {
  if (!ctx.tools?.guard || !ctx.tools?.presentAs)
    throw fail("当前 DSH 不支持 QQ 会话的管理操作约束，请升级宿主", 409);
  const store = new StarrStore(config.dataRoot);
  new Onboarding(store);
  store.db.exec(
    "CREATE TABLE IF NOT EXISTS qq_session_bindings (session_id TEXT PRIMARY KEY, character_id TEXT NOT NULL REFERENCES characters(id))",
  );
  const dispose = [];
  let closed = false;
  function characterFor(sessionId) {
    if (closed || !sessionId) throw fail("QQ 会话上下文尚未就绪", 409);
    let binding = store.db
      .prepare(
        "SELECT character_id FROM qq_session_bindings WHERE session_id=?",
      )
      .get(sessionId);
    if (!binding) {
      const row = store.db
        .prepare("SELECT data FROM onboarding WHERE id=1")
        .get();
      const state = row ? JSON.parse(row.data) : null;
      if (!state?.completedAt || !state.characterId)
        throw fail("请先打开 starr 完成新手调试，再使用 QQ 会话", 409);
      store.character(state.characterId);
      store.db
        .prepare("INSERT OR IGNORE INTO qq_session_bindings VALUES(?,?)")
        .run(sessionId, state.characterId);
      binding = store.db
        .prepare(
          "SELECT character_id FROM qq_session_bindings WHERE session_id=?",
        )
        .get(sessionId);
    }
    if (
      !store.db
        .prepare("SELECT session_id FROM chat_sessions WHERE session_id=?")
        .get(sessionId)
    ) {
      const hasThreads = store.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='qq_threads'",
        )
        .get();
      const thread = hasThreads
        ? store.db
            .prepare(
              "SELECT t.*,json_extract(i.payload,'$.selfId') AS account FROM qq_threads t LEFT JOIN qq_inbox i ON i.thread_key=t.key WHERE t.session_id=? ORDER BY i.seq DESC LIMIT 1",
            )
            .get(sessionId)
        : null;
      store.conversations.ensure({
        sessionId,
        characterId: binding.character_id,
        platform: thread ? "qq" : "web",
        type: thread?.type || "web",
        account: thread?.account || "",
        target: thread?.target || "",
      });
    }
    return store.character(binding.character_id);
  }
  try {
    dispose.push(ctx.tools.presentAs("native"));
    const management = new Set([
      "exec_command",
      "write_stdin",
      "bash",
      "pwsh",
      "powershell",
      "terminal_open",
      "terminal_send",
      "terminal_signal",
      "terminal_close",
      "Config",
      ...(config.managementTools ?? []),
    ]);
    dispose.push(
      ctx.tools.guard((exec) =>
        management.has(exec.name)
          ? "此管理操作请在 DSH 管理会话执行；QQ 角色会话不执行终端或修改宿主配置；普通文件读写使用 DSH 原生文件工具"
          : undefined,
      ),
    );
    for (const spec of toolSpecifications) {
      const properties = {};
      const required = [];
      for (const [key, value] of Object.entries(spec.parameters)) {
        const { required: isRequired, ...definition } = value;
        properties[key] = definition;
        if (isRequired) required.push(key);
      }
      dispose.push(
        ctx.tools.register({
          ...spec,
          parameters: {
            type: "object",
            properties,
            additionalProperties: false,
            ...(required.length ? { required } : {}),
          },
          output: {
            schema: {},
            render: (_args, value) => [
              { type: "text", text: JSON.stringify(value) },
            ],
          },
          execute: (args, exec) => {
            exec.signal?.throwIfAborted();
            const character = characterFor(exec.agent?.id);
            return jsonResult(
              createTools(store, {
                characterId: character.id,
                sessionId: exec.agent.id,
                signal: exec.signal,
              })[spec.name](args),
            );
          },
        }),
      );
    }
    dispose.push(
      installChatContext(ctx, store, characterFor, { roleConversation: true }),
    );
    dispose.push(installUsageBudget(ctx, store, characterFor));
    dispose.push(
      ctx.systemPrompt.section({
        name: "deployment:persona-suffix",
        order: ctx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_SUFFIX"),
        text: "Starr-chat 使用当前人设与可信会话身份。平台回复通过该会话的发送工具完成，结果未知时不重发。",
      }),
    );
  } catch (error) {
    dispose.reverse().forEach((remove) => remove?.());
    store.close();
    throw error;
  }
  const close = () => {
    if (closed) return;
    closed = true;
    dispose.reverse().forEach((remove) => remove?.());
    store.close();
  };
  ctx.on("dispose", close);
  return close;
}
