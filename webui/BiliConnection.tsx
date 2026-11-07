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
  best: "旧动态记录",
  game: "旧动态记录",
  anime: "旧动态记录",
  gaming: "旧动态记录",
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
          <Panel title="模型与互动对象">
            <ConfigForm {...props} pages={["bili"]} />
            <section className="config-section">
              <h3>私信收件</h3>
              <ConfigForm {...props} pages={["bili-dm"]} />
            </section>
            <section className="config-section">
              <h3>评论与提及</h3>
              <ConfigForm {...props} pages={["bili-comment"]} />
            </section>
            <section className="config-section">
              <h3>直播间与弹幕</h3>
              <ConfigForm {...props} pages={["bili-live"]} />
            </section>
            <section className="config-section">
              <h3>监听、回复与额度</h3>
              <ConfigForm {...props} pages={["bili-limits"]} />
            </section>
          </Panel>
          <Panel
            title="B站接入状态"
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
              QQ、B站和网页共用角色人格、状态与已授权共享的记忆。私信按用户分开，评论按楼层分开，直播按房间分开；后台分别保存接续
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
                {busy ? "正在检查…" : "验证登录"}
              </button>
            </div>
            {result && <p role="status">{result}</p>}
          </Panel>
          <Panel title="B站扫码登录与连接">
            <Disclosure title="扫码登录或更换账号">
              <BiliLogin
                characterId={props.character.id}
                enabled={!!data?.loginReady}
                onSaved={props.refresh}
              />
            </Disclosure>
            <Disclosure title="手动凭据与环境变量（高级）">
              <p>
                在 Windows 上通过当前用户的系统加密保存。只需要 SESSDATA 与
                bili_jct；可附带
                buvid3。已保存的内容不会回显到网页。也可在配置中指定启动环境变量
              </p>
              <label className="field">
                B站 Cookie
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
                  保存凭据
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
                  清除本机凭据
                </button>
              </div>
            </Disclosure>
          </Panel>
        </>
      )}
      {(!props.view || props.view !== "connection") && (
        <Panel
          title={
            props.view === "publish" ? "B站动态创作" : "日常浏览、兴趣与分享"
          }
        >
          <p>
            浏览会读取资料与可用字幕；没有画面和音频证据时，记录会明确说明阅读范围。分享只发给已授权并向该账号发来过私信的对象
          </p>
          {props.view !== "publish" && (
            <>
              <section className="config-section">
                <h3>作息与浏览额度</h3>
                <ConfigForm {...props} pages={["bili-watch"]} />
              </section>
              <section className="config-section">
                <h3>她的兴趣与偏好</h3>
                <ConfigForm {...props} pages={["bili-preferences"]} />
              </section>
              <section className="config-section">
                <h3>视频分享对象与额度</h3>
                <ConfigForm {...props} pages={["bili-share"]} />
              </section>
            </>
          )}
          <Disclosure title="最近活动" initialOpen>
            {data?.activities?.slice(0, 5).map((item) => (
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
      <Panel title="最近的收件与处理">
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
        <Disclosure title="最近收件" initialOpen>
          {data?.recent.slice(0, 5).map((row) => (
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
