import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Check,
  Plus,
  Save,
  RotateCcw,
  ArrowUpRight,
  Wind,
  Sparkles,
  Heart,
  Activity,
} from "lucide-react";
import { api, json, date, type State, type Intentions } from "./types";
import { Panel, Badge, Empty, Select, Tabs, Disclosure } from "./components";
import { Spectrum } from "./scenes";
import { ConfigForm } from "./pages";
import { useResource, GoalModal, type PageProps } from "./main";
import {
  stateDimensions,
  deriveOrganism,
  experienceDefinitions,
  type ExperienceKind,
  type Drive,
} from "../src/starrcore/organism";

export function OrganismPage(props: PageProps & { view?: string }) {
  const { character, overview, refresh, notify, version } = props;
  const [emotionScope, setEmotionScope] = useState("main");
  const [tab, setTab] = useState(props.view || "now"),
    [draft, setDraft] = useState<State>(overview.state),
    [dimensionGroup, setDimensionGroup] = useState("body");
  const [kind, setKind] = useState<ExperienceKind>("conversation"),
    [intensity, setIntensity] = useState(60),
    [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [goalModal, setGoalModal] = useState(false);
  // 保留同一次提交的事件号，网络失败后重试不会重复作用。
  const pending = useRef<{ signature: string; eventKey: string } | null>(null);
  const close = useCallback(() => setGoalModal(false), []);
  const { data: history, error: historyError } = useResource<
    {
      created: string;
      after: State;
      experience?: { kind: ExperienceKind; intensity: number };
    }[]
  >(`/api/characters/${character.id}/state/history`, version);
  const { data: intentions, error: intentionsError } = useResource<Intentions>(
    `/api/characters/${character.id}/intentions`,
    version,
  );
  useEffect(() => {
    setDraft(overview.state);
    setError("");
  }, [overview.state.revision, character.id]);
  useEffect(() => {
    setEvidence("");
    pending.current = null;
  }, [character.id]);
  const organism = useMemo(
    () => deriveOrganism({ ...draft, _affect: draft.experienceTrace }),
    [draft],
  );
  const preview = useMemo(() => ({ ...draft, organism }), [draft, organism]);
  const visibleEmotions = organism.emotions.filter((e) => e.intensity > 0);
  const createFromDrive = async (drive: Drive) => {
    setBusy(true);
    try {
      await api(`/api/characters/${character.id}/goals`, {
        method: "POST",
        body: json({
          title: drive.title,
          reason: drive.reason,
          drive: drive.id,
        }),
      });
      refresh();
      notify("愿望已留下，等一个合适的时机");
      setTab("goals");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="organism-page">
      <Tabs
        value={tab}
        onChange={(s) => {
          setTab(s);
          setError("");
        }}
        items={[
          { id: "now", name: "心潮与体感" },
          { id: "goals", name: "愿望与目的" },
          { id: "history", name: "经历的回声" },
          { id: "habits", name: "节律与边界" },
        ]}
      />
      <div className="organism-view" key={tab}>
        {tab === "now" ? (
          <>
            <Panel
              className="inner-weather"
              title="当前情绪状态"
              aside={
                <Badge>
                  {organism.mixed ? "多种感受同时存在" : "此刻的感受"}
                </Badge>
              }
            >
              <div className="weather-heading">
                <div>
                  <h3>{organism.label}</h3>
                  <p>{organism.poetic}</p>
                </div>
                <span className="weather-freshness">
                  {date(overview.state.updatedAt)} 留下的状态
                </span>
              </div>
              <div className="emotion-scope">
                <Tabs
                  value={emotionScope}
                  onChange={setEmotionScope}
                  items={[
                    { id: "main", name: "主要心潮" },
                    { id: "all", name: "全部感受" },
                  ]}
                />
                <span>
                  {emotionScope === "all"
                    ? visibleEmotions.length
                    : Math.min(8, visibleEmotions.length)}{" "}
                  种感受，独立流动
                </span>
              </div>
              <div
                className={`emotion-stage ${emotionScope === "all" ? "emotion-stage-expanded" : ""}`}
              >
                <Spectrum
                  limit={emotionScope === "all" ? 0 : 8}
                  state={preview}
                  motion={String(character.config["ui.motion"])}
                />
                <div className="emotion-axis">
                  <span>感受生起</span>
                  <span>流动 · 交织 · 慢慢沉淀</span>
                  <span>此刻仍在</span>
                </div>
              </div>
              <div className="emotion-key" aria-label="波谱情绪图例">
                {visibleEmotions
                  .slice(0, emotionScope === "all" ? visibleEmotions.length : 8)
                  .map((e) => (
                    <div
                      key={e.id}
                      style={{ "--emotion-color": e.color } as CSSProperties}
                    >
                      <span className="emotion-swatch" />
                      <span>{e.name}</span>
                      <strong>{e.intensity}</strong>
                      <small>强度</small>
                    </div>
                  ))}
              </div>
              <div className="rhythm-facts">
                <span>
                  急切 <b>{organism.rhythm.urgency}</b>
                </span>
                <span>
                  舒展 <b>{organism.rhythm.coherence}</b>
                </span>
                <span>
                  交错 <b>{organism.rhythm.turbulence}</b>
                </span>
                <small>虚拟感受的流场表达，颜色与图例一一对应</small>
              </div>
            </Panel>
            <div className="organism-columns">
              <Panel
                title="体感与心理状态"
                className="body-rhythm"
                aside={<Activity size={17} />}
              >
                <p className="section-intro">身体有余量，心事才有地方安放</p>
                <div className="body-readings">
                  {stateDimensions
                    .filter((d) => d.group === "body")
                    .map((d) => (
                      <div key={d.key}>
                        <span>{d.name}</span>
                        <strong>
                          {Math.round(draft[d.key])}
                          <small> / 100</small>
                        </strong>
                        <div className="level-track">
                          <i style={{ width: `${draft[d.key]}%` }} />
                        </div>
                      </div>
                    ))}
                </div>
                <div className="current-evidence">
                  <span>最近的来处</span>
                  <p>{overview.state.evidence}</p>
                </div>
              </Panel>
              <Panel
                title="各项情绪强度"
                className="emotion-inventory"
                aside={<Heart size={17} />}
              >
                <div className="emotion-list">
                  {visibleEmotions.slice(0, 8).map((e) => (
                    <div
                      key={e.id}
                      style={{ "--emotion-color": e.color } as CSSProperties}
                    >
                      <span>
                        <i />
                        {e.name}
                      </span>
                      <div className="level-track">
                        <i style={{ width: `${e.intensity}%` }} />
                      </div>
                      <strong>{e.intensity}</strong>
                    </div>
                  ))}
                </div>
                <Disclosure
                  title="其他情绪"
                  description="不把负面情绪折成一个不开心的数值"
                >
                  <div className="emotion-rest">
                    {visibleEmotions.slice(8).map((e) => (
                      <span key={e.id}>
                        <i style={{ background: e.color }} />
                        {e.name}
                        <b>{e.intensity}</b>
                      </span>
                    ))}
                  </div>
                </Disclosure>
              </Panel>
            </div>
            <Panel
              className="experience-panel"
              title="记录经历并更新状态"
              aside={<Sparkles size={17} />}
            >
              <p className="section-intro">
                记下刚发生的事。它会影响体感、心理、情绪余韵和下一步想做的事
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  const payload = {
                      kind,
                      intensity,
                      evidence: evidence.trim(),
                    },
                    signature = JSON.stringify(payload);
                  if (pending.current?.signature !== signature)
                    pending.current = {
                      signature,
                      eventKey: crypto.randomUUID(),
                    };
                  try {
                    await api(`/api/characters/${character.id}/experiences`, {
                      method: "POST",
                      body: json({
                        ...payload,
                        revision: overview.state.revision,
                        eventKey: pending.current.eventKey,
                      }),
                    });
                    pending.current = null;
                    setEvidence("");
                    refresh();
                    notify("这阵风，已在心里留下回声");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="experience-fields">
                  <label className="field">
                    经历了什么
                    <Select
                      label="经历类型"
                      value={kind}
                      onChange={(s) => setKind(s as ExperienceKind)}
                      options={Object.entries(experienceDefinitions).map(
                        ([value, d]) => ({ value, label: d.name }),
                      )}
                    />
                  </label>
                  <label className="state-slider">
                    <span>
                      这件事的分量<b>{intensity}</b>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                    />
                    <small>强度越高，状态变化越明显</small>
                  </label>
                </div>
                <label className="field">
                  发生了什么，为什么这样判断
                  <textarea
                    required
                    maxLength={500}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="例如：完成了反复失败的任务，终于松了一口气"
                    rows={3}
                  />
                </label>
                {error && (
                  <p className="inline-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="form-footer">
                  <small>只记录发生过的经历；不创建聊天消息或记忆正文</small>
                  <button
                    className="primary"
                    disabled={busy || !evidence.trim()}
                  >
                    <Plus size={14} />
                    {busy ? "留下回声…" : "记录这次经历"}
                  </button>
                </div>
              </form>
            </Panel>
            <Disclosure
              title="细调体感与心理"
              description="高级调节：预览即时变化，保存后才写入状态；需要说明来源"
            >
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  const values = Object.fromEntries([
                    ...stateDimensions.map((d) => [d.key, draft[d.key]]),
                    ["evidence", draft.evidence],
                  ]);
                  const signature = JSON.stringify(values);
                  if (pending.current?.signature !== signature)
                    pending.current = {
                      signature,
                      eventKey: crypto.randomUUID(),
                    };
                  try {
                    await api(`/api/characters/${character.id}/state`, {
                      method: "PATCH",
                      body: json({
                        revision: draft.revision,
                        values,
                        eventKey: pending.current.eventKey,
                      }),
                    });
                    pending.current = null;
                    refresh();
                    notify("体感与心理的变化已保存");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Tabs
                  value={dimensionGroup}
                  onChange={setDimensionGroup}
                  items={[
                    { id: "body", name: "身体余量" },
                    { id: "mind", name: "心理感受" },
                  ]}
                />
                <div className="state-sliders">
                  {stateDimensions
                    .filter((d) => d.group === dimensionGroup)
                    .map((d) => (
                      <label className="state-slider" key={d.key}>
                        <span>
                          {d.name}
                          <b>{Math.round(draft[d.key])}</b>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={draft[d.key]}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              [d.key]: Number(e.target.value),
                            })
                          }
                        />
                        <small>{d.help}</small>
                      </label>
                    ))}
                </div>
                <label className="field">
                  这次调整的依据
                  <textarea
                    required
                    maxLength={500}
                    rows={2}
                    value={draft.evidence}
                    onChange={(e) =>
                      setDraft({ ...draft, evidence: e.target.value })
                    }
                  />
                </label>
                {error && (
                  <p className="inline-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="form-footer">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setDraft(overview.state)}
                  >
                    <RotateCcw size={14} />
                    恢复已保存状态
                  </button>
                  <button className="primary" disabled={busy}>
                    <Save size={14} />
                    保存调节
                  </button>
                </div>
              </form>
            </Disclosure>
            <Disclosure
              title="虚拟调节参数"
              description="虚拟兴奋、安定、联结、压力、警觉与睡眠倾向"
            >
              <div className="modulator-grid">
                {organism.modulators.map((m) => (
                  <div key={m.id}>
                    <span>
                      {m.name}
                      <b>{m.value}</b>
                    </span>
                    <div className="level-track">
                      <i style={{ width: `${m.value}%` }} />
                    </div>
                    <small>{m.help}</small>
                  </div>
                ))}
              </div>
              <p className="footnote">
                这些是角色的虚拟调节参数，用于保持经历与行为的连贯性，不是人体激素测量，也不表示真实生理感受
              </p>
            </Disclosure>
          </>
        ) : tab === "goals" ? (
          <>
            <Panel
              title="需求与主动候选"
              aside={
                <Badge>{intentions?.enabled ? "正在评估" : "仅观察需求"}</Badge>
              }
            >
              <p className="section-intro">
                需求不是命令。可以想靠近，也可以先休息；目的会同时考虑精力、时机与边界
              </p>
              {intentionsError && (
                <p className="inline-error" role="alert">
                  {intentionsError}
                </p>
              )}
              <div className="drive-list">
                {(intentions?.candidates ?? organism.drives).map((d, i) => (
                  <div
                    className={`drive-row ${i === 0 ? "drive-leading" : ""}`}
                    key={d.id}
                  >
                    <div className="drive-pressure">
                      <strong>{d.pressure}</strong>
                      <span>{d.name}</span>
                    </div>
                    <div className="drive-content">
                      <h3>{d.title}</h3>
                      <p>{d.reason}</p>
                      {"blockers" in d && (
                        <small>
                          {(
                            d as Intentions["candidates"][number]
                          ).blockers.join(" · ") ||
                            "条件适合，可以交由角色考虑"}
                        </small>
                      )}
                    </div>
                    <button
                      className="text-link"
                      disabled={
                        busy ||
                        overview.goals.some(
                          (g) => g.status === "waiting" && g.drive === d.id,
                        )
                      }
                      onClick={() => createFromDrive(d)}
                    >
                      {overview.goals.some(
                        (g) => g.status === "waiting" && g.drive === d.id,
                      )
                        ? "愿望已在酝酿"
                        : "留下这个愿望"}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="footnote">
                这里只提出倾向；评估与创建目的均不代表已经执行。没有迫切愿望时，安静也是一种选择
              </p>
            </Panel>
            <Panel
              title="已保存的目的"
              aside={
                <button className="ghost" onClick={() => setGoalModal(true)}>
                  <Plus size={14} />
                  添加目的
                </button>
              }
            >
              {overview.goals.length ? (
                overview.goals.map((g) => {
                  const evaluation = intentions?.goals.find(
                    (e) => e.id === g.id,
                  );
                  return (
                    <div className="purpose-row" key={g.id}>
                      <div>
                        <h3>{g.title}</h3>
                        <p>{g.reason}</p>
                        {g.progress && (
                          <p className="activity-progress">
                            最近进展：{g.progress}
                          </p>
                        )}
                        <small>
                          {g.status === "completed"
                            ? "已完成"
                            : g.status === "cancelled"
                              ? "已放下"
                              : evaluation?.blockers.join(" · ") ||
                                "等待合适的条件"}
                          {g.due ? ` · 约定 ${date(g.due)}` : ""}
                        </small>
                      </div>
                      {g.status === "waiting" && (
                        <div className="row-actions">
                          {["completed", "cancelled"].map((status) => (
                            <button
                              className={
                                status === "completed" ? "ghost" : "text-link"
                              }
                              key={status}
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await api(
                                    `/api/characters/${character.id}/goals/${g.id}`,
                                    { method: "PATCH", body: json({ status }) },
                                  );
                                  refresh();
                                  notify(
                                    status === "completed"
                                      ? "约定已标记完成"
                                      : "目的已取消",
                                  );
                                } catch (e) {
                                  notify((e as Error).message);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              {status === "completed" && <Check size={14} />}
                              {status === "completed" ? "完成" : "取消目的"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <Empty
                  title="还没有写下的约定"
                  description="从上面的需求留下一份愿望，或记下一个具体的约定"
                />
              )}
            </Panel>
          </>
        ) : tab === "history" ? (
          <Panel title="状态变化记录" aside={<Wind size={18} />}>
            {historyError && (
              <p className="inline-error" role="alert">
                {historyError}
              </p>
            )}
            {history?.length ? (
              history.map((h, i) => (
                <div className="history-row" key={i}>
                  <span className="history-mark" />
                  <div>
                    <strong>
                      {h.experience
                        ? experienceDefinitions[h.experience.kind]?.name
                        : "手动调节"}{" "}
                      · {h.after.organism?.label ?? h.after.emotion}
                    </strong>
                    <p>{h.after.evidence}</p>
                    <small>
                      {date(h.created)} · 精力 {Math.round(h.after.energy)} ·
                      紧张 {Math.round(h.after.tension)}
                      {h.experience
                        ? ` · 经历强度 ${h.experience.intensity}`
                        : ""}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="暂无状态变化记录"
                description="记录真实经历或调节状态后，这里会保留变化前后与来源"
              />
            )}
          </Panel>
        ) : (
          <Panel title="主动行为与作息">
            <ConfigForm {...props} pages={["state"]} />
            <Disclosure title="她如何形成一个目的">
              <ol className="organism-chain">
                <li>经历改变体感、心理与情绪余韵</li>
                <li>身体需求和心理感受共同形成欲望</li>
                <li>欲望带出候选目的，结合精力与时机排序</li>
                <li>宿主接入后，仍需按具体能力与授权执行</li>
              </ol>
              <p>
                时间用于状态演化、作息和冷却；不会因到了某一分钟就强制说话。当前独立版可记录、评估与保存目的，外部行为尚未接入
              </p>
            </Disclosure>
          </Panel>
        )}
      </div>
      {goalModal && (
        <GoalModal
          character={character}
          onClose={close}
          onSaved={() => {
            refresh();
            notify("目的已保存");
          }}
        />
      )}
    </div>
  );
}
