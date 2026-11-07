import { ArrowDown, ArrowUpRight, RefreshCw } from "lucide-react";
import { type PageProps } from "./main";
import { date, kindNames } from "./types";
import { StatusCards, useDashboard } from "./RuntimeStatus";

const steps = [
  ["connections", "会话与连接"],
  ["senses", "感官与状态"],
  ["agency", "自主行为"],
  ["memories", "最近记忆"],
];
const eventStates: Record<string, string> = {
  sent: "已发送",
  done: "已完成",
  saved: "已保存",
  silent: "选择安静",
  failed: "执行失败",
  uncertain: "结果待核对",
  running: "进行中",
  skipped: "已略过",
  accepted: "平台已受理",
  sending: "发送待确认",
  cancelled: "已停止",
  recovered: "已恢复",
};
export function ObservatoryOverview(props: PageProps) {
  const { character, go, overview } = props;
  const { data, error, retry } = useDashboard(character.id, props.version);
  const state = data?.state || overview.state;
  const items = (ids: string[]) =>
    data?.items.filter((item) => ids.includes(item.id)) || [];
  const scroll = (id: string) =>
    document.getElementById(`home-${id}`)?.scrollIntoView({
      block: "start",
      behavior:
        character.config["ui.motion"] === "reduced" ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
    });
  return (
    <div className="observatory-page home-preview-page">
      <section className="observatory-hero" aria-label="首页预览">
        <header className="observatory-heading">
          <div className="observatory-heading-copy">
            <div className="observatory-kicker">
              {new Intl.DateTimeFormat("zh-CN", {
                month: "long",
                day: "numeric",
                weekday: "long",
              }).format(new Date())}
              <span>此间星河</span>
            </div>
            <h2 className="observatory-title">
              <span>山河入梦</span>
              <span>星海有声</span>
            </h2>
            <p className="observatory-copy">循光而来，让每一颗星都有回响。</p>
            <nav className="home-section-links" aria-label="首页预览分段">
              {steps.map(([id, label], i) => (
                <button key={id} onClick={() => scroll(id)}>
                  <span>0{i + 1}</span>
                  {label}
                  <ArrowDown size={13} />
                </button>
              ))}
            </nav>
          </div>
        </header>
        <button
          className="observatory-scroll"
          onClick={() => scroll("connections")}
        >
          查看连接状态
          <ArrowDown size={16} />
        </button>
      </section>
      <div className="home-live-caption" role="status">
        <span>
          {error ||
            (data
              ? `状态更新于 ${new Date(data.checkedAt).toLocaleTimeString("zh-CN")} · 页面可见时每 20 秒刷新`
              : "正在读取实际运行状态…")}
        </span>
        <button className="text-link" onClick={retry}>
          <RefreshCw size={13} />
          刷新状态
        </button>
      </div>
      <section
        id="home-connections"
        className="home-preview-section"
        aria-labelledby="connections-title"
      >
        <div className="home-section-intro">
          <span>01 / 会话与连接</span>
          <h2 id="connections-title">消息能否顺利抵达</h2>
          <p>一眼查看宿主、QQ 与 B站的连接；设置在各功能页直接打开。</p>
          <button className="text-link" onClick={() => go("chat-rules")}>
            回复与连续接听设置
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="home-preview-surface">
          <StatusCards items={items(["host", "qq", "bili"])} go={go} />
          {!data && <p>{error || "正在读取连接状态…"}</p>}
          <div className="home-preview-note">
            只有实际连接或平台轮询成功才显示在线。外部模型仅配置完整时显示“待验证”。
          </div>
        </div>
      </section>
      <section
        id="home-senses"
        className="home-preview-section"
        aria-labelledby="senses-title"
      >
        <div className="home-section-intro">
          <span>02 / 感官与状态</span>
          <h2 id="senses-title">此刻的感受与能力</h2>
          <p>情绪来自角色实际记录。看图、听写、说话和翻唱各有独立状态。</p>
          <button className="text-link" onClick={() => go("state")}>
            情绪与体感详情
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="home-preview-surface">
          <div className="home-feeling">
            <div>
              <small>当前情绪</small>
              <h3>{state.emotion || "暂无记录"}</h3>
            </div>
            <div className="home-state-meters">
              {[
                ["精力", state.energy],
                ["舒适", state.comfort],
                ["社交意愿", state.social],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <meter min="0" max="100" value={Number(value)} />
                  <strong>{Math.round(Number(value))}</strong>
                </div>
              ))}
            </div>
          </div>
          <StatusCards
            items={items(["vision", "hearing", "tts", "singing"])}
            go={go}
          />
        </div>
      </section>
      <section
        id="home-agency"
        className="home-preview-section"
        aria-labelledby="agency-title"
      >
        <div className="home-section-intro">
          <span>03 / 自主行为</span>
          <h2 id="agency-title">最近做了什么</h2>
          <p>保留简明近况，详细执行结果和配置放在相应功能页。</p>
          <button className="text-link" onClick={() => go("intentions")}>
            自主行为设置与记录
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="home-preview-surface">
          <StatusCards items={items(["agency", "browser", "files"])} go={go} />
          <h3>最近 24 小时</h3>
          {data?.recent.length ? (
            <ol className="home-recent-events">
              {data.recent.map((event) => (
                <li key={`${event.kind}-${event.id}`}>
                  <span className="recent-event-mark" />
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {event.kind} · {eventStates[event.status] || "已记录"}
                    </small>
                  </div>
                  <time>
                    {new Date(event.time).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="home-empty">
              {data
                ? "最近 24 小时暂无活动记录，待机不代表故障。"
                : error || "正在读取最近活动…"}
            </p>
          )}
        </div>
      </section>
      <section
        id="home-memories"
        className="home-preview-section"
        aria-labelledby="memories-title"
      >
        <div className="home-section-intro">
          <span>04 / 最近记忆</span>
          <h2 id="memories-title">留下来的经历</h2>
          <p>
            {data?.memory.count == null
              ? "本地记忆状态正在读取。"
              : `记忆库中保存了 ${data.memory.count.toLocaleString()} 条记录。这里只预览最近三条。`}
          </p>
          <button className="text-link" onClick={() => go("memory")}>
            打开完整记忆库
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="home-preview-surface">
          <StatusCards items={items(["memory", "jobs"])} go={go} />
          <div className="home-recent-memories">
            {data?.memory.recent.map((memory) => (
              <button
                key={memory.id}
                onClick={() => {
                  sessionStorage.setItem(
                    `starr-memory-selection:${character.id}`,
                    memory.id,
                  );
                  go("memory");
                }}
              >
                <small>
                  {kindNames[memory.kind] || "记忆"} · {date(memory.created)}
                </small>
                <h3>{memory.title}</h3>
                <p>{memory.preview}</p>
                <span>
                  阅读全文
                  <ArrowUpRight size={13} />
                </span>
              </button>
            ))}
          </div>
          {data && !data.memory.recent.length && (
            <p className="home-empty">
              {data.memory.count === null
                ? "记忆读取失败，请到维护页检查。"
                : "还没有保存的记忆。新经历保存后会在这里出现。"}
            </p>
          )}
        </div>
      </section>
      <nav className="home-end-links" aria-label="常用设置">
        <button onClick={() => go("settings")}>
          全部功能与配置
          <ArrowUpRight size={14} />
        </button>
        <button onClick={() => go("maintenance")}>
          维护与备份
          <ArrowUpRight size={14} />
        </button>
        <button onClick={() => go("appearance")}>
          外观与性能
          <ArrowUpRight size={14} />
        </button>
      </nav>
    </div>
  );
}
