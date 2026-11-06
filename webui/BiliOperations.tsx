import { useState } from "react";
import { api, json } from "./types";
import { Panel, Select, Disclosure, Modal } from "./components";
import { ConfigForm } from "./pages";
import { useResource, type PageProps } from "./main";
type Preview = {
  token: string;
  kind: string;
  text: string;
  id: string;
  account: { name: string };
  detail: string;
  image: { bytes: number } | null;
  original: { text: string } | null;
};
export function BiliOperations(props: PageProps) {
  const root = `/api/characters/${props.character.id}/bili/operations`;
  const { data } = useResource<{
    drafts: { id: string; text: string; revision: number }[];
    recent: { id: string; kind: string; status: string; error: string }[];
  }>(root, props.version);
  const [kind, setKind] = useState("publish"),
    [id, setId] = useState(""),
    [text, setText] = useState(""),
    [image, setImage] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null),
    [read, setRead] = useState("history"),
    [query, setQuery] = useState(""),
    [material, setMaterial] = useState("");
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await task();
      props.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="settings-stack">
      <Panel title="公开内容，落笔之前">
        <ConfigForm {...props} pages={["bili-actions"]} />
        <p>
          草稿只存本机。发布、编辑、删除与点赞先核验账号和预览，再由你确认；编辑保留原图，删除只能操作自己的动态
        </p>
        <Select
          label="人间落笔"
          value={kind}
          onChange={(value) => {
            setKind(value);
            setPreview(null);
            setImage("");
          }}
          options={[
            { value: "publish", label: "发布文字或图文动态" },
            { value: "edit", label: "编辑自己的动态" },
            { value: "delete", label: "删除自己的动态" },
            { value: "like", label: "点赞指定动态" },
          ]}
        />
        {kind !== "publish" && (
          <label className="field">
            动态编号
            <input value={id} onChange={(e) => setId(e.target.value)} />
          </label>
        )}
        {["publish", "edit"].includes(kind) && (
          <label className="field">
            笺文
            <textarea
              rows={7}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        )}
        {kind === "publish" && (
          <label className="field">
            附一张本地图片（可选）
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 8 * 1024 * 1024) {
                  setMessage("图片须小于8MB");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setImage(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
            {image && (
              <img
                className="dynamic-image-preview"
                src={image}
                alt="本地待发布图片"
              />
            )}
          </label>
        )}
        <div className="button-row">
          <button
            disabled={busy || !text.trim()}
            onClick={() =>
              run(async () => {
                await api(`${root}/draft`, {
                  method: "POST",
                  body: json({ text }),
                });
                setMessage("草稿已保存在本机，尚未发布");
              })
            }
          >
            暂寄笺底
          </button>
          <button
            className="primary"
            disabled={busy || !props.character.config["bili.actions.enabled"]}
            onClick={() =>
              run(async () =>
                setPreview(
                  await api(root + "/preview", {
                    method: "POST",
                    body: json({ kind, id, text, image }),
                  }),
                ),
              )
            }
          >
            照笺试读
          </button>
        </div>
        {message && <p role="status">{message}</p>}
        <Disclosure title="未寄之笺">
          {data?.drafts.map((draft) => (
            <div className="job-error" key={draft.id}>
              <p>{draft.text}</p>
              <button
                onClick={() => {
                  setText(draft.text);
                  setKind("publish");
                }}
              >
                展读笺文
              </button>
            </div>
          ))}
        </Disclosure>
        <Disclosure title="渡口回笺">
          {data?.recent.map((item) => (
            <div className="job-error" key={item.id}>
              <strong>
                {
                  (
                    {
                      publish: "发布",
                      edit: "重理此笺",
                      delete: "归于尘寂",
                      like: "点赞",
                    } as Record<string, string>
                  )[item.kind]
                }{" "}
                ·{" "}
                {
                  (
                    {
                      sent: "有明确回执",
                      accepted: "平台已受理",
                      uncertain: "待核对",
                      failed: "失败",
                      sending: "执行中",
                    } as Record<string, string>
                  )[item.status]
                }
              </strong>
              <p>{item.error}</p>
            </div>
          ))}
        </Disclosure>
      </Panel>
      <Panel title="山海拾遗 · 公开资料">
        <Select
          label="星笺门类"
          value={read}
          onChange={setRead}
          options={[
            { value: "history", label: "当前账号观看历史" },
            { value: "feed", label: "当前账号公开动态" },
            { value: "favorites", label: "收藏夹目录" },
            { value: "search", label: "搜索视频资料" },
            { value: "profile", label: "公开账号信息" },
            { value: "video", label: "指定视频资料与字幕" },
          ]}
        />
        {["search", "profile", "video"].includes(read) && (
          <label className="field">
            {read === "search"
              ? "关键词"
              : read === "profile"
                ? "账号 mid（留空为自己）"
                : "视频 BV 号"}
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        )}
        <button
          disabled={busy}
          onClick={() =>
            run(async () =>
              setMaterial(
                JSON.stringify(
                  await api(root + "/read", {
                    method: "POST",
                    body: json({ kind: read, q: query, id: query }),
                  }),
                  null,
                  2,
                ),
              ),
            )
          }
        >
          展读此笺
        </button>
        {material && <pre className="material-result">{material}</pre>}
      </Panel>
      {preview && (
        <Modal title="确认落笔" onClose={() => setPreview(null)}>
          <p>
            当前账号：{preview.account.name} · 动态：{preview.id || "新动态"}
          </p>
          {preview.original && (
            <p className="preview-original">原笺：{preview.original.text}</p>
          )}
          <p className="preview-text">{preview.text}</p>
          {preview.image && (
            <p>附一张本地图片，{Math.round(preview.image.bytes / 1024)}KB</p>
          )}
          <p>{preview.detail}</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const token = preview.token;
                setPreview(null);
                const result = await api<{ status: string; messageId: string }>(
                  root + "/execute",
                  { method: "POST", body: json({ token }) },
                );
                setMessage(
                  `平台${result.status === "sent" ? "已返回明确编号" : "已受理，最终状态需核对"} · ${result.messageId}`,
                );
              })
            }
          >
            落笔一回
          </button>
        </Modal>
      )}
    </div>
  );
}
