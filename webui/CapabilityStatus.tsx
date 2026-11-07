import { Panel, Badge } from "./components";
import { useResource, type PageProps } from "./main";

type Capability = {
  enabled: boolean;
  configured: boolean;
  verified: boolean;
  detail: string;
};
export function CapabilityStatus(props: PageProps & { only?: string[] }) {
  const { data, error } = useResource<Record<string, Capability | unknown>>(
    `/api/characters/${props.character.id}/capabilities`,
    props.version,
  );
  const labels: Record<string, string> = {
    hearing: "接收语音",
    browser: "网页浏览",
    singing: "选歌与翻唱",
    files: "DSH 原生文件读写",
  };
  return (
    <Panel title="当前能力状态">
      <div className="capability-list">
        {Object.entries(labels)
          .filter(([key]) => !props.only || props.only.includes(key))
          .map(([key, label]) => {
            const v = data?.[key] as Capability | undefined;
            return (
              <div className="capability-row" key={key}>
                <div>
                  <strong>{label}</strong>
                  <p>{v?.detail || "正在读取当前配置…"}</p>
                </div>
                <Badge>
                  {!v
                    ? "读取中"
                    : !v.enabled
                      ? "未开启"
                      : !v.configured
                        ? key === "files"
                          ? "等待角色会话加载"
                          : "需要配置"
                        : "可尝试调用"}
                </Badge>
              </div>
            );
          })}
      </div>
      {error && <p className="inline-error">{error}</p>}
      <p className="field-help">
        配置完整后可尝试调用，实际结果以每次执行为准。
      </p>
    </Panel>
  );
}
