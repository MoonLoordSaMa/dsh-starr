import { useEffect, useState } from "react";
import { Radar, RefreshCw } from "lucide-react";
import { api, json } from "./types";
import { Badge, Disclosure } from "./components";
import type { PageProps } from "./main";
import "./chat.css";

type Defaults = {
  ports: number[];
  directories: string[];
  host: {
    providers: {
      id: string;
      name: string;
      models: { id: string; name: string }[];
    }[];
    detail: string;
  };
};
type Discovery = {
  profiles?: {
    kind: string;
    label: string;
    verified: boolean;
    voices?: string[];
    next: string;
    patch: Record<string, string>;
  }[];
  checkedAt: string;
  endpoints: {
    port: number;
    status: string;
    baseUrl?: string;
    provider?: string;
    note: string;
    models: { id: string }[];
  }[];
  files: {
    path: string;
    name: string;
    bytes: number;
    kind: string;
    note: string;
  }[];
  directories: { directory: string; status: string; truncated: boolean }[];
  note: string;
};
export function LocalModelDiscovery({
  character,
  refresh,
  notify,
  onChoose,
  kind,
}: Partial<Pick<PageProps, "character" | "refresh" | "notify">> & {
  onChoose?: (patch: Record<string, string>) => void;
  kind?: string;
}) {
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [ports, setPorts] = useState("");
  const [directories, setDirectories] = useState("");
  const [directory, setDirectory] = useState("");
  const [applied, setApplied] = useState("");
  const [result, setResult] = useState<Discovery | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    api<Defaults>(
      `/api/local-models${character ? `?characterId=${encodeURIComponent(character.id)}` : ""}`,
      { signal: abort.signal },
    )
      .then((value) => {
        setDefaults(value);
        setPorts(value.ports.join(", "));
        setDirectories(value.directories.join("\n"));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, [character?.id]);
  return (
    <div className="model-discovery">
      <p>
        填写引擎的安装目录，一次查找程序、模型与音色，再确认填入。扫描只读，不启动模型
      </p>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <Disclosure title="DSH 已登记的模型">
        <p className="footnote">
          {defaults?.host.detail || "正在读取宿主模型列表"}
        </p>
        {defaults?.host.providers.map((provider) => (
          <div className="discovery-endpoint" key={provider.id}>
            <strong>{provider.name || provider.id}</strong>
            <p>
              {provider.models.map((m) => m.name || m.id).join("、") ||
                "没有可读的模型清单"}
            </p>
          </div>
        ))}
        <p className="footnote">
          这里列出宿主已有连接，不能仅凭名称确定是否在本机运行。额外模型需要分别验证说话、听写和看图能力
        </p>
      </Disclosure>
      <label className="field">
        引擎安装目录
        <input
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
          placeholder="填写 Breeze 或 SoulX 所在的文件夹"
        />
        <small>
          不必分别查找每个模型文件。留空则检查已有配置与常见用户模型目录
        </small>
      </label>
      <Disclosure title="高级扫描选项 · 端口与额外目录">
        <label className="field">
          要检查的本机端口
          <input
            value={ports}
            onChange={(e) => setPorts(e.target.value)}
            placeholder="11434, 1234, 8100"
          />
          <small>最多 12 个，仅检查 127.0.0.1 的模型目录接口</small>
        </label>
        <label className="field">
          模型目录，每行一个
          <textarea
            rows={4}
            value={directories}
            onChange={(e) => setDirectories(e.target.value)}
          />
          <small>
            可留空，只检查接口；最多 8 个目录，不选择整个磁盘，不跟随目录联接
          </small>
        </label>
      </Disclosure>
      <button
        className="primary"
        disabled={busy || !defaults}
        onClick={async () => {
          setBusy(true);
          setError("");
          setApplied("");
          try {
            setResult(
              await api<Discovery>("/api/local-models/discover", {
                method: "POST",
                body: json({
                  ports: ports
                    .split(/[,，\s]+/)
                    .filter(Boolean)
                    .map(Number),
                  directories: [
                    directory.trim(),
                    ...directories
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  ]
                    .filter(Boolean)
                    .filter((v, i, all) => all.indexOf(v) === i)
                    .slice(0, 8),
                }),
              }),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <RefreshCw size={15} className="spin" /> : <Radar size={15} />}{" "}
        {busy ? "正在发现本地模型…" : "发现本机已有模型"}
      </button>
      {result && (
        <div aria-live="polite">
          <p className="footnote">{result.note}</p>
          {applied && <p role="status">{applied}</p>}
          {(result.profiles || [])
            .filter((profile) => !kind || kind === profile.kind)
            .map((profile) => (
              <div className="discovery-file" key={profile.label}>
                <strong>{profile.label}</strong>
                <Badge>程序与模型已找到 · 待实际验证</Badge>
                <p>{profile.next}</p>
                {profile.voices?.length ? (
                  <small>发现音色：{profile.voices.join("、")}</small>
                ) : null}
                <button
                  className="primary"
                  disabled={busy || (!character && !onChoose)}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const patch = { ...profile.patch };
                      const current = String(
                        character?.config["tts.voice"] || "",
                      );
                      if (
                        profile.kind === "tts" &&
                        profile.voices?.length &&
                        (!current || current === "alloy") &&
                        !profile.voices.includes(current)
                      )
                        patch["tts.voice"] = profile.voices[0];
                      if (onChoose) onChoose(patch);
                      else if (character) {
                        await api(`/api/characters/${character.id}/config`, {
                          method: "PATCH",
                          body: json({ patch, revision: character.revision }),
                        });
                        refresh?.();
                      }
                      setApplied(`配置已填入。${profile.next}`);
                      notify?.(`配置已填入。${profile.next}`);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  确认并填入配置
                </button>
              </div>
            ))}
          {!(result.profiles || []).some(
            (profile) => !kind || profile.kind === kind,
          ) && (
            <p>
              尚未找到完整引擎。请填写安装目录；单独的权重文件需要对应引擎，路径可以在高级配置补充
            </p>
          )}
          {result.endpoints.map((endpoint) => (
            <div className="discovery-endpoint" key={endpoint.port}>
              <strong>本机端口 {endpoint.port}</strong>
              <Badge>
                {endpoint.status === "catalog"
                  ? "取得模型清单 · 能力待验证"
                  : "未取得清单"}
              </Badge>
              <p>
                {endpoint.models.map((m) => m.id).join("、") || endpoint.note}
              </p>
            </div>
          ))}
          <p className="footnote">
            本机端口仅供只读盘点。请在下方使用插件托管的本地引擎配置，以保证同时只加载一个模型并在闲置5分钟后退出；首次向导中请先完成角色创建
          </p>
          <Disclosure title={`本地模型文件 · ${result.files.length} 个`}>
            <p>
              文件无法直接作为接口模型使用；需要相应引擎加载。路径提示的类型不代表格式兼容
            </p>
            {result.files.map((file) => (
              <div className="discovery-file" key={file.path}>
                <strong>{file.name}</strong>
                <small>
                  {(file.bytes / 1024 / 1024).toFixed(1)} MB ·{" "}
                  {
                    {
                      tts: "可能用于说话",
                      svc: "可能用于变声或唱歌",
                      asr: "可能用于听写",
                      unknown: "用途待确认",
                    }[file.kind]
                  }
                </small>
                <code>{file.path}</code>
              </div>
            ))}
            {!result.files.length && (
              <p>所选范围内未发现支持的模型文件；可以补充实际模型目录后重试</p>
            )}
          </Disclosure>
          <Disclosure title="目录扫描结果">
            {result.directories.map((dir) => (
              <p key={dir.directory}>
                <code>{dir.directory}</code> ·{" "}
                {dir.status === "scanned"
                  ? "已扫描"
                  : dir.status === "missing"
                    ? "目录不存在"
                    : "无法读取或为联接目录"}
                {dir.truncated ? " · 已到扫描上限，结果不完整" : ""}
              </p>
            ))}
          </Disclosure>
        </div>
      )}
    </div>
  );
}
