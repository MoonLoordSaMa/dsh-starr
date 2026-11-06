import { useState } from "react";
import { api } from "./types";
import { Panel, Badge } from "./components";
import { ConfigForm } from "./pages";
import { useResource, type PageProps } from "./main";
export function PlatformBridge(props: PageProps) {
  const root = `/api/characters/${props.character.id}/bridge`;
  const { data } = useResource<{
    hostReady: boolean;
    recent: {
      id: string;
      kind: string;
      status: string;
      target: string;
      message_id: string | null;
      error: string | null;
    }[];
  }>(root, props.version);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const names: Record<string, string> = {
    sent: "已取得QQ回执",
    baseline: "首次水位，不发送",
    uncertain: "回执待核对",
    failed: "需要处理",
    sending: "正在发送",
  };
  return (
    <div className="settings-stack">
      <Panel
        title="B站到 QQ 分享设置"
        aside={<Badge>{data?.hostReady ? "宿主已接入" : "需要 DSH"}</Badge>}
      >
        <p>
          B站与 QQ
          共享角色，外发仍有独立边界。公开视频与公开动态可同步到明确授权的 QQ
          目标；私密对话、日记和记忆原文不会跨平台转发
        </p>
        <ConfigForm {...props} pages={["bridge"]} />
        <button
          disabled={busy || !data?.hostReady}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await api<{
                detail: string;
                memory: { shared: number; database: string };
                qq: { status: string };
                bili: { status: string };
              }>(`${root}/check`, { method: "POST" });
              props.refresh();
              setMessage(
                `${result.detail} 记忆库：${result.memory.database}，共享${result.memory.shared}条；QQ：${result.qq.status}，B站：${result.bili.status}`,
              );
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          检查平台与记忆互通
        </button>
        {message && <p role="status">{message}</p>}
      </Panel>
      <Panel title="跨平台分享记录">
        {!data?.recent.length && (
          <p>尚无跨平台任务。启用前请同时配置 QQ 允许名单、B站账号与分享目标</p>
        )}
        {data?.recent.map((row) => (
          <div className="job-error" key={row.id}>
            <strong>
              {names[row.status] || row.status} · {row.target || "连接检查"}
            </strong>
            <p>{row.error || row.message_id || "已记录"}</p>
          </div>
        ))}
      </Panel>
    </div>
  );
}
