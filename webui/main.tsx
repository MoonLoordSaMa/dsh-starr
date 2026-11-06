import React, {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  UserRound,
  Orbit,
  Activity,
  MessagesSquare,
  AudioLines,
  Globe2,
  Smile,
  Wrench,
  Settings2,
  Plus,
  ChevronRight,
  Menu,
  X,
  Check,
  ArrowRight,
  RefreshCw,
  BookOpen,
  CheckCheck,
  Clock3,
  ArrowUpRight,
} from "lucide-react";
import {
  api,
  json,
  date,
  kindNames,
  kindColors,
  type Bootstrap,
  type Overview as OverviewData,
  type Memory,
  type Goal,
  type Character,
} from "./types";
import {
  Badge,
  Panel,
  Empty,
  Select,
  Star,
  Modal,
  TextLink,
} from "./components";
import { Background, Spectrum } from "./scenes";
import { playRouteTransition, usePageEntrance } from "./motion";
import { useLiquidMetal } from "./liquid-metal";
import {
  MemoryPage,
  CharacterPage,
  StatePage,
  MediaPage,
  SettingsPage,
  MaintenancePage,
  ExpressionsPage,
  ConnectionPage,
  ConfigForm,
} from "./pages";
import { OnboardingWizard } from "./OnboardingWizard";
import "./style.css";
import "./threeui-theme.css";
import "./kage-theme.css";
import "./organism.css";
import "./liquid-metal.css";
import "./v015.css";
import "./v019.css";
import "./v019-redesign.css";
import "./v019-surfaces.css";
import "./v019-journey.css";
import "./foundation.css";
import "./v019-glass.css";
import "./v020.css";
import { PageContinuation } from "./PageContinuation";
import { CompanionOverview } from "./CompanionOverview";
import { ObservatoryOverview } from "./ObservatoryOverview";
import { navigation, workspaces } from "./navigation";
import { PagePrelude, RelatedRoutes, WorkspacePage } from "./WorkspacePages";
import { Today } from "./Today";

export const StarMap = lazy(() => import("./StarMap"));
export function useResource<T>(url: string, version = 0) {
  const [result, setResult] = useState<{
    url: string;
    data: T | null;
    error: string | null;
  }>({ url: "", data: null, error: null });
  useEffect(() => {
    if (!url) return;
    const abort = new AbortController();
    api<T>(url, { signal: abort.signal })
      .then((data) => {
        if (!abort.signal.aborted) setResult({ url, data, error: null });
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setResult({ url, data: null, error: e.message });
      });
    return () => abort.abort();
  }, [url, version]);
  return result.url === url ? result : { url, data: null, error: null };
}
export type PageProps = {
  character: Character;
  overview: OverviewData;
  bootstrap: Bootstrap;
  version: number;
  refresh: () => void;
  notify: (s: string) => void;
  go: (page: string) => void;
};
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="fatal">
        <Star />
        <h1>页面暂时没能展开</h1>
        <p>数据仍在本地保存，重新载入后继续</p>
        <button onClick={() => location.reload()}>重新载入</button>
      </div>
    ) : (
      this.props.children
    );
  }
}

function Overview({
  overview,
  character,
  bootstrap,
  go,
  version,
  refresh,
  notify,
  onMemory,
  onGoal,
}: PageProps & { onMemory: () => void; onGoal: () => void }) {
  const { data: graph } = useResource<{
      nodes: Memory[];
      links: import("./types").Link[];
    }>(`/api/characters/${character.id}/graph`, version),
    [selected, setSelected] = useState<string | null>(null);
  const active = overview.goals.filter((g) => g.status === "waiting"),
    s = overview.state,
    motion = String(character.config["ui.motion"]);
  const selectedMemory = graph?.nodes.find((n) => n.id === selected);
  return (
    <>
      <section className="landing-hero" aria-label="星际观测站">
        <div className="hero-intro">
          <h2>
            <span>{character.name}</span>
          </h2>
          <p>
            {s.emotion || "正在经历自己的每一天"}
            <br />
            留下经历，也慢慢靠近心愿
          </p>
        </div>
        <div className="hero-coordinate" aria-hidden="true">
          <span>此刻与她</span>
          <i />
          <span>只属于这个角色</span>
        </div>
        <div className="hero-footer">
          <div className="hero-actions">
            <button className="primary hero-enter" onClick={() => go("memory")}>
              查看记忆 <ArrowUpRight size={18} />
            </button>
            <button className="hero-write" onClick={onMemory}>
              <Plus size={16} />
              记录记忆
            </button>
          </div>
          <div className="hero-status">
            <span className="live-dot" />
            <strong>{s.emotion}</strong>
            <span>当前角色状态</span>
            <span className="hero-status-rule" />
            <b>{overview.counts.memories}</b>
            <span>段记忆</span>
          </div>
        </div>
        <button
          className="hero-scroll"
          onClick={(event) =>
            event.currentTarget
              .closest("main")
              ?.querySelector(".overview-chapters")
              ?.scrollIntoView({
                behavior: motion === "reduced" ? "instant" : "smooth",
                block: "start",
              })
          }
        >
          <span>沿着星光，继续向下</span>
          <i />
        </button>
      </section>
      <div className="overview-chapters">
        <CompanionOverview
          overview={overview}
          character={character}
          bootstrap={bootstrap}
          version={version}
          refresh={refresh}
          notify={notify}
          go={go}
        />
        <Today
          overview={overview}
          character={character}
          bootstrap={bootstrap}
          go={go}
          version={version}
          refresh={refresh}
          notify={notify}
          compact
        />
        <div className="chapter-navigation" aria-label="探索方向">
          <button onClick={() => go("memory")}>
            <small>留下</small>
            <strong>那些未曾散去的光</strong>
            <span>
              查看记忆详情 <ArrowUpRight size={18} />
            </span>
          </button>
          <button onClick={() => go("state")}>
            <small>感受</small>
            <strong>此刻心潮</strong>
            <span>
              循着心潮，听见愿望 <ArrowUpRight size={18} />
            </span>
          </button>
          <button onClick={() => go("conversation")}>
            <small>相连</small>
            <strong>与世界对话</strong>
            <span>
              让感知与表达自然发生 <ArrowUpRight size={18} />
            </span>
          </button>
        </div>
        <div className="orbit-summary" aria-label="角色概况">
          <span className="orbit-summary-label">
            <Star />
            这个角色的小宇宙
          </span>
          <span>
            <b>{overview.counts.memories}</b> 段记忆
          </span>
          <span>
            <b>{overview.counts.links}</b> 条关联
          </span>
          <span>
            <b>{active.length}</b> 个待完成的约定
          </span>
          <span className="orbit-summary-status">
            <i className="live-dot" />
            记忆持续在本地保存
          </span>
        </div>
        <div className={`overview-grid ${selectedMemory ? "has-memory" : ""}`}>
          <Panel
            className="universe-panel"
            title="记忆图谱"
            aside={<TextLink onClick={() => go("memory")}>进入记忆</TextLink>}
          >
            <Suspense
              fallback={<div className="scene-loading">正在加载场景</div>}
            >
              {graph && (
                <StarMap
                  nodes={graph.nodes}
                  links={graph.links}
                  selected={selected}
                  onSelect={setSelected}
                  motion={motion}
                />
              )}
            </Suspense>
            <div className="universe-footer">
              <span className="universe-footer-caption">
                <i />
                探索她的记忆轨道
              </span>
              <div>
                <span className="large-number">{overview.counts.memories}</span>
                <span>条记忆</span>
              </div>
              <div>
                <span className="large-number">{overview.counts.links}</span>
                <span>条真实关联</span>
              </div>
              <button className="ghost" onClick={onMemory}>
                <Plus size={15} />
                添加记忆
              </button>
            </div>
          </Panel>
          <div className="overview-rail">
            {selectedMemory && (
              <aside
                className="panel memory-detail overview-memory-detail"
                aria-label="选中记忆的完整详情"
              >
                <div className="detail-heading">
                  <Badge>{kindNames[selectedMemory.kind]}</Badge>
                  <button
                    className="icon-button"
                    aria-label="关闭记忆详情"
                    onClick={() => setSelected(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <h2>{selectedMemory.title}</h2>
                <section className="memory-reading" aria-label="记忆完整正文">
                  <span className="detail-content-label">完整正文</span>
                  <div className="memory-body">{selectedMemory.content}</div>
                </section>
                <div className="detail-facts">
                  <span>
                    记录于<strong>{date(selectedMemory.created)}</strong>
                  </span>
                  <span>
                    来源<strong>{selectedMemory.source}</strong>
                  </span>
                  <span>
                    重要度<strong>{selectedMemory.importance} / 100</strong>
                  </span>
                  <span>
                    事实置信度<strong>{selectedMemory.confidence} / 100</strong>
                  </span>
                  <span>
                    当前召回权重<strong>{selectedMemory.score}</strong>
                  </span>
                </div>
                <h3 className="detail-subtitle">相关记忆</h3>
                {graph?.links
                  .filter(
                    (edge) =>
                      edge.source === selectedMemory.id ||
                      edge.target === selectedMemory.id,
                  )
                  .map((edge, index) => {
                    const other = graph.nodes.find(
                      (n) =>
                        n.id ===
                        (edge.source === selectedMemory.id
                          ? edge.target
                          : edge.source),
                    );
                    return other ? (
                      <button
                        key={index}
                        className="relation-row"
                        onClick={() => setSelected(other.id)}
                      >
                        <span>{other.title}</span>
                        <ArrowUpRight size={13} />
                      </button>
                    ) : null;
                  })}
              </aside>
            )}
            <Panel
              title="当前角色状态"
              className="feeling-panel"
              aside={<TextLink onClick={() => go("state")}>看状态</TextLink>}
            >
              <div className="emotion-title">
                <span className="emotion-orb">
                  <Star />
                </span>
                <div>
                  <h3>{s.emotion}</h3>
                  <small>来自角色的模拟状态</small>
                </div>
              </div>
              <Spectrum state={s} motion={motion} />
              <div className="spectrum-legend">
                <span>
                  <i />
                  情绪波谱
                </span>
                <span>唤醒度 {s.arousal}</span>
              </div>
              <div className="mini-state">
                {[
                  ["精力", s.energy],
                  ["舒适", s.comfort],
                  ["社交意愿", s.social],
                ].map(([n, v]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <div className="meter">
                      <i style={{ width: `${v}%` }} />
                    </div>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="连接与准备">
              <div className="connection-row">
                <span>
                  <i className="live-dot" />
                  starr 核心
                </span>
                <span>运行中</span>
              </div>
              <div className="connection-row">
                <span>DSH 宿主</span>
                <span className="muted">
                  {bootstrap.host?.connected ? "已连接" : "待接入"}
                </span>
              </div>
              <div className="connection-row">
                <span>模型与平台</span>
                <TextLink onClick={() => go("media")}>配置能力</TextLink>
              </div>
              <p className="footnote">
                {bootstrap.host?.connected
                  ? "已连接 DSH · 平台消息桥接仍需分别配置与验收"
                  : "独立初版 · 宿主连接完成后启用平台会话"}
              </p>
            </Panel>
          </div>
        </div>
        <div className="bottom-grid">
          <Panel
            title="最近记忆"
            aside={<TextLink onClick={() => go("memory")}>全部记忆</TextLink>}
          >
            {overview.memories.length ? (
              <div className="memory-list">
                {[...overview.memories]
                  .sort((a, b) => b.created.localeCompare(a.created))
                  .slice(0, 4)
                  .map((m) => (
                    <button
                      className="memory-row"
                      key={m.id}
                      onClick={() => go("memory")}
                    >
                      <i style={{ background: kindColors[m.kind] }} />
                      <div>
                        <strong>{m.title}</strong>
                        <small>
                          {kindNames[m.kind]} · {date(m.created)}
                        </small>
                      </div>
                      {m.anchor ? (
                        <BookOpen size={15} />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </button>
                  ))}
              </div>
            ) : (
              <Empty
                title="还没有记忆"
                description="值得记住的事，可以从一句话开始"
                action={
                  <button className="ghost" onClick={onMemory}>
                    记录第一段记忆
                  </button>
                }
              />
            )}
          </Panel>
          <Panel
            title="待处理目的"
            aside={
              <button className="text-link" onClick={onGoal}>
                <Plus size={14} />
                添加目的
              </button>
            }
          >
            {active.length ? (
              <div className="goal-list">
                {active.slice(0, 3).map((g) => (
                  <div className="goal-row" key={g.id}>
                    <Clock3 size={17} />
                    <div>
                      <strong>{g.title}</strong>
                      <small>{g.reason}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="暂时没有待办的约定"
                description="主动来自值得做的事，不必为了开口而开口"
              />
            )}
            <TextLink onClick={() => go("state")}>管理目的与行动条件</TextLink>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function MemoryModal({
  character,
  onClose,
  onSaved,
}: {
  character: Character;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
      title: "",
      content: "",
      kind: "moment",
      importance: 60,
      confidence: 90,
      anchor: false,
      source: "用户手动记录",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="添加记忆" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(`/api/characters/${character.id}/memories`, {
              method: "POST",
              body: json({ ...form, eventKey: crypto.randomUUID() }),
            });
            onSaved();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          一个简短的标题
          <input
            autoFocus
            required
            maxLength={150}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <div className="field">
          <label>它属于</label>
          <Select
            label="资料类型"
            value={form.kind}
            onChange={(kind) => setForm({ ...form, kind })}
            options={Object.entries(kindNames).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        <label className="field">
          想记住的事
          <textarea
            rows={5}
            required
            maxLength={40000}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </label>
        <div className="form-columns">
          <label className="field">
            重要度 <span>{form.importance}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={form.importance}
              onChange={(e) =>
                setForm({ ...form, importance: +e.target.value })
              }
            />
            <small>影响检索顺序，不会删除原文</small>
          </label>
          <label className="field">
            事实置信度 <span>{form.confidence}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={form.confidence}
              onChange={(e) =>
                setForm({ ...form, confidence: +e.target.value })
              }
            />
            <small>对内容可靠程度的判断</small>
          </label>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.anchor}
            onChange={(e) => setForm({ ...form, anchor: e.target.checked })}
          />
          作为长期锚点，不降低召回优先级
        </label>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <small>提交后立即保存，再输出笔记</small>
          <button className="primary" disabled={busy}>
            {busy ? "保存中…" : "记录记忆"}
            <Check size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function GoalModal({
  character,
  onClose,
  onSaved,
}: {
  character: Character;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ title: "", reason: "", due: "" }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="添加目的" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(`/api/characters/${character.id}/goals`, {
              method: "POST",
              body: json({
                ...form,
                due: form.due ? new Date(form.due).toISOString() : null,
              }),
            });
            onSaved();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          想做什么
          <input
            required
            maxLength={150}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="field">
          为什么，以及来自哪里
          <textarea
            required
            rows={4}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </label>
        <label className="field">
          约定时间，可留空
          <input
            type="datetime-local"
            value={form.due}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
          <small>时间到达只会提示重新评估，不会自动替你发消息</small>
        </label>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <span />
          <button className="primary" disabled={busy}>
            {busy ? "正在记录…" : "保存目的"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function NewCharacter({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="添加角色" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/api/characters", {
              method: "POST",
              body: json({ name }),
            });
            onSaved();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          角色名称
          <input
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <small>人格、记忆、状态和配置将独立保存。显示名可以重复</small>
        </label>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <div className="form-footer">
          <span />
          <button className="primary" disabled={busy}>
            创建角色
            <Plus size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function App() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null),
    [bootError, setBootError] = useState(""),
    [id, setId] = useState(localStorage.getItem("starr-character") ?? ""),
    [version, setVersion] = useState(0),
    [page, setPage] = useState(() =>
      navigation.some(
        (n) =>
          n.id ===
          (location.hash === "#platforms"
            ? "conversation"
            : location.hash.slice(1)),
      )
        ? location.hash === "#platforms"
          ? "conversation"
          : location.hash.slice(1)
        : "overview",
    ),
    [menu, setMenu] = useState(false),
    [compact, setCompact] = useState(
      () => matchMedia("(max-width: 980px)").matches,
    ),
    [modal, setModal] = useState(""),
    [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    main = useRef<HTMLElement>(null);
  const load = useCallback(() => {
    api<Bootstrap>("/api/bootstrap")
      .then((data) => {
        setBootstrap(data);
        setBootError("");
        setId((old) =>
          data.characters.some((c) => c.id === old)
            ? old
            : (data.characters[0]?.id ?? ""),
        );
      })
      .catch((e) => setBootError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    const media = matchMedia("(max-width: 980px)");
    const change = () => setCompact(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!menu || !compact) return;
    const before = document.activeElement as HTMLElement;
    const frame = requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>('.sidebar nav button[aria-current="page"]')
        ?.focus(),
    );
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [menu, compact]);
  useEffect(() => {
    const handler = () => {
      const next =
        location.hash === "#platforms"
          ? "conversation"
          : location.hash.slice(1);
      setPage(navigation.some((n) => n.id === next) ? next : "overview");
      main.current?.scrollTo({ top: 0, behavior: "instant" });
      if (next === "onboarding") {
        setBootstrap(null);
        load();
      }
    };
    addEventListener("hashchange", handler);
    return () => removeEventListener("hashchange", handler);
  }, [load]);
  useEffect(() => {
    if (id) localStorage.setItem("starr-character", id);
  }, [id]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  const { data: overview, error } = useResource<OverviewData>(
    id ? `/api/characters/${id}/overview` : "",
    version,
  );
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }, []);
  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
    load();
  }, [load]);
  const go = (next: string) => {
    setMenu(false);
    main.current?.scrollTo({ top: 0, behavior: "instant" });
    if (page !== next) {
      playRouteTransition();
      setPage(next);
      location.hash = next;
    }
  };
  const onClose = useCallback(() => setModal(""), []);
  const motion = String(overview?.character.config["ui.motion"] ?? "default"),
    blur = Number(overview?.character.config["ui.blur"] ?? 8),
    density = Number(overview?.character.config["ui.starDensity"] ?? 1);
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
    document.documentElement.style.setProperty("--blur", `${blur}px`);
  }, [motion, blur]);
  usePageEntrance(
    main,
    `${id}:${page}`,
    Boolean(
      overview && overview.character.id === id && bootstrap?.installation,
    ),
    motion,
  );
  useLiquidMetal(motion);
  if (!bootstrap)
    return (
      <>
        <Background motion="light" density={0.6} />
        <div className="fatal">
          <Star />
          <h1>{bootError ? "暂时无法连接 starr" : "正在加载 starr"}</h1>
          <p>{bootError || "连接独立角色核心…"}</p>
          {bootError && <button onClick={load}>重试连接</button>}
        </div>
      </>
    );
  if (!bootstrap.installation || location.hash === "#onboarding")
    return (
      <>
        <Background motion="default" density={1} />
        <OnboardingWizard
          key={bootstrap.onboarding.revision}
          data={bootstrap}
          onDone={() => {
            location.hash = "overview";
            refresh();
          }}
        />
      </>
    );
  const props =
    overview && overview.character.id === id
      ? {
          character: overview.character,
          overview,
          bootstrap,
          version,
          refresh,
          notify,
          go,
        }
      : null;
  const nav = navigation.find((n) => n.id === page) ?? navigation[0],
    section =
      workspaces.find((group) => group.pages.includes(page)) ?? workspaces[0],
    activeProps = props;
  return (
    <>
      <Background
        motion={motion}
        density={density}
        scene={page}
        state={overview?.state}
        quality={String(overview?.character.config["ui.quality"] || "auto")}
      />
      <div className="route-curtain" aria-hidden="true" />
      <div
        className={`app-shell ${menu ? "menu-open" : ""}`}
        data-workspace={section.id}
      >
        <button
          className="nav-shade"
          aria-label="关闭导航"
          onClick={() => setMenu(false)}
        />
        <aside className="sidebar" inert={compact && !menu}>
          <div className="workspace-heading">
            <span>私人星际观测站</span>
            <h2>{section.name}</h2>
            <p>{section.caption}</p>
          </div>
          <div className="character-switch">
            <span className="avatar">{props?.character.name[0] ?? "✧"}</span>
            <Select
              label="切换观察角色"
              value={id}
              onChange={(next) => {
                setId(next);
                setModal("");
                setMenu(false);
              }}
              options={bootstrap.characters.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
            <button
              type="button"
              className="icon-button"
              aria-label="添加角色"
              onClick={() => setModal("character")}
            >
              <Plus size={15} />
            </button>
          </div>
          <nav aria-label="主要导航">
            {section.primary
              .flatMap((id) => navigation.filter((n) => n.id === id))
              .map((n) => (
                <React.Fragment key={n.id}>
                  <button
                    aria-current={page === n.id ? "page" : undefined}
                    className={page === n.id ? "active" : ""}
                    onClick={() => go(n.id)}
                  >
                    <n.icon size={17} strokeWidth={1.6} />
                    <span>
                      <strong>{n.name}</strong>
                      <small>{n.purpose}</small>
                    </span>
                    {page === n.id && (
                      <span className="nav-active-star" aria-hidden="true">
                        ✦
                      </span>
                    )}
                  </button>
                </React.Fragment>
              ))}
          </nav>
          <div className="sidebar-bottom">
            <span>
              <i className="live-dot" />
              独立核心运行中
            </span>
            <small>
              v{bootstrap.version}
              <span>
                {bootstrap.host?.connected ? "DSH 已连接" : "独立预览"}
              </span>
            </small>
          </div>
        </aside>
        <div className="workspace" inert={compact && menu}>
          <header className="topbar">
            <button
              className="world-brand"
              onClick={() => go("overview")}
              aria-label="starr 概览"
            >
              <Star />
              <span>starr</span>
            </button>
            <nav className="workspace-navigation" aria-label="工作区导航">
              {workspaces.map((group) => (
                <button
                  key={group.id}
                  aria-current={section.id === group.id ? "page" : undefined}
                  onClick={() => go(group.entry)}
                >
                  <span>{group.name}</span>
                  <i />
                </button>
              ))}
            </nav>
            <div className="breadcrumb">
              {section.id !== "home" && (
                <button
                  className="icon-button mobile-menu"
                  aria-label="展开导航"
                  onClick={() => setMenu(true)}
                >
                  <Menu size={20} />
                </button>
              )}
              <button
                className="ghost guide-reopen"
                onClick={() => {
                  location.hash = "onboarding";
                  load();
                }}
              >
                新手调试
              </button>
              {
                <div className="home-character-switch">
                  <Select
                    label="切换观察角色"
                    value={id}
                    onChange={(next) => {
                      setId(next);
                      setModal("");
                    }}
                    options={bootstrap.characters.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="添加角色"
                    onClick={() => setModal("character")}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              }
              <ChevronRight size={13} />
              <span>{nav.label}</span>
            </div>
            <div className="topbar-right">
              <span className="preview-label">
                {bootstrap.version} · 独立初版
              </span>
              <span className="saved-indicator">
                <CheckCheck size={14} />
                本地持久化
              </span>
              <button
                className="icon-button"
                aria-label="刷新当前数据"
                onClick={refresh}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </header>
          <main ref={main} id="main-content" data-page={page}>
            {!bootstrap.onboarding.completedAt && (
              <div className="guide-reminder" role="status">
                <p>
                  先完成新手调试，检查角色、记忆目录与平台连接。未验证的能力会保留待接入状态
                </p>
                <button
                  className="ghost"
                  onClick={() => {
                    location.hash = "onboarding";
                    load();
                  }}
                >
                  继续新手调试
                </button>
              </div>
            )}

            {activeProps && page !== "overview" && <PagePrelude page={page} />}
            <div className="page-title">
              <div>
                <h1>
                  {nav.label}
                  <small className="page-purpose">{nav.purpose}</small>
                </h1>
                <p>
                  {page === "overview"
                    ? "记得的事、此刻心潮，以及想慢慢完成的约定"
                    : page === "memory"
                      ? "经历并非散落的碎片，它们在同一片星空相遇"
                      : page === "state"
                        ? "让情绪有来源，让主动有缘由"
                        : page === "media"
                          ? "说、唱、听、看，各有清楚的能力与连接"
                          : page === "conversation"
                            ? "在不同的窗口相逢，让记忆回到同一片星空"
                            : page === "expressions"
                              ? "每一种情绪，都可以有自己的表情"
                              : "让每一项能力，都有恰当的位置"}
                </p>
              </div>
              {page === "memory" ? (
                <button className="primary" onClick={() => setModal("memory")}>
                  <Plus size={15} />
                  记录记忆
                </button>
              ) : null}
            </div>
            {error && (
              <div className="inline-error" role="alert">
                {error}
                <button onClick={refresh}>重试</button>
              </div>
            )}
            {!props && !error && (
              <div className="loading-panel">正在读取这个角色的宇宙…</div>
            )}
            {activeProps && (
              <div className="page-content" key={`${id}:${page}`}>
                <Boundary>
                  {page === "overview" ? (
                    <ObservatoryOverview
                      {...activeProps}
                      onMemory={() => setModal("memory")}
                      onGoal={() => setModal("goal")}
                    />
                  ) : page === "memory" ? (
                    <MemoryPage {...activeProps} />
                  ) : page === "state" ? (
                    <StatePage {...activeProps} />
                  ) : page === "expressions" ? (
                    <ExpressionsPage {...activeProps} />
                  ) : (
                    <WorkspacePage {...activeProps} page={page} />
                  )}
                  <RelatedRoutes page={page} go={go} />
                </Boundary>
              </div>
            )}
            <footer className="page-footer">
              <span>starr · 让每一颗星都有来处</span>
              <span>
                {bootstrap.version} /{" "}
                {bootstrap.host?.connected ? "DSH 控制台" : "独立预览"}
              </span>
            </footer>
            {activeProps && (
              <PageContinuation key={page} page={page} main={main} go={go} />
            )}
          </main>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {modal === "character" && (
        <NewCharacter
          onClose={onClose}
          onSaved={() => {
            refresh();
            notify("新角色已创建");
          }}
        />
      )}
      {modal === "memory" && props && (
        <MemoryModal
          character={props.character}
          onClose={onClose}
          onSaved={() => {
            refresh();
            notify("记忆已立即保存");
          }}
        />
      )}
      {modal === "goal" && props && (
        <GoalModal
          character={props.character}
          onClose={onClose}
          onSaved={() => {
            refresh();
            notify("目的已记录，尚未执行外部动作");
          }}
        />
      )}
    </>
  );
}
// 开发热更新会重新执行入口；复用挂载点上的根，避免同时出现多份页面和画布。
const rootElement = document.getElementById("root")! as HTMLElement & {
  starrReactRoot?: ReturnType<typeof createRoot>;
};
const appRoot = (rootElement.starrReactRoot ??= createRoot(rootElement));
appRoot.render(
  <Boundary>
    <App />
  </Boundary>,
);
