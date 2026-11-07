import { roleContract } from "./role-contract.mjs";
import { capabilityPrompt } from "./capabilities.mjs";

export function installChatContext(
  ctx,
  store,
  resolveCharacter,
  { roleConversation = false } = {},
) {
  if (!ctx.systemPrompt?.section) return () => {};
  const assembled = new Map();
  let claimedQuery, claimedTurn, claimedId;
  const removeClaim = ctx.on?.("agent/inbox/claimed", ({ message, turn }) => {
    if (message?.role !== "user" || message.source?.kind === "runtime-context")
      return;
    const text = (message.content || [])
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    claimedQuery = (
      claimedTurn === turn ? `${claimedQuery || ""}\n${text}` : text
    ).slice(-4000);
    claimedTurn = turn;
    claimedId = message.id;
  });
  const build = ({ scope }) => {
    const character = resolveCharacter(scope?.id);
    const existing = store.db
      .prepare("SELECT session_id FROM chat_sessions WHERE session_id=?")
      .get(scope.id);
    if (!existing)
      store.conversations.ensure({
        sessionId: scope.id,
        characterId: character.id,
        platform: "web",
        type: "web",
      });
    const session = store.conversations.get(scope.id);
    const events = scope.session?.snapshotEvents?.() || [];
    const user = events.findLast(
      (event) =>
        event.type === "user/message" &&
        event.data?.source?.kind !== "runtime-context",
    )?.data;
    const query =
      session.platform === "web"
        ? (claimedQuery ??
          (user?.content
            ? user.content
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("\n")
            : undefined))
        : undefined;
    if (query !== undefined && query !== session.query)
      store.conversations.query(scope.id, query);
    const preview = store.conversations.context(scope.id, { q: query });
    assembled.set(scope.id, preview);
    return preview;
  };
  const removers = [
    removeClaim,
    ctx.systemPrompt.section({
      name: "deployment:persona-prefix",
      order: ctx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX"),
      interpolate: false,
      ...(roleConversation ? { complete: true } : {}),
      text: (context) => {
        const preview = build(context);
        const text = ctx.systemPrompt.context
          ? preview.sections[0]?.text || ""
          : preview.text;
        return roleConversation
          ? `${text}\n\n${roleContract}\n${capabilityPrompt(store, resolveCharacter(context.scope?.id).id, context.scope?.id)}`
          : text;
      },
    }),
  ];
  if (ctx.systemPrompt.context)
    removers.push(
      ctx.systemPrompt.context({
        name: "starr:conversation",
        order: 300,
        interpolate: false,
        required: true,
        text: (context) => {
          const preview = build(context);
          const latest = context.scope.session
            ?.snapshotEvents?.()
            .findLast(
              (e) =>
                e.type === "user/message" && e.data?.source?.kind === "user",
            )?.data;
          // 初始快照已随可见来信投递；工具改变资料后才补充新的运行快照。
          if (
            roleConversation &&
            store.conversations.matchesDelivery(
              context.scope.id,
              claimedId || latest?.id,
              preview,
            )
          )
            return "";
          return preview.sections
            .slice(1)
            .map((s) => s.text)
            .join("\n\n");
        },
      }),
    );
  removers.push(
    ctx.on?.("agent/status", ({ status }) => {
      if (status !== "idle") return;
      let agent;
      try {
        agent = ctx.agents?.requireInitiator?.();
      } catch {
        return;
      }
      const preview = assembled.get(agent?.id);
      if (!preview || !agent.session?.snapshotEvents) return;
      const events = agent.session.snapshotEvents();
      const result = events.findLast((e) => e.type === "assistant/message");
      if (!result || result.data?.interrupted) return;
      // 只核对该响应之前最新的系统提示和运行快照，不能用更早的同名内容凑成成功。
      const admitted = events.filter((e) => e.seq <= result.seq);
      const system = admitted.findLast((e) => e.type === "system/message")?.data
        ?.message;
      const runtime = admitted.findLast(
        (e) =>
          e.type === "user/message" &&
          e.data?.source?.kind === "runtime-context",
      )?.data;
      const text = (message) =>
        (message?.content || [])
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("\n");
      const core = text(system),
        dynamic = text(runtime);
      const incoming = admitted.findLast(
        (e) => e.type === "user/message" && e.data?.source?.kind === "user",
      )?.data;
      const delivery = store.conversations.delivery(agent.id);
      const visible =
        roleConversation && delivery?.messageId === incoming?.id
          ? text(incoming)
          : "";
      const hasRuntime = runtime?.source?.sections
        ? runtime.source.sections.some((s) => s.name === "starr:conversation")
        : preview.sections.slice(1).some((s) => dynamic.includes(s.text));
      const current = hasRuntime ? dynamic : visible || dynamic;
      const missingSections = preview.sections
        .filter(
          (s, i) =>
            !(
              i === 0 ? core : ctx.systemPrompt.context ? current : core
            ).includes(s.text),
        )
        .map((s) => s.name);
      store.conversations.recordInjection(agent.id, preview, {
        verified:
          !missingSections.length &&
          (!roleConversation || core.includes(roleContract)),
        missingSections,
        placement: hasRuntime || !visible ? "runtime" : "message",
        roleConversation,
        completed: result.time || Date.now(),
        requestSeq: result.seq,
      });
    }),
  );
  return () => removers.reverse().forEach((remove) => remove?.());
}
