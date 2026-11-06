import { useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { api, json } from "./types";
import { Panel, Badge, Disclosure } from "./components";
import { ConfigForm } from "./pages";
import { useResource, type PageProps } from "./main";
import { BiliLogin } from "./BiliLogin";
import { BiliOperations } from "./BiliOperations";
type Status = {
  hostReady: boolean;
  loginReady: boolean;
  secret: { saved: boolean; storage?: string };
  runtime: {
    status: string;
    code?: string;
    account?: { selfId: string; name: string };
    lastPollAt?: string;
    channelErrors?: { channel: string; code: string; detail: string }[];
  };
  counts: Record<string, number>;
  recent: {
    id: string;
    status: string;
    error: string | null;
    created: number;
  }[];
  activities?: {
    id: string;
    kind: string;
    status: string;
    slot: string;
    data: string;
  }[];
};
const statusNames: Record<string, string> = {
  stopped: "尚未开启",
  unavailable: "请在 DSH 中打开",
  listening: "正在监听",
  degraded: "部分通道需处理",
  observed: "已收件 · 安静观察",
  skipped: "本轮休息",
  interrupted: "执行曾中断",
  failed: "连接需要处理",
  cooldown: "平台冷却中",
  pending: "等待处理",
  processing: "正在回应",
  done: "已处理",
  uncertain: "外发结果待核对",
};
const activityNames: Record<string, string> = {
  watch: "资料阅读",
  best: "晨间精选",
  game: "午间游戏",
  anime: "午后二次元",
  gaming: "晚间随记",
};
function activityText(raw: string) {
  try {
    const value = JSON.parse(raw);
    if (value.error || value.reason) return value.error || value.reason;
    if (value.videos?.length)
      return `本轮已阅读 ${value.videos.length} 条视频资料`;
    if (value.messageId) return `已取得平台回执 · ${value.messageId}`;
  } catch {}
  return "处理结果已记录";
}
export function BiliConnection(
  props: PageProps & { view?: "connection" | "activities" | "publish" },
) {
  const root = `/api/characters/${props.character.id}/bili`,
    { data, error } = useResource<Status>(root, props.version),
    [cookie, setCookie] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState("");
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setResult("");
    try {
      await task();
      props.refresh();
    } catch (error) {
      setResult((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="settings-stack">
      {(!props.view || props.view === "connection") && (
        <>
          <Panel
            title="在 B站，续上同一个故事"
            aside={
              <Badge
                tone={data?.runtime.status === "listening" ? "good" : "quiet"}
              >
                {statusNames[data?.runtime.status || "unavailable"] ||
                  "等待检查"}
              </Badge>
            }
          >
            <p>
              QQ、B站和网页共用角色人格、状态与已授权共享的记忆。私信按用户分开，评论按楼层分开，直播按房间分开；每段接续都能在“会话”里查看
            </p>
            {error && <p className="inline-error">{error}</p>}
            {data?.runtime.account && (
              <p>
                当前账号：{data.runtime.account.name} ·{" "}
                {data.runtime.account.selfId}
              </p>
            )}
            {data?.runtime.code && (
              <p className="inline-error">{data.runtime.code}</p>
            )}
            {data?.runtime.channelErrors?.map((item) => (
              <p role="alert" className="inline-error" key={item.channel}>
                {item.channel}：{item.detail}；其他通道继续处理
              </p>
            ))}
            <div className="form-footer">
              <small>账号验证只检查登录，不发送私信、评论或弹幕</small>
              <button
                className="ghost"
                disabled={busy || !data?.hostReady}
                onClick={() =>
                  run(async () => {
                    const result = await api<{
                      detail: string;
                      status: string;
                    }>(`${root}/check`, { method: "POST" });
                    setResult(result.detail);
                  })
                }
              >
                <RefreshCw size={14} />
                {busy ? "正在照契…" : "验看信契"}
              </button>
            </div>
            {result && <p role="status">{result}</p>}
          </Panel>
          <Panel title="扫码相逢 · 连接 B站">
            <BiliLogin
              characterId={props.character.id}
              enabled={!!data?.loginReady}
              onSaved={props.refresh}
            />
            <Disclosure title="信钥藏处">
              <p>
                在 Windows 上通过当前用户的系统加密保存。只需要 SESSDATA 与
                bili_jct；可附带
                buvid3。已保存的内容不会回显到网页。也可在配置中指定启动环境变量
              </p>
              <label className="field">
                山海信钥
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={cookie}
                  onChange={(event) => setCookie(event.target.value)}
                  placeholder={
                    data?.secret.saved
                      ? "已加密保存；需要更换时重新填写"
                      : "SESSDATA=…; bili_jct=…; buvid3=…"
                  }
                />
              </label>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={busy || !cookie.trim() || !data?.hostReady}
                  onClick={() =>
                    run(async () => {
                      await api(`${root}/credential`, {
                        method: "POST",
                        body: json({ cookie }),
                      });
                      setCookie("");
                      setResult("凭据已加密保存，请验证登录后开启通道");
                    })
                  }
                >
                  封存信钥
                </button>
                <button
                  className="ghost"
                  disabled={busy || !data?.secret.saved}
                  onClick={() =>
                    run(async () => {
                      await api(`${root}/credential`, {
                        method: "POST",
                        body: json({ clear: true }),
                      });
                      setCookie("");
                      setResult(
                        "已清除本机加密凭据，环境变量请在启动环境中管理",
                      );
                    })
                  }
                >
                  解下信钥
                </button>
              </div>
            </Disclosure>
          </Panel>
          <Panel title="灵枢与故人">
            <ConfigForm {...props} pages={["bili"]} />
            <Disclosure title="尺素入匣">
              <ConfigForm {...props} pages={["bili-dm"]} />
            </Disclosure>
            <Disclosure title="人间回声">
              <ConfigForm {...props} pages={["bili-comment"]} />
            </Disclosure>
            <Disclosure title="同观流光">
              <ConfigForm {...props} pages={["bili-live"]} />
            </Disclosure>
            <Disclosure title="候信应答有度">
              <ConfigForm {...props} pages={["bili-limits"]} />
            </Disclosure>
          </Panel>
        </>
      )}
      {(!props.view || props.view !== "connection") && (
        <Panel
          title={
            props.view === "publish"
              ? "寄语人间 · 动态创作"
              : "日常浏览、兴趣与分享"
          }
        >
          <p>
            浏览会读取资料与可用字幕；没有画面和音频证据时，记录会明确说明阅读范围。分享只发给已授权并向该账号发来过私信的对象
          </p>
          {props.view !== "publish" && (
            <>
              <Disclosure title="更筹与漫游">
                <ConfigForm {...props} pages={["bili-watch"]} />
              </Disclosure>
              <Disclosure title="心向山海">
                <ConfigForm {...props} pages={["bili-preferences"]} />
              </Disclosure>
              <Disclosure title="流影寄予谁">
                <ConfigForm {...props} pages={["bili-share"]} />
              </Disclosure>
            </>
          )}
          {props.view !== "activities" && (
            <Disclosure title="四时寄笺" initialOpen>
              <ConfigForm {...props} pages={["bili-dynamics"]} />
              {[
                { key: "best", label: "晨光拾萃" },
                { key: "game", label: "午间游趣" },
                { key: "anime", label: "午后幻境" },
                { key: "gaming", label: "暮色随笺" },
              ].map((item) => (
                <Disclosure key={item.key} title={item.label}>
                  <ConfigForm {...props} pages={[`bili-dynamic-${item.key}`]} />
                </Disclosure>
              ))}
            </Disclosure>
          )}
          <Disclosure title="近来山海笺">
            {data?.activities?.map((item) => (
              <div className="job-error" key={item.id}>
                <strong>
                  {activityNames[item.kind] || "B站活动"} · {item.slot} ·{" "}
                  {statusNames[item.status] || item.status}
                </strong>
                <p>{activityText(item.data)}</p>
              </div>
            ))}
          </Disclosure>
        </Panel>
      )}
      {props.view === "publish" && <BiliOperations {...props} />}
      <Panel title="近来信笺">
        <p>
          不明回执会保留待核对，插件不会重发。直播接口只返回受理确认时，会明确标为受理，不能等同于已在直播画面显示
        </p>
        <div className="tag-row">
          {Object.entries(data?.counts || {}).map(([status, count]) => (
            <Badge key={status}>
              {statusNames[status] || status} · {count}
            </Badge>
          ))}
        </div>
        <Disclosure title="展读近笺">
          {data?.recent.map((row) => (
            <div className="job-error" key={row.id}>
              <strong>{statusNames[row.status] || row.status}</strong>
              <p>{row.error || "已保留真实处理记录"}</p>
              <small>{new Date(row.created).toLocaleString("zh-CN")}</small>
            </div>
          ))}
        </Disclosure>
      </Panel>
    </div>
  );
}
