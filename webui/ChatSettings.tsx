import { Panel } from "./components";
import { ConfigForm } from "./pages";
import { CapabilityStatus } from "./CapabilityStatus";
import type { PageProps } from "./main";

// 页面展示角色配置，后台会话仍由原服务保存。
export function ChatSettings(
  props: PageProps & { view?: string; channel?: string },
) {
  if (props.view === "memory")
    return (
      <Panel title="跨会话记忆共享">
        <ConfigForm {...props} pages={["chat-memory"]} />
      </Panel>
    );
  if (props.view === "context")
    return (
      <div className="settings-stack">
        <CapabilityStatus {...props} only={["files"]} />
        <Panel title="长期记忆与会话接续">
          <ConfigForm {...props} pages={["chat-context"]} />
        </Panel>
      </div>
    );
  return (
    <div className="settings-stack">
      <Panel title="回复、分段与等待">
        <ConfigForm {...props} pages={["chat-reply"]} />
      </Panel>
      <Panel title="唤醒与接收范围">
        <ConfigForm {...props} pages={["chat-wake", "chat-access"]} />
      </Panel>
      <Panel title="上下文、工作区与记忆召回">
        <ConfigForm {...props} pages={["chat-context"]} />
      </Panel>
      <Panel title="消息与媒体">
        <ConfigForm
          {...props}
          pages={["chat-tools", "chat-media", "chat-slang"]}
        />
      </Panel>
      <Panel title="用量与节奏">
        <ConfigForm {...props} pages={["chat-budget"]} />
      </Panel>
    </div>
  );
}
