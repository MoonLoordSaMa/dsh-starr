import fs from "node:fs";
import { fields } from "../src/starrcore/config.mjs";
const { version } = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const titles = {
  agency: "主动范围、预算与暂停",
  bridge: "B站到 QQ 分享",
  "bili-actions": "B站公开内容管理",
  "chat-social": "QQ 群成员、拍一拍与问题反馈",
  appearance: "界面与动态",
  memory: "记忆权重与投影",
  state: "目的与作息",
  permissions: "日常配置授权",
  media: "媒体共用连接",
  tts: "说话连接与音色",
  asr: "听写连接",
  vision: "视觉连接",
  "chat-context": "上下文注入",
  "chat-memory": "记忆共享授权",
  "chat-wake": "唤醒、观察与额度",
  "chat-reply": "回复、等待与收尾",
  "chat-access": "拒收与刷屏保护",
  "chat-tools": "基础会话工具",
  "chat-media": "QQ 图片、语音、表情与历史",
  "memory-jobs": "日记与整理模型",
  bili: "B站模型与互动对象",
  "bili-dm": "B站私信",
  "bili-comment": "B站评论",
  "bili-live": "B站直播",
  "bili-limits": "B站监听与额度",
  "tts-local": "本地 Breeze",
  "sing-local": "本地 SoulX",
  sing: "唱歌连接与推理",
  "bili-watch": "B站资料阅读",
  "bili-preferences": "B站兴趣",
  "bili-share": "B站视频分享",
  "bili-dynamics": "B站动态发布",
  "chat-budget": "模型用量与估算费用",
  "chat-slang": "会话用语学习",
};
const text = (value) =>
  String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
const lines = [
  `# 全部有效配置（${version}）`,
  "",
  `由统一字段定义生成，共 ${fields.length} 项角色配置。默认停用的外发/任务需要管理员明确开启。下面仅列配置定义，外部平台和模型的实际可用性仍需真实验证。`,
  "",
  "QQ 连接是全局传输配置，另列在文末；角色习惯、B站与媒体配置按当前角色隔离。凭据原文不会成为这些字段的默认值。",
  "",
  "字段变更与旧值转换见 V013.md 和网页旧版对照。标注“是”的字段仍需要 permissions.botConfig 授权，数字每次调整幅度还受限制。",
  "",
];
for (const page of [...new Set(fields.map((f) => f.page))]) {
  const group = fields.filter((f) => f.page === page);
  lines.push(
    `## ${titles[page] || page.replace("memory-job-", "记忆任务 · ").replace("bili-dynamic-", "动态类型 · ")}`,
    "",
    "| 字段 / 标签 | 默认值 | 范围与选项 | 允许角色调整 | 作用 |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const f of group)
    lines.push(
      `| ${f.key}<br>${text(f.label)} | ${text(f.default === "" ? "空" : JSON.stringify(f.default))} | ${text(f.options?.join(" / ") || (f.min !== undefined ? `${f.min}–${f.max}${f.integer ? "（整数）" : ""}` : f.type))} | ${f.bot ? "是" : "否"} | ${text(f.help)} |`,
    );
  lines.push("");
}
lines.push(
  "## QQ 接入（全局传输）",
  "",
  "| 字段 | 默认值 | 作用 |",
  "| --- | --- | --- |",
  "| enabled | false | 管理员明确启用后处理允许名单 |",
  "| httpPort / wsPort | 3000 / 3001 | SnowLuma 正向 HTTP / WebSocket，仅本机 |",
  "| tokenEnv | SNOWLUMA_TOKEN | 启动环境变量名；也可 Windows 系统加密保存令牌原文 |",
  "| privateUsers / groups | 空 | 允许对象；空列表不开放 |",
  "| requireMention | true | 群聊先要求 @，再判断角色唤醒 |",
  "| provider / model | 空 | DSH 已登记的模型连接与模型 |",
  "| characterId | 空 | 固定角色编号，不随网页当前角色切换 |",
  "| mergeMs | 1200 | 合并短消息，200–5000 毫秒 |",
  "",
);
fs.writeFileSync(
  new URL("../docs/CONFIGURATION.md", import.meta.url),
  lines.join("\n"),
);
console.log(`已生成 ${fields.length} 项角色配置与 QQ 接入说明`);
