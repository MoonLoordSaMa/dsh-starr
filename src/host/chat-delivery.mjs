import { roleContract } from "./role-contract.mjs";

// 自动来信保留本轮配置快照；角色身份仍由系统层和可信平台绑定决定。
export function conversationDelivery(preview, incoming) {
  return `【本轮系统提示 · 当前角色】\n${preview.sections[0]?.text || ""}\n\n${roleContract}\n\n【本轮上下文 · 言外之意】\n${preview.sections
    .slice(1)
    .map((section) => section.text)
    .join("\n\n")}\n\n【本轮平台来信】\n${incoming}`;
}
