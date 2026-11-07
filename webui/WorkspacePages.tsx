import { useMemo, useState } from "react";
import { ArrowDown, ArrowUpRight, Search } from "lucide-react";
import { Panel, Badge, Disclosure, TextLink, Tabs } from "./components";
import { ConfigForm, CharacterPage, MediaPage, MaintenancePage } from "./pages";
import { ChatSettings as StarrChat } from "./ChatSettings";
import { BiliConnection } from "./BiliConnection";
import { MemoryJobs } from "./MemoryJobs";
import { LegacyConfiguration } from "./LegacyConfiguration";
import { OrganismPage } from "./OrganismPage";
import { navigation, workspaces, commonPages, fieldRoute } from "./navigation";
import type { PageProps } from "./main";
import { MemoryWorkshop } from "./MemoryWorkshop";
import { PlatformBridge } from "./PlatformBridge";
import { InteractionPage } from "./InteractionPage";
import { Today } from "./Today";

const relations: Record<string, [string, string][]> = {
  character: [
    ["chat-rules", "说话方式与接续设置"],
    ["state", "此刻情绪与体感"],
  ],
  "memory-care": [
    ["memory", "回到记忆星图"],
    ["memory-care", "日记与笔记设置"],
  ],
  "chat-context": [
    ["character", "编辑人设与提示词"],
    ["chat-sharing", "管理可见记忆"],
  ],
  "chat-rules": [
    ["qq", "QQ 连接与对象"],
    ["bili", "B站连接与对象"],
    ["intentions", "主动目的与节律"],
  ],
  "chat-sharing": [
    ["memory", "查看记忆全文"],
    ["chat-rules", "记忆召回与接续设置"],
  ],
  qq: [
    ["chat-rules", "唤醒与回复节奏"],
    ["bridge", "跨平台分享"],
  ],
  bili: [
    ["bili-activities", "浏览与兴趣"],
    ["bili-publish", "动态与平台操作"],
  ],
  "bili-activities": [
    ["bili", "账号与通道"],
    ["bridge", "分享到 QQ"],
  ],
  "bili-publish": [
    ["bili", "账号与权限"],
    ["bridge", "同步到 QQ"],
  ],
  media: [
    ["qq", "QQ 语音发送授权"],
    ["hearing", "语音识别"],
  ],
};
export function RelatedRoutes({
  page,
  go,
}: {
  page: string;
  go: PageProps["go"];
}) {
  const items = relations[page];
  return items ? (
    <nav className="related-routes" aria-label="关联功能">
      <span>相关功能</span>
      {items.map(([id, label]) => (
        <button key={id} onClick={() => go(id)} title={label}>
          {navigation.find((item) => item.id === id)?.label || label}
          <ArrowUpRight size={13} />
        </button>
      ))}
    </nav>
  ) : null;
}

export function FunctionIndex(props: PageProps) {
  const [query, setQuery] = useState("");
  const tasks = [
    {
      page: "qq",
      title: "她没有收到或回复 QQ 消息",
      words: "没反应 不回复 不回应 收不到 群聊 连接 断线",
    },
    {
      page: "intentions",
      title: "让她主动聊天、参与群聊",
      words: "主动 主动性 无聊 找事 自主 群里",
    },
    {
      page: "chat-sharing",
      title: "换会话以后仍记得我们的相处",
      words: "忘记 记住 习惯 成长 new 私聊群聊 互通 共享",
    },
    {
      page: "chat-rules",
      title: "分段回复，回复后继续接听",
      words: "分段 一条一条 等待 接听 消息 太长",
    },
    {
      page: "memory-care",
      title: "设置日记时间与记忆保存",
      words: "日记 笔记 定时 记忆 保存 整理 同步",
    },
    {
      page: "appearance",
      title: "调整画面，减少卡顿",
      words: "卡顿 模糊 看不清 性能 动效 背景 字体",
    },
  ];
  const taskResults = query.trim()
    ? tasks.filter((task) => {
        const text = query.trim().toLowerCase();
        return (
          `${task.title} ${task.words}`.includes(text) ||
          task.words.split(" ").some((word) => text.includes(word))
        );
      })
    : tasks;
  const results = useMemo(
    () =>
      props.bootstrap.fields
        .filter((field) => field.page !== "retired")
        .filter((field) =>
          `${field.label} ${field.page} ${field.help} ${field.key}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        ),
    [props.bootstrap.fields, query],
  );
  return (
    <div className="settings-stack">
      <Panel title="全部功能与配置">
        <p>搜索想做的事，或选择下方常用入口。日常设置在对应功能页直接修改。</p>
        <label className="search-box function-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索功能、配置名或字段，例如：提示词、扫码、日记"
            aria-label="搜索全部功能配置"
          />
        </label>
        <div className="quick-routes">
          {taskResults.map((task) => (
            <button
              key={task.page}
              className="ghost"
              onClick={() => props.go(task.page)}
            >
              {task.title}
            </button>
          ))}
        </div>
        {query ? (
          <div className="function-results">
            {results.map((field) => (
              <button
                key={field.key}
                className="function-result"
                onClick={() => {
                  sessionStorage.setItem(
                    `starr-config-focus:${props.character.id}`,
                    field.key,
                  );
                  props.go(fieldRoute(field.page));
                }}
              >
                <div>
                  <strong title={field.label}>{field.label}</strong>
                  <small>{field.help}</small>
                </div>
                <span>
                  {
                    navigation.find(
                      (item) => item.id === fieldRoute(field.page),
                    )?.label
                  }
                  <ArrowUpRight size={13} />
                </span>
              </button>
            ))}
            {!results.length && !taskResults.length && (
              <p>
                没有找到匹配设置。试试“群聊”“主动聊天”“记住习惯”或“日记”等说法。
              </p>
            )}
          </div>
        ) : (
          <div className="function-groups">
            {workspaces
              .filter((workspace) => workspace.id !== "home")
              .map((workspace) => (
                <section key={workspace.id}>
                  <h3>{workspace.label}</h3>
                  <p>{workspace.caption}</p>
                  {navigation
                    .filter((item) => workspace.primary.includes(item.id))
                    .map((item) => (
                      <button key={item.id} onClick={() => props.go(item.id)}>
                        <item.icon size={16} />
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.purpose}</small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                </section>
              ))}
          </div>
        )}
      </Panel>
      <Panel title="通用设置">
        <div className="quick-routes">
          {commonPages
            .filter((id) => id !== "settings")
            .map((id) => (
              <button className="ghost" key={id} onClick={() => props.go(id)}>
                {navigation.find((item) => item.id === id)?.label}
              </button>
            ))}
        </div>
      </Panel>
    </div>
  );
}

function BiliWorkspace(props: PageProps & { page: string }) {
  const view =
    props.page === "bili-activities"
      ? "activities"
      : props.page === "bili-publish"
        ? "publish"
        : "connection";
  return (
    <div className="settings-stack">
      <Tabs
        value={view}
        onChange={(next) =>
          props.go(
            next === "activities"
              ? "bili-activities"
              : next === "publish"
                ? "bili-publish"
                : "bili",
          )
        }
        items={[
          { id: "connection", name: "账号与接收消息" },
          { id: "activities", name: "浏览与分享" },
          { id: "publish", name: "发布与互动" },
        ]}
      />
      <BiliConnection {...props} view={view} />
    </div>
  );
}
export function WorkspacePage(props: PageProps & { page: string }) {
  const { page } = props;
  if (page === "qq")
    return (
      <div className="settings-stack">
        <InteractionPage {...props} page={page} />
        <Panel title="群内自主参与">
          <ConfigForm
            {...props}
            pages={["agency"]}
            onlyKeys={["agency.observeGroups", "agency.groupEnabled"]}
          />
        </Panel>
      </div>
    );
  if (page === "character") return <CharacterPage {...props} />;
  if (
    [
      "conversation",
      "chat-context",
      "chat-rules",
      "chat-sharing",
      "qq",
    ].includes(page)
  )
    return (
      <StarrChat
        {...props}
        view={
          (
            {
              conversation: "sessions",
              "chat-context": "context",
              "chat-rules": "rules",
              "chat-sharing": "memory",
              qq: "qq",
            } as Record<string, string>
          )[page]
        }
        channel={page === "conversation" ? "external" : undefined}
      />
    );
  if (["bili", "bili-activities", "bili-publish"].includes(page))
    return <BiliWorkspace {...props} page={page} />;
  if (["media", "hearing", "vision", "singing"].includes(page))
    return (
      <MediaPage
        {...props}
        view={
          (
            {
              media: "tts",
              hearing: "asr",
              vision: "vision",
              singing: "sing",
            } as Record<string, string>
          )[page]
        }
      />
    );
  if (page === "intentions")
    return (
      <div className="settings-stack">
        <Panel title="自主行为设置">
          <ConfigForm {...props} pages={["state", "agency"]} />
        </Panel>
        <Today {...props} />
        <OrganismPage {...props} view="goals" />
      </div>
    );
  if (page === "memory-care")
    return (
      <div className="settings-stack">
        <Panel title="记忆保存设置">
          <ConfigForm {...props} pages={["memory"]} />
        </Panel>
        <MemoryJobs {...props} />
        <Disclosure title="笔记同步、归档与恢复">
          <MemoryWorkshop {...props} />
        </Disclosure>
      </div>
    );

  if (page === "bridge") return <PlatformBridge {...props} />;
  if (page === "maintenance") return <MaintenancePage {...props} />;
  if (page === "appearance")
    return (
      <Panel title="外观设置">
        <p>
          性能档位、背景星光与局部玻璃统一管理。减少动态时停止持续运动，页面切换复用场景
        </p>
        <ConfigForm {...props} pages={["appearance"]} />
      </Panel>
    );
  if (page === "permissions")
    return (
      <Panel title="角色权限设置">
        <ConfigForm {...props} pages={["permissions"]} />
        <Disclosure title="角色可自行调整的日常习惯">
          <ul>
            {props.bootstrap.fields
              .filter((field) => field.bot)
              .map((field) => (
                <li key={field.key} title={field.label}>
                  {field.label}
                </li>
              ))}
          </ul>
          <p>调整幅度、修订号与权限均由服务端检查，每次写入审计</p>
        </Disclosure>
      </Panel>
    );
  if (page === "legacy")
    return (
      <Panel title="旧版功能对照">
        <LegacyConfiguration go={props.go} />
      </Panel>
    );
  return <FunctionIndex {...props} />;
}
