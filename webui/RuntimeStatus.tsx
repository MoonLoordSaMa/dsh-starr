import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { api, type State } from "./types";
import type { PageProps } from "./main";

export type RuntimeItem = {
  id: string;
  label: string;
  page: string;
  status: string;
  text: string;
  detail: string;
  checkedAt: string | null;
};
export type Dashboard = {
  characterId: string;
  checkedAt: string;
  items: RuntimeItem[];
  state: State;
  listening: { seconds: number; deadlineAt: number }[];
  memory: {
    count: number | null;
    recent: {
      id: string;
      title: string;
      kind: string;
      created: string;
      preview: string;
    }[];
    retained: {
      id: string;
      title: string;
      content: string;
      revision: number;
      created: string;
    }[];
    changes: {
      id: string;
      memoryId: string;
      title: string;
      reason: string;
      revision: number;
      created: string;
    }[];
  };
  attention: RuntimeItem[];
  recent: {
    id: string;
    time: number;
    kind: string;
    title: string;
    status: string;
    detail: string;
  }[];
};
export function useDashboard(characterId: string, version: number) {
  const [result, setResult] = useState<{
    id: string;
    data: Dashboard | null;
    error: string;
  }>({ id: "", data: null, error: "" });
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    let controller: AbortController | null = null;
    let busy = false;
    const load = async () => {
      if (document.hidden || busy) return;
      busy = true;
      controller = new AbortController();
      const request = controller;
      const timeout = setTimeout(() => request.abort(), 10000);
      try {
        const data = await api<Dashboard>(
          `/api/characters/${characterId}/dashboard`,
          { signal: request.signal },
        );
        if (!request.signal.aborted)
          setResult({ id: characterId, data, error: "" });
      } catch {
        if (controller === request)
          setResult((previous) => ({
            id: characterId,
            data: previous.id === characterId ? previous.data : null,
            error: "状态刷新失败；如有旧数据，以下显示上次成功读取的状态。",
          }));
      } finally {
        clearTimeout(timeout);
        busy = false;
      }
    };
    void load();
    const timer = setInterval(load, 20000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      controller?.abort();
      controller = null;
    };
  }, [characterId, version, pulse]);
  return {
    data: result.id === characterId ? result.data : null,
    error: result.id === characterId ? result.error : "",
    retry: () => setPulse((v) => v + 1),
  };
}
export function StatusCards({
  items,
  go,
}: {
  items: RuntimeItem[];
  go: PageProps["go"];
}) {
  return (
    <div className="runtime-cards">
      {items.map((item) => (
        <button
          key={item.id}
          className="runtime-card"
          data-status={item.status}
          onClick={() => go(item.page)}
        >
          <span className="runtime-card-heading">
            <strong>{item.label}</strong>
            <ArrowUpRight size={14} />
          </span>
          <span className="runtime-value">
            <i />
            {item.text}
          </span>
          <small>{item.detail}</small>
          {item.checkedAt && (
            <time dateTime={item.checkedAt}>
              最近回执{" "}
              {new Date(item.checkedAt).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          )}
        </button>
      ))}
    </div>
  );
}
export function RuntimeStatus(props: PageProps & { page: string }) {
  const { data, error, retry } = useDashboard(
    props.character.id,
    props.version,
  );
  const items = data?.items.filter((item) => item.page === props.page) || [];
  if (!items.length && !error && data) return null;
  return (
    <section
      className="function-status"
      aria-label="当前功能状态"
      data-stale={!!error}
    >
      <div className="runtime-caption">
        <span>{error || (data ? "当前运行状态" : "正在读取运行状态…")}</span>
        <button
          className="text-link"
          onClick={retry}
          aria-label="重新读取运行状态"
        >
          <RefreshCw size={13} />
          刷新
        </button>
      </div>
      {data && <StatusCards items={items} go={props.go} />}
    </section>
  );
}
