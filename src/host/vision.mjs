import crypto from "node:crypto";
import { modelFailure } from "./model-failure.mjs";
import { fail } from "../starrcore/store.mjs";

// 列表与附件服务没有signal参数，仍需及时结束已取消的调用。
function abortable(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

// 使用DSH真实附件引用与模型流，不伪造本机/v1接口。
export function createHostVision(
  ctx,
  store,
  { characterSelection = () => null } = {},
) {
  let runtime,
    agents,
    defaults,
    closed = false;
  const active = new Set();
  ctx.inject?.(["llm", "attachments"], (child) =>
    child.effect(() => {
      const current = { llm: child.llm, attachments: child.attachments };
      runtime = current;
      return () => {
        if (runtime === current) runtime = null;
        for (const controller of active)
          controller.abort(fail("DSH视觉服务已停止", 409));
      };
    }),
  );
  ctx.inject?.(["agents"], (child) =>
    child.effect(() => {
      agents = child.agents;
      return () => {
        if (agents === child.agents) agents = null;
      };
    }),
  );
  ctx.inject?.(["agentDefaultModel"], (child) =>
    child.effect(() => {
      defaults = child.agentDefaultModel;
      return () => {
        if (defaults === child.agentDefaultModel) defaults = null;
      };
    }),
  );
  const ready = () => {
    if (closed || !runtime?.llm?.stream || !runtime?.attachments?.saveImage)
      throw fail("DSH模型或附件服务尚未就绪，请从DSH内打开starr", 409);
    return runtime;
  };
  const checkRoute = async (selection, signal) => {
    signal?.throwIfAborted();
    const { llm } = ready();
    if (!selection?.provider || !selection?.model)
      throw fail(
        "请在DSH配置角色聊天模型，或在视觉页选择支持图片的宿主模型",
        409,
      );
    const models = await abortable(llm.listModels(selection.provider), signal);
    const model = models.find((m) => m.id === selection.model);
    if (!model?.inputModalities?.includes("image"))
      throw fail("所选DSH模型未声明支持图片输入，请选择带视觉能力的模型", 409);
    return { provider: selection.provider, model: selection.model };
  };
  return {
    async supportsRoute(selection, { signal } = {}) {
      try {
        await checkRoute(selection, signal || AbortSignal.timeout(10000));
        return true;
      } catch {
        signal?.throwIfAborted();
        return false;
      }
    },
    async select(
      characterId,
      { sessionId, modelSelection, signal = AbortSignal.timeout(10000) } = {},
    ) {
      const c = store.character(characterId).config;
      if (
        sessionId &&
        store.conversations.get(sessionId).character_id !== characterId
      )
        throw fail("视觉调用不属于当前角色会话", 403);
      let selected;
      if (c["vision.host.provider"] || c["vision.host.model"])
        selected = {
          provider: c["vision.host.provider"],
          model: c["vision.host.model"],
        };
      else if (modelSelection) selected = modelSelection;
      else if (sessionId) {
        selected = agents?.get(sessionId)?.options;
      }
      return checkRoute(
        selected ||
          characterSelection(characterId) ||
          defaults?.currentSelection(),
        signal,
      );
    },
    async imageBlock({ image, name = "starr-image", signal }) {
      const { attachments } = ready();
      signal?.throwIfAborted();
      const match =
        /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
          image || "",
        );
      const data = match && Buffer.from(match[2], "base64");
      if (
        !data?.length ||
        data.length > 8 * 1024 * 1024 ||
        data.toString("base64") !== match[2]
      )
        throw fail("请提供8MB内有效PNG、JPEG或WebP图片", 400);
      const attachment = await abortable(
        attachments.saveImage({
          data: new Uint8Array(data),
          mediaType: match[1],
          name,
        }),
        signal,
      );
      signal?.throwIfAborted();
      return { type: "image", attachment };
    },
    async see(characterId, { image, prompt }, options = {}) {
      const c = store.character(characterId).config;
      if (c["vision.connection"] !== "host")
        throw fail("DSH视觉连接未启用", 409);
      const controller = new AbortController();
      const signal = AbortSignal.any([
        controller.signal,
        AbortSignal.timeout((c["vision.timeoutSeconds"] || 60) * 1000),
        ...(options.signal ? [options.signal] : []),
      ]);
      active.add(controller);
      try {
        const selected = await this.select(characterId, { ...options, signal });
        signal.throwIfAborted();
        const block = await this.imageBlock({ image, signal });
        const current = store.character(characterId).config;
        if (
          [
            "vision.connection",
            "vision.host.provider",
            "vision.host.model",
          ].some((key) => current[key] !== c[key])
        )
          throw fail("视觉连接已改变，请按新配置重新提交", 409);
        const { llm } = ready();
        let answer = "",
          finished = false;
        for await (const chunk of llm.stream({
          ...selected,
          signal,
          maxTokens: c["vision.maxTokens"] || 4096,
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              source: { kind: "user" },
              content: [{ type: "text", text: prompt }, block],
            },
          ],
          tools: [],
        })) {
          signal.throwIfAborted();
          if (chunk.type === "text-delta") answer += chunk.text || "";
          if (answer.length > 40000) throw fail("DSH视觉回答超过长度上限", 502);
          if (chunk.type === "finish") {
            finished = true;
            if (chunk.reason?.kind !== "stop") {
              const failure = modelFailure(
                chunk.reason?.failure || {
                  code:
                    chunk.reason?.kind === "aborted"
                      ? "ABORTED"
                      : ["max-tokens", "length"].includes(chunk.reason?.kind)
                        ? "MAX_TOKENS"
                        : "INVALID_REQUEST",
                },
              );
              throw Object.assign(
                fail(
                  `DSH视觉调用失败：${failure.code === "MODEL_OUTPUT_LIMIT" ? "图片分析达到输出令牌上限，请在视觉页调高“视觉输出令牌上限”后重试" : failure.detail}`,
                  502,
                ),
                { code: failure.code },
              );
            }
          }
        }
        signal.throwIfAborted();
        if (!finished || !answer.trim())
          throw fail("DSH视觉未返回完整的图片回答", 502);
        return {
          answer,
          ...selected,
          connection: "host",
          verifiedAt: new Date().toISOString(),
        };
      } catch (error) {
        if (error.status) throw error;
        if (signal.aborted) throw fail("DSH视觉调用已取消或超时", 504);
        const failure = modelFailure(error);
        throw Object.assign(fail(`DSH视觉调用失败：${failure.detail}`, 502), {
          code: failure.code,
        });
      } finally {
        active.delete(controller);
      }
    },
    close() {
      closed = true;
      for (const controller of active)
        controller.abort(fail("视觉调用已停止", 409));
    },
  };
}
