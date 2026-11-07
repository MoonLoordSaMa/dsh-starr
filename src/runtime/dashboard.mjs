import { capabilityStatus } from "../host/capabilities.mjs";
import { mediaServices } from "./media-services.mjs";
import { todayOverview } from "../agency/today.mjs";

// 只读取已有运行回执。打开首页不登录平台、不启动模型、不外发消息。
export function dashboardStatus(store, characterId, services = {}) {
  const c = store.character(characterId).config;
  const runtime = { ...mediaServices(store), ...services };
  const capabilities = capabilityStatus(store, characterId, undefined, runtime);
  const items = [];
  const add = (id, label, page, status, text, detail, checkedAt = null) =>
    items.push({ id, label, page, status, text, detail, checkedAt });
  const readiness = (id, label, page, value) =>
    add(
      id,
      label,
      page,
      !value.enabled
        ? "disabled"
        : value.configured
          ? "configured"
          : "needs-config",
      !value.enabled
        ? "未启用"
        : value.configured
          ? "已配置 · 待验证"
          : "需要配置",
      value.detail,
    );
  const host = services.host || { connected: false };
  add(
    "host",
    "DSH 宿主",
    "maintenance",
    host.connected ? "online" : "unavailable",
    host.connected ? "已连接" : "未连接",
    host.detail || "宿主连接与各外部能力分别检测",
  );
  const qq = runtime.qq?.status();
  const ownQQ = qq?.config?.characterId === characterId;
  const qr = ownQQ ? qq.runtime : null;
  const listening = qr?.listening || [];
  add(
    "qq",
    "QQ 消息",
    "qq",
    !ownQQ
      ? "needs-config"
      : !qq.config.enabled
        ? "disabled"
        : qr.status === "connected"
          ? "online"
          : ["failed", "error"].includes(qr.status) || qr.lastError
            ? "error"
            : "unavailable",
    !ownQQ
      ? "尚未绑定此角色"
      : !qq.config.enabled
        ? "未启用"
        : qr.status === "connected"
          ? listening.length
            ? "在线 · 连续接听中"
            : "在线"
          : qr.lastError
            ? "连接异常"
            : "未连接",
    !ownQQ
      ? "在 QQ 连接页选择此角色并设置接收范围"
      : listening.length
        ? `回复后在原回合接听，当前有 ${listening.length} 个窗口`
        : "连接由 SnowLuma 实时回报；平台收发结果见 QQ 页面",
    qr?.lastReceivedAt || null,
  );
  const bili = runtime.bili?.status(characterId);
  const br = bili?.runtime;
  add(
    "bili",
    "B站连接",
    "bili",
    !c["bili.enabled"]
      ? "disabled"
      : !bili?.hostReady
        ? "unavailable"
        : br?.status === "listening"
          ? "online"
          : ["failed", "degraded", "cooldown"].includes(br?.status)
            ? "error"
            : "configured",
    !c["bili.enabled"]
      ? "未启用"
      : !bili?.hostReady
        ? "宿主未接入"
        : br?.status === "listening"
          ? "在线"
          : br?.status === "degraded"
            ? "部分通道异常"
            : ["failed", "cooldown"].includes(br?.status)
              ? "连接异常"
              : "尚未验证",
    br?.status === "degraded"
      ? "账号已登录，部分收件通道异常；请到 B站连接页检查"
      : "以最近一次真实平台轮询为准，登录不代表所有平台操作成功",
    br?.lastPollAt || null,
  );
  readiness("browser", "网页浏览", "browser", capabilities.browser);
  readiness("hearing", "语音识别", "hearing", capabilities.hearing);
  readiness("singing", "翻唱", "singing", capabilities.singing);
  readiness("files", "文件读写", "chat-rules", capabilities.files);
  for (const [kind, label, page] of [
    ["vision", "图片理解", "vision"],
    ["tts", "语音合成", "media"],
  ]) {
    const mode = c[`${kind}.connection`];
    const hostMode = kind === "vision" && mode === "host";
    const localMode = kind === "tts" && mode === "breeze-local";
    const prefix = mode === "custom" ? kind : "media";
    readiness(kind, label, page, {
      enabled: mode !== "disabled",
      configured: hostMode
        ? !!runtime.hostVision
        : localMode
          ? !!runtime.localMedia &&
            !!c["tts.local.bin"] &&
            !!c["tts.local.voicesDir"]
          : !!c[`${kind}.model`] && !!c[`${prefix}.baseUrl`],
      detail: hostMode
        ? "使用 DSH 视觉模型，图片理解结果以实际调用为准"
        : localMode
          ? "按需启动本地语音模型；配置存在不代表模型正在运行"
          : "在对应功能页试用后核对实际结果；首页不自动调用付费模型",
    });
  }
  const agency = runtime.agency?.status(characterId);
  const active = runtime.agency?.running?.has(characterId);
  add(
    "agency",
    "自主行为",
    "intentions",
    !c["agency.enabled"]
      ? "disabled"
      : c["agency.paused"]
        ? "paused"
        : !agency?.hostReady
          ? "unavailable"
          : c["agency.level"] === "observe"
            ? "paused"
            : active
              ? "running"
              : "ready",
    !c["agency.enabled"]
      ? "未启用"
      : c["agency.paused"]
        ? "已暂停"
        : !agency?.hostReady
          ? "宿主未接入"
          : c["agency.level"] === "observe"
            ? "仅观察"
            : active
              ? "正在行动"
              : "等待合适时机",
    agency?.blockers?.slice(0, 2).join("；") ||
      "由角色自行判断目的与时机，待机不表示故障",
  );
  const jobs = runtime.jobs?.status(characterId);
  const jobsEnabled = Object.entries(c).some(
    ([key, value]) => /^jobs\..+\.enabled$/.test(key) && value,
  );
  add(
    "jobs",
    "记忆整理任务",
    "memory-care",
    !jobsEnabled
      ? "disabled"
      : jobs?.configurationError
        ? "needs-config"
        : jobs?.running
          ? "running"
          : !runtime.jobs
            ? "unavailable"
            : "ready",
    !jobsEnabled
      ? "未启用"
      : jobs?.configurationError
        ? "需要配置"
        : jobs?.running
          ? "正在整理"
          : !runtime.jobs
            ? "宿主未接入"
            : "等待计划时间",
    jobs?.configurationError ||
      "日记、整理和备份的执行结果分别保留在任务记录中",
  );
  let memory;
  try {
    const db = store.memory(characterId);
    const count = db
      .prepare(
        "SELECT count(*) n FROM records WHERE id NOT IN(SELECT record_id FROM record_archive)",
      )
      .get().n;
    const recent = db
      .prepare(
        "SELECT id,title,kind,created,substr(content,1,220) AS preview FROM records WHERE id NOT IN(SELECT record_id FROM record_archive) ORDER BY created DESC,id DESC LIMIT 3",
      )
      .all();
    memory = { count, recent };
    add(
      "memory",
      "本地记忆库",
      "memory",
      "ready",
      "可读取",
      `已保存 ${count} 条记忆，写入状态以实际保存回执为准`,
    );
  } catch {
    memory = { count: null, recent: [] };
    add(
      "memory",
      "本地记忆库",
      "memory",
      "error",
      "读取失败",
      "请到维护页检查角色记忆目录，旧数据未被删除",
    );
  }
  const today = todayOverview(store, characterId);
  return {
    characterId,
    checkedAt: new Date().toISOString(),
    items,
    listening: listening.map(({ seconds, deadlineAt }) => ({
      seconds,
      deadlineAt,
    })),
    state: store.getState(characterId),
    memory,
    recent: today.events.slice(0, 4),
  };
}
