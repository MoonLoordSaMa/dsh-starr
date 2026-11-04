export const jobKinds = {
  diaryDay: "白天日记",
  diaryNight: "晚间日记",
  organize: "记忆整理",
  weekly: "每周回顾",
  monthly: "每月回顾",
  yearly: "每年回顾",
  backup: "角色备份",
  projection: "笔记同步补漏",
};
const f = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  ["jobs.provider", "jobs.model"].includes(key)
    ? "memory-jobs"
    : `memory-job-${key.split(".")[1]}`,
  help,
  extra,
];
export const jobFields = [
  f(
    "jobs.provider",
    "整理模型连接",
    "text",
    "",
    "填写 DSH 已登记的连接标识；日记与回顾在独立角色会话内完成，不改聊天默认模型。",
  ),
  f(
    "jobs.model",
    "整理模型",
    "text",
    "",
    "填写该连接中的模型标识；备份和同步补漏不调用模型。",
  ),
  ...Object.entries(jobKinds).flatMap(([key, label], index) => [
    f(
      `jobs.${key}.enabled`,
      `${label} · 启用`,
      "boolean",
      false,
      "到点后仅运行一次；关闭后不再调度。正在执行的模型任务会收到中止信号。",
    ),
    f(
      `jobs.${key}.at`,
      `${label} · 本地时间`,
      "time",
      ["12:00", "23:00", "03:00", "20:00", "20:00", "20:00", "04:00", "05:00"][
        index
      ],
      "使用角色作息时区；周回顾在周日，月回顾在每月1日，年回顾在1月1日。",
    ),
    f(
      `jobs.${key}.catchUpHours`,
      `${label} · 补跑窗口（小时）`,
      "number",
      6,
      "停机错过后，仅在此窗口内补跑最近一次；不无限追补旧任务。",
      { min: 1, max: 168, integer: true },
    ),
  ]),
];
