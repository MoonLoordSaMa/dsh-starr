import { ChatSettings as StarrChat } from "./ChatSettings";
import { QQConnection } from "./QQConnection";
import { BiliConnection } from "./BiliConnection";
import { MediaPage } from "./pages";
import { PlatformBridge } from "./PlatformBridge";
import type { PageProps } from "./main";

export function InteractionPage(props: PageProps & { page: string }) {
  const { page } = props;
  return (
    <div className="interaction-workspace">
      {page === "host-chat" && (
        <>
          <StarrChat {...props} view="sessions" channel="host" />
        </>
      )}
      {(page === "qq-private" || page === "qq-group") && (
        <>
          <StarrChat
            {...props}
            view="sessions"
            channel={page === "qq-private" ? "private" : "group"}
          />
        </>
      )}
      {page === "qq" && <QQConnection {...props} />}
      {page === "bili" && <BiliConnection {...props} />}
      {page === "media" && <MediaPage {...props} />}
    </div>
  );
}
