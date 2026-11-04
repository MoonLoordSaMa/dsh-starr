const field = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  "agency",
  help,
  extra,
];
export const agencyFields = [
  field(
    "agency.level",
    "主动范围",
    "select",
    "observe",
    "只观察不执行；主人私聊仅联系管理员绑定且已互动的主人；浏览增加已授权B站公开阅读；社交还需逐项平台授权。管理操作不进入自主调度。",
    { options: ["observe", "owner", "browse", "social"] },
  ),
  field(
    "agency.paused",
    "暂停全部后台主动活动",
    "boolean",
    false,
    "暂停目的执行、B站定时浏览和发布、星桥分享；普通来信回复仍由会话设置控制。",
  ),
  field(
    "agency.dailyDecisions",
    "近24小时主动评估最多轮数",
    "number",
    8,
    "每次模型评估都计入，失败与决定安静也计入，避免空转。",
    { min: 1, max: 100, integer: true },
  ),
  field(
    "agency.dailyActions",
    "近24小时目的执行最多外发次数",
    "number",
    3,
    "此执行器的主动发送与失败尝试共用额度；平台自身还有独立额度。",
    { min: 1, max: 30, integer: true },
  ),
  field(
    "agency.maxRequests",
    "每轮最多模型请求",
    "number",
    6,
    "每次模型请求前检查；超过上限停止本轮。",
    { min: 1, max: 12, integer: true },
  ),
  field(
    "agency.maxTools",
    "每轮最多工具调用",
    "number",
    12,
    "包括检索、记忆与外发；不可由角色自行提高。",
    { min: 1, max: 30, integer: true },
  ),
  field(
    "agency.maxTokens",
    "近24小时主动模型令牌预算",
    "number",
    30000,
    "仅累计此执行器的宿主实际用量；缺失用量停止后续自主轮次，不能将未知当作零。另受角色全局预算约束。",
    { min: 1000, max: 1000000, integer: true },
  ),
  field(
    "agency.failureLimit",
    "连续失败后自动停下",
    "number",
    3,
    "达到连续失败次数暂停新的自主轮次；需在时间线确认恢复，未知外发不会重发。",
    { min: 1, max: 10, integer: true },
  ),
  field(
    "agency.recentMinutes",
    "互动结束后至少等待（分钟）",
    "number",
    15,
    "主人最近仍在聊天或有未处理来信时不另起话题。",
    { min: 1, max: 1440, integer: true },
  ),
  field(
    "agency.busyHours",
    "主人说忙后安静（小时）",
    "number",
    4,
    "只根据可信主人私聊实际来信中的明确忙碌、睡觉或勿扰表达判断；不是情绪识别结论。",
    { min: 1, max: 48, integer: true },
  ),
];

export const agencyRank = (level) =>
  ["observe", "owner", "browse", "social"].indexOf(level);
export function quietNow(config, time = Date.now()) {
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: config["agency.timezone"],
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(time);
  const start = config["agency.quietStart"],
    end = config["agency.quietEnd"];
  return start === end
    ? false
    : start < end
      ? clock >= start && clock < end
      : clock >= start || clock < end;
}
