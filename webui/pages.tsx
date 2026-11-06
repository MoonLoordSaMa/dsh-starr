import { poeticField, poeticName } from "./poetic-names";
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
import { StarrChat } from "./StarrChat";
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
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const latest = useRef(character);
  const [selectedKey, setSelectedKey] = useState(fields[0]?.key || "");
  const selectedField =
    fields.find((field) => field.key === selectedKey) || fields[0];
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
  return (
    <form
      className="config-form"
      data-dirty={changed.length > 0}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await api(`/api/characters/${character.id}/config`, {
            method: "PATCH",
            body: json({
              patch: Object.fromEntries(
                changed.map((f) => [f.key, draft[f.key]]),
              ),
              revision: character.revision,
            }),
          });
          refresh();
          notify("配置已保存并应用到当前角色");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {title && <h3>{title}</h3>}
      <div className="configuration-layout">
        <div className="configuration-fields">
          {fields.map((f) => (
            <div
              className={`config-row ${f.type === "boolean" ? "switch-row" : ""} ${selectedField?.key === f.key ? "inspected" : ""}`}
              key={f.key}
              onFocusCapture={() => setSelectedKey(f.key)}
              onClick={() => setSelectedKey(f.key)}
            >
              <label htmlFor={f.key}>
                <strong title={f.label}>{poeticField(f)}</strong>
                <small className="sr-only" id={`${f.key}-help`}>
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
                              p.id === draft[`${f.key.split(".")[0]}.provider`],
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
                      label: poeticName(
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
                      ),
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
        </div>
        {selectedField && (
          <aside
            className="configuration-inspector"
            aria-label="所选配置说明"
            aria-live="polite"
          >
            <span className="eyebrow">星枢笺注</span>
            <h3 title={selectedField.label}>{poeticField(selectedField)}</h3>
            <p>{selectedField.help}</p>
            <dl>
              <dt>信契裁度</dt>
              <dd>
                {selectedField.bot
                  ? "管理员授权后，角色可按范围自行调整"
                  : "由管理员设置"}
              </dd>
              {selectedField.type === "number" && (
                <>
                  <dt>信契所及</dt>
                  <dd>
                    {selectedField.min} — {selectedField.max}
                  </dd>
                </>
              )}
              <dt>落笺之法</dt>
              <dd>修改后点击保存，应用到当前角色。</dd>
            </dl>
          </aside>
        )}
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
        <button className="primary" disabled={!changed.length || busy}>
          <Save size={14} />
          {busy ? "落笔未歇…" : "落笔成笺"}
        </button>
      </div>
    </form>
  );
}

export function MemoryPage(props: PageProps) {
  const { character, version, refresh, notify } = props,
    [view, setView] = useState("map"),
    [filter, setFilter] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
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
          (!filter || n.kind === filter) &&
          (!query ||
            `${n.title} ${n.content}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ) ?? [],
    [data, filter, query],
  );
  const current = data?.nodes.find((n) => n.id === selected),
    motion = String(character.config["ui.motion"]);
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
          { id: "map", name: "记忆星图" },
          { id: "timeline", name: "流年卷" },
        ]}
      />
      {view === "settings" ? (
        <div className="settings-stack">
          <Panel title="记忆如何留下">
            <p className="section-intro">
              重要内容立即提交；笔记与双链通过可重试队列同步。普通记忆的新鲜度变化，只影响检索顺序
            </p>
            <ConfigForm {...props} pages={["memory"]} />
            <Disclosure title="拾忆笺注" description="查看当前实现边界">
              <p>
                已实现即时保存、重要度与半衰期排序、关键词检索、真实关系边、笔记投影、外部笔记修订预览导入与定时模型整理。向量索引仍待接入。
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
                        ? (data?.nodes.filter((n) => n.kind === key).length ??
                          0)
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
                        nodes={data.nodes}
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
                    <span>淡色星轨仅作装饰 · 分类保留原位</span>
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
                        {kindNames[m.kind]} · {date(m.created)}
                      </small>
                    </div>
                    <span className="importance">
                      {m.anchor && <StarIcon size={12} />} {m.importance}
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
                      记下一件事
                    </button>
                  }
                />
              )}
            </Panel>
            <aside className="memory-detail panel">
              {current ? (
                <>
                  <div className="detail-heading">
                    <Badge>{kindNames[current.kind]}</Badge>
                    <button
                      aria-label="关闭记忆详情"
                      className="icon-button"
                      onClick={() => setSelected(null)}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  </div>
                  <h2>{current.title}</h2>
                  <section className="memory-reading" aria-label="记忆完整正文">
                    <span className="detail-content-label">星笺全卷</span>
                    <div className="memory-body">{current.content}</div>
                  </section>
                  <div className="detail-facts">
                    <span>
                      记录于<strong>{date(current.created)}</strong>
                    </span>
                    <span>
                      星之来处<strong>{current.source}</strong>
                    </span>
                    <span>
                      星光分量<strong>{current.importance} / 100</strong>
                    </span>
                    <span>
                      笺中可信<strong>{current.confidence} / 100</strong>
                    </span>
                    <span>
                      此刻星重<strong>{current.score}</strong>
                    </span>
                    {!!current.anchor && <Badge tone="good">长明之星</Badge>}
                  </div>
                  <h3 className="detail-subtitle">
                    <Link2 size={15} />
                    同光旧笺
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
                            {l.kind === "explicit" ? "已牵星线" : "候牵星线"}
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
                      牵起星线
                    </button>
                  </div>
                </>
              ) : (
                <div className="detail-placeholder">
                  <OrbitIllustration />
                  <h3>让一颗星，讲讲它的故事</h3>
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
      <Panel title="星魂小传">
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
              这里保存完整人设，影响后续所有绑定此角色的会话。注入预算与实际裁剪可在“言外之意
              · 上下文注入”检查
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
                重拾旧笺
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
              {busy ? "落笔未歇…" : "落定星魂"}
            </button>
          </div>
        </form>
      </Panel>
      <div className="rail">
        <Panel title="卿之小传">
          <div className="profile-portrait">
            <OrbitIllustration />
            <span>{name}</span>
          </div>
          <div className="detail-facts">
            <span>
              创建于<strong>{date(character.created)}</strong>
            </span>
            <span>
              星之印<code>{character.id.slice(0, 8)}</code>
            </span>
            <span>
              笺卷修次<strong>{character.revision}</strong>
            </span>
          </div>
          <p className="footnote">
            人设会在 QQ、B站和网页角色会话共用；此处星轨为档案装饰
          </p>
        </Panel>
        <Panel title="让她有自己的想法">
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
  const { character, notify } = props,
    [tab, setTab] = useState(props.view || "tts"),
    [text, setText] = useState("今天的星光，想和你一起收好"),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [audio, setAudio] = useState(""),
    [image, setImage] = useState(""),
    [prompt, setPrompt] = useState("这张图片里有什么？"),
    [fileName, setFileName] = useState(""),
    [drag, setDrag] = useState(false),
    [verified, setVerified] = useState(""),
    input = useRef<HTMLInputElement>(null),
    audioRef = useRef("");
  const root = `/api/characters/${character.id}/media`;
  useEffect(
    () => () => {
      if (audioRef.current) URL.revokeObjectURL(audioRef.current);
    },
    [],
  );
  useEffect(() => {
    setError("");
    setAnswer("");
    setVerified("");
  }, [tab]);
  const imageFile = async (file?: File) => {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("请选择不超过 8MB 的 PNG、JPEG 或 WebP 图片");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setFileName(file.name);
      setError("");
    };
    reader.readAsDataURL(file);
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setVerified("");
    try {
      await action();
      setVerified("本次真实调用成功");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const hear = async (file?: File) => {
    if (!file) return;
    await run(async () => {
      const result = await api<{ text: string }>(`${root}/hear`, {
        method: "POST",
        headers: { "Content-Type": file.type || "audio/wav" },
        body: file,
      });
      setAnswer(result.text);
    });
  };
  return (
    <>
      {!props.view && (
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "tts", name: "清音" },
            { id: "sing", name: "弦歌" },
            { id: "asr", name: "听风" },
            { id: "vision", name: "观澜" },
          ]}
        />
      )}
      <div className="content-with-rail">
        <div className="stack">
          {tab !== "sing" && (
            <MediaSetup {...props} key={`${character.id}:${tab}`} kind={tab} />
          )}
          <Panel
            title={
              tab === "tts"
                ? "把文字变成她的声音"
                : tab === "asr"
                  ? "听见，才知道你在说什么"
                  : tab === "vision"
                    ? "一起看看眼前的世界"
                    : "让喜欢的歌有她的声音"
            }
            aside={
              <Badge tone={verified ? "good" : "quiet"}>
                {verified
                  ? "本次已验证"
                  : tab === "sing"
                    ? "按音频实际验证"
                    : "按能力单独验证"}
              </Badge>
            }
          >
            {tab === "tts" ? (
              <>
                <p className="section-intro">
                  使用下面保存的语音模型和音色生成试听。每次点击都会向服务发起真实请求
                </p>
                <label className="field">
                  想让她说什么
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <div className="form-footer">
                  <small>最多 2000 字；服务可能产生费用</small>
                  <button
                    className="primary"
                    disabled={busy || !text.trim()}
                    onClick={() =>
                      run(async () => {
                        const r = await fetch(apiUrl(`${root}/speak`), {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: json({ text }),
                        });
                        if (!r.ok) throw new Error((await r.json()).error);
                        const blob = await r.blob();
                        if (audioRef.current)
                          URL.revokeObjectURL(audioRef.current);
                        audioRef.current = URL.createObjectURL(blob);
                        setAudio(audioRef.current);
                      })
                    }
                  >
                    <Headphones size={15} />
                    {busy ? "星笺初成…" : "清音初试"}
                  </button>
                </div>
                {audio && (
                  <audio className="audio-player" controls src={audio} />
                )}
              </>
            ) : tab === "vision" ? (
              <>
                <div
                  className={`image-drop ${drag ? "dragging" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-label="选择、粘贴或拖入图片"
                  onClick={() => input.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      input.current?.click();
                    }
                  }}
                  onPaste={(e) => {
                    const file = Array.from(e.clipboardData.items)
                      .find((i) => i.type.startsWith("image/"))
                      ?.getAsFile();
                    if (file) {
                      e.preventDefault();
                      imageFile(file);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    imageFile(e.dataTransfer.files[0]);
                  }}
                >
                  {image ? (
                    <img src={image} alt="待理解的图片" />
                  ) : (
                    <>
                      <ImagePlus size={30} strokeWidth={1.2} />
                      <strong>把图片带到这里</strong>
                      <span>点击选择、拖入，或在此粘贴</span>
                      <small>PNG / JPEG / WebP，最多 8MB</small>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp"
                  ref={input}
                  onChange={(e) => imageFile(e.target.files?.[0])}
                />
                {fileName && <p className="footnote">{fileName}</p>}
                <label className="field">
                  想问她什么
                  <input
                    maxLength={3000}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </label>
                <div className="form-footer">
                  <small>图片仅在你点击后发送给所选服务</small>
                  <button
                    className="primary"
                    disabled={busy || !image || !prompt.trim()}
                    onClick={() =>
                      run(async () => {
                        const result = await api<{ answer: string }>(
                          `${root}/see`,
                          { method: "POST", body: json({ image, prompt }) },
                        );
                        setAnswer(result.answer);
                      })
                    }
                  >
                    <Eye size={15} />
                    {busy ? "观澜未歇…" : "观画知意"}
                  </button>
                </div>
              </>
            ) : tab === "asr" ? (
              <>
                <p className="section-intro">
                  上传一段音频，交给已配置的听写服务。文件只在你选择后发送，不自动打开麦克风
                </p>
                <label className="upload-button">
                  <Upload size={20} />
                  <strong>{busy ? "听风未歇…" : "择一声笺"}</strong>
                  <span>WAV、MP3、M4A、WebM、Ogg，最多 15MB</span>
                  <input
                    type="file"
                    accept="audio/*"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 15 * 1024 * 1024) {
                        setError("音频不能超过 15MB");
                        return;
                      }
                      hear(f);
                    }}
                  />
                </label>
              </>
            ) : (
              <SingingPage {...props} />
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            {verified && (
              <p className="success-note">
                <Check size={14} />
                {verified} · 配置或模型变更后需重新验证
              </p>
            )}
            {answer && (
              <div className="media-answer">
                <h3>她听见或看见的</h3>
                <p>{answer}</p>
              </div>
            )}
          </Panel>
          {tab !== "sing" && (
            <Panel
              title={
                tab === "tts"
                  ? "声音的配置"
                  : tab === "asr"
                    ? "听写的配置"
                    : "视觉的配置"
              }
            >
              <Disclosure title="清音通幽">
                <ConfigForm {...props} pages={[tab]} />
              </Disclosure>
              {tab === "tts" && (
                <Disclosure title="翻阅声笺">
                  <p>
                    本地列出音色文件；云端只显示已配置名称，清单不代表已完成合成验证
                  </p>
                  <button
                    className="ghost"
                    onClick={async () => {
                      try {
                        const result = await api<{
                          voices: string[];
                          detail: string;
                        }>(`${root}/voices`);
                        setAnswer(
                          `${result.voices.join("、") || "没有找到音色"}\n${result.detail}`,
                        );
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    展读声谱
                  </button>
                </Disclosure>
              )}
              {tab === "tts" && (
                <Disclosure title="风吟栖处">
                  <p>
                    连接方式选择 breeze-local
                    时，首次生成按下面路径启动已安装的服务。这里只管理插件自己启动的进程
                  </p>
                  <ConfigForm {...props} pages={["tts-local"]} />
                  <button
                    className="ghost"
                    onClick={async () => {
                      try {
                        await api(`${root}/local/stop`, {
                          method: "POST",
                          body: json({ kind: "tts" }),
                        });
                        notify("已停止插件管理的本地语音进程");
                      } catch (error) {
                        notify((error as Error).message);
                      }
                    }}
                  >
                    清音暂歇
                  </button>
                </Disclosure>
              )}
            </Panel>
          )}
        </div>
        <div className="rail">
          <Panel title="同源分流">
            <Cloud size={22} className="section-icon" />
            <p className="section-intro">
              视觉可直接沿用DSH模型，无需在此填写。多种能力使用同一云端兼容服务时只需配置一次；各功能也能选择独立连接、本地托管或停用
            </p>
            <Disclosure title="源流细笺">
              <ConfigForm {...props} pages={["media"]} />
            </Disclosure>
          </Panel>
          <Panel title="近灯远帆">
            <p>
              说话与唱歌使用插件托管的Breeze、SoulX，听写可使用免费Whisper。它们共用本地模型许可，闲置5分钟下线。视觉可直接沿用DSH已有视觉模型，也可单独配置远程服务；每项能力都需真实输入验证
            </p>
            <Badge>逐项真实验证</Badge>
          </Panel>
        </div>
      </div>
    </>
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
            眉目百态 <span>{data?.length ?? 0}</span>
          </button>
          <button
            className={favorite ? "selected" : ""}
            onClick={() => setFavorite(true)}
          >
            <StarIcon size={13} />
            藏星
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
          {busy ? "纳卷途中…" : "纳眉目入卷"}
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
                      title="散去此影"
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
            title={
              query || favorite ? "没有符合条件的表情" : "把她的表情带回来"
            }
            description="导入 PNG、JPEG、GIF 或 WebP。收藏、备注与图片按角色独立保存，文件缺失不会清空记录"
            action={
              <label className="button ghost">
                初藏眉目
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
            心绪题词
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
              散去此影
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
              留存唤词
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
      <Panel title="星光设色">
        <p className="section-intro">
          动效强度随设备调整，背景持续存在，页面切换时不重新搭建星空
        </p>
        <ConfigForm {...props} pages={["appearance"]} />
      </Panel>
      <Panel title="随心有界">
        <p className="section-intro">
          由你授权，再由服务端检查字段和改动幅度。不能修改凭据、路径、执行程序或扩大自己的权限
        </p>
        <ConfigForm {...props} pages={["permissions"]} />
        <Disclosure title="信契所许">
          <ul>
            {props.bootstrap.fields
              .filter((f) => f.bot)
              .map((f) => (
                <li key={f.key} title={f.label}>
                  {poeticField(f)}
                </li>
              ))}
          </ul>
          <p>每次改动写入审计记录，权限仅作用于这个角色。</p>
        </Disclosure>
      </Panel>
      <Panel title="星河栖处">
        <div className="detail-facts">
          <span>
            星海归处<code>{props.bootstrap.installation?.memoryRoot}</code>
          </span>
          <span>
            藏星之所<code>{props.bootstrap.installation?.backupRoot}</code>
          </span>
        </div>
        <p className="footnote">
          目录在首次向导确认。跨机器迁移时先备份、导入，再重新配置连接与凭据
        </p>
        <TextLink onClick={() => props.go("maintenance")}>藏星问脉</TextLink>
      </Panel>
      <Panel title="旧卷寻踪">
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
      <Panel title="言后余响">
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
        title="星途问脉"
        aside={
          <button className="ghost" onClick={refresh}>
            <RefreshCw size={14} />
            再观星象
          </button>
        }
      >
        {error && <p className="inline-error">{error}</p>}
        <div className="health-row">
          <span>
            <Database size={18} />
            星魂藏卷
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
            重渡星桥
          </button>
        )}
      </Panel>
      <Panel title="把这一片星空带走">
        <p className="section-intro">
          为当前角色创建数据库一致性快照，同时保存角色资料、笔记与文件校验清单。环境变量中的凭据不会包含在备份里
        </p>
        <div className="backup-location">
          <HardDrive size={22} />
          <div>
            <strong>藏星之所</strong>
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
            {busy ? "星事未歇…" : "藏星入阁"}
          </button>
        </div>
        {result && (
          <p className="backup-result" role="status">
            {result}
          </p>
        )}
      </Panel>
      <Panel title="旧梦渡新河">
        <p>
          旧数据先做只读预检，检查来源、重复项和角色归属后再导入新目录。当前提供命令行预检，网页导入向导与全量格式转换仍待完成
        </p>
        <code className="command">
          pnpm migrate:inspect -- &lt;备份目录&gt;
        </code>
        <Disclosure title="星程未央">
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
