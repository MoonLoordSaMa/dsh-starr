import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "./types";
import { Badge, Disclosure, Select, TextLink } from "./components";
import type { PageProps } from "./main";
import "./chat.css";
import { fieldRoute } from "./navigation";

type Entry = {
  id: string;
  scope: string;
  key: string;
  label: string;
  group: string;
  status: string;
  note: string;
  target: { key: string; page: string } | null;
};
type Catalog = {
  registeredCount: number;
  declarationCount: number;
  notice: string;
  entries: Entry[];
  supplemental: { id: string; key: string; label: string; decision: string }[];
  capabilities: {
    kind: string;
    name: string;
    decision: string;
    status: string;
    target?: { page: string; entry: string; note: string } | null;
  }[];
};
const statusNames: Record<string, string> = {
  mapped: "已归并配置",
  host: "交由 DSH 管理",
  retired: "已退役机制",
  planned: "能力待接入",
};
export function LegacyConfiguration({ go }: Pick<PageProps, "go">) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [count, setCount] = useState(60);
  useEffect(() => {
    const abort = new AbortController();
    api<Catalog>("/api/configuration/catalog", { signal: abort.signal })
      .then(setCatalog)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, []);
  const match = (text: string) =>
    text.toLowerCase().includes(query.toLowerCase());
  const entries =
    catalog?.entries.filter(
      (e) =>
        (status === "all" || e.status === status) &&
        match(`${e.scope} ${e.key} ${e.label} ${e.group}`),
    ) || [];
  return (
    <div className="legacy-catalog">
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <p>{catalog?.notice || "正在载入旧版功能清单"}</p>
      <p>
        逐项保留 {catalog?.registeredCount || 411} 个旧注册字段、
        {catalog?.supplemental.length || 243} 个额外声明与{" "}
        {catalog?.capabilities.length || 140}{" "}
        项能力。可运行的字段在功能区编辑；待接入条目保留说明
      </p>
      <div className="chat-filters">
        <label className="search-box">
          <Search size={15} />
          <input
            aria-label="搜索旧版功能"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCount(60);
            }}
            placeholder="搜索旧字段、标签或分类"
          />
        </label>
        <Select
          label="旧配置状态"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setCount(60);
          }}
          options={[
            { value: "all", label: "全部状态" },
            ...Object.entries(statusNames).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        <Badge>{entries.length} 项匹配</Badge>
      </div>
      <div className="legacy-list">
        {entries.slice(0, count).map((entry) => (
          <div className="legacy-row" key={entry.id}>
            <div>
              <strong>{entry.label || entry.key}</strong>
              <small>
                {entry.scope} · {entry.group}
              </small>
              <code>{entry.key}</code>
            </div>
            <Badge>{statusNames[entry.status]}</Badge>
            <p>{entry.note}</p>
            {entry.target && (
              <TextLink onClick={() => go(fieldRoute(entry.target!.page))}>
                展读星枢 · {entry.target.key}
              </TextLink>
            )}
          </div>
        ))}
      </div>
      {entries.length > count && (
        <button className="ghost" onClick={() => setCount(count + 60)}>
          继续显示 · 还有 {entries.length - count} 项
        </button>
      )}
      <Disclosure
        title={`额外参数与声明 · ${catalog?.supplemental.length || 243} 项`}
      >
        {catalog?.supplemental
          .filter((e) => match(`${e.key} ${e.label}`))
          .map((e) => (
            <p key={e.id}>
              <code>{e.key}</code> · {e.label} · {e.decision}
            </p>
          ))}
      </Disclosure>
      <Disclosure
        title={`工具、命令与任务 · ${catalog?.capabilities.length || 140} 项`}
      >
        <p>
          这里保留旧能力盘点，是否可运行以当前工具注册和功能页为准，不代表全部完成迁移
        </p>
        {catalog?.capabilities
          .filter((e) => match(e.name))
          .map((e, i) => (
            <p key={i}>
              <code>{e.name}</code> · {e.kind} ·{" "}
              {e.target ? "已由新入口承接" : "尚待接入"}
              {e.target ? (
                <>
                  {" · "}
                  <TextLink onClick={() => go(e.target!.page)}>
                    {e.target.entry}
                  </TextLink>
                  <small>{e.target.note}</small>
                </>
              ) : (
                <small>{e.decision}</small>
              )}
            </p>
          ))}
      </Disclosure>
    </div>
  );
}
