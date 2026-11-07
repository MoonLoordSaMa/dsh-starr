import { useEffect, useState } from "react";
import { RefreshCw, Save, MessagesSquare } from "lucide-react";
import { api, json, date, type CheckResult } from "./types";
import { Panel, Badge, Select, Disclosure } from "./components";
import type { PageProps } from "./main";
import { ConfigForm } from "./pages";
import "./qq.css";

type Settings = {
  enabled: boolean;
  httpPort: number;
  wsPort: number;
  tokenEnv: string;
  privateUsers: string;
  groups: string;
  requireMention: boolean;
  provider: string;
  model: string;
  characterId: string;
  mergeMs: number;
};
type Status = {
  revision: number;
  config: Settings;
  runtime: {
    status: string;
    code?: string;
    detail?: string;
    account?: { selfId: string; nickname: string };
    lastError?: string;
    lastReplyAt?: string;
    lastReceivedAt?: string;
    hostReady: boolean;
  };
  secret: { saved: boolean; storage: string };
  counts: Record<string, number>;
  recent: {
    seq: number;
    status: string;
    attempts: number;
    error: string | null;
    created: number;
  }[];
};
const labels: Record<string, string> = {
  connected: "已连接",
  stopped: "已暂停",
  connecting: "正在连接",
  reconnecting: "等待重连",
  unavailable: "宿主未就绪",
  failed: "需要处理",
  pending: "待处理",
  processing: "正在回应",
  done: "已处理",
  uncertain: "发送待核对",
};
const reasons: Record<string, string> = {
  ONEBOT_AUTH: "访问令牌不匹配",
  QQ_OFFLINE: "机器人 QQ 尚未在线",
  WS_CONNECTION: "WebSocket 未连接，请检查端口与令牌",
  WS_DISCONNECTED: "消息连接已断开，正在重连",
  ONEBOT_TRANSPORT: "无法连接 SnowLuma",
  NO_PLATFORM_REPLY: "模型完成了回合，但未调用回复工具",
  MODEL_FAILED: "模型回合失败，请检查宿主模型登录与服务状态",
  INTERRUPTED: "回合超时或连接已停止",
  PREVIOUS_SEND: "已有发送记录，避免重复发送，请先核对",
  IN_USE: "同一运行目录已有 QQ 驱动，请关闭重复实例",
  MODEL_BUSY: "模型服务繁忙，插件会有限重试；持续失败时可稍后重试或更换模型",
  MODEL_AUTH: "宿主模型登录或凭据无效，请在 DSH 模型设置中检查",
  MODEL_QUOTA: "模型额度不足，请检查宿主账号或服务商额度",
  MODEL_NETWORK: "模型网络连接失败，请检查DSH代理、网络与服务地址",
  MODEL_TIMEOUT: "模型请求取消或超时，请检查网络后重试",
  MODEL_CONTEXT: "模型上下文超过容量，请整理会话历史或调整注入预算",
  MODEL_UNAVAILABLE: "所选服务或模型不可用，请在DSH重新选择",
  MODEL_REQUEST: "模型拒绝请求格式，请检查所选模型是否支持工具或图片",
  AGENT_BUSY: "对应的 DSH 会话正在处理其他消息，稍后重试",
};

export function QQConnection(props: PageProps) {
  const { character, bootstrap, notify } = props;
  const [status, setStatus] = useState<Status | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [token, setToken] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [catalog, setCatalog] = useState<
    { id: string; name: string; models: { id: string; name: string }[] }[]
  >([]);
  const load = async (adopt = false) => {
    const next = await api<Status>("/api/qq");
    setStatus(next);
    if (adopt) {
      setDraftRevision(next.revision);
      setDraft({
        ...next.config,
        characterId: next.config.characterId || character.id,
      });
      setDirty(false);
    }
  };
  useEffect(() => {
    let active = true;
    api<Status>("/api/qq")
      .then((next) => {
        if (active) {
          setStatus(next);
          setDraftRevision(next.revision);
          setDraft({
            ...next.config,
            characterId: next.config.characterId || character.id,
          });
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    api<{ providers: typeof catalog }>("/api/onboarding/models")
      .then((next) => {
        if (active) setCatalog(next.providers);
      })
      .catch(() => {});
    const timer = setInterval(() => {
      if (document.hidden) return;
      api<Status>("/api/qq")
        .then((next) => {
          if (active) setStatus(next);
        })
        .catch(() => {});
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [character.id]);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((old) => (old ? { ...old, [key]: value } : old));
    setDirty(true);
  };
  const run = async (operation: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!status || !draft)
    return (
      <Panel title="QQ 连接设置">
        <p>{error || "正在读取 QQ 连接…"}</p>
      </Panel>
    );
  return (
    <div className="content-with-rail qq-connection">
      <div>
        <Panel
          title="QQ 连接设置"
          aside={
            <Badge
              tone={status.runtime.status === "connected" ? "good" : "quiet"}
            >
              {labels[status.runtime.status] || status.runtime.status}
            </Badge>
          }
        >
          <p>
            SnowLuma 接收消息，DSH 运行角色会话，starr
            取得真实回执后记录回复。普通模型正文不会重复转发
          </p>
          {status.runtime.account && (
            <p className="backup-result">
              <MessagesSquare size={16} />
              {status.runtime.account.nickname} ·{" "}
              {status.runtime.account.selfId}
            </p>
          )}
          {(status.runtime.lastError || status.runtime.code) && (
            <p role="status" className="inline-error">
              {reasons[status.runtime.lastError || status.runtime.code || ""] ||
                status.runtime.detail ||
                status.runtime.lastError ||
                status.runtime.code}
            </p>
          )}
          <div className="form-columns">
            <label className="field">
              OneBot HTTP 端口
              <input
                type="number"
                value={draft.httpPort}
                onChange={(e) => update("httpPort", +e.target.value)}
              />
            </label>
            <label className="field">
              正向 WebSocket 端口
              <input
                type="number"
                value={draft.wsPort}
                onChange={(e) => update("wsPort", +e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            OneBot 访问令牌
            <input
              type="password"
              autoComplete="new-password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setDirty(true);
              }}
              placeholder={
                status.secret.saved
                  ? "已加密保存，留空保留"
                  : "与 SnowLuma 一致；无令牌服务可留空"
              }
            />
            <small>
              {status.secret.storage === "windows-dpapi"
                ? "通过 Windows 当前用户加密保存，网页不会回显"
                : "此系统请使用下方环境变量方式"}
            </small>
          </label>
          <div className="form-columns">
            <label className="field">
              允许私聊回复的 QQ 号
              <input
                value={draft.privateUsers}
                onChange={(e) => update("privateUsers", e.target.value)}
                placeholder="多个 QQ 号用逗号分隔"
              />
            </label>
            <label className="field">
              允许回复的群号
              <input
                value={draft.groups}
                onChange={(e) => update("groups", e.target.value)}
                placeholder="留空不处理群聊"
              />
            </label>
          </div>
          <Select
            label="绑定角色"
            value={draft.characterId}
            onChange={(value) => update("characterId", value)}
            options={bootstrap.characters.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
          <div className="form-columns">
            <Select
              label="聊天服务"
              value={draft.provider}
              onChange={(value) => {
                update("provider", value);
                update("model", "");
              }}
              options={[
                { value: "", label: "选择 DSH 中的服务" },
                ...catalog.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
            <Select
              label="聊天模型"
              value={draft.model}
              onChange={(value) => update("model", value)}
              options={[
                { value: "", label: "选择聊天模型" },
                ...(
                  catalog.find((item) => item.id === draft.provider)?.models ||
                  []
                ).map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
            />
            启用 QQ 自动回复
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={draft.requireMention}
              onChange={(e) => update("requireMention", e.target.checked)}
            />
            群聊仅在被 @ 时回应
          </label>
          <Disclosure title="更多连接选项">
            <label className="field">
              令牌环境变量名
              <input
                value={draft.tokenEnv}
                onChange={(e) => update("tokenEnv", e.target.value)}
              />
              <small>环境变量中的令牌优先于本机加密存储；这里填写变量名</small>
            </label>
            <label className="field">
              短消息合并等待（毫秒）
              <input
                type="number"
                min={200}
                max={5000}
                value={draft.mergeMs}
                onChange={(e) => update("mergeMs", +e.target.value)}
              />
            </label>
          </Disclosure>
          <div className="form-footer">
            <button
              className="ghost"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await load(true);
                  setToken("");
                  setCheck(null);
                  notify("已重新读取保存的配置");
                })
              }
            >
              重新读取配置
            </button>
            <button
              className="ghost"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  setCheck(
                    await api<CheckResult>("/api/qq/check", {
                      method: "POST",
                      body: json({
                        httpPort: draft.httpPort,
                        wsPort: draft.wsPort,
                        tokenEnv: draft.tokenEnv,
                        token: token || undefined,
                      }),
                    }),
                  );
                  setToken("");
                  await load();
                })
              }
            >
              <RefreshCw size={15} />
              检查协议与登录
            </button>
            <button
              className="primary"
              disabled={busy || !dirty}
              onClick={() =>
                run(async () => {
                  const next = await api<Status>("/api/qq", {
                    method: "PATCH",
                    body: json({
                      revision: draftRevision,
                      patch: draft,
                      token: token || undefined,
                    }),
                  });
                  setStatus(next);
                  setDraftRevision(next.revision);
                  setDraft(next.config);
                  setToken("");
                  setDirty(false);
                  notify(
                    next.config.enabled
                      ? "QQ 配置已保存，正在连接"
                      : "QQ 自动回复已暂停",
                  );
                })
              }
            >
              <Save size={15} />
              {busy ? "正在处理…" : "保存并应用"}
            </button>
          </div>
          {check && (
            <p
              role="status"
              className={
                check.status === "verified" ? "backup-result" : "inline-error"
              }
            >
              {check.detail}
            </p>
          )}
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
        </Panel>
        <Panel title="群成员、戳一戳与互动设置">
          <ConfigForm {...props} pages={["chat-social"]} />
        </Panel>
        <Panel title="最近消息处理">
          <div className="protocol-facts">
            {["pending", "processing", "done", "failed", "uncertain"].map(
              (key) => (
                <span key={key}>
                  {labels[key] || "处理失败"} · {status.counts[key] || 0}
                </span>
              ),
            )}
          </div>
          <div className="qq-recent">
            {status.recent.slice(0, 5).map((row) => (
              <div className="platform-row" key={row.seq}>
                <div>
                  <strong>
                    收件 #{row.seq} · {labels[row.status] || "处理失败"}
                  </strong>
                  <p>
                    {date(new Date(row.created).toISOString())} · 尝试{" "}
                    {row.attempts} 次
                    {row.error ? ` · ${reasons[row.error] || row.error}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <small>
              “发送待核对”不会自动重发；请先到 QQ 核对，避免同一条话发两次
            </small>
            <button
              className="ghost"
              disabled={busy || !(status.counts.failed > 0)}
              onClick={() =>
                run(async () => {
                  setStatus(
                    await api<Status>("/api/qq/retry", { method: "POST" }),
                  );
                  notify("已重新排队明确失败的消息");
                })
              }
            >
              重试失败消息
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
