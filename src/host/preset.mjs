export function qqPreset(dataRoot) {
  return {
    id: "starr-qqchat",
    name: "Starr-chat · 角色会话",
    description:
      "共用角色记忆与状态。首次使用请完成 starr 新手调试并配置 SnowLuma；平台消息由插件按白名单路由。",
    order: 10,
    plugins: [
      {
        id: "starr-qq-session",
        name: "dsh-starr/qq-session",
        config: { dataRoot },
      },
    ],
  };
}

export function installPreset(ctx, dataRoot) {
  let status = {
    status: "unavailable",
    detail: "宿主尚未提供预设注册服务，请确认 DSH 版本与插件加载状态",
  };
  let registry;
  let disposed = false;
  let remove;
  ctx.inject?.(["agentPresets"], (child) => {
    if (!child.agentPresets?.register) return;
    registry = child.agentPresets;
    child.effect(() => {
      let active = true;
      status = { status: "registering", detail: "正在自动注册 starr-qqchat" };
      const ready = registry
        .register(qqPreset(dataRoot))
        .then((dispose) => {
          if (!active || disposed) return dispose();
          let removed = false;
          remove = () => {
            if (removed) return;
            removed = true;
            return dispose();
          };
          status = {
            status: "registered",
            detail: "starr-qqchat 已自动注册；可在新手调试中检查加载状态",
          };
        })
        .catch(() => {
          status = {
            status: "error",
            detail:
              "预设注册失败，可能存在同名预设或宿主版本不兼容；未覆盖现有配置",
          };
        });
      return () => {
        active = false;
        return ready.then(() => remove?.());
      };
    });
  });
  return {
    presetStatus: () => ({ ...status }),
    async checkPreset() {
      if (!registry || status.status !== "registered") return { ...status };
      // 仅在用户请求时审计，避免在宿主加载期间等待自身的插件树。
      const row = (await registry.list()).find(
        (preset) => preset.id === "starr-qqchat",
      );
      return row && !row.broken
        ? {
            status: "verified",
            detail: "预设加载检查通过；模型通道与 QQ 收发须分别验证",
          }
        : {
            status: "error",
            detail: "预设存在加载异常，请查看 DSH 插件日志核对版本与依赖",
          };
    },
    close() {
      disposed = true;
      return remove?.();
    },
  };
}
