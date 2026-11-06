import { useState } from "react";
import { api, json } from "./types";
import { Panel, Badge, Disclosure, Select } from "./components";
import { ConfigForm } from "./pages";
import { useResource, type PageProps } from "./main";
const kinds = [
  { value: "diaryDay", label: "朝光入笺" },
  { value: "diaryNight", label: "夜语成笺" },
  { value: "organize", label: "拾光成册" },
  { value: "weekly", label: "七日回眸" },
  { value: "monthly", label: "月满回眸" },
  { value: "yearly", label: "经年回眸" },
  { value: "backup", label: "藏星入阁" },
  { value: "projection", label: "双笺补光" },
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
    [kind, setKind] = useState("projection"),
    [busy, setBusy] = useState(false);
  return (
    <Panel
      title="重要的当下保存，零散的日后整理"
      aside={
        <Badge>
          {data?.running
            ? `${data.running} 项执行中`
            : data?.hostReady
              ? "调度已接入"
              : "需在 DSH 内运行"}
        </Badge>
      }
    >
      <p>
        记忆写入工具会立即提交原文；这里负责定时日记、回顾、备份和笔记补漏。日记与整理会调用单独的
        DSH 模型会话，并检查记忆确实落盘；不会把模型最终回复误当成已保存
      </p>
      <p>
        整理任务遵循记忆可见范围，不能从别人的私聊中拼接资料。原文和外部修改过的笔记会保留，冲突在维护页显示
      </p>
      {error && <p className="inline-error">{error}</p>}
      {data?.configurationError && (
        <p role="alert" className="inline-error">
          {data.configurationError}
        </p>
      )}
      <Disclosure title="拾光执笔者">
        <ConfigForm {...props} pages={["memory-jobs"]} />
      </Disclosure>
      {kinds.map((item) => (
        <Disclosure key={item.value} title={item.label}>
          <ConfigForm {...props} pages={[`memory-job-${item.value}`]} />
        </Disclosure>
      ))}
      <div className="form-footer">
        <Select
          value={kind}
          onChange={setKind}
          options={kinds}
          label="此刻落笔"
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
          {busy ? "落笔未歇…" : "此刻落笔一回"}
        </button>
      </div>
      <Disclosure title="近来星程">
        {data?.recent.map((row) => (
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
