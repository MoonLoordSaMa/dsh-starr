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
    "agency.observeGroups",
    "观察允许群的日常消息",
    "boolean",
    false,
    "将未被 @ 的普通群消息保存为观察记录，不立即唤醒模型；主动评估只读取近期真实消息。仍受 QQ 群允许名单及会话黑名单约束。",
  ),
  field(
    "agency.groupEnabled",
    "允许自主参与群聊",
    "boolean",
    false,
    "还需社交级主动范围与 QQ 群允许名单；只在已有群会话发言，不向陌生群发送。",
  ),
  field(
    "agency.groupGapMinutes",
    "同一群主动发言间隔（分钟）",
    "number",
    15,
    "没有新群消息或仍有待处理来信时不另起一轮。",
    { min: 5, max: 1440, integer: true },
  ),
  field(
    "agency.groupRecentMinutes",
    "参与最近多少分钟的群话题",
    "number",
    120,
    "只从近期有新消息的群里选择话题，避免接续过时讨论。",
    { min: 1, max: 1440, integer: true },
  ),
  field(
    "agency.opportunityMinutes",
    "日常主动评估间隔（分钟）",
    "number",
    20,
    "不依赖情绪强度，定期检查约定、近况与已授权的探索机会；平静、低落和愉快时都可行动。没有合适内容可保持安静，仍受冷却、作息、权限和预算限制。0 表示只按明确目的与需求触发。",
    { min: 0, max: 1440, integer: true },
  ),
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
    48,
    "每次模型评估都计入，失败与决定安静也计入，避免空转。",
    { min: 1, max: 100, integer: true },
  ),
  field(
    "agency.dailyActions",
    "近24小时目的执行最多外发次数",
    "number",
    12,
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
    160000,
    "累计宿主已报告用量；未报告的请求单独显示，不记作零。是否因缺失用量停下，统一由模型用量页的闸门控制。",
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
    "主人明确要求勿扰后等待（小时）",
    "number",
    4,
    "只依据主人最近一条明确的勿扰表达；普通忙碌、情绪与晚安不触发固定禁言。",
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
