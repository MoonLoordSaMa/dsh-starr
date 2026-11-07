import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  Plus,
  Search,
  BookOpen,
  Link2,
  ArrowLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Save,
  RotateCcw,
  ShieldCheck,
  Cloud,
  Headphones,
  Eye,
  Mic2,
  Music2,
  Upload,
  ImagePlus,
  Star as StarIcon,
  FolderOpen,
  Database,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  Unplug,
  MessagesSquare,
  Globe2,
  Radio,
  Trash2,
} from "lucide-react";
import {
  api,
  apiUrl,
  json,
  date,
  kindNames,
  kindColors,
  type Config,
  type Field,
  type Memory,
  type Link,
  type State,
  type Expression,
} from "./types";
import {
  Panel,
  Badge,
  Empty,
  Select,
  Tabs,
  Disclosure,
  Modal,
  ConfirmDialog,
  TextLink,
} from "./components";
import { Spectrum } from "./scenes";
import { QQConnection } from "./QQConnection";
import { ChatSettings as StarrChat } from "./ChatSettings";
import { LocalModelDiscovery } from "./LocalModelDiscovery";
import { LegacyConfiguration } from "./LegacyConfiguration";
import { MemoryJobs } from "./MemoryJobs";
import { SingingPage } from "./SingingPage";
import { MediaSetup } from "./MediaSetup";
import {
  useResource,
  StarMap,
  MemoryModal,
  GoalModal,
  type PageProps,
} from "./main";

export function ConfigForm({
  character,
  bootstrap,
  refresh,
  notify,
  pages,
  onlyKeys,
  title,
}: {
  character: PageProps["character"];
  bootstrap: PageProps["bootstrap"];
  refresh: () => void;
  notify: (s: string) => void;
  pages: string[];
  onlyKeys?: string[];
  title?: string;
}) {
  const fields = bootstrap.fields.filter(
      (f) => pages.includes(f.page) && (!onlyKeys || onlyKeys.includes(f.key)),
    ),
    [draft, setDraft] = useState<Config>({ ...character.config }),
    [error, setError] = useState("");
  const latest = useRef(character);
  const [modelCatalog, setModelCatalog] = useState<
    { id: string; name: string; models: { id: string; name: string }[] }[]
  >([]);
  const hasHostModel = fields.some((f) =>
    ["jobs.provider", "bili.provider"].includes(f.key),
  );
  useEffect(() => {
    if (!hasHostModel) return;
    const controller = new AbortController();
    api<{ providers: typeof modelCatalog }>("/api/onboarding/models", {
      signal: controller.signal,
    })
      .then((value) => setModelCatalog(value.providers))
      .catch(() => {});
    return () => controller.abort();
  }, [hasHostModel]);
  useEffect(() => {
    const previous = latest.current;
    latest.current = character;
    setDraft((current) =>
      previous.id !== character.id
        ? { ...character.config }
        : {
            ...character.config,
            ...Object.fromEntries(
              fields
                .filter(
                  (field) => current[field.key] !== previous.config[field.key],
                )
                .map((field) => [field.key, current[field.key]]),
            ),
          },
    );
    setError("");
  }, [character.id, character.revision]);
  const changed = fields.filter(
    (f) => draft[f.key] !== character.config[f.key],
  );
  useEffect(() => {
    const collect = (event: Event) =>
      Object.assign(
        (event as CustomEvent<{ patch: Config }>).detail.patch,
        Object.fromEntries(
          fields
            .filter((field) => draft[field.key] !== character.config[field.key])
            .map((field) => [field.key, draft[field.key]]),
        ),
      );
    const reset = () => setDraft({ ...character.config });
    document.addEventListener("starr-collect-config", collect);
    document.addEventListener("starr-reset-config", reset);
    document.dispatchEvent(new Event("starr-config-changed"));
    return () => {
      document.removeEventListener("starr-collect-config", collect);
      document.removeEventListener("starr-reset-config", reset);
    };
  }, [draft, character.id, character.revision]);
  return (
    <form
      className="config-form"
      data-dirty={changed.length > 0}
      onSubmit={(event) => {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent("starr-save-page"));
      }}
    >
      {title && <h3>{title}</h3>}
      <div className="configuration-layout">
        <div className="configuration-fields">
          {fields
            .filter((field) => !field.advanced)
            .map((f) => (
              <div
                className={`config-row ${f.type === "boolean" ? "switch-row" : ""}`}
                key={f.key}
                data-config-key={f.key}
              >
                <label htmlFor={f.key}>
                  <strong title={f.label}>{f.label}</strong>
                  <small className="config-help" id={`${f.key}-help`}>
                    {f.help}
                  </small>
                </label>
                <div className="config-control">
                  {f.type === "boolean" ? (
                    <button
                      id={f.key}
                      type="button"
                      role="switch"
                      aria-checked={!!draft[f.key]}
                      aria-label={f.label}
                      aria-describedby={`${f.key}-help`}
                      className="toggle"
                      onClick={() =>
                        setDraft({ ...draft, [f.key]: !draft[f.key] })
                      }
                    >
                      <i />
                    </button>
                  ) : modelCatalog.length &&
                    [
                      "jobs.provider",
                      "jobs.model",
                      "bili.provider",
                      "bili.model",
                    ].includes(f.key) ? (
                    <Select
                      label={f.label}
                      value={String(draft[f.key] || "")}
                      options={[
                        {
                          value: "",
                          label: f.key.endsWith(".provider")
                            ? "选择已登记的 DSH 连接"
                            : "选择模型",
                        },
                        ...(draft[f.key]
                          ? [
                              {
                                value: String(draft[f.key]),
                                label: String(draft[f.key]),
                              },
                            ]
                          : []),
                        ...(f.key.endsWith(".provider")
                          ? modelCatalog
                          : modelCatalog.find(
                              (p) =>
                                p.id ===
                                draft[`${f.key.split(".")[0]}.provider`],
                            )?.models || []
                        )
                          .filter((item) => item.id !== draft[f.key])
                          .map((item) => ({
                            value: item.id,
                            label: item.name || item.id,
                          })),
                      ]}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          [f.key]: value,
                          ...(f.key.endsWith(".provider")
                            ? { [`${f.key.split(".")[0]}.model`]: "" }
                            : {}),
                        }))
                      }
                    />
                  ) : f.options ? (
                    <Select
                      label={f.label}
                      value={String(draft[f.key])}
                      options={f.options.map((value) => ({
                        value,
                        label:
                          f.key === "memory.defaultVisibility"
                            ? value === "shared"
                              ? "角色各平台共享"
                              : "仅来源会话"
                            : ({
                                auto: "自动选择",
                                self: "仅自己可见",
                                friends: "好友可见",
                                public: "公开可见",
                                vivid: "强动效",
                                default: "平衡",
                                light: "轻量",
                                reduced: "减少动态",
                                shared: "共用连接",
                                conversation: "仅来源会话",
                                custom: "独立连接",
                                host: "使用DSH视觉模型",
                                disabled: "停用",
                                "breeze-local": "本地 Breeze（插件管理）",
                                "free-local": "免费本地 Whisper",
                                "soulx-managed": "本地 SoulX（插件管理）",
                                "soulx-existing": "已有本地 SoulX 服务",
                                "soulx-bytes": "远程音频字节节点",
                                awake: "清醒",
                                observe: "观察",
                                sleep: "沉睡",
                                cuda: "NVIDIA 显卡（CUDA）",
                                cpu: "处理器（CPU）",
                                mps: "Apple 图形处理器（MPS）",
                              }[value] ?? value),
                      }))}
                      onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                    />
                  ) : (
                    <input
                      id={f.key}
                      aria-describedby={`${f.key}-help`}
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "time"
                            ? "time"
                            : "text"
                      }
                      min={f.min}
                      max={f.max}
                      step={f.type === "number" ? "any" : undefined}
                      value={String(draft[f.key] ?? "")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          [f.key]:
                            f.type === "number"
                              ? e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          {fields.some((field) => field.advanced) && (
            <details className="advanced-settings">
              <summary>
                高级设置 · {fields.filter((field) => field.advanced).length} 项
              </summary>
              <p className="field-help">
                默认值适合日常使用；需要调整具体行为时再展开。
              </p>
              {fields
                .filter((field) => field.advanced)
                .map((f) => (
                  <div
                    className={`config-row ${f.type === "boolean" ? "switch-row" : ""}`}
                    key={f.key}
                    data-config-key={f.key}
                  >
                    <label htmlFor={f.key}>
                      <strong title={f.label}>{f.label}</strong>
                      <small className="config-help" id={`${f.key}-help`}>
                        {f.help}
                      </small>
                    </label>
                    <div className="config-control">
                      {f.type === "boolean" ? (
                        <button
                          id={f.key}
                          type="button"
                          role="switch"
                          aria-checked={!!draft[f.key]}
                          aria-label={f.label}
                          aria-describedby={`${f.key}-help`}
                          className="toggle"
                          onClick={() =>
                            setDraft({ ...draft, [f.key]: !draft[f.key] })
                          }
                        >
                          <i />
                        </button>
                      ) : modelCatalog.length &&
                        [
                          "jobs.provider",
                          "jobs.model",
                          "bili.provider",
                          "bili.model",
                        ].includes(f.key) ? (
                        <Select
                          label={f.label}
                          value={String(draft[f.key] || "")}
                          options={[
                            {
                              value: "",
                              label: f.key.endsWith(".provider")
                                ? "选择已登记的 DSH 连接"
                                : "选择模型",
                            },
                            ...(draft[f.key]
                              ? [
                                  {
                                    value: String(draft[f.key]),
                                    label: String(draft[f.key]),
                                  },
                                ]
                              : []),
                            ...(f.key.endsWith(".provider")
                              ? modelCatalog
                              : modelCatalog.find(
                                  (p) =>
                                    p.id ===
                                    draft[`${f.key.split(".")[0]}.provider`],
                                )?.models || []
                            )
                              .filter((item) => item.id !== draft[f.key])
                              .map((item) => ({
                                value: item.id,
                                label: item.name || item.id,
                              })),
                          ]}
                          onChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              [f.key]: value,
                              ...(f.key.endsWith(".provider")
                                ? { [`${f.key.split(".")[0]}.model`]: "" }
                                : {}),
                            }))
                          }
                        />
                      ) : f.options ? (
                        <Select
                          label={f.label}
                          value={String(draft[f.key])}
                          options={f.options.map((value) => ({
                            value,
                            label:
                              f.key === "memory.defaultVisibility"
                                ? value === "shared"
                                  ? "角色各平台共享"
                                  : "仅来源会话"
                                : ({
                                    auto: "自动选择",
                                    self: "仅自己可见",
                                    friends: "好友可见",
                                    public: "公开可见",
                                    vivid: "强动效",
                                    default: "平衡",
                                    light: "轻量",
                                    reduced: "减少动态",
                                    shared: "共用连接",
                                    conversation: "仅来源会话",
                                    custom: "独立连接",
                                    host: "使用DSH视觉模型",
                                    disabled: "停用",
                                    "breeze-local": "本地 Breeze（插件管理）",
                                    "free-local": "免费本地 Whisper",
                                    "soulx-managed": "本地 SoulX（插件管理）",
                                    "soulx-existing": "已有本地 SoulX 服务",
                                    "soulx-bytes": "远程音频字节节点",
                                    awake: "清醒",
                                    observe: "观察",
                                    sleep: "沉睡",
                                    cuda: "NVIDIA 显卡（CUDA）",
                                    cpu: "处理器（CPU）",
                                    mps: "Apple 图形处理器（MPS）",
                                  }[value] ?? value),
                          }))}
                          onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                        />
                      ) : (
                        <input
                          id={f.key}
                          aria-describedby={`${f.key}-help`}
                          type={
                            f.type === "number"
                              ? "number"
                              : f.type === "time"
                                ? "time"
                                : "text"
                          }
                          min={f.min}
                          max={f.max}
                          step={f.type === "number" ? "any" : undefined}
                          value={String(draft[f.key] ?? "")}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              [f.key]:
                                f.type === "number"
                                  ? e.target.value === ""
                                    ? ""
                                    : Number(e.target.value)
                                  : e.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
            </details>
          )}
        </div>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <small>
          {changed.length
            ? `${changed.length} 项更改尚未保存`
            : "当前配置已保存"}
        </small>
      </div>
    </form>
  );
}

export function MemoryPage(props: PageProps) {
  const { character, version, refresh, notify } = props,
    [view, setView] = useState("timeline"),
    [filter, setFilter] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(() => {
      const key = `starr-memory-selection:${character.id}`;
      const value = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      return value;
    }),
    [modal, setModal] = useState(false),
    [target, setTarget] = useState(""),
    [linkBusy, setLinkBusy] = useState(false);
  const close = useCallback(() => setModal(false), []),
    { data, error } = useResource<{ nodes: Memory[]; links: Link[] }>(
      `/api/characters/${character.id}/graph`,
      version,
    );
  const rows = useMemo(
    () =>
      data?.nodes.filter(
        (n) =>
          (!filter ||
            (filter === "moment" ? n.kind !== "diary" : n.kind === filter)) &&
          (view !== "continuity" || (n.anchor && n.kind !== "diary")) &&
          (!query ||
            `${n.title} ${n.content}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ) ?? [],
    [data, filter, query, view],
  );
  const current = data?.nodes.find((n) => n.id === selected),
    motion = String(character.config["ui.motion"]);
  useEffect(() => {
    if (!current || !matchMedia("(max-width: 980px)").matches) return;
    const frame = requestAnimationFrame(() =>
      document
        .querySelector(".memory-detail")
        ?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [current?.id]);
  const changeCategory = useCallback((kind: string) => {
    setSelected(null);
    setFilter(kind);
  }, []);
  useEffect(() => {
    if (data && selected && !data.nodes.some((n) => n.id === selected))
      setSelected(null);
  }, [data, selected]);
  return (
    <>
      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: "timeline", name: "笔记与日记" },
          { id: "continuity", name: "长期理解" },
          { id: "map", name: "记忆星图" },
        ]}
      />
      {view === "settings" ? (
        <div className="settings-stack">
          <Panel title="记忆如何留下">
            <p className="section-intro">
              重要内容立即提交；笔记与双链通过可重试队列同步。普通记忆的新鲜度变化，只影响检索顺序
            </p>
            <ConfigForm {...props} pages={["memory"]} />
            <Disclosure
              title="关于整理、向量与外部编辑"
              description="查看当前实现边界"
            >
              <p>
                日记按设置的时间保存。其他笔记由她在相处中逐步修订，重复或过时内容可以归档；归档后仍可恢复。
              </p>
              <p>外部改过的笔记会被保留并报告冲突，不会静默覆盖。</p>
            </Disclosure>
          </Panel>
          <MemoryJobs {...props} />
        </div>
      ) : (
        <>
          <div className="filter-toolbar">
            <div className="filters" role="group" aria-label="记忆类型">
              {[["", "全部"], ...Object.entries(kindNames)].map(
                ([key, label]) => (
                  <button
                    key={key}
                    className={filter === key ? "selected" : ""}
                    aria-pressed={filter === key}
                    onClick={() => changeCategory(key)}
                  >
                    {key && <i style={{ background: kindColors[key] }} />}
                    {label}
                    <span>
                      {key
                        ? (data?.nodes.filter((n) =>
                            key === "moment"
                              ? n.kind !== "diary"
                              : n.kind === key,
                          ).length ?? 0)
                        : (data?.nodes.length ?? 0)}
                    </span>
                  </button>
                ),
              )}
            </div>
            <label className="search-box">
              <Search size={15} />
              <input
                aria-label="搜索记忆"
                placeholder="在记忆里找一找"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {error && <p className="inline-error">{error}</p>}
          <div className={`memory-workspace ${current ? "has-detail" : ""}`}>
            <Panel className="memory-primary">
              {view === "map" ? (
                <>
                  <Suspense
                    fallback={
                      <div className="scene-loading">正在展开三维星图…</div>
                    }
                  >
                    {data && (
                      <StarMap
                        nodes={data.nodes.map((node) => ({
                          ...node,
                          kind: node.kind === "diary" ? "diary" : "moment",
                        }))}
                        links={data.links}
                        selected={selected}
                        onSelect={setSelected}
                        filter={filter}
                        onFilterChange={changeCategory}
                        motion={motion}
                      />
                    )}
                  </Suspense>
                  <div className="memory-under-map">
                    <span>
                      <i className="legend-line" />
                      连线来自真实关联
                    </span>
                    <span>选择星点，阅读完整笔记</span>
                  </div>
                </>
              ) : null}
              <div
                className={`memory-list ${view === "timeline" ? "timeline" : ""}`}
              >
                {(view === "timeline"
                  ? [...rows].sort((a, b) => b.created.localeCompare(a.created))
                  : rows
                ).map((m) => (
                  <button
                    key={m.id}
                    className={`memory-row ${selected === m.id ? "is-selected" : ""}`}
                    onClick={() => setSelected(selected === m.id ? null : m.id)}
                  >
                    <i style={{ background: kindColors[m.kind] }} />
                    <div>
                      <strong>{m.title}</strong>
                      <small>
                        {kindNames[m.kind] || "笔记"} · {date(m.created)}
                      </small>
                    </div>
                    <span className="importance">
                      {m.anchor ? (
                        <span title="跨会话保留的长期理解">
                          <StarIcon size={12} />
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
              {!rows.length && (
                <Empty
                  title={
                    query || filter
                      ? "这片范围里还没有记忆"
                      : "还没有属于她的记忆"
                  }
                  description={
                    query || filter
                      ? "试着换一个词，或查看全部类型"
                      : "先写下一件事，再把彼此有关的记忆连起来"
                  }
                  action={
                    <button className="ghost" onClick={() => setModal(true)}>
                      <Plus size={14} />
                      添加记忆
                    </button>
                  }
                />
              )}
            </Panel>
            <aside className="memory-detail panel">
              {current ? (
                <>
                  <div className="detail-heading">
                    <Badge>{kindNames[current.kind] || "笔记"}</Badge>
                    <button
                      aria-label="关闭记忆详情"
                      className="icon-button"
                      onClick={() => setSelected(null)}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  </div>
                  <h2>{current.title}</h2>
                  <section
                    className="memory-reading"
                    aria-label="记忆完整正文"
                    tabIndex={0}
                  >
                    <span className="detail-content-label">完整正文</span>
                    <div className="memory-body">{current.content}</div>
                  </section>
                  <div className="detail-facts">
                    <span>
                      记录于<strong>{date(current.created)}</strong>
                    </span>
                    <span>
                      来源<strong>{current.source}</strong>
                    </span>
                    <details className="memory-recall-details">
                      <summary>检索信息</summary>
                      <span>
                        重要度<strong>{current.importance} / 100</strong>
                      </span>
                      <span>
                        事实置信度<strong>{current.confidence} / 100</strong>
                      </span>
                      <span>
                        当前召回权重<strong>{current.score}</strong>
                      </span>
                    </details>
                    {!!current.anchor && <Badge tone="good">长期理解</Badge>}
                  </div>
                  <h3 className="detail-subtitle">
                    <Link2 size={15} />
                    相关记忆
                  </h3>
                  {data?.links
                    .filter(
                      (l) => l.source === current.id || l.target === current.id,
                    )
                    .map((l, i) => {
                      const other = data.nodes.find(
                        (n) =>
                          n.id ===
                          (l.source === current.id ? l.target : l.source),
                      );
                      return other ? (
                        <button
                          className="relation-row"
                          key={i}
                          onClick={() => setSelected(other.id)}
                        >
                          <span>{other.title}</span>
                          <small>
                            {l.kind === "explicit" ? "明确关联" : "建议关联"}
                          </small>
                        </button>
                      ) : null;
                    })}
                  <div className="link-editor">
                    <Select
                      label="选择要关联的记忆"
                      value={target}
                      onChange={setTarget}
                      options={[
                        { value: "", label: "选择一条记忆…" },
                        ...(data?.nodes
                          .filter((n) => n.id !== current.id)
                          .map((n) => ({ value: n.id, label: n.title })) ?? []),
                      ]}
                    />
                    <button
                      className="ghost"
                      disabled={!target || target === current.id || linkBusy}
                      onClick={async () => {
                        setLinkBusy(true);
                        try {
                          await api(`/api/characters/${character.id}/links`, {
                            method: "POST",
                            body: json({
                              source: current.id,
                              target,
                              kind: "explicit",
                              weight: 1,
                            }),
                          });
                          refresh();
                          notify("关联已保存，双方笔记将同步双链");
                          setTarget("");
                        } catch (e) {
                          notify((e as Error).message);
                        } finally {
                          setLinkBusy(false);
                        }
                      }}
                    >
                      <Plus size={14} />
                      建立关联
                    </button>
                  </div>
                </>
              ) : (
                <div className="detail-placeholder">
                  <OrbitIllustration />
                  <h3>选择一条记忆查看全文</h3>
                  <p>
                    在星图或列表中选择记忆，查看来源、重要度，以及与其他记忆的联系
                  </p>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
      {modal && (
        <MemoryModal
          character={character}
          onClose={close}
          onSaved={() => {
            refresh();
            notify("记忆已保存");
          }}
        />
      )}
    </>
  );
}
function OrbitIllustration() {
  return (
    <svg
      className="orbit-illustration"
      viewBox="0 0 160 130"
      aria-hidden="true"
    >
      <ellipse
        cx="80"
        cy="65"
        rx="64"
        ry="25"
        transform="rotate(-30 80 65)"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".25"
      />
      <ellipse
        cx="80"
        cy="65"
        rx="43"
        ry="40"
        transform="rotate(25 80 65)"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".12"
      />
      <path
        d="m80 45 4 16 16 4-16 4-4 16-4-16-16-4 16-4Z"
        fill="currentColor"
      />
      <circle cx="134" cy="35" r="3" fill="currentColor" />
    </svg>
  );
}

export function CharacterPage(props: PageProps) {
  const { character, refresh, notify } = props,
    [name, setName] = useState(character.name),
    [persona, setPersona] = useState(character.persona),
    [baseRevision, setBaseRevision] = useState(character.revision),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setName(character.name);
    setPersona(character.persona);
    setBaseRevision(character.revision);
  }, [character.id]);
  return (
    <div className="content-with-rail">
      <Panel title="人格与相处方式">
        <form
          data-dirty={persona !== character.persona || name !== character.name}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const saved = await api<{ revision: number }>(
                `/api/characters/${character.id}`,
                {
                  method: "PATCH",
                  body: json({ name, persona, revision: baseRevision }),
                },
              );
              setBaseRevision(saved.revision);
              refresh();
              notify("角色资料已保存");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            她的名字
            <input
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <small>名字可修改，记忆归属与身份编号不会变化</small>
          </label>
          <label className="field">
            角色人设与系统提示词
            <textarea
              className="persona-editor"
              rows={13}
              maxLength={20000}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="她的偏好、说话方式、自己的想法与边界……"
            />
            <small>
              这里保存完整人设，影响后续所有绑定此角色的会话。注入预算可在“回复规则与节奏”的“上下文、工作区与记忆召回”中设置。
            </small>
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {character.revision !== baseRevision && (
            <p className="footnote">
              资料在别处发生了变化；当前草稿已保留。
              <TextLink
                onClick={() => {
                  setName(character.name);
                  setPersona(character.persona);
                  setBaseRevision(character.revision);
                }}
              >
                重新载入已保存资料
              </TextLink>
            </p>
          )}
          <div className="form-footer">
            <small>
              {persona !== character.persona || name !== character.name
                ? "有尚未保存的修改"
                : "资料已保存"}
            </small>
            <button
              className="primary"
              disabled={
                busy ||
                (persona === character.persona && name === character.name)
              }
            >
              <Save size={14} />
              {busy ? "保存中…" : "保存角色"}
            </button>
          </div>
        </form>
      </Panel>
      <div className="rail">
        <Panel title="角色资料">
          <div className="profile-portrait">
            <OrbitIllustration />
            <span>{name}</span>
          </div>
          <div className="detail-facts">
            <span>
              创建于<strong>{date(character.created)}</strong>
            </span>
            <span>
              身份编号<code>{character.id.slice(0, 8)}</code>
            </span>
            <span>
              资料修订<strong>{character.revision}</strong>
            </span>
          </div>
          <p className="footnote">
            人设会在 QQ、B站和网页角色会话共用；此处星轨为档案装饰
          </p>
        </Panel>
        <Panel title="角色行为偏好">
          <p>
            偏好可以有理由，坚持可以有边界。允许她提议、等待、拒绝重复的话题，也允许她在无事可做时安静
          </p>
          <TextLink onClick={() => props.go("state")}>看看此刻的状态</TextLink>
          <TextLink onClick={() => props.go("chat-context")}>
            检查实际注入的上下文
          </TextLink>
        </Panel>
      </div>
    </div>
  );
}

export { OrganismPage as StatePage } from "./OrganismPage";

export function MediaPage(props: PageProps & { view?: string }) {
  const kind = props.view || "tts";
  if (kind === "sing") return <SingingPage {...props} />;
  const titles: Record<string, string> = {
    tts: "语音合成设置",
    asr: "语音识别设置",
    vision: "视觉理解与采集设置",
  };
  return (
    <div className="settings-stack">
      <MediaSetup
        {...props}
        key={`${props.character.id}:${kind}`}
        kind={kind}
      />
      <Panel title={titles[kind]}>
        {kind === "asr" && (
          <>
            <p>
              QQ
              语音会在回复前自动转写，转写失败时显示具体原因。当前只识别说话内容，不表示能持续监听麦克风或识别完整语气。
            </p>
            <ConfigForm
              {...props}
              pages={["chat-media"]}
              onlyKeys={["chat.tools.audio", "chat.media.autoTranscribe"]}
            />
          </>
        )}
        <ConfigForm {...props} pages={[kind, `${kind}-local`]} />
      </Panel>
      <Panel title="共用媒体连接">
        <ConfigForm {...props} pages={["media"]} />
      </Panel>
    </div>
  );
}

export function ExpressionsPage(props: PageProps) {
  const { character, version, refresh, notify } = props,
    { data, error } = useResource<Expression[]>(
      `/api/characters/${character.id}/expressions`,
      version,
    ),
    [query, setQuery] = useState(""),
    [favorite, setFavorite] = useState(false),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Expression | null>(null),
    [deleting, setDeleting] = useState<Expression | null>(null),
    [tags, setTags] = useState(""),
    [failed, setFailed] = useState<Record<string, boolean>>({});
  const rows =
      data?.filter(
        (e) =>
          (!favorite || e.favorite) &&
          (!query || `${e.name} ${e.tags}`.includes(query)),
      ) ?? [],
    close = useCallback(() => setSelected(null), []);
  const upload = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    let count = 0;
    try {
      for (const file of Array.from(files).slice(0, 30)) {
        if (file.size > 10 * 1024 * 1024)
          throw new Error("每张图片不能超过 10MB");
        await api(`/api/characters/${character.id}/expressions`, {
          method: "POST",
          headers: {
            "Content-Type": file.type,
            "X-Starr-Name": encodeURIComponent(file.name),
          },
          body: file,
        });
        count++;
      }
      notify(`已导入 ${count} 个文件，重复图片自动保留原记录`);
    } catch (e) {
      notify(`${count ? `已导入 ${count} 个；` : ""}${(e as Error).message}`);
    } finally {
      setBusy(false);
      refresh();
    }
  };
  return (
    <>
      <div className="filter-toolbar">
        <div className="filters">
          <button
            className={!favorite ? "selected" : ""}
            onClick={() => setFavorite(false)}
          >
            全部表情 <span>{data?.length ?? 0}</span>
          </button>
          <button
            className={favorite ? "selected" : ""}
            onClick={() => setFavorite(true)}
          >
            <StarIcon size={13} />
            收藏
          </button>
        </div>
        <label className="search-box">
          <Search size={15} />
          <input
            aria-label="搜索表情"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名字、情绪或关键词"
          />
        </label>
        <label className="button primary file-action">
          <Plus size={14} />
          {busy ? "导入中…" : "导入表情"}
          <input
            hidden
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp"
            disabled={busy}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>
      {error && <p className="inline-error">{error}</p>}
      <Panel className="expression-panel">
        {rows.length ? (
          <div className="expression-grid">
            {rows.map((item) => (
              <div className="expression-card" key={item.id}>
                <button
                  className="expression-preview"
                  onClick={() => {
                    setSelected(item);
                    setTags(item.tags);
                  }}
                >
                  {failed[item.id] ? (
                    <span className="missing-expression">
                      <AlertTriangle size={22} />
                      原文件缺失
                      <br />
                      记录已保留
                    </span>
                  ) : (
                    <img
                      src={apiUrl(
                        `/api/characters/${character.id}/expressions/${item.id}`,
                      )}
                      alt={item.name}
                      loading="lazy"
                      onError={() =>
                        setFailed((old) => ({ ...old, [item.id]: true }))
                      }
                    />
                  )}
                </button>
                <div className="expression-meta">
                  <strong>{item.name}</strong>
                  <div className="expression-actions">
                    <button
                      className={`icon-button ${item.favorite ? "favorited" : ""}`}
                      disabled={busy}
                      aria-label={item.favorite ? "取消收藏" : "收藏表情"}
                      aria-pressed={!!item.favorite}
                      onClick={async () => {
                        try {
                          await api(
                            `/api/characters/${character.id}/expressions/${item.id}`,
                            {
                              method: "PATCH",
                              body: json({ favorite: !item.favorite }),
                            },
                          );
                          refresh();
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      <StarIcon
                        size={15}
                        fill={item.favorite ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`删除表情 ${item.name}`}
                      title="删除表情"
                      disabled={busy}
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <small>{item.tags || "还没有情绪关键词"}</small>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title={query || favorite ? "没有符合条件的表情" : "暂无表情包"}
            description="导入 PNG、JPEG、GIF 或 WebP。收藏、备注与图片按角色独立保存，文件缺失不会清空记录"
            action={
              <label className="button ghost">
                导入第一组表情
                <input
                  hidden
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => upload(e.target.files)}
                />
              </label>
            }
          />
        )}
      </Panel>
      {selected && (
        <Modal title={selected.name} onClose={close}>
          <img
            className="expression-large"
            src={apiUrl(
              `/api/characters/${character.id}/expressions/${selected.id}`,
            )}
            alt={selected.name}
          />
          <label className="field">
            情绪与关键词
            <input
              maxLength={500}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如 开心、惊讶、晚安"
            />
          </label>
          <div className="form-footer">
            <button
              type="button"
              className="ghost danger"
              disabled={busy}
              onClick={() => {
                setDeleting(selected);
                close();
              }}
            >
              <Trash2 size={14} />
              删除表情
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(
                    `/api/characters/${character.id}/expressions/${selected.id}`,
                    { method: "PATCH", body: json({ tags }) },
                  );
                  refresh();
                  close();
                  notify("表情关键词已保存");
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              保存关键词
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title={`删除表情“${deleting.name}”？`}
          description="从当前角色表情库移除图片、收藏与关键词记录，角色将不能再选用它。原图和元数据移至该角色表情目录的 .trash 中；如果原图已经缺失，只清理残留记录。"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            setBusy(true);
            try {
              await api(
                `/api/characters/${character.id}/expressions/${deleting.id}`,
                { method: "DELETE" },
              );
              setFailed((old) => {
                const next = { ...old };
                delete next[deleting.id];
                return next;
              });
              refresh();
              notify("表情已从当前角色库移除，已有文件保留在回收目录");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}

export function SettingsPage(props: PageProps) {
  return (
    <div className="settings-stack">
      <Panel title="外观设置">
        <p className="section-intro">
          动效强度随设备调整，背景持续存在，页面切换时不重新搭建星空
        </p>
        <ConfigForm {...props} pages={["appearance"]} />
      </Panel>
      <Panel title="角色能调整多少日常习惯">
        <p className="section-intro">
          由你授权，再由服务端检查字段和改动幅度。不能修改凭据、路径、执行程序或扩大自己的权限
        </p>
        <ConfigForm {...props} pages={["permissions"]} />
        <Disclosure title="当前允许的调整项">
          <ul>
            {props.bootstrap.fields
              .filter((f) => f.bot)
              .map((f) => (
                <li key={f.key} title={f.label}>
                  {f.label}
                </li>
              ))}
          </ul>
          <p>每次改动写入审计记录，权限仅作用于这个角色。</p>
        </Disclosure>
      </Panel>
      <Panel title="运行与数据目录">
        <div className="detail-facts">
          <span>
            记忆主目录<code>{props.bootstrap.installation?.memoryRoot}</code>
          </span>
          <span>
            当前备份目录<code>{props.bootstrap.installation?.backupRoot}</code>
          </span>
        </div>
        <p className="footnote">
          目录在首次向导确认。跨机器迁移时先备份、导入，再重新配置连接与凭据
        </p>
        <TextLink onClick={() => props.go("maintenance")}>备份与诊断</TextLink>
      </Panel>
      <Panel title="旧版功能对照">
        <LegacyConfiguration go={props.go} />
      </Panel>
    </div>
  );
}
type Health = {
  database: string;
  outbox: { id: string; status: string; error: string; attempts: number }[];
  host: {
    status: string;
    detail: string;
    connected?: boolean;
    services?: {
      tools: boolean;
      preset: string;
      qqDriver: boolean;
      memoryJobsDriver: boolean;
      biliDriver: boolean;
    };
  };
  media: { status: string; detail: string };
};
export function MaintenancePage(props: PageProps) {
  const feedback = useResource<
    { id: string; session_id: string; data: string; created: number }[]
  >(`/api/characters/${props.character.id}/feedback`, props.version);
  const { character, version, notify, refresh } = props,
    { data, error } = useResource<Health>(
      `/api/characters/${character.id}/health`,
      version,
    ),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState("");
  return (
    <div className="settings-stack">
      <Panel title="会话留下的反馈">
        <p>
          角色通过反馈工具提交的问题保存在本机，供管理员排查。此处最多展示最近
          100 项
        </p>
        {feedback.error && <p role="alert">{feedback.error}</p>}
        {feedback.data?.length ? (
          feedback.data.map((item) => (
            <div className="job-error" key={item.id}>
              <small>
                {date(new Date(item.created).toISOString())} · {item.session_id}
              </small>
              <p>{JSON.parse(item.data).text}</p>
            </div>
          ))
        ) : (
          <p className="footnote">暂时没有反馈记录</p>
        )}
      </Panel>
      <Panel
        title="运行状态与诊断"
        aside={
          <button className="ghost" onClick={refresh}>
            <RefreshCw size={14} />
            重新检查
          </button>
        }
      >
        {error && <p className="inline-error">{error}</p>}
        <div className="health-row">
          <span>
            <Database size={18} />
            角色数据库
          </span>
          <Badge tone={data?.database === "ok" ? "good" : "quiet"}>
            {data?.database === "ok" ? "完整性正常" : "检查中"}
          </Badge>
        </div>
        <div className="health-row">
          <span>
            <BookOpen size={18} />
            Obsidian 笔记同步
          </span>
          <Badge tone={data?.outbox.length ? "warn" : "good"}>
            {data
              ? data.outbox.length
                ? `${data.outbox.length} 项待处理`
                : "队列已完成"
              : "检查中"}
          </Badge>
        </div>
        <div className="health-row">
          <span>
            <Unplug size={18} />
            DSH 宿主
          </span>
          <Badge tone={data?.host.connected ? "good" : "quiet"}>
            {!data
              ? "检查中"
              : data.host.connected
                ? "DSH 已连接"
                : data.host.status === "standalone"
                  ? "独立控制台"
                  : "宿主未就绪"}
          </Badge>
        </div>
        {data?.host.detail && <p className="footnote">{data.host.detail}</p>}
        {data?.host.services && (
          <p className="footnote">
            工具服务：{data.host.services.tools ? "已挂载" : "未就绪"} ·
            Starr-chat 预设：
            {["registered", "verified"].includes(data.host.services.preset)
              ? "已注册"
              : "未就绪"}{" "}
            · 会话驱动：{data.host.services.qqDriver ? "已挂载" : "未就绪"} ·
            记忆任务：
            {data.host.services.memoryJobsDriver ? "已挂载" : "未就绪"}
          </p>
        )}
        {data?.outbox.map((job) => (
          <div className="job-error" key={job.id}>
            <p>{job.error}</p>
            <small>已尝试 {job.attempts} 次 · 原始记忆仍已保存</small>
          </div>
        ))}
        {!!data?.outbox.length && (
          <button
            className="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/api/characters/${character.id}/projection/retry`, {
                  method: "POST",
                });
                refresh();
                notify("已重新处理同步队列，冲突文件继续保留");
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            重试同步
          </button>
        )}
      </Panel>
      <Panel title="数据备份">
        <p className="section-intro">
          为当前角色创建数据库一致性快照，同时保存角色资料、笔记与文件校验清单。环境变量中的凭据不会包含在备份里
        </p>
        <div className="backup-location">
          <HardDrive size={22} />
          <div>
            <strong>当前备份目录</strong>
            <code>{props.bootstrap.installation?.backupRoot}</code>
          </div>
        </div>
        <div className="form-footer">
          <small>不会改动你已有的旧版完整备份</small>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ path: string; files: number }>(
                  `/api/characters/${character.id}/backup`,
                  { method: "POST" },
                );
                setResult(`${r.path} · ${r.files} 个文件`);
                notify("角色备份已完成");
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Save size={14} />
            {busy ? "正在处理…" : "角色备份"}
          </button>
        </div>
        {result && (
          <p className="backup-result" role="status">
            {result}
          </p>
        )}
      </Panel>
      <Panel title="旧版本迁移说明">
        <p>
          旧数据先做只读预检，检查来源、重复项和角色归属后再导入新目录。当前提供命令行预检，网页导入向导与全量格式转换仍待完成
        </p>
        <code className="command">
          pnpm migrate:inspect -- &lt;备份目录&gt;
        </code>
        <Disclosure title="初版与开源发布的距离">
          <p>
            已接入 Starr-chat、QQ 与
            B站收发、模型发现、本地媒体管理和自动整理。真实平台账号、实际模型生成与远程机器仍需在你的环境中验证；尚未接入的旧能力可在“旧版功能对照”中查阅。
          </p>
          <p>
            全新 DSH
            重装后还需验证安装、加载、平台去重和恢复，才能作为正式开源版本发布。
          </p>
        </Disclosure>
      </Panel>
    </div>
  );
}

export function ConnectionPage(props: PageProps & { platform: boolean }) {
  return <StarrChat {...props} />;
}
