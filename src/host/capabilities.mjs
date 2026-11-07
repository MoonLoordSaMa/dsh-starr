import fs from "node:fs";
import { fileWorkspace } from "./native-files.mjs";
import path from "node:path";
import { mediaServices } from "../runtime/media-services.mjs";

// 配置完整仅表示可以尝试调用，实际服务成功仍以本次回执为准。
export function capabilityStatus(store, characterId, sessionId, services = {}) {
  const c = store.character(characterId).config,
    runtime = { ...mediaServices(store), ...services };
  const entry = (enabled, configured, detail) => ({
    enabled: !!enabled,
    configured: !!configured,
    verified: false,
    detail,
  });
  const local =
    ["auto", "free-local"].includes(c["asr.connection"]) &&
    (c["asr.connection"] === "free-local" || !c["media.baseUrl"]);
  const python =
    c["asr.local.python"] ||
    path.join(
      store.dataRoot,
      "media-runtime",
      "asr",
      process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
    );
  const asr = local
    ? fs.existsSync(python)
    : !!c["asr.model"] &&
      !!c[c["asr.connection"] === "custom" ? "asr.baseUrl" : "media.baseUrl"];
  const files = runtime.nativeFiles?.(sessionId, characterId);
  const hasFiles = ["read", "write", "edit"].every((name) => files?.[name]);
  return {
    checkedAt: new Date().toISOString(),
    hearing: entry(
      c["chat.tools.audio"] && c["asr.connection"] !== "disabled",
      asr,
      asr
        ? "收到QQ语音后先调用听写；文字转写不能表示已理解音色和语气"
        : local
          ? "本地听写环境未准备完成"
          : "当前听写模型或服务地址未配置完整，请到语音识别页检查",
    ),
    singing: entry(
      c["sing.allowBot"],
      !!runtime.singing &&
        c["sing.mode"] !== "disabled" &&
        !!c["sing.referenceId"],
      "可自主选歌、搜索音源并生成翻唱；主动回合可向已绑定的主人或当前来源群发送实际成品。QQ语音单独发送",
    ),
    files: {
      ...entry(
        true,
        hasFiles,
        hasFiles
          ? "使用 DSH 原生 read/write/edit 读文件、写文字和修改文档，glob/grep 搜索资料；实际权限由宿主文件服务判断"
          : "当前尚未检测到宿主完整挂载 read/write/edit；请在 DSH 中使用角色会话，独立网页预览不能替代宿主文件工具",
      ),
      workspace: fileWorkspace(store, characterId),
    },
    continuousListening: false,
    audioEmotionUnderstanding: false,
    imageGenerationModel: false,
    scope: sessionId ? "当前可信角色会话" : "管理员控制台",
  };
}
export function capabilityPrompt(store, id, sessionId) {
  const status = capabilityStatus(store, id, sessionId);
  return (
    "【当前能力实况】" +
    Object.entries({
      hearing: "听写",
      singing: "翻唱",
      files: "原生文件读写",
    })
      .map(([key, label]) => {
        const v = status[key];
        return `${label}：${!v.enabled ? "未开启" : v.configured ? "配置具备调用条件" : "需要补充配置"}。`;
      })
      .join("") +
    "具体缺失项可查starr_capabilities；配置完整不能代替实际成功。遇到失败说明具体原因，不把暂时故障记成永久不会。"
  );
}
