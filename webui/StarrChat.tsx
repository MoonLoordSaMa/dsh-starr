import { useEffect, useState } from "react";
import { MessagesSquare, RefreshCw, Save, Search } from "lucide-react";
import { api, json, date, type Memory } from "./types";
import { Panel, Tabs, Select, Badge, Empty, Disclosure } from "./components";
import { ConfigForm } from "./pages";
import { QQConnection } from "./QQConnection";
import { BiliConnection } from "./BiliConnection";
import { UsageBudget } from "./UsageBudget";
import type { PageProps } from "./main";
import "./chat.css";

type Session = {
  session_id: string;
  character_id: string;
  platform: string;
  type: string;
  account: string;
  target: string;
  title: string;
  purpose: string;
  paused: number;
  revision: number;
  summary?: string;
  pending?: string;
  updated: string;
  behavior?: { mode: string; wake_after: number; last_wake: number } | null;
  mode?: string;
};
type Context = {
  text: string;
  chars: number;
  budget: number;
  sections: { name: string; text: string; chars: number }[];
  memories: { id: string; title: string; visibility: string; score: number }[];
  note: string;
  characterRevision: number;
  lastInjection: null | {
    verified: boolean;
    completed: number;
    requestSeq: number;
    characterRevision: number;
    chars: number;
    memories: { id: string; title: string }[];
    placement?: "message" | "runtime";
  };
};
const purposeNames: Record<string, string> = {
  chat: "日常交流",
  memory: "记忆整理",
  task: "任务协作",
  management: "系统管理",
};
const platformNames: Record<string, string> = {
  qq: "QQ",
  bili: "B站",
  web: "网页角色会话",
};
const typeNames: Record<string, string> = {
  group: "群聊",
  private: "私聊",
  dm: "私信",
  comment: "评论楼层",
  live: "直播间",
  watch: "资料阅读",
  dynamic: "动态创作",
  web: "角色会话",
};
export function StarrChat(props: PageProps & { view?: string }) {
  const { character, notify } = props,
    base = `/api/characters/${character.id}`;
  const [tab, setTab] = useState(props.view || "sessions"),
    [sessions, setSessions] = useState<Session[]>([]),
    [selected, setSelected] = useState(""),
    [detail, setDetail] = useState<Session | null>(null),
    [preview, setPreview] = useState<Context | null>(null);
  const [platform, setPlatform] = useState("all"),
    [purpose, setPurpose] = useState("all"),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [memories, setMemories] = useState<(Memory & { visibility?: string })[]>(
      [],
    );
  const [reload, setReload] = useState(0);
  const [shareBatch, setShareBatch] = useState("");
  const load = async () => {
    setSessions(await api<Session[]>(`${base}/chats`));
    setReload((value) => value + 1);
  };
  useEffect(() => {
    setError("");
    setSessions([]);
    setSelected("");
    setDetail(null);
    setPreview(null);
    setShareBatch("");
  }, [base]);
  useEffect(() => {
    let active = true;
    api<Session[]>(`${base}/chats`)
      .then((value) => {
        if (active) {
          setSessions(value);
          const preferred =
            value.find((item) => ["qq", "bili"].includes(item.platform)) ||
            value.find(
              (item) => !item.session_id.startsWith("session-starr-job-"),
            ) ||
            value[0];
          setSelected((current) =>
            value.some((item) => item.session_id === current)
              ? current
              : preferred?.session_id || "",
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [base, props.version]);
  useEffect(() => {
    let active = true;
    if (!selected) return;
    setDetail(null);
    setPreview(null);
    Promise.all([
      api<Session>(`${base}/chats/${encodeURIComponent(selected)}`),
      api<Context>(`${base}/chats/${encodeURIComponent(selected)}/context`),
    ])
      .then(([session, context]) => {
        if (active) {
          setDetail(session);
          setPreview(context);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [base, selected, reload, props.version]);
  useEffect(() => {
    if (tab !== "memory") return;
    let active = true;
    api<(Memory & { visibility?: string })[]>(`${base}/memories?limit=500`)
      .then((value) => {
        if (active) setMemories(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [tab, base, props.version]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const filtered = sessions.filter(
    (session) =>
      (platform === "all" || session.platform === platform) &&
      (purpose === "all" || session.purpose === purpose) &&
      `${session.title} ${session.target}`.includes(query),
  );
  return (
    <div className="starr-chat">
      <div className="chat-intro">
        <p>按平台与用途整理接续，账号和对话对象各有边界</p>
        <Badge>{sessions.length} 段角色会话</Badge>
      </div>
      {!props.view && (
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "sessions", name: "会话" },
            { id: "context", name: "上下文注入" },
            { id: "rules", name: "规则与节奏" },
            { id: "memory", name: "共享记忆" },
            { id: "qq", name: "QQ 接入" },
            { id: "bili", name: "B站接入" },
          ]}
        />
      )}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {tab === "sessions" && (
        <>
          <div className="chat-filters">
            <Select
              label="平台分类"
              value={platform}
              onChange={setPlatform}
              options={[
                { value: "all", label: "全部平台" },
                ...Object.entries(platformNames).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <Select
              label="用途分类"
              value={purpose}
              onChange={setPurpose}
              options={[
                { value: "all", label: "全部用途" },
                ...Object.entries(purposeNames).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <label className="search-box">
              <Search size={15} />
              <input
                aria-label="搜索会话"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="标题或平台对象"
              />
            </label>
            <button className="ghost" disabled={busy} onClick={() => run(load)}>
              <RefreshCw size={15} />
              刷新
            </button>
          </div>
          <div className="chat-columns">
            <Panel title="相逢有来处">
              {filtered.length ? (
                <div className="chat-session-list">
                  {filtered.map((session) => (
                    <button
                      key={session.session_id}
                      className={`chat-session ${selected === session.session_id ? "selected" : ""}`}
                      disabled={busy}
                      onClick={() => setSelected(session.session_id)}
                    >
                      <MessagesSquare size={17} />
                      <span>
                        <strong>{session.title}</strong>
                        <small>
                          {platformNames[session.platform]} ·{" "}
                          {session.session_id.startsWith("session-starr-job-")
                            ? "记忆任务"
                            : typeNames[session.type] || "角色会话"}{" "}
                          · {purposeNames[session.purpose]}
                        </small>
                        <small>
                          {date(session.updated)}
                          {session.paused ? " · 平台收件已暂停" : ""}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty
                  title="这里还没有会话"
                  description="QQ 收到允许范围内的消息，或在 DSH 打开角色预设后，会自动登记在这里。B站实际接入后也使用同一套登记与记忆服务。"
                />
              )}
            </Panel>
            <div>
              {detail ? (
                <>
                  <Panel title="这一段对话">
                    {["qq", "bili"].includes(detail.platform) &&
                      ["private", "group", "dm", "comment", "live"].includes(
                        detail.type,
                      ) && (
                        <>
                          <Select
                            label="这段会话的状态"
                            value={
                              detail.mode || detail.behavior?.mode || "default"
                            }
                            onChange={(mode) => setDetail({ ...detail, mode })}
                            options={[
                              { value: "default", label: "跟随角色默认状态" },
                              { value: "awake", label: "清醒 · 接续交流" },
                              { value: "observe", label: "观察 · 等待叫到" },
                              {
                                value: "sleep",
                                label: "沉睡 · 只回应直接呼唤",
                              },
                            ]}
                          />
                          {!!detail.behavior?.wake_after && (
                            <p className="footnote">
                              等待至{" "}
                              {date(
                                new Date(
                                  detail.behavior.wake_after,
                                ).toISOString(),
                              )}
                              ，改动状态后保存可立即解除等待
                            </p>
                          )}
                        </>
                      )}
                    <label className="field">
                      会话标题
                      <input
                        value={detail.title}
                        onChange={(e) =>
                          setDetail({ ...detail, title: e.target.value })
                        }
                      />
                    </label>
                    <Select
                      label="会话用途"
                      value={detail.purpose}
                      onChange={(value) =>
                        setDetail({ ...detail, purpose: value })
                      }
                      options={Object.entries(purposeNames).map(
                        ([value, label]) => ({ value, label }),
                      )}
                    />
                    <label className="field">
                      接续摘要
                      <textarea
                        rows={4}
                        value={detail.summary || ""}
                        onChange={(e) =>
                          setDetail({ ...detail, summary: e.target.value })
                        }
                      />
                      <small>
                        由角色调用工具或管理员整理，不冒充自动生成的完整聊天记录
                      </small>
                    </label>
                    <label className="field">
                      尚未完成的事
                      <textarea
                        rows={3}
                        value={detail.pending || ""}
                        onChange={(e) =>
                          setDetail({ ...detail, pending: e.target.value })
                        }
                      />
                    </label>
                    {["qq", "bili"].includes(detail.platform) &&
                      ["private", "group", "dm", "comment", "live"].includes(
                        detail.type,
                      ) && (
                        <label className="check-field">
                          <input
                            type="checkbox"
                            checked={!!detail.paused}
                            onChange={(e) =>
                              setDetail({
                                ...detail,
                                paused: Number(e.target.checked),
                              })
                            }
                          />
                          暂停此对话的后续平台处理（已开始的批次会完成）
                        </label>
                      )}
                    <p className="footnote">
                      对象与角色绑定由可信来源固定；改变用途只整理分类，不扩大工具权限
                    </p>
                    <div className="form-footer">
                      <code>{detail.session_id.slice(0, 24)}</code>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const next = await api<Session>(
                              `${base}/chats/${encodeURIComponent(detail.session_id)}`,
                              {
                                method: "PATCH",
                                body: json({
                                  revision: detail.revision,
                                  patch: {
                                    title: detail.title,
                                    purpose: detail.purpose,
                                    summary: detail.summary,
                                    pending: detail.pending,
                                    paused: !!detail.paused,
                                    ...(detail.mode
                                      ? { mode: detail.mode }
                                      : {}),
                                  },
                                }),
                              },
                            );
                            setDetail(next);
                            setPreview(
                              await api<Context>(
                                `${base}/chats/${encodeURIComponent(next.session_id)}/context`,
                              ),
                            );
                            await load();
                            notify("会话分类与接续已保存");
                          })
                        }
                      >
                        <Save size={14} />
                        保存会话
                      </button>
                    </div>
                  </Panel>
                  {preview && (
                    <Panel title="下一轮会带上什么">
                      <div className="protocol-facts">
                        <span>
                          {preview.chars} / {preview.budget} 字符
                        </span>
                        <span>{preview.memories.length} 条可见记忆</span>
                      </div>
                      {preview.sections.map((section) => (
                        <Disclosure
                          key={section.name}
                          title={`${section.name} · ${section.chars} 字符`}
                        >
                          <pre className="chat-context-text">
                            {section.text}
                          </pre>
                        </Disclosure>
                      ))}
                      <small>{preview.note}</small>
                    </Panel>
                  )}
                </>
              ) : (
                <Panel title="把一段对话，轻轻展开">
                  <p>
                    选择左侧会话，可以整理用途、接续摘要与未完事项，也能检查实际将注入的资料
                  </p>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
      {tab === "context" && (
        <div className="content-with-rail">
          <Panel title="留下恰到好处的上下文">
            <ConfigForm {...props} pages={["chat-context"]} />
          </Panel>
          <div className="rail">
            <Panel title="这一次，真正带上了什么">
              <div className="injection-check">
                <Select
                  label="核验会话"
                  value={selected}
                  onChange={setSelected}
                  options={sessions.map((session) => ({
                    value: session.session_id,
                    label: session.title,
                  }))}
                />
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() => run(load)}
                >
                  <RefreshCw size={14} />
                  刷新核验
                </button>
                {preview ? (
                  <>
                    <p>
                      下一轮预览：{preview.chars} / {preview.budget} 字符，
                      {preview.memories.length} 条可见记忆
                    </p>
                    {preview.lastInjection ? (
                      <>
                        <Badge>
                          {preview.lastInjection.verified
                            ? "已在宿主完成的请求中核对"
                            : "注入未能完整核对"}
                        </Badge>
                        <p>
                          {date(
                            new Date(
                              preview.lastInjection.completed,
                            ).toISOString(),
                          )}{" "}
                          · {preview.lastInjection.chars} 字符 ·{" "}
                          {preview.lastInjection.memories.length} 条记忆
                        </p>
                        <p>
                          {preview.lastInjection.placement === "message"
                            ? "本轮资料已完整附在自动来信正文中"
                            : "本轮资料通过运行上下文更新"}
                        </p>
                        {preview.lastInjection.characterRevision !==
                          preview.characterRevision && (
                          <p>配置已更新，等待下一轮会话使用新配置</p>
                        )}
                      </>
                    ) : (
                      <p>
                        尚无本次修复后的请求记录。下一轮会话完成后会核验；打开本页预览不会冒充实际请求
                      </p>
                    )}
                    {preview.sections.map((section) => (
                      <Disclosure
                        key={section.name}
                        title={`${section.name} · ${section.chars} 字符`}
                      >
                        <pre className="chat-context-text">{section.text}</pre>
                      </Disclosure>
                    ))}
                  </>
                ) : (
                  <p>
                    角色会话开始后，可在这里查看角色、接续、状态与记忆的注入预览
                  </p>
                )}
              </div>
            </Panel>
            <Panel title="角色核心与动态资料">
              <p>
                当前人设决定说话方式；摘要、心理状态与相关往事随请求更新。资料应自然融入相处，完整记忆需要时再按编号读取
              </p>
              <p>
                这份预算控制 starr 的注入内容。DSH
                原始聊天历史与其他插件仍遵循宿主策略；不会把修改字数预算说成已经压缩整个模型上下文
              </p>
            </Panel>
          </div>
        </div>
      )}
      {tab === "rules" && (
        <Panel title="让相处有自己的节奏">
          <p>
            唤醒状态作用于 QQ 与 B站，分条、回复节奏与补历史作用于
            QQ；用量闸门作用于当前角色的 Starr-chat
            模型请求。平台凭据和允许对象分别在接入页配置
          </p>
          <Disclosure title="唤醒、观察与额度">
            <ConfigForm {...props} pages={["chat-wake"]} />
          </Disclosure>
          <Disclosure title="回复、分条、等待与收尾">
            <ConfigForm {...props} pages={["chat-reply"]} />
          </Disclosure>
          <Disclosure title="拒收与连续刷屏保护">
            <ConfigForm {...props} pages={["chat-access"]} />
          </Disclosure>
          <Disclosure title="会话工具开关">
            <ConfigForm {...props} pages={["chat-tools"]} />
          </Disclosure>
          <Disclosure title="图片、语音、表情与补看历史">
            <ConfigForm {...props} pages={["chat-media"]} />
          </Disclosure>
          <Disclosure title="模型用量与估算费用">
            <UsageBudget {...props} />
            <ConfigForm {...props} pages={["chat-budget"]} />
          </Disclosure>
          <Disclosure title="记住这段相处的用语">
            <ConfigForm {...props} pages={["chat-slang"]} />
          </Disclosure>
        </Panel>
      )}
      {tab === "memory" && (
        <>
          <Panel title="同一颗星，不必重复收藏">
            <p>
              QQ、B站与网页角色会话共用当前角色的记忆库。角色共享记忆可被各平台召回；本对话记忆只给来源会话。旧记忆默认待确认，不自动变成群聊可见
            </p>
            <ConfigForm {...props} pages={["chat-memory"]} />
          </Panel>
          <Panel title="确认记忆的共享范围">
            <p>
              一键共享后，当前角色的
              QQ、B站和网页角色会话都能读取这些记忆。请先确认其中没有希望保留在单独私聊里的内容
            </p>
            <div className="form-footer">
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const result = await api<{
                      batchId: string;
                      count: number;
                    }>(`${base}/memory-share-all`, {
                      method: "POST",
                      body: json({}),
                    });
                    setShareBatch(result.batchId);
                    setReload((n) => n + 1);
                    notify(
                      `已共享${result.count}条记忆，包含当前列表以外的记录`,
                    );
                  })
                }
              >
                一键共享全部记忆
              </button>
              {shareBatch && (
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(`${base}/memory-share-all`, {
                        method: "POST",
                        body: json({ restoreBatch: shareBatch }),
                      });
                      setShareBatch("");
                      setReload((n) => n + 1);
                      notify("已恢复本次共享前的范围");
                    })
                  }
                >
                  撤销本次共享
                </button>
              )}
            </div>
            <Disclosure title="逐条查看或调整范围">
              <p className="footnote">
                下方列出最近 500
                条记忆；这是管理员操作。设为共享后，当前角色各平台会话都可能召回
              </p>
              <div className="chat-memory-list">
                {memories.map((memory) => (
                  <div className="chat-memory-row" key={memory.id}>
                    <span>
                      <strong>{memory.title}</strong>
                      <small>
                        {memory.visibility === "shared"
                          ? "角色共享"
                          : memory.visibility === "conversation"
                            ? "仅来源会话"
                            : "待确认范围"}
                      </small>
                    </span>
                    <button
                      className="ghost"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const visibility =
                            memory.visibility === "shared"
                              ? "unclassified"
                              : "shared";
                          const result = await api<{
                            visibility: string;
                            revision: number;
                          }>(`${base}/memory-scope/${memory.id}`, {
                            method: "PATCH",
                            body: json({
                              visibility,
                              revision: memory.revision,
                            }),
                          });
                          setMemories((old) =>
                            old.map((row) =>
                              row.id === memory.id
                                ? { ...row, ...result }
                                : row,
                            ),
                          );
                          notify(
                            visibility === "shared"
                              ? "已设为当前角色共享记忆"
                              : "已取消跨会话共享",
                          );
                        })
                      }
                    >
                      {memory.visibility === "shared"
                        ? "取消共享"
                        : "设为角色共享"}
                    </button>
                  </div>
                ))}
              </div>
            </Disclosure>
          </Panel>
        </>
      )}
      {tab === "qq" && (
        <>
          <QQConnection {...props} />
          <Panel title="群成员、拍一拍与问题反馈">
            <ConfigForm {...props} pages={["chat-social"]} />
          </Panel>
        </>
      )}
      {tab === "bili" && <BiliConnection {...props} view={undefined} />}
    </div>
  );
}
