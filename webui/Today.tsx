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
            段记忆，写了 {data.counts.diary} 篇日记，主动私聊{" "}
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
              万籁暂歇
            </button>
          </div>
          {!compact && (
            <>
              <Select
                label="主动范围 · 仅管理员可改"
                value={String(character.config["agency.level"] || "observe")}
                onChange={(value) => {
                  if (
                    value !== "observe" &&
                    !confirm(
                      "开启所选主动范围？仍受次数、安静时段和平台独立授权约束；公开发言可能影响账号，请先使用主人私聊范围观察",
                    )
                  )
                    return;
                  save({ "agency.level": value });
                }}
                options={[
                  { value: "observe", label: "L0 · 只观察" },
                  { value: "owner", label: "L1 · 主人的QQ私聊" },
                  { value: "browse", label: "L2 · 加上已授权的公开资料浏览" },
                  { value: "social", label: "L3 · 加上逐项授权的B站社交" },
                ]}
              />
              <div className="form-footer">
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() =>
                    save({
                      "agency.enabled": !character.config["agency.enabled"],
                    })
                  }
                >
                  {character.config["agency.enabled"] ? "心愿暂歇" : "心愿启程"}
                </button>
                {data.agency.paused && (
                  <button
                    className="ghost"
                    disabled={busy}
                    onClick={() => save({ "agency.paused": false })}
                  >
                    万籁复苏
                  </button>
                )}
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      setPreview(await api(`${root}/agency/preview`));
                    })
                  }
                >
                  试问星机
                </button>
                <button
                  className="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(`${root}/agency/reset`, {
                        method: "POST",
                        body: json({}),
                      });
                      notify("已确认失败记录；不清除额度，也不重试未知外发");
                    })
                  }
                >
                  风波已平
                </button>
              </div>
              <p className="footnote">
                管理命令、凭据、屏幕和摄像头不进入后台主动范围。权限与预算不会随范围选择自动打开，角色也不能替自己放权
              </p>
              <p>
                目的执行预算：已评估 {data.agency.counters.decisions}/
                {data.limits.decisions} 轮，已尝试外发{" "}
                {data.agency.counters.actions}/{data.limits.actions} 次，已用{" "}
                {data.agency.counters.tokens}/{data.limits.tokens} 个令牌
              </p>
              {data.agency.blockers.length ? (
                <p>现在安静的原因：{data.agency.blockers.join("；")}</p>
              ) : (
                <p>当前条件允许评估，仍可选择安静</p>
              )}
              {preview && (
                <div className="job-error" role="status">
                  <strong>
                    预演：{preview.goal?.title || "暂时没有需要行动的目的"}
                  </strong>
                  <p>
                    {preview.target}；
                    {preview.blockers.length
                      ? preview.blockers.join("；")
                      : "条件允许，下个调度周期再评估"}
                  </p>
                  <small>预演只读，不调用模型或发送消息</small>
                </div>
              )}
            </>
          )}
          <Disclosure
            title={`今日时间线 · ${data.events.length} 项`}
            initialOpen={!compact}
          >
            {!data.events.length && (
              <p>今天还没有后台行动与新记忆；安静也会留在主动评估记录里</p>
            )}
            {data.events.slice(0, compact ? 8 : 80).map((event) => (
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
