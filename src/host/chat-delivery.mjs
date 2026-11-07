// 自动来信保留本轮配置快照；角色身份仍由系统层和可信平台绑定决定。
export function conversationDelivery(preview, incoming) {
  return `${incoming}\n\n【本轮角色与接续资料】\n${preview.sections[0]?.text || ""}\n\n${preview.sections
    .slice(1)
    .map((section) => section.text)
    .join("\n\n")}`;
}
