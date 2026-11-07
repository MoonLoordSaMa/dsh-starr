import { useEffect, useState } from "react";
import { api, json, date } from "./types";
import { Panel, Badge, Disclosure, Select } from "./components";
import { useResource, type PageProps } from "./main";

type TodayData = {
  day: string;
  timezone: string;
  counts: { memories: number; diary: number; proactive: number };
  usage: {
    tokens: number;
    estimatedCostCNY: number;
    requests: number;
    missingUsage: number;
  };
  limits: { decisions: number; actions: number; tokens: number };
  agency: {
    hostReady: boolean;
    paused: boolean;
    level: string;
    blockers: string[];
    counters: {
      decisions: number;
      actions: number;
      tokens: number;
      missingUsage: number;
    };
  };
  events: {
    id: string;
    time: number;
    kind: string;
    title: string;
    status: string;
    reason: string;
    detail: string;
  }[];
};
const states: Record<string, string> = {
  sent: "已发送",
  done: "已完成",
  silent: "选择安静",
  skipped: "这次略过",
  saved: "已保存",
  failed: "需要处理",
  uncertain: "结果待核对",
  running: "进行中",
  cancelled: "已停止",
  recovered: "已恢复记录",
  sending: "发送待确认",
  accepted: "平台已受理",
};
export function Today(props: PageProps & { compact?: boolean }) {
  const { character, version, refresh, notify, compact } = props,
    root = `/api/characters/${character.id}`;
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setPulse((v) => v + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [character.id]);
  const { data, error } = useResource<TodayData>(
    `${root}/today`,
    version + pulse,
  );
  const [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<{
      goal: { title: string } | null;
      blockers: string[];
      target: string;
    } | null>(null);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = (patch: Record<string, unknown>) =>
    run(async () => {
      await api(`${root}/config`, {
        method: "PATCH",
        body: json({ patch, revision: character.revision }),
      });
    });
  return (
    <Panel title="她今天做了什么">
      {error && <p className="inline-error">{error}</p>}
      {data && (
        <>
          <p>
            {data.day} · {data.timezone}。留下 {data.counts.memories}{" "}
            段记忆，写了 {data.counts.diary} 篇日记，主动发言{" "}
            {data.counts.proactive} 次
          </p>
          <p className="footnote">
            近24小时：{data.usage.tokens.toLocaleString()} 个模型令牌 · 估算 ¥
            {data.usage.estimatedCostCNY.toFixed(3)} · {data.usage.requests}{" "}
            次已报告模型请求
            {data.usage.missingUsage
              ? ` · ${data.usage.missingUsage} 次用量未知`
              : ""}
            。这是宿主上报的会话用量估算，不等同服务商账单；媒体服务另计
          </p>
          <div className="form-footer">
            <Badge>
              {data.agency.paused
                ? "后台主动活动已暂停"
                : data.agency.level === "observe" ||
                    !character.config["agency.enabled"]
                  ? "只观察，等你开口"
                  : "按授权寻找合适时机"}
            </Badge>
            <button
              className="ghost"
              disabled={busy || data.agency.paused}
              onClick={() =>
                run(async () => {
                  await api(`${root}/agency/pause`, {
                    method: "POST",
                    body: json({}),
                  });
                  notify("已暂停后台主动活动，普通聊天仍按会话设置处理");
                })
              }
            >
              一键暂停主动活动
            </button>
          </div>
          {!compact && (
            <>
              <p>
                当前阻塞：
                {data.agency.blockers.join("；") || "无，可由角色自行判断"}
              </p>
              <div className="button-row">
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() => save({ "agency.paused": !data.agency.paused })}
                >
                  {data.agency.paused ? "恢复自主活动" : "暂停自主活动"}
                </button>
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(root + "/agency/reset", {
                        method: "POST",
                        body: json({}),
                      });
                      notify("已确认故障记录，未知外发不会重试");
                    })
                  }
                >
                  确认故障已处理
                </button>
              </div>
            </>
          )}
          <Disclosure title="最近活动" initialOpen>
            {!data.events.length && (
              <p>今天还没有后台行动与新记忆；安静也会留在主动评估记录里</p>
            )}
            {data.events.slice(0, compact ? 3 : 5).map((event) => (
              <div className="job-error" key={`${event.kind}:${event.id}`}>
                <small>
                  {date(new Date(event.time).toISOString())} · {event.kind}
                </small>
                <strong>{event.title}</strong>
                <Badge>{states[event.status] || event.status}</Badge>
                <p>{event.reason}</p>
                {event.detail && <small>{event.detail}</small>}
              </div>
            ))}
          </Disclosure>
        </>
      )}
    </Panel>
  );
}
