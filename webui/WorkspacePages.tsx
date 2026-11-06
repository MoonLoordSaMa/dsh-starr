import { useMemo, useState } from "react";
import { ArrowDown, ArrowUpRight, Search } from "lucide-react";
import { Panel, Badge, Disclosure, TextLink } from "./components";
import { ConfigForm, CharacterPage, MediaPage, MaintenancePage } from "./pages";
import { StarrChat } from "./StarrChat";
import { BiliConnection } from "./BiliConnection";
import { MemoryJobs } from "./MemoryJobs";
import { LegacyConfiguration } from "./LegacyConfiguration";
import { OrganismPage } from "./OrganismPage";
import { navigation, workspaces, poems, fieldRoute } from "./navigation";
import type { PageProps } from "./main";
import { MemoryWorkshop } from "./MemoryWorkshop";
import { PlatformBridge } from "./PlatformBridge";
import { InteractionPage } from "./InteractionPage";
import { Today } from "./Today";

export function PagePrelude({ page }: { page: string }) {
  const poem = poems[page];
  const entry = navigation.find((item) => item.id === page);
  if (!poem) return null;
  return (
    <section className="page-prelude" aria-label={`${entry?.name}·诗序`}>
      <div className="prelude-index" aria-hidden="true">
        {String(navigation.findIndex((item) => item.id === page) + 1).padStart(
          2,
          "0",
        )}
      </div>
      <div className="prelude-verse">
        <h2>
          <span>{poem[0]}</span>
          <span>{poem[1]}</span>
        </h2>
        <p>
          <span>{poem[2]}</span>
          <i aria-hidden="true" />
          <strong>{entry?.label}</strong>
        </p>
      </div>
      <button
        className="prelude-continue"
        onClick={(event) => {
          const main = event.currentTarget.closest("main");
          const prelude =
            event.currentTarget.closest<HTMLElement>(".page-prelude");
          if (main && prelude)
            main.scrollTo({
              top:
                main.scrollTop +
                prelude.getBoundingClientRect().bottom -
                main.getBoundingClientRect().top -
                24,
              behavior:
                document.documentElement.dataset.motion === "reduced" ||
                matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
            });
        }}
      >
        <span>查看功能设置</span>
        <ArrowDown size={14} />
      </button>
    </section>
  );
}

const relations: Record<string, [string, string][]> = {
  character: [
    ["chat-context", "人设如何进入会话"],
    ["state", "此刻情绪与体感"],
  ],
  "memory-care": [
    ["memory", "回到记忆星图"],
    ["memory-sync", "双链与同步"],
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
    ["chat-context", "检查实际注入"],
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
          {navigation.find((item) => item.id === id)?.name || label}
          <ArrowUpRight size={13} />
        </button>
      ))}
    </nav>
  ) : null;
}

export function FunctionIndex(props: PageProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      props.bootstrap.fields
        .filter((field) =>
          `${field.label} ${field.label} ${field.help} ${field.key}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 60),
    [props.bootstrap.fields, query],
  );
  return (
    <div className="settings-stack">
      <Panel
        title="全部功能与配置"
        aside={<Badge>{props.bootstrap.fields.length} 项角色配置</Badge>}
      >
        <p>
          从功能出发寻找配置。人设影响所有角色会话；连接决定能做什么；授权决定可以对谁做；记忆共享决定哪些经历能够相通
        </p>
        <label className="search-box function-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索功能、配置名或字段，例如：提示词、扫码、日记"
            aria-label="搜索全部功能配置"
          />
        </label>
        {query ? (
          <div className="function-results">
            {results.map((field) => (
              <button
                key={field.key}
                className="function-result"
                onClick={() => props.go(fieldRoute(field.page))}
              >
                <div>
                  <strong title={field.label}>{field.label}</strong>
                  <small>{field.help}</small>
                </div>
                <span>
                  {
                    navigation.find(
                      (item) => item.id === fieldRoute(field.page),
                    )?.name
                  }
                  <ArrowUpRight size={13} />
                </span>
              </button>
            ))}
            {!results.length && (
              <p>没有找到匹配配置，试试功能名或到旧版迁入清单查看</p>
            )}
          </div>
        ) : (
          <div className="function-groups">
            {workspaces
              .filter((workspace) => workspace.id !== "home")
              .map((workspace) => (
                <section key={workspace.id}>
                  <h3>{workspace.name}</h3>
                  <p>{workspace.caption}</p>
                  {navigation
                    .filter((item) => workspace.pages.includes(item.id))
                    .map((item) => (
                      <button key={item.id} onClick={() => props.go(item.id)}>
                        <item.icon size={16} />
                        <span>
                          <strong>{item.name}</strong>
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
      <Panel title="运行目录">
        <div className="detail-facts">
          <span>
            记忆库<code>{props.bootstrap.installation?.memoryRoot}</code>
          </span>
          <span>
            备份库<code>{props.bootstrap.installation?.backupRoot}</code>
          </span>
        </div>
        <TextLink onClick={() => props.go("maintenance")}>备份与诊断</TextLink>
      </Panel>
    </div>
  );
}

export function WorkspacePage(props: PageProps & { page: string }) {
  const { page } = props;
  if (
    ["host-chat", "qq-private", "qq-group", "qq", "bili", "media"].includes(
      page,
    )
  )
    return <InteractionPage {...props} page={page} />;
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
    return (
      <BiliConnection
        {...props}
        view={
          page === "bili"
            ? "connection"
            : page === "bili-activities"
              ? "activities"
              : "publish"
        }
      />
    );
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
      <>
        <Today {...props} />
        <OrganismPage {...props} view="goals" />
        <Panel title="主动行为与节律">
          <Disclosure title="高级预算、作息与失败恢复">
            <ConfigForm {...props} pages={["state", "agency"]} />
          </Disclosure>
        </Panel>
      </>
    );
  if (page === "memory-care")
    return (
      <div className="settings-stack">
        <Panel title="记忆保存设置">
          <ConfigForm {...props} pages={["memory", "chat-memory"]} />
        </Panel>
        <MemoryJobs {...props} />
        <MemoryWorkshop {...props} />
      </div>
    );
  if (page === "memory-sync") return <MemoryWorkshop {...props} sync />;
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
        <ConfigForm
          {...props}
          pages={["permissions", "chat-tools", "chat-media"]}
        />
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
