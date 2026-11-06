import { ArrowUpRight, MessageCircle, Sparkles } from "lucide-react";
import { useResource } from "./main";
import { date, type Overview as OverviewData } from "./types";
import type { PageProps } from "./main";

type Snapshot = {
  day: string;
  counts: { memories: number; diary: number; proactive: number };
  agency: { level: string; paused: boolean; blockers: string[] };
};
type Session = {
  session_id: string;
  platform: string;
  type: string;
  title: string;
  updated: string;
  paused: number;
};

export function CompanionOverview(props: PageProps) {
  const { character, overview, version, go } = props;
  const { data: today } = useResource<Snapshot>(
    `/api/characters/${character.id}/today`,
    version,
  );
  const { data: sessions } = useResource<Session[]>(
    `/api/characters/${character.id}/chats`,
    version,
  );
  const recent =
    sessions
      ?.filter((item) => !item.session_id.startsWith("session-starr-job-"))
      .slice(0, 4) || [];
  const waiting = overview.goals.filter((goal) => goal.status === "waiting");
  return (
    <section className="companion-overview" aria-label="角色近况">
      <div className="companion-status">
        <span className="eyebrow">她的近况</span>
        <h2>{character.name}</h2>
        <p>
          <Sparkles size={15} />
          {overview.state.emotion || "状态还在慢慢形成"}
        </p>
        <span className="companion-note">
          {today
            ? `${today.counts.memories} 段记忆 · ${today.counts.diary} 篇日记 · ${today.counts.proactive} 次主动行动`
            : `${overview.counts.memories} 段记忆 · ${waiting.length} 个约定`}{" "}
          ·{" "}
          {today?.agency.paused
            ? "主动活动已暂停"
            : today?.agency.blockers.length
              ? "正在观察"
              : "按现有授权生活"}
        </span>
      </div>
      <div className="companion-intentions">
        <span className="eyebrow">正在期待</span>
        {waiting.slice(0, 2).map((goal) => (
          <button key={goal.id} onClick={() => go("intentions")}>
            <strong>{goal.title}</strong>
            <ArrowUpRight size={14} />
          </button>
        ))}
        {!waiting.length && <p>还没有待完成的约定。</p>}
        <button
          className="companion-text-link"
          onClick={() => go("intentions")}
        >
          打开她的愿望
        </button>
      </div>
      <div className="companion-sessions">
        <span className="eyebrow">最近相逢</span>
        {recent.length ? (
          recent.map((session) => (
            <button
              key={session.session_id}
              onClick={() =>
                go(
                  session.platform === "web"
                    ? "host-chat"
                    : session.platform === "qq"
                      ? session.type === "group"
                        ? "qq-group"
                        : "qq-private"
                      : "conversation",
                )
              }
            >
              <MessageCircle size={14} />
              <span>
                <strong>{session.title}</strong>
                <small>
                  {session.platform === "web"
                    ? "DSH 宿主"
                    : session.platform === "qq"
                      ? "QQ"
                      : "B站"}{" "}
                  · {date(session.updated)}
                </small>
              </span>
              <ArrowUpRight size={13} />
            </button>
          ))
        ) : (
          <p>发生新的交流后，会显示在这里。</p>
        )}
        <button className="companion-text-link" onClick={() => go("host-chat")}>
          灯下续语
        </button>
      </div>
    </section>
  );
}
