import { Suspense, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Heart,
  MessageCircle,
  Plus,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useResource, StarMap, type PageProps } from "./main";
import { CompanionOverview } from "./CompanionOverview";
import { Today } from "./Today";
import { Badge, Empty } from "./components";
import { Spectrum } from "./scenes";
import {
  api,
  date,
  kindColors,
  kindNames,
  type Link,
  type Memory,
  type Overview as OverviewData,
} from "./types";

export function ObservatoryOverview(
  props: PageProps & { onMemory: () => void; onGoal: () => void },
) {
  const { character, overview, bootstrap, go, version, refresh, notify } =
    props;
  const { data: graph, error: graphError } = useResource<{
    nodes: Memory[];
    links: Link[];
  }>(`/api/characters/${character.id}/graph`, version);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedMemory = graph?.nodes.find((memory) => memory.id === selected);
  const state = overview.state;
  const waiting = overview.goals.filter((goal) => goal.status === "waiting");
  const motion = String(character.config["ui.motion"] || "default");
  const currentDay = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <div className="observatory-page">
      <section className="observatory-hero" aria-label="星光庭院">
        <header className="observatory-heading">
          <div className="observatory-heading-copy">
            <div className="observatory-kicker">
              <span aria-hidden="true" />
              <span>私人星际观测站</span>
              <i />
              <span>{currentDay}</span>
            </div>
            <h2 className="observatory-title">
              <span>星落有时</span>
              <span>心事有迹</span>
            </h2>
            <p className="observatory-copy">
              <strong>{character.name}</strong> 正在经历自己的每一天
              <span>{state.emotion || "暂无情绪记录"}</span>
            </p>
          </div>
          <div className="observatory-actions">
            <button
              className="primary observatory-action"
              onClick={props.onMemory}
            >
              <Plus size={16} />
              添加记忆
            </button>
            <button
              className="ghost observatory-action-secondary"
              onClick={() => go("host-chat")}
            >
              <MessageCircle size={16} />
              打开角色会话
            </button>
          </div>
        </header>
        <div className="observatory-scene-note" aria-hidden="true">
          <span>星光庭院</span>
          <i />
          <span>与她，共度此刻</span>
        </div>
        <button
          className="observatory-scroll"
          onClick={(event) => {
            const content = event.currentTarget
              .closest(".observatory-page")
              ?.querySelector(".observatory-passage");
            content?.scrollIntoView({
              block: "start",
              behavior:
                motion === "reduced" ||
                matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
            });
          }}
        >
          <span>查看角色近况</span>
          <ArrowDown size={16} />
        </button>
      </section>

      <section className="observatory-passage" aria-label="循星入庭">
        <article className="journey-stop journey-stop-left">
          <span className="journey-number">01 / 循阶</span>
          <h2>
            松风吹解带
            <br />
            山月照弹琴
          </h2>
          <p>王维《酬张少府》</p>
          <div className="journey-footnote">
            <span>穿过树影，循光入庭</span>
            <button onClick={() => go("character")}>
              查看角色资料 <ArrowUpRight size={15} />
            </button>
          </div>
        </article>
        <article className="journey-stop journey-stop-right">
          <span className="journey-number">02 / 观星</span>
          <h2>
            星垂平野阔
            <br />
            月涌大江流
          </h2>
          <p>杜甫《旅夜书怀》</p>
          <div className="journey-footnote">
            <span>{overview.counts.memories} 段经历，在星海里相逢</span>
            <button onClick={() => go("memory")}>
              查看记忆 <ArrowUpRight size={15} />
            </button>
          </div>
        </article>
        <article className="journey-stop journey-stop-left">
          <span className="journey-number">03 / 回望</span>
          <h2>
            此时相望不相闻
            <br />
            愿逐月华流照君
          </h2>
          <p>张若虚《春江花月夜》</p>
          <div className="journey-footnote">
            <span>星轨之外，也有人间回声</span>
            <button onClick={() => go("conversation")}>
              查看会话记录 <ArrowUpRight size={15} />
            </button>
          </div>
        </article>
      </section>

      <div className="observatory-content">
        <nav className="observatory-metrics" aria-label="角色近况索引">
          <button onClick={() => go("memory")}>
            <span>记忆片段</span>
            <strong>{overview.counts.memories.toLocaleString()}</strong>
            <small>已保存的记忆</small>
          </button>
          <button onClick={() => go("memory")}>
            <span>真实关联</span>
            <strong>{overview.counts.links.toLocaleString()}</strong>
            <small>已建立的记忆关联</small>
          </button>
          <button onClick={() => go("state")}>
            <span>当前情绪</span>
            <strong className="metric-emotion">
              {state.emotion || "平静"}
            </strong>
            <small>来自角色的状态记录</small>
          </button>
          <button onClick={() => go("intentions")}>
            <span>待处理目的</span>
            <strong>{waiting.length.toLocaleString()}</strong>
            <small>等待评估或执行的目的</small>
          </button>
        </nav>

        <div className="observatory-grid">
          <section className="observatory-map" aria-label="记忆星图">
            <header className="observatory-section-heading">
              <div>
                <span className="observatory-eyebrow">她走过的路</span>
                <h3>记忆星图</h3>
                <p>光芒映照记忆权重，星轨只连接真实相关的经历</p>
              </div>
              <button className="text-link" onClick={() => go("memory")}>
                打开记忆图谱 <ArrowUpRight size={14} />
              </button>
            </header>
            <div className="observatory-map-stage">
              {graphError ? (
                <div className="observatory-map-state" role="alert">
                  <Sparkles size={22} />
                  <p>记忆图谱暂时无法加载</p>
                  <small>{graphError}</small>
                  <button className="text-link" onClick={refresh}>
                    重新读取 <ArrowUpRight size={13} />
                  </button>
                </div>
              ) : !graph ? (
                <div className="observatory-map-state" role="status">
                  <span className="map-loading-orbit" aria-hidden="true" />
                  <p>正在加载记忆</p>
                </div>
              ) : graph.nodes.length ? (
                <Suspense
                  fallback={
                    <div className="observatory-map-state" role="status">
                      <span className="map-loading-orbit" aria-hidden="true" />
                      <p>正在加载记忆图谱</p>
                    </div>
                  }
                >
                  <StarMap
                    nodes={graph.nodes}
                    links={graph.links}
                    selected={selected}
                    onSelect={setSelected}
                    motion={motion}
                  />
                </Suspense>
              ) : (
                <div className="observatory-map-state observatory-map-empty">
                  <div className="empty-star" aria-hidden="true">
                    <Star size={22} />
                  </div>
                  <h4>第一颗星，还在等一个故事</h4>
                  <p>写下一件值得记住的事，它会从这里长出自己的星轨</p>
                  <button className="primary" onClick={props.onMemory}>
                    <Plus size={15} />
                    记录第一段记忆
                  </button>
                </div>
              )}
            </div>
            <footer className="observatory-map-footer">
              <span>
                <i className="map-legend-star" />
                星点亮度随记忆权重变化
              </span>
              <span>
                <i className="map-legend-link" />
                连线表示已记录的关联
              </span>
              <button className="text-link" onClick={props.onMemory}>
                <Plus size={13} /> 记录记忆
              </button>
            </footer>
          </section>

          <aside className="observatory-aside" aria-label="此刻与记忆详情">
            {selectedMemory ? (
              <section
                className="observatory-memory-detail"
                aria-label="选中记忆的完整详情"
              >
                <header className="observatory-detail-heading">
                  <span className="observatory-eyebrow">记忆详情</span>
                  <button
                    className="icon-button"
                    aria-label="关闭记忆详情"
                    onClick={() => setSelected(null)}
                  >
                    <X size={16} />
                  </button>
                </header>
                <div className="observatory-memory-type">
                  <i style={{ background: kindColors[selectedMemory.kind] }} />
                  {kindNames[selectedMemory.kind]}
                  {selectedMemory.anchor && <Badge>重要记忆</Badge>}
                </div>
                <h3>{selectedMemory.title}</h3>
                <div className="memory-reading">
                  <span className="detail-content-label">完整记忆</span>
                  <div className="memory-body">{selectedMemory.content}</div>
                </div>
                <dl className="detail-facts">
                  <div>
                    <dt>记录于</dt>
                    <dd>{date(selectedMemory.created)}</dd>
                  </div>
                  <div>
                    <dt>重要度</dt>
                    <dd>{selectedMemory.importance} / 100</dd>
                  </div>
                  <div>
                    <dt>当前召回权重</dt>
                    <dd>{selectedMemory.score}</dd>
                  </div>
                </dl>
                <div className="observatory-detail-links">
                  <button className="text-link" onClick={() => go("memory")}>
                    <BookOpen size={14} /> 在记忆库中查看
                  </button>
                  {graph?.links
                    .filter(
                      (edge) =>
                        edge.source === selectedMemory.id ||
                        edge.target === selectedMemory.id,
                    )
                    .slice(0, 4)
                    .map((edge, index) => {
                      const other = graph.nodes.find(
                        (memory) =>
                          memory.id ===
                          (edge.source === selectedMemory.id
                            ? edge.target
                            : edge.source),
                      );
                      return other ? (
                        <button
                          className="observatory-related-memory"
                          key={`${edge.source}:${edge.target}:${index}`}
                          onClick={() => setSelected(other.id)}
                        >
                          <span>{other.title}</span>
                          <ArrowUpRight size={13} />
                        </button>
                      ) : null;
                    })}
                </div>
              </section>
            ) : (
              <>
                <section
                  className="observatory-feeling"
                  aria-label="情绪与体感"
                >
                  <header className="observatory-section-heading">
                    <div>
                      <span className="observatory-eyebrow">当前角色状态</span>
                      <h3>情绪变化</h3>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="查看情绪与体感"
                      onClick={() => go("state")}
                    >
                      <Activity size={17} />
                    </button>
                  </header>
                  <div className="observatory-emotion-title">
                    <span className="observatory-emotion-star">
                      <Star size={19} />
                    </span>
                    <div>
                      <h4>{state.emotion || "暂无情绪记录"}</h4>
                      <p>由经历慢慢形成，不替她下结论</p>
                    </div>
                  </div>
                  <Spectrum state={state} motion={motion} />
                  <div className="observatory-state-values">
                    {[
                      ["精力", state.energy],
                      ["舒适", state.comfort],
                      ["社交意愿", state.social],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <div className="state-value-track">
                          <i style={{ width: `${value}%` }} />
                        </div>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="observatory-recent" aria-label="最近的记忆">
                  <header className="observatory-section-heading">
                    <div>
                      <span className="observatory-eyebrow">近来留下的光</span>
                      <h3>最近记忆</h3>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => go("memory")}
                      aria-label="查看全部记忆"
                    >
                      全部 <ArrowUpRight size={13} />
                    </button>
                  </header>
                  {overview.memories.length ? (
                    <div className="observatory-memory-list">
                      {[...overview.memories]
                        .sort((a, b) => b.created.localeCompare(a.created))
                        .slice(0, 3)
                        .map((memory) => (
                          <button
                            key={memory.id}
                            onClick={() => setSelected(memory.id)}
                            aria-label={`阅读记忆：${memory.title}`}
                          >
                            <i
                              style={{ background: kindColors[memory.kind] }}
                            />
                            <span>
                              <strong>{memory.title}</strong>
                              <small>
                                {kindNames[memory.kind]} ·{" "}
                                {date(memory.created)}
                              </small>
                            </span>
                            <ArrowUpRight size={13} />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <p className="observatory-empty-line">
                      还没有记忆，故事可以从很小的一件事开始
                    </p>
                  )}
                </section>
              </>
            )}
          </aside>
        </div>

        <CompanionOverview
          character={character}
          overview={overview}
          bootstrap={bootstrap}
          version={version}
          refresh={refresh}
          notify={notify}
          go={go}
        />
        <div className="observatory-today">
          <Today {...props} compact />
        </div>

        <footer className="observatory-trustline">
          <span>
            <i className="live-dot" />
            {bootstrap.host?.connected
              ? "DSH 宿主已连接"
              : "独立控制台 · DSH 宿主待接入"}
          </span>
          <span>
            <Heart size={13} />
            记忆保存在本地，不以模型回复代替真实记录
          </span>
        </footer>
      </div>
    </div>
  );
}

export type ObservatoryGraph = {
  nodes: Memory[];
  links: Link[];
};
