import { useEffect, useRef, useState } from "react";
import { api, apiUrl, json } from "./types";
import { Badge, ConfirmDialog, Disclosure, Panel, Select } from "./components";
import { ConfigForm } from "./pages";
import { useResource, type PageProps } from "./main";
import { LocalModelDiscovery } from "./LocalModelDiscovery";
type Library = {
  songs: {
    id: string;
    title: string;
    mime: string;
    bytes: number;
    platforms?: string;
    source_url?: string;
    segment?: { startSeconds: number; detail: string };
  }[];
  renders: {
    id: string;
    source_id: string;
    status: string;
    error: string | null;
    created: string;
  }[];
  busy: boolean;
};
type MusicResult = {
  platform: "local" | "bili" | "netease";
  id: string;
  title: string;
  artists: string[];
  url?: string;
  availability?: string;
  segmentHint?: string;
};
type MusicSearch = {
  results: MusicResult[];
  sources: {
    platform: string;
    status: string;
    count?: number;
    detail?: string;
  }[];
};
const platformNames: Record<string, string> = {
  local: "本地曲库",
  bili: "B站",
  netease: "网易云",
};
const musicPermissions = [
  "sing.search.netease",
  "sing.source.allowBot",
  "sing.allowBot",
  "chat.tools.singing",
  "bili.actions.allowBot",
];
export function SingingPage(props: PageProps) {
  const [pulse, setPulse] = useState(0);
  const root = `/api/characters/${props.character.id}/media/songs`,
    { data, error } = useResource<Library>(root, props.version + pulse),
    [source, setSource] = useState(""),
    [reference, setReference] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [query, setQuery] = useState(""),
    [platform, setPlatform] = useState("all"),
    [segment, setSegment] = useState("chorus"),
    [startSeconds, setStartSeconds] = useState(""),
    [searching, setSearching] = useState(false),
    [results, setResults] = useState<MusicSearch | null>(null),
    [pending, setPending] = useState<{
      kind: "source" | "render" | "cache";
      id: string;
      title: string;
      clearDefault?: boolean;
      revision?: number;
    } | null>(null);
  const requests = useRef(new AbortController());
  useEffect(() => {
    const refreshStatus = () => {
      if (!document.hidden) setPulse((value) => value + 1);
    };
    const timer = setInterval(refreshStatus, 3000);
    window.addEventListener("focus", refreshStatus);
    document.addEventListener("visibilitychange", refreshStatus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshStatus);
      document.removeEventListener("visibilitychange", refreshStatus);
    };
  }, [props.character.id]);
  useEffect(() => {
    requests.current = new AbortController();
    setResults(null);
    setSource("");
    setReference("");
    setMessage("");
    setBusy(false);
    setSearching(false);
    setPending(null);
    return () => requests.current.abort();
  }, [props.character.id]);
  const options =
    data?.songs.map((song) => ({ value: song.id, label: song.title })) || [];
  return (
    <div className="stack">
      <p>
        先扫描并连接本地
        SoulX，再准备参考音色。可直接搜索本地曲库、B站或网易云，确认音源后入库并翻唱。音源与成品最多45秒，参考音色最多30秒；QQ也可完成同一流程，目录解析由插件处理
      </p>
      {error && <p className="inline-error">{error}</p>}
      <Panel title="循声拾曲 · 搜索与入库">
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (searching || busy || !query.trim()) return;
            setSearching(true);
            setMessage("");
            setResults(null);
            const signal = requests.current.signal;
            try {
              const found = await api<MusicSearch>(`${root}/search`, {
                method: "POST",
                body: json({ q: query, platform, segment }),
                signal,
              });
              if (!signal.aborted) setResults(found);
            } catch (e) {
              if (!signal.aborted) setMessage((e as Error).message);
            } finally {
              if (!signal.aborted) setSearching(false);
            }
          }}
        >
          <label>
            歌名或歌手
            <input
              value={query}
              maxLength={100}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例如：晴天 周杰伦"
            />
          </label>
          <Select
            label="搜索平台"
            value={platform}
            onChange={setPlatform}
            options={[
              { value: "all", label: "本地曲库＋B站＋网易云" },
              { value: "local", label: "本地曲库" },
              { value: "bili", label: "B站" },
              { value: "netease", label: "网易云" },
            ]}
          />
          <button
            className="primary"
            type="submit"
            disabled={searching || busy || !query.trim()}
          >
            {searching ? "正在寻找音源…" : "搜索音乐"}
          </button>
          <Select
            label="片段偏好"
            value={segment}
            onChange={setSegment}
            options={[
              { value: "chorus", label: "优先高潮 / 副歌" },
              { value: "opening", label: "普通检索 · 从开头截取" },
            ]}
          />
          <label className="field">
            指定片段起点（秒，可留空）
            <input
              type="number"
              min={0}
              max={14400}
              step={0.1}
              value={startSeconds}
              onChange={(event) => setStartSeconds(event.target.value)}
              placeholder="留空按片段偏好定位"
            />
            <small>
              优先寻找高潮剪辑；网易云尝试用重复歌词定位副歌候选。无法确认时明确提示，仍可手动指定起点
            </small>
          </label>
        </form>
        {results?.sources.map((item) => (
          <p
            key={item.platform}
            className={item.status === "ok" ? "muted" : "inline-error"}
          >
            {platformNames[item.platform]}：
            {item.status === "ok" ? `找到 ${item.count} 条` : item.detail}
          </p>
        ))}
        {results?.results.map((item) => (
          <div className="job-error" key={`${item.platform}:${item.id}`}>
            <Badge>{platformNames[item.platform]}</Badge>
            <strong>{item.title}</strong>
            <small>{item.artists.join(" / ") || "本地音频"}</small>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer">
                查看原曲页面
              </a>
            )}
            {item.availability && <small>{item.availability}</small>}
            {item.segmentHint && <small>{item.segmentHint}</small>}
            <button
              className="ghost"
              disabled={busy || searching}
              onClick={async () => {
                if (item.platform === "local") {
                  setSource(item.id);
                  setMessage("已选为翻唱音源");
                  return;
                }
                setBusy(true);
                setMessage("");
                const signal = requests.current.signal;
                try {
                  const song = await api<{
                    sourceId: string;
                    title: string;
                    segment?: { detail: string; startSeconds: number };
                  }>(`${root}/source`, {
                    method: "POST",
                    body: json({
                      platform: item.platform,
                      id: item.id,
                      segment,
                      ...(startSeconds.trim()
                        ? { startSeconds: Number(startSeconds) }
                        : {}),
                    }),
                    signal,
                  });
                  if (signal.aborted) return;
                  setSource(song.sourceId);
                  props.refresh();
                  setMessage(
                    `已保存“${song.title}”到当前角色曲库。${song.segment ? `起点 ${song.segment.startSeconds} 秒；${song.segment.detail}。` : ""}接下来选择参考音色并生成翻唱`,
                  );
                } catch (e) {
                  if (!signal.aborted) setMessage((e as Error).message);
                } finally {
                  if (!signal.aborted) setBusy(false);
                }
              }}
            >
              {item.platform === "local"
                ? "选为翻唱音源"
                : "保存45秒内片段并选用"}
            </button>
          </div>
        ))}
        <p className="muted">
          搜索、取音源、SVC翻唱与QQ发送分别验证。网易云仅使用平台返回的可播放音频；会员、付费、地区限制与试听内容会明确提示
        </p>
        <p>
          QQ自动找歌入库：
          {props.character.config["sing.source.allowBot"]
            ? "已开启"
            : "尚未开启"}{" "}
          · 角色翻唱：
          {props.character.config["sing.allowBot"] ? "已开启" : "尚未开启"} ·
          QQ发送翻唱：
          {props.character.config["chat.tools.singing"] ? "已开启" : "尚未开启"}
        </p>
        <Disclosure title="QQ找歌与翻唱授权">
          <ConfigForm
            {...props}
            pages={["sing", "chat-media", "bili-actions"]}
            onlyKeys={musicPermissions}
          />
        </Disclosure>
      </Panel>
      <Disclosure
        title="首次连接 · 填一个本地引擎目录即可发现配置"
        initialOpen={!props.character.config["sing.local.modelPath"]}
      >
        <LocalModelDiscovery {...props} kind="sing" />
      </Disclosure>
      <label className="upload-button">
        导入音源或参考音色<span>WAV、MP3、FLAC、Ogg，最多 15MB</span>
        <input
          type="file"
          disabled={busy}
          accept="audio/wav,audio/mpeg,audio/flac,audio/ogg"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 15 * 1024 * 1024) {
              setMessage("音频不能超过 15MB");
              return;
            }
            setBusy(true);
            try {
              await api(root, {
                method: "POST",
                headers: {
                  "Content-Type": "application/octet-stream",
                  "X-Starr-Name": encodeURIComponent(file.name),
                },
                body: file,
              });
              props.refresh();
              setMessage("音频已导入当前角色曲库");
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
              event.target.value = "";
            }
          }}
        />
      </label>
      <Select
        label="要翻唱的音源"
        value={source}
        onChange={setSource}
        options={[{ value: "", label: "选择音源" }, ...options]}
      />
      <Select
        label="参考音色"
        value={reference}
        onChange={setReference}
        options={[{ value: "", label: "使用配置中的默认参考编号" }, ...options]}
      />
      <button
        className="primary"
        disabled={busy || data?.busy || !source}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const result = await api<{ cached?: boolean }>(`${root}/convert`, {
              method: "POST",
              body: json({
                sourceId: source,
                referenceId: reference || undefined,
              }),
            });
            setMessage(
              result.cached
                ? "已复用之前同配置的成品"
                : "本次转换已返回 WAV 音频",
            );
            props.refresh();
          } catch (error) {
            setMessage((error as Error).message);
            props.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "正在处理音频…" : "生成翻唱"}
      </button>
      {message && <p role="status">{message}</p>}
      <Disclosure title="唱歌连接与推理配置">
        <ConfigForm
          {...props}
          pages={["sing"]}
          onlyKeys={props.bootstrap.fields
            .filter(
              (f) => f.page === "sing" && !musicPermissions.includes(f.key),
            )
            .map((f) => f.key)}
        />
      </Disclosure>
      <Disclosure title="本地 SoulX 程序与模型">
        <ConfigForm {...props} pages={["sing-local"]} />
        <button
          className="ghost"
          onClick={async () => {
            try {
              await api(
                `/api/characters/${props.character.id}/media/local/stop`,
                { method: "POST", body: json({ kind: "sing" }) },
              );
              props.notify("已停止插件管理的唱歌进程");
            } catch (error) {
              props.notify((error as Error).message);
            }
          }}
        >
          停止本地唱歌进程
        </button>
      </Disclosure>
      <Disclosure title={`曲库 · ${data?.songs.length || 0} 个音频`}>
        {(busy || data?.busy) && (
          <p role="status" className="footnote">
            {data?.busy
              ? "正在生成翻唱，完成或中止后即可删除音频和成品"
              : "正在处理音频，请稍候再操作"}
          </p>
        )}
        <button
          className="ghost"
          disabled={busy || data?.busy}
          onClick={() =>
            setPending({ kind: "cache", id: "", title: "全部生成成品" })
          }
        >
          清理生成成品
        </button>
        {data?.songs.map((song) => (
          <div className="job-error" key={song.id}>
            <strong>{song.title}</strong>
            {song.platforms && (
              <small>
                来源：
                {song.platforms
                  .split(",")
                  .map((value) => platformNames[value] || value)
                  .join("、")}
              </small>
            )}
            {song.source_url && (
              <a href={song.source_url} target="_blank" rel="noreferrer">
                查看原始来源
              </a>
            )}
            <small>{(song.bytes / 1024 / 1024).toFixed(2)} MB</small>
            {song.segment && (
              <small>
                片段起点 {song.segment.startSeconds} 秒 · {song.segment.detail}
              </small>
            )}
            <code>{song.id}</code>
            {props.character.config["sing.referenceId"] === song.id && (
              <Badge>默认参考音色</Badge>
            )}
            <button
              className="ghost"
              disabled={busy || data?.busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const isDefault =
                    props.character.config["sing.referenceId"] === song.id;
                  await api(`/api/characters/${props.character.id}/config`, {
                    method: "PATCH",
                    body: json({
                      revision: props.character.revision,
                      patch: { "sing.referenceId": isDefault ? "" : song.id },
                    }),
                  });
                  props.refresh();
                  props.notify(
                    isDefault
                      ? "已取消默认参考音色，可继续删除音频"
                      : "已设为默认参考音色",
                  );
                } catch (error) {
                  props.notify((error as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {props.character.config["sing.referenceId"] === song.id
                ? "取消默认参考音色"
                : "设为默认参考音色"}
            </button>
            <button
              className="ghost danger"
              disabled={busy || data?.busy}
              title={
                props.character.config["sing.referenceId"] === song.id
                  ? "确认后解除默认参考音色引用并删除"
                  : "移到本角色回收目录"
              }
              onClick={() =>
                setPending({
                  kind: "source",
                  id: song.id,
                  title: song.title,
                  clearDefault:
                    props.character.config["sing.referenceId"] === song.id,
                  revision: props.character.revision,
                })
              }
            >
              删除音频
            </button>
          </div>
        ))}
      </Disclosure>
      {data?.renders.map((render) => (
        <div className="job-error" key={render.id}>
          <strong>
            {data.songs.find((song) => song.id === render.source_id)?.title ||
              "曲库音源"}
          </strong>
          <Badge tone={render.status === "done" ? "good" : "quiet"}>
            {render.status === "done"
              ? "已有成品"
              : render.status === "converting"
                ? "转换中"
                : render.status === "cache-cleared"
                  ? "成品已清理"
                  : "需要处理"}
          </Badge>
          {render.error && <p className="inline-error">{render.error}</p>}
          {render.status === "done" && (
            <audio
              controls
              className="audio-player"
              src={apiUrl(`${root}/renders/${render.id}`)}
            />
          )}
          <button
            type="button"
            className="ghost danger"
            disabled={busy || data?.busy || render.status === "converting"}
            onClick={() =>
              setPending({
                kind: "render",
                id: render.id,
                title:
                  data.songs.find((song) => song.id === render.source_id)
                    ?.title || "这条翻唱记录",
              })
            }
          >
            {render.status === "done" ? "删除此成品" : "移除这条记录"}
          </button>
        </div>
      ))}
      {pending && (
        <ConfirmDialog
          title={
            pending.kind === "cache"
              ? "清理全部生成成品？"
              : `删除“${pending.title}”？`
          }
          confirmLabel={pending.kind === "cache" ? "确认清理成品" : "确认删除"}
          description={
            pending.kind === "cache"
              ? "永久清理当前角色已有的翻唱成品文件；音源、参考音色和转换记录保留。之后可重新生成。"
              : pending.kind === "source"
                ? `${pending.clearDefault ? "此音频正作为默认参考音色，确认后会同时解除默认引用，下次翻唱需重新选择参考音色。" : ""}从当前角色曲库移除该音频和来源索引，原文件与来源元数据移至曲库 .trash。已有翻唱成品保留；缺失原文件时只清理残留记录。`
                : "从成品列表移除此项，已有文件与元数据移至曲库 .trash。原始音源和参考音色保留，内部转换记录留作核对。"
          }
          onClose={() => setPending(null)}
          onConfirm={async () => {
            setBusy(true);
            const signal = requests.current.signal;
            try {
              const endpoint =
                pending.kind === "cache"
                  ? "cache"
                  : `${pending.kind === "source" ? "source" : "renders"}/${pending.id}`;
              await api(`${root}/${endpoint}`, {
                method: "DELETE",
                signal,
                ...(pending.kind === "source"
                  ? {
                      body: json({
                        clearDefault: pending.clearDefault,
                        revision: pending.revision,
                      }),
                    }
                  : {}),
              });
              if (signal.aborted) return;
              if (pending.kind === "source") {
                if (source === pending.id) setSource("");
                if (reference === pending.id) setReference("");
                setResults(null);
              }
              props.refresh();
              props.notify(
                pending.kind === "cache"
                  ? "生成成品已清理，原始音频保留"
                  : "已从当前角色列表移除，已有文件保留在回收目录",
              );
            } finally {
              if (!signal.aborted) setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
