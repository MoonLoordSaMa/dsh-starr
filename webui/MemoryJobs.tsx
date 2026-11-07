import { useState } from "react";
import { api, json } from "./types";
import { Panel, Badge, Disclosure, Select } from "./components";
import { ConfigForm } from "./pages";
import { useResource, type PageProps } from "./main";
const kinds = [
  { value: "diaryDay", label: "白天日记" },
  { value: "diaryNight", label: "晚间日记" },
  { value: "backup", label: "角色备份" },
  { value: "projection", label: "笔记同步" },
];
type Status = {
  hostReady: boolean;
  running: number;
  configurationError: string | null;
  recent: {
    id: string;
    kind: string;
    slot: string;
    status: string;
    error: string | null;
    result: string | null;
    created: number;
  }[];
};
const names: Record<string, string> = {
  running: "正在执行",
  done: "已完成",
  failed: "需要处理",
  interrupted: "执行曾中断",
};
function resultText(raw: string) {
  try {
    const value = JSON.parse(raw);
    if (value.recordId)
      return `已保存记忆${value.title ? ` · ${value.title}` : ""}`;
    if (value.path) return "备份已保存，可在维护页核对";
    if (typeof value.completed === "number")
      return `已完成 ${value.completed} 项笔记同步`;
  } catch {}
  return "任务结果已记录";
}
export function MemoryJobs(props: PageProps) {
  const root = `/api/characters/${props.character.id}/jobs`,
    { data, error } = useResource<Status>(root, props.version),
    [kind, setKind] = useState("diaryNight"),
    [busy, setBusy] = useState(false);
  return (
    <Panel
      title="日记与自动维护"
      aside={
        <Badge>
          {data?.running
            ? `${data.running} 项执行中`
            : data?.hostReady
              ? "已接入"
              : "需在 DSH 内运行"}
        </Badge>
      }
    >
      <p>
        日记按你选择的时间写下当天经历。其他笔记由她自己取舍和修订，不再生成固定周报、月报或年报。
      </p>
      <p>日记原文保留；同步和备份不调用模型。</p>
      {error && <p className="inline-error">{error}</p>}
      {data?.configurationError && (
        <p role="alert" className="inline-error">
          {data.configurationError}
        </p>
      )}
      <section>
        <h3>日记模型</h3>
        <ConfigForm {...props} pages={["memory-jobs"]} />
      </section>
      {kinds
        .filter((item) => item.value.startsWith("diary"))
        .map((item) => (
          <section key={item.value}>
            <h3>{item.label}</h3>
            <ConfigForm {...props} pages={[`memory-job-${item.value}`]} />
          </section>
        ))}
      <Disclosure title="自动备份与同步">
        {kinds
          .filter((item) => !item.value.startsWith("diary"))
          .map((item) => (
            <section key={item.value}>
              <h3>{item.label}</h3>
              <ConfigForm {...props} pages={[`memory-job-${item.value}`]} />
            </section>
          ))}
      </Disclosure>
      <div className="form-footer">
        <Select
          value={kind}
          onChange={setKind}
          options={kinds}
          label="立即执行的任务"
        />
        <button
          className="ghost"
          disabled={busy || !data?.hostReady}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`${root}/run`, {
                method: "POST",
                body: json({ kind }),
              });
              props.notify("任务完成，结果已写入任务记录");
              props.refresh();
            } catch (error) {
              props.notify((error as Error).message);
              props.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "保存中…" : "立即执行一次"}
        </button>
      </div>
      <Disclosure title="最近的任务记录">
        {data?.recent.slice(0, 5).map((row) => (
          <div className="job-error" key={row.id}>
            <strong>
              {kinds.find((item) => item.value === row.kind)?.label} ·{" "}
              {names[row.status] || row.status}
            </strong>
            <small>
              {row.slot.startsWith("manual-")
                ? `手动执行 · ${new Date(row.created).toLocaleString("zh-CN")}`
                : row.slot}
            </small>
            {row.error && <p>{row.error}</p>}
            {row.result && <p className="footnote">{resultText(row.result)}</p>}
          </div>
        ))}
      </Disclosure>
    </Panel>
  );
}
