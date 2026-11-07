import crypto from "node:crypto";
import { fileWorkspace } from "./native-files.mjs";
import { fail } from "../starrcore/store.mjs";

export function taskSessionId(characterId, lane, origin = "") {
  return `session-starr-task-${crypto
    .createHash("sha256")
    .update(JSON.stringify([characterId, lane, origin]))
    .digest("hex")
    .slice(0, 32)}`;
}

// 使用宿主真实的标题服务；用户手动改过的正常聊天标题保留。
export function nameSession(ctx, agent, title) {
  const service = ctx.get?.("sessionTitle");
  if (!service?.rename || !agent.session?.snapshotEvents) return false;
  const current = service.get(agent.session);
  if (
    current?.source?.kind === "user" &&
    !current.title.startsWith("【本轮系统提示")
  )
    return false;
  service.rename(agent.session, title);
  return true;
}

export async function taskAgent(
  ctx,
  store,
  { sessionId, characterId, title, provider, model, signal },
) {
  store.db.exec(
    "CREATE TABLE IF NOT EXISTS host_task_sessions(session_id TEXT PRIMARY KEY,character_id TEXT NOT NULL)",
  );
  const known = store.db
    .prepare("SELECT character_id FROM host_task_sessions WHERE session_id=?")
    .get(sessionId);
  if (known && known.character_id !== characterId)
    throw fail("后台会话与角色不匹配", 403);
  let agent = ctx.agents.get?.(sessionId);
  if (agent?.status === "running")
    throw fail("同类后台任务尚未结束，请稍后再试", 409);
  if (!agent) {
    const options = {
      agentOptions: { provider, model },
      signal,
      setup: async (scope) => ctx.agentPresets.mount(scope, "starr-qqchat"),
    };
    const handle = known
      ? await ctx.agents.resume({ ...options, resumeSessionId: sessionId })
      : await ctx.agents.create({
          ...options,
          sessionId,
          meta: {
            cwd: fileWorkspace(store, characterId, { create: true }),
            agentPreset: "starr-qqchat",
          },
        });
    agent = handle.agent;
    store.db
      .prepare("INSERT OR IGNORE INTO host_task_sessions VALUES(?,?)")
      .run(sessionId, characterId);
  }
  if (agent.options) {
    agent.options.provider = provider;
    agent.options.model = model;
  }
  nameSession(ctx, agent, title);
  return { agent };
}
