import { useState } from "react";
import { api, json, type Memory } from "./types";
import { Panel, Badge, Disclosure, Select } from "./components";
import { useResource, type PageProps } from "./main";
type Status = {
  counts: { total: number; archived: number; links: number };
  archived: { id: string; title: string; revision: number; reason: string }[];
};
type Conflict = {
  id: string;
  error?: string;
  title: string;
  content: string;
  revision: number;
  fileHash: string;
  before: { title: string; content: string };
  changed: boolean;
  warning: string;
};
export function MemoryWorkshop(props: PageProps & { sync?: boolean }) {
  const base = `/api/characters/${props.character.id}`,
    root = `${base}/memory-workshop`;
  const { data } = useResource<Status>(root, props.version);
  const { data: memories } = useResource<Memory[]>(
    `${base}/memories?limit=500`,
    props.version,
  );
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(""),
    [error, setError] = useState("");
  const [selected, setSelected] = useState(""),
    [reason, setReason] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [topics, setTopics] = useState<
    {
      source: string;
      target: string;
      sourceTitle: string;
      targetTitle: string;
      evidence: string[];
      weight: number;
    }[]
  >([]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setResult("");
    try {
      await task();
      props.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="settings-stack">
      <Panel
        title={props.sync ? "双链同源，修改有据" : "整理往事，保留来处"}
        aside={<Badge>{data?.counts.total ?? 0} 段原文</Badge>}
      >
        <p>
          {props.sync
            ? "星图与 Obsidian 使用同一份关系。显式关系直接投影，语义关系达到设置的强度后投影；外部修改先比较再导入，旧版本保存在审计记录里"
            : "归档只移出日常召回与星图，正文仍在原库，可随时恢复。索引重建与主题建议不调用云端模型"}
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {result && <p role="status">{result}</p>}
        <div className="button-row">
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await api(`${root}/reindex`, { method: "POST" });
                setResult("全文索引已重建并通过完整性检查");
              })
            }
          >
            重织星图
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const value = await api<{ conflicts: Conflict[] }>(
                  `${root}/sync`,
                  { method: "POST" },
                );
                setConflicts(value.conflicts);
                setResult("已补充同步队列；外部改动保留待合并");
              })
            }
          >
            补笺校卷
          </button>
          {!props.sync && (
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const value = await api<{
                    suggestions: typeof topics;
                    scanned: number;
                  }>(`${root}/topics`);
                  setTopics(value.suggestions);
                  setResult(
                    `已分析 ${value.scanned} 条记录，关联建议需逐条确认`,
                  );
                })
              }
            >
              循意牵星
            </button>
          )}
        </div>
        {conflicts.map((item) => (
          <Disclosure
            key={item.id}
            title={
              item.error
                ? `待检查笔记 · ${item.id.slice(0, 8)}`
                : `外部改动 · ${item.title}`
            }
          >
            {item.error ? (
              <p role="alert">{item.error}</p>
            ) : (
              <>
                <p>{item.warning}</p>
                <div className="merge-comparison">
                  <label className="field">
                    阁中原笺
                    <textarea readOnly rows={8} value={item.before.content} />
                  </label>
                  <label className="field">
                    双笺此卷
                    <textarea readOnly rows={8} value={item.content} />
                  </label>
                </div>
                <button
                  className="primary"
                  disabled={busy || !item.changed}
                  onClick={() =>
                    run(async () => {
                      await api(`${root}/import`, {
                        method: "POST",
                        body: json({
                          id: item.id,
                          revision: item.revision,
                          fileHash: item.fileHash,
                        }),
                      });
                      setConflicts((current) =>
                        current.filter((value) => value.id !== item.id),
                      );
                      setResult("已导入并保留库内旧正文，双链同步已重新入队");
                    })
                  }
                >
                  择此笺文
                </button>
              </>
            )}
          </Disclosure>
        ))}
        {topics.map((item) => (
          <div
            className="topic-suggestion"
            key={`${item.source}:${item.target}`}
          >
            <div>
              <strong>
                {item.sourceTitle} ↔ {item.targetTitle}
              </strong>
              <small>
                共同标题词：{item.evidence.join("、")} · 建议强度{" "}
                {item.weight.toFixed(2)}
              </small>
            </div>
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api(`${base}/links`, {
                    method: "POST",
                    body: json({
                      source: item.source,
                      target: item.target,
                      kind: "semantic",
                      weight: item.weight,
                    }),
                  });
                  setTopics((current) =>
                    current.filter((value) => value !== item),
                  );
                  setResult("关联已保存，星图与笔记使用同一关系");
                })
              }
            >
              牵起星线
            </button>
          </div>
        ))}
      </Panel>
      {!props.sync && (
        <Panel title="暂藏星光 · 可恢复归档">
          <p>
            适合重复、暂时无关或已经失效的记忆。长期锚点也须由你明确选择后才归档，不批量清空记忆
          </p>
          <Select
            label="要归档的记忆"
            value={selected}
            onChange={setSelected}
            options={[
              { value: "", label: "选择记忆" },
              ...(memories || []).map((item) => ({
                value: item.id,
                label: item.title,
              })),
            ]}
          />
          <label className="field">
            藏星缘由
            <input
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button
            disabled={busy || !selected || !reason.trim()}
            onClick={() =>
              run(async () => {
                const memory = memories?.find((item) => item.id === selected);
                if (!memory) return;
                await api(`${root}/archive`, {
                  method: "POST",
                  body: json({
                    id: memory.id,
                    revision: memory.revision,
                    reason,
                  }),
                });
                setSelected("");
                setReason("");
                setResult("已归档，原文保留，可在下方恢复");
              })
            }
          >
            暂藏此星
          </button>
          <Disclosure title={`归档中的记忆 · ${data?.archived.length ?? 0}`}>
            {data?.archived.map((item) => (
              <div className="topic-suggestion" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.reason}</small>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(`${root}/archive`, {
                        method: "POST",
                        body: json({
                          id: item.id,
                          revision: item.revision,
                          reason: "管理员恢复归档",
                          restore: true,
                        }),
                      });
                      setResult("已恢复到召回与星图");
                    })
                  }
                >
                  星光归来
                </button>
              </div>
            ))}
          </Disclosure>
        </Panel>
      )}
    </div>
  );
}
