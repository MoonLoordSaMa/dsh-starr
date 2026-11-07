import { chatFields } from "../conversation/config.mjs";
import { policyFields } from "../conversation/policy.mjs";
import { mediaFields } from "../media/config.mjs";
import { qqCapabilityFields } from "../qq/capabilities.mjs";
import { jobFields } from "../jobs/config.mjs";
import { biliFields } from "../bili/config.mjs";
import { localMediaFields } from "../media/local.mjs";
import { singingFields } from "../media/singing.mjs";
import { activityFields, dynamicKinds, inWindow } from "../bili/activities.mjs";
import { budgetFields } from "../conversation/budget.mjs";
import { slangFields } from "../conversation/slang.mjs";
import { bridgeFields } from "../bridge/service.mjs";
import { operationFields } from "../bili/operations.mjs";
import { socialFields } from "../qq/social.mjs";
import { autonomyFields } from "../bili/autonomy.mjs";
import { agencyFields } from "../agency/config.mjs";
import { browserFields } from "../browser/tabbit.mjs";
import { fileFields } from "../host/native-files.mjs";
import path from "node:path";
export const fields = [
  ...fileFields,
  ...browserFields,
  ...agencyFields,
  ...autonomyFields,
  [
    "ui.motion",
    "动态效果",
    "select",
    "default",
    "appearance",
    "强动效保留完整星光，轻量模式减少粒子；减少动态会停止持续运动。",
    { options: ["vivid", "default", "light", "reduced"] },
  ],
  [
    "ui.blur",
    "局部玻璃层次",
    "number",
    8,
    "appearance",
    "只磨砂面板和标签覆盖的背景；外面板、内标签与浮层分层处理，数值越高质感越明显。",
    { min: 0, max: 14 },
  ],
  [
    "ui.starDensity",
    "背景星光密度",
    "number",
    1,
    "appearance",
    "在设备允许的范围内增加远星与近星，页面切换复用同一个背景。",
    { min: 0.4, max: 2 },
  ],
  [
    "memory.halfLifeDays",
    "普通记忆半衰期",
    "number",
    90,
    "memory",
    "经过这段天数，普通记忆的新鲜度减半；原文保留，锚点不受衰减。",
    { min: 1, max: 3650 },
  ],
  [
    "memory.recallLimit",
    "每次召回条数",
    "number",
    6,
    "memory",
    "限制一次工具检索返回的记忆数量，减少无关上下文。",
    { min: 1, max: 30, bot: true },
  ],
  [
    "memory.projectionEnabled",
    "输出 Obsidian 笔记",
    "boolean",
    true,
    "memory",
    "提交记忆后输出带稳定编号的 Markdown 笔记；失败进入可重试队列。",
  ],
  [
    "agency.enabled",
    "开启自主活动",
    "boolean",
    false,
    "state",
    "开启后结合主动范围、冷却、预算与安静时段评估和执行；默认只观察。不会按固定间隔强制发言。",
  ],
  [
    "agency.cooldownMinutes",
    "主动外发最短间隔（分钟）",
    "number",
    30,
    "state",
    "仅约束外发；内部阅读、反思、记忆和目的管理可继续。",
    { min: 5, max: 1440 },
  ],
  [
    "agency.quietStart",
    "安静时段开始",
    "time",
    "23:00",
    "state",
    "主动目的在安静时段等待；用户直接请求仍由会话处理。",
  ],
  [
    "agency.quietEnd",
    "安静时段结束",
    "time",
    "08:00",
    "state",
    "按安装时选择的时区判断，不依赖网页机器的时区。",
  ],
  [
    "agency.timezone",
    "作息时区",
    "text",
    "Asia/Shanghai",
    "state",
    "例如 Asia/Shanghai，供安静时段与到期目的评估使用。",
  ],
  [
    "permissions.botConfig",
    "允许 bot 调整日常习惯",
    "boolean",
    false,
    "permissions",
    "仅允许调整明确列出的安全字段；不包含路径、密钥、管理员和授权本身。",
  ],
  [
    "media.baseUrl",
    "兼容服务地址",
    "url",
    "",
    "media",
    "填写服务的版本入口，例如 https://服务商/v1；各能力分别验证。",
  ],
  [
    "media.secretEnv",
    "凭据环境变量名",
    "text",
    "",
    "media",
    "只保存变量名称，密钥由启动环境提供，不写入配置或返回网页。",
  ],
  [
    "media.timeoutSeconds",
    "请求超时",
    "number",
    60,
    "media",
    "连接或生成超过此时间终止请求，失败不会伪装成可用。",
    { min: 5, max: 300 },
  ],
  [
    "tts.model",
    "说话模型",
    "text",
    "",
    "tts",
    "兼容服务的语音合成模型标识；与聊天模型分别配置。",
  ],
  [
    "tts.voice",
    "音色",
    "text",
    "alloy",
    "tts",
    "服务支持的音色标识；填写名称不代表服务具备该音色。",
  ],
  [
    "tts.speed",
    "说话速度",
    "number",
    1,
    "tts",
    "适用于支持 speed 参数的语音服务。",
    { min: 0.25, max: 4, bot: true },
  ],
  [
    "asr.model",
    "听写模型",
    "text",
    "",
    "asr",
    "兼容 audio/transcriptions 的模型；需要单独真实测试。",
  ],
  [
    "asr.language",
    "听写语言",
    "text",
    "zh",
    "asr",
    "可填 zh 或 en；留空由服务识别。",
  ],
  [
    "vision.model",
    "看图模型",
    "text",
    "",
    "vision",
    "仅供共用或独立兼容接口使用；选择DSH宿主视觉时请在使用方式中选择已登记的视觉模型。",
  ],
  ...chatFields,
  ...policyFields,
  ...mediaFields,
  ...qqCapabilityFields,
  ...jobFields,
  ...biliFields,
  ...localMediaFields,
  ...singingFields,
  ...activityFields,
  ...budgetFields,
  ...slangFields,
  ...bridgeFields,
  ...operationFields,
  ...socialFields,
  [
    "memory.linkThreshold",
    "笔记双链的关系强度门槛",
    "number",
    0.65,
    "memory",
    "显式双链始终同步；语义与时间关联达到门槛后写入 Obsidian，星图保留原关系类型。",
    { min: 0, max: 1 },
  ],
  [
    "permissions.botMemoryArchive",
    "允许角色归档本会话记忆",
    "boolean",
    false,
    "permissions",
    "角色自主决定记什么、关联什么、淡忘什么；归档保留可恢复原文。日记受保护，不能归档其他对象的私密记忆或清空全库。",
  ],
  [
    "ui.quality",
    "背景渲染品质",
    "select",
    "auto",
    "appearance",
    "自动按实际绘制耗时调整分辨率；高品质保留细节，轻量降低像素和帧率。",
    { options: ["auto", "high", "low"] },
  ],
].map(([key, label, type, value, page, help, extra = {}]) => ({
  key,
  label,
  type,
  default: value,
  page: key.startsWith("bili.dynamics.") ? "retired" : page,
  help,
  ...extra,
  ...([
    "memory.halfLifeDays",
    "memory.anchorBoost",
    "memory.minRecallScore",
    "context.recentMemoryLimit",
    "context.recentMemoryDays",
    "context.anchorMemoryLimit",
    "context.includeDiary",
    "context.includeState",
    "context.includeSummary",
    "tts.voice",
    "tts.instructions",
    "sing.pitchShift",
    "sing.autoShift",
    "sing.steps",
    "sing.guidance",
    "bili.preferences.like",
    "bili.preferences.dislike",
    "bili.preferences.keywords",
    "bili.preferences.likeWeight",
    "bili.preferences.dislikeWeight",
  ].includes(key)
    ? { bot: true }
    : {}),
}));
export const defaults = () =>
  Object.fromEntries(fields.map((f) => [f.key, f.default]));
export function validatePatch(patch, { bot = false, current = {} } = {}) {
  if (
    !patch ||
    typeof patch !== "object" ||
    Array.isArray(patch) ||
    Object.keys(patch).length > 40
  )
    throw Object.assign(new Error("配置修改必须是字段对象"), { status: 400 });
  for (const [key, value] of Object.entries(patch)) {
    const f = fields.find((f) => f.key === key);
    if (!f)
      throw Object.assign(new Error(`未定义的配置：${key}`), { status: 400 });
    if (bot && (!current["permissions.botConfig"] || !f.bot))
      throw Object.assign(new Error(`没有调整此项的授权：${key}`), {
        status: 403,
      });
    if (
      f.type === "number"
        ? typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < f.min ||
          value > f.max
        : f.type === "boolean"
          ? typeof value !== "boolean"
          : typeof value !== "string" || value.length > 2000
    )
      throw Object.assign(new Error(`${f.label}的值不符合范围`), {
        status: 400,
      });
    if (f.options && !f.options.includes(value))
      throw Object.assign(new Error(`${f.label}没有这个选项`), { status: 400 });
    if ((key === "memory.recallLimit" || f.integer) && !Number.isInteger(value))
      throw Object.assign(new Error(`${f.label}必须是整数`), { status: 400 });
    if (f.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
      throw Object.assign(new Error("时间格式应为 HH:mm"), { status: 400 });
    if (f.type === "url" && value) {
      const u = new URL(value);
      if (
        !["http:", "https:"].includes(u.protocol) ||
        u.username ||
        u.password ||
        u.search ||
        u.hash
      )
        throw Object.assign(
          new Error("服务地址只接受不含凭据、查询参数的 HTTP(S) 入口"),
          { status: 400 },
        );
    }
    if (
      (key === "media.secretEnv" || key.endsWith(".secretEnv")) &&
      value &&
      !/^[A-Z][A-Z0-9_]{1,100}$/.test(value)
    )
      throw Object.assign(new Error("请填写环境变量名，例如 STARR_MEDIA_KEY"), {
        status: 400,
      });
    if (key === "agency.timezone") {
      try {
        new Intl.DateTimeFormat("zh-CN", { timeZone: value });
      } catch {
        throw Object.assign(new Error("时区名称无效"), { status: 400 });
      }
    }
    if (
      bot &&
      f.type === "number" &&
      Math.abs(value - current[key]) > (f.max - f.min) * 0.2
    )
      throw Object.assign(new Error("单次调整超过允许幅度，请先提出建议"), {
        status: 403,
      });
  }
  const merged = { ...defaults(), ...current, ...patch };
  if (
    merged["files.workspaceRoot"] &&
    !path.isAbsolute(merged["files.workspaceRoot"])
  )
    throw Object.assign(
      new Error("角色文件工作区必须填写绝对路径，或留空使用默认目录"),
      { status: 400 },
    );
  if (!!merged["vision.host.provider"] !== !!merged["vision.host.model"])
    throw Object.assign(
      new Error("DSH视觉服务与模型需要成对选择，或一起留空自动沿用"),
      { status: 400 },
    );
  if (
    merged["memory.ownerBili"] &&
    !/^[1-9]\d{0,21}$/.test(merged["memory.ownerBili"])
  )
    throw Object.assign(new Error("主人B站mid请填写真实数字编号或留空"), {
      status: 400,
    });
  if (
    merged["memory.ownerQQ"] &&
    !/^[1-9]\d{4,19}$/.test(merged["memory.ownerQQ"])
  )
    throw Object.assign(new Error("主人 QQ 请填写真实数字编号或留空"), {
      status: 400,
    });
  const bridgeTargets = String(merged["bridge.targets"])
    .split(/[,，\s]+/)
    .filter(Boolean);
  if (
    bridgeTargets.length > 10 ||
    bridgeTargets.some(
      (value) => !/^(group|private):[1-9]\d{4,19}$/.test(value),
    )
  )
    throw Object.assign(
      new Error("星桥目标请填写 group:群号 或 private:QQ号，最多10个"),
      { status: 400 },
    );
  if (
    String(merged["bridge.times"])
      .split(/[,，\s]+/)
      .filter(Boolean)
      .some((value) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
  )
    throw Object.assign(new Error("分享时间请填写 HH:mm，以逗号分隔"), {
      status: 400,
    });
  for (const key of ["bili.allowedUsers", "bili.live.rooms"]) {
    const ids = String(merged[key])
      .split(/[,，\s]+/)
      .filter(Boolean);
    if (
      ids.length > (key === "bili.live.rooms" ? 5 : 20) ||
      ids.some((id) => !/^\d{1,22}$/.test(id))
    )
      throw Object.assign(new Error("B站对象列表格式无效或超过数量上限"), {
        status: 400,
      });
  }
  if (
    merged["bili.enabled"] &&
    (!merged["bili.provider"] ||
      !merged["bili.model"] ||
      !merged["bili.allowedUsers"].trim())
  )
    throw Object.assign(new Error("请先选择 B站模型与允许互动的用户"), {
      status: 400,
    });
  for (const kind of Object.keys(dynamicKinds))
    if (
      merged[`bili.dynamics.${kind}.minChars`] >
      merged[`bili.dynamics.${kind}.maxChars`]
    )
      throw Object.assign(new Error("动态最少字数不能大于最多字数"), {
        status: 400,
      });
  if (
    Object.hasOwn(patch, "bili.watch.windows") &&
    !String(patch["bili.watch.windows"])
      .split(/[,，\s]+/)
      .filter(Boolean)
      .every((window) =>
        /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(window),
      )
  )
    throw Object.assign(new Error("浏览窗口请填写 HH:mm-HH:mm，以逗号分隔"), {
      status: 400,
    });
  if (
    merged["chat.reply.delayMinMs"] > merged["chat.reply.delayMaxMs"] ||
    merged["chat.wait.minMs"] > merged["chat.wait.maxMs"]
  )
    throw Object.assign(new Error("最小时长不能大于最大时长"), { status: 400 });
  if (merged["context.personaChars"] > merged["context.maxChars"] - 400)
    throw Object.assign(
      new Error("角色核心预算需要给会话边界与动态资料留出至少 400 字符"),
      { status: 400 },
    );
  return patch;
}
