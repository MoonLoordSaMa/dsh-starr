import { useEffect, useState } from "react";
import { api, json } from "./types";
import { ConfirmDialog, Panel, Select, Disclosure } from "./components";
import type { PageProps } from "./main";
import { LocalModelDiscovery } from "./LocalModelDiscovery";

type Status = {
  credentials: Record<string, { saved: boolean; storage: string }>;
  localAsr: { runtimeInstalled: boolean; note: string };
};
export function MediaSetup({ kind, ...props }: PageProps & { kind: string }) {
  const { character, notify, refresh } = props;
  const root = `/api/characters/${character.id}/media`;
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false),
    [clearingCredential, setClearingCredential] = useState(false),
    [error, setError] = useState("");
  const [mode, setMode] = useState(
    String(
      character.config[`${kind}.connection`] ||
        (kind === "vision" ? "host" : kind === "asr" ? "auto" : "shared"),
    ),
  );
  const [base, setBase] = useState(""),
    [model, setModel] = useState(""),
    [key, setKey] = useState("");
  const [name, setName] = useState(""),
    [transcript, setTranscript] = useState(""),
    [reference, setReference] = useState<File | null>(null);
  const [bvid, setBvid] = useState(""),
    [answer, setAnswer] = useState("");
  const [hostModels, setHostModels] = useState<
    { value: string; label: string }[]
  >([]);
  const [hostModel, setHostModel] = useState("");
  const [voice, setVoice] = useState(
    String(character.config["tts.voice"] || ""),
  );
  const [voices, setVoices] = useState<string[]>([]);
  useEffect(() => {
    const abort = new AbortController();
    setKey("");
    setClearingCredential(false);
    setAnswer("");
    setError("");
    setReference(null);
    setHostModels([]);
    setVoice(String(character.config["tts.voice"] || ""));
    setVoices([]);
    const config = character.config,
      selected = String(
        config[`${kind}.connection`] ||
          (kind === "vision" ? "host" : kind === "asr" ? "auto" : "shared"),
      );
    setMode(selected);
    if (kind === "tts" && selected === "breeze-local")
      api<{ voices: string[] }>(`${root}/voices`, { signal: abort.signal })
        .then((r) => setVoices(r.voices))
        .catch(() => {});
    setBase(
      String(config[`${selected === "custom" ? kind : "media"}.baseUrl`] || ""),
    );
    setModel(String(config[`${kind}.model`] || ""));
    setHostModel(
      config["vision.host.provider"] && config["vision.host.model"]
        ? JSON.stringify([
            config["vision.host.provider"],
            config["vision.host.model"],
          ])
        : "",
    );
    if (kind === "vision")
      api<{
        host: {
          providers: {
            id: string;
            name: string;
            models: { id: string; name: string; inputModalities?: string[] }[];
          }[];
        };
      }>("/api/local-models", { signal: abort.signal })
        .then((r) =>
          setHostModels(
            r.host.providers.flatMap((p) =>
              p.models
                .filter((m) => m.inputModalities?.includes("image"))
                .map((m) => ({
                  value: JSON.stringify([p.id, m.id]),
                  label: `${p.name} · ${m.name}`,
                })),
            ),
          ),
        )
        .catch((e) => {
          if (!abort.signal.aborted) setError(e.message);
        });
    api<Status>(`${root}/workbench`, { signal: abort.signal })
      .then(setStatus)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [root, kind, character.revision]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const local =
    mode === "free-local" || mode === "breeze-local" || mode === "auto";
  const prefix = mode === "custom" ? kind : "media";
  return (
    <Panel title="先选一种适合你的方式">
      <p>
        {kind === "asr"
          ? "无需API密钥也能在本机听写。自动模式沿用已配置的共用服务；没有共用服务时使用免费本地Whisper"
          : kind === "tts"
            ? "本地Breeze可以用参考录音建立音色。远程服务填写兼容地址、模型和音色编号即可"
            : "画面采集负责看见，视觉模型负责理解。图片、屏幕与B站视频共用这里的视觉连接"}
      </p>
      <p className="footnote">
        {kind === "vision" && mode === "host"
          ? "沿用DSH的模型连接与生命周期，starr不会另启视觉模型进程；屏幕与摄像头仍需单独授权"
          : "插件托管的本地模型统一互斥，闲置5分钟自动下线；切换时先卸载旧模型。手动启动的本地兼容服务无法保证卸载，请使用插件托管的本地模式"}
      </p>
      <Select
        label="使用方式"
        value={mode}
        onChange={setMode}
        options={[
          ...(kind === "asr"
            ? [
                { value: "auto", label: "自动选择" },
                { value: "free-local", label: "免费本地Whisper" },
              ]
            : []),
          ...(kind === "tts"
            ? [{ value: "breeze-local", label: "本地Breeze" }]
            : []),
          ...(kind === "vision"
            ? [{ value: "host", label: "使用DSH已配置的视觉模型" }]
            : []),
          { value: "custom", label: "单独配置云端服务" },
          { value: "shared", label: "沿用共用连接" },
          { value: "disabled", label: "停用" },
        ]}
      />
      {kind === "vision" && mode === "host" && (
        <>
          <Select
            label="DSH视觉模型"
            value={hostModel}
            onChange={setHostModel}
            options={[
              { value: "", label: "自动沿用当前角色会话模型" },
              ...hostModels,
              ...(hostModel && !hostModels.some((m) => m.value === hostModel)
                ? [
                    {
                      value: hostModel,
                      label: "原选择暂未在宿主视觉清单中找到，请核对DSH连接",
                    },
                  ]
                : []),
            ]}
          />
          <p className="footnote">
            使用DSH的模型连接与附件服务，无需填写地址或密钥。只列出明确支持图片的模型；自动模式使用当前会话或角色聊天模型，未配置时沿用DSH默认模型。实际图片会交给所选模型处理
          </p>
        </>
      )}
      {!local && mode !== "disabled" && mode !== "host" && (
        <div className="field-grid">
          <label className="field">
            {mode === "shared" ? "共用兼容地址" : "服务兼容地址"}
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="https://服务商/v1"
            />
          </label>
          <label className="field">
            模型名称
            <input value={model} onChange={(e) => setModel(e.target.value)} />
          </label>
          <label className="field">
            API密钥（服务无需鉴权可留空）
            <input
              type="password"
              autoComplete="new-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={
                status?.credentials[prefix]?.saved
                  ? "已有系统加密凭据；留空保留"
                  : "只保存到当前系统用户的加密凭据"
              }
            />
          </label>
        </div>
      )}
      {kind === "tts" &&
        mode !== "disabled" &&
        (mode === "breeze-local" && voices.length ? (
          <Select
            label="说话音色"
            value={voice}
            onChange={setVoice}
            options={[
              { value: "", label: "选择音色" },
              ...(!voices.includes(voice) && voice
                ? [{ value: voice, label: `${voice}（目录中未找到）` }]
                : []),
              ...voices.map((v) => ({ value: v, label: v })),
            ]}
          />
        ) : (
          <label className="field">
            说话音色编号
            <input
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              placeholder={
                mode === "breeze-local"
                  ? "先发现本地音色，或用参考录音建立"
                  : "填写服务商提供的音色编号"
              }
            />
            <small>使用服务支持的音色编号；参考录音建立音色是可选步骤</small>
          </label>
        ))}
      <div className="form-footer">
        <button
          className="primary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const patch: Record<string, unknown> = {
                [`${kind}.connection`]: mode,
              };
              if (kind === "tts" && mode !== "disabled")
                patch["tts.voice"] = voice.trim();
              if (mode === "host") {
                const [provider, selectedModel] = hostModel
                  ? JSON.parse(hostModel)
                  : ["", ""];
                patch["vision.host.provider"] = provider;
                patch["vision.host.model"] = selectedModel;
              }
              if (!local && mode !== "disabled" && mode !== "host") {
                patch[`${prefix}.baseUrl`] = base.trim();
                patch[`${kind}.model`] = model.trim();
              }
              if (key.trim() && mode !== "host")
                await api(`${root}/credential`, {
                  method: "POST",
                  body: json({ kind: prefix, key }),
                });
              await api(`/api/characters/${character.id}/config`, {
                method: "PATCH",
                body: json({ patch, revision: character.revision }),
              });
              setKey("");
              refresh();
              notify("连接已保存，请用下方实际输入验证能力");
            })
          }
        >
          {busy ? "正在处理…" : "保存使用方式"}
        </button>
        {status?.credentials[prefix]?.saved && (
          <button
            type="button"
            className="ghost danger"
            disabled={busy}
            onClick={() => setClearingCredential(true)}
          >
            清除{prefix === "media" ? "共用" : "此能力"}已存密钥
          </button>
        )}
        {kind === "asr" && (
          <button
            className="ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const result = await api<{ detail: string }>(
                  `${root}/asr/prepare`,
                  { method: "POST", body: json({}) },
                );
                notify(result.detail);
                setAnswer(result.detail);
              })
            }
          >
            准备免费听写
          </button>
        )}
      </div>
      {kind === "asr" && (
        <p className="footnote">
          需要已安装Python；准备过程联网下载依赖，首次转写下载免费权重。已有环境可在高级配置指定Python和模型目录
        </p>
      )}
      {kind === "tts" && (
        <>
          {mode === "breeze-local" && (
            <LocalModelDiscovery {...props} kind="tts" />
          )}
          <Disclosure title="用参考录音建立本地音色">
            <p>
              录音与准确文字会编码为Breeze音色并自动选用。云端音色建立请使用服务商支持的流程
            </p>
            <label className="field">
              音色标识
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="字母、数字、横线或下划线"
              />
            </label>
            <label className="field">
              录音中的原文
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </label>
            <label className="field">
              参考录音
              <input
                type="file"
                accept="audio/wav"
                onChange={(e) => setReference(e.target.files?.[0] || null)}
              />
            </label>
            <button
              className="primary"
              disabled={busy || !reference || !name || !transcript}
              onClick={() =>
                run(async () => {
                  if (!reference || reference.size > 10 * 1024 * 1024)
                    throw new Error("请选择10MB内的WAV参考录音");
                  const base64 = await new Promise<string>(
                    (resolve, reject) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result).split(",")[1]);
                      r.onerror = reject;
                      r.readAsDataURL(reference);
                    },
                  );
                  const result = await api<{ detail: string }>(
                    `${root}/voices`,
                    {
                      method: "POST",
                      body: json({ name, transcript, base64 }),
                    },
                  );
                  refresh();
                  notify(result.detail);
                })
              }
            >
              建立并选用音色
            </button>
          </Disclosure>
        </>
      )}
      {kind === "vision" && (
        <Disclosure title="看一小段真实画面">
          <p>
            屏幕与摄像头需要在高级配置独立开启。每次采集3秒并停止；视频只分析前30秒内的关键帧，不代表看完整片
          </p>
          <div className="form-footer">
            {["screen", "camera"].map((source) => (
              <button
                className="ghost"
                key={source}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const result = await api<{ answer: string }>(
                      `${root}/capture`,
                      {
                        method: "POST",
                        body: json({
                          source,
                          seconds: 3,
                          prompt: "描述画面中实际可见的内容与变化",
                        }),
                      },
                    );
                    setAnswer(result.answer);
                  })
                }
              >
                {source === "screen" ? "看看屏幕" : "看看摄像头"}
              </button>
            ))}
          </div>
          <label className="field">
            B站视频BV号
            <input value={bvid} onChange={(e) => setBvid(e.target.value)} />
          </label>
          <button
            className="ghost"
            disabled={busy || !/^BV[A-Za-z0-9]{10}$/.test(bvid)}
            onClick={() =>
              run(async () => {
                const result = await api<{ answer: string }>(
                  `${root}/bili-watch`,
                  { method: "POST", body: json({ bvid, seconds: 30 }) },
                );
                setAnswer(result.answer);
              })
            }
          >
            分析视频关键帧
          </button>
        </Disclosure>
      )}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {answer && (
        <div className="media-result">
          <p style={{ whiteSpace: "pre-wrap" }}>{answer}</p>
        </div>
      )}
      {clearingCredential && (
        <ConfirmDialog
          title={prefix === "media" ? "清除共用连接密钥？" : "清除此能力密钥？"}
          confirmLabel="确认清除密钥"
          description={
            prefix === "media"
              ? "删除当前角色共用连接的本机加密密钥，所有沿用共用连接的能力都会受影响。环境变量中的密钥需在启动环境中单独移除；服务地址与模型配置保留。"
              : "删除当前角色此能力的本机加密密钥。环境变量中的密钥需在启动环境中单独移除；服务地址与模型配置保留。"
          }
          onClose={() => setClearingCredential(false)}
          onConfirm={async () => {
            await api(`${root}/credential`, {
              method: "POST",
              body: json({ kind: prefix, clear: true }),
            });
            setKey("");
            setStatus(await api<Status>(`${root}/workbench`));
            notify("已清除本机加密密钥，环境变量请在启动环境中管理");
          }}
        />
      )}
    </Panel>
  );
}
