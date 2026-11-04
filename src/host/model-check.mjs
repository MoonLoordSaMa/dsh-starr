import crypto from "node:crypto";
import { modelFailure } from "./model-failure.mjs";

export function modelDiagnostics(ctx) {
  let llm;
  ctx.inject?.(["llm"], (child) => {
    llm = child.llm;
  });
  return {
    async catalog() {
      if (!llm)
        return {
          providers: [],
          detail: "当前宿主未提供模型服务，请在 DSH 中打开新手调试",
        };
      const providers = await Promise.all(
        llm.listProviders().map(async (provider) => {
          try {
            const models = await llm.listModels(provider.id);
            return {
              id: provider.id,
              name: provider.name,
              models: models.map((model) => ({
                id: model.id,
                name: model.name,
                inputModalities: model.inputModalities || [],
              })),
            };
          } catch {
            return {
              id: provider.id,
              name: provider.name,
              models: [],
              error: "模型列表读取失败，请到 DSH 模型设置检查连接",
            };
          }
        }),
      );
      return {
        providers,
        detail: "使用 DSH 已有模型连接，密钥在 DSH 模型设置中管理",
      };
    },
    async test({ provider, model }) {
      const checkedAt = new Date().toISOString();
      if (!llm || !provider || !model)
        return {
          status: "unavailable",
          checkedAt,
          detail: "请先在 DSH 模型设置中添加连接，再选择服务与模型",
        };
      let finished = false;
      let called = false;
      let failure;
      const calls = new Map();
      try {
        const catalog = await this.catalog();
        if (
          !catalog.providers.some(
            (entry) =>
              entry.id === provider &&
              entry.models.some((entry) => entry.id === model),
          )
        )
          return {
            status: "unavailable",
            checkedAt,
            detail: "所选模型不在当前宿主模型列表中，请重新选择",
          };
        for await (const chunk of llm.stream({
          provider,
          model,
          signal: AbortSignal.timeout(20000),
          maxTokens: 128,
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              source: { kind: "user" },
              content: [
                {
                  type: "text",
                  text: "这是 starr 后台连接测试。请仅调用 starr_diagnostic_echo，参数 value 为 STARR_READY。不要调用其他工具。",
                },
              ],
            },
          ],
          tools: [
            {
              name: "starr_diagnostic_echo",
              description: "仅用于测试工具调用格式，不执行任何外部操作",
              parameters: {
                type: "object",
                properties: { value: { type: "string" } },
                required: ["value"],
                additionalProperties: false,
              },
            },
          ],
        })) {
          if (chunk.type === "tool-call-delta") {
            const call = calls.get(chunk.id) ?? { name: "", arguments: "" };
            if (chunk.name) call.name = chunk.name;
            call.arguments += chunk.argumentsDelta ?? "";
            if (call.arguments.length > 4096)
              throw new Error("诊断工具参数过长");
            calls.set(chunk.id, call);
          }
          if (chunk.type === "finish") {
            finished = true;
            if (["error", "aborted"].includes(chunk.reason?.kind))
              failure = modelFailure(
                chunk.reason.failure || {
                  code:
                    chunk.reason.kind === "aborted" ? "ABORTED" : "TRANSPORT",
                },
              );
          }
        }
        if (calls.size === 1) {
          const [call] = calls.values();
          try {
            const args = JSON.parse(call.arguments);
            called =
              call.name === "starr_diagnostic_echo" &&
              args?.value === "STARR_READY" &&
              Object.keys(args).length === 1;
          } catch {
            called = false;
          }
        }
      } catch (error) {
        failure = modelFailure(error);
      }
      return {
        provider,
        model,
        checkedAt,
        status:
          finished && !failure ? (called ? "verified" : "partial") : "failed",
        code: failure?.code,
        detail:
          failure || !finished
            ? failure?.detail || "模型未返回完整结束，请检查DSH连接后重试"
            : called
              ? "后台请求与工具调用响应通过；尚未验证实际 QQ 会话与发送流程"
              : "后台请求已完成，但未返回预期工具调用，暂不能认定 QQ 工具链可用",
        qqReplyVerified: false,
      };
    },
  };
}
