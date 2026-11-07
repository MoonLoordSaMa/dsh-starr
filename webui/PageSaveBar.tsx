import { useEffect, useRef, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { api, json, type Config } from "./types";
import type { PageProps } from "./main";

export function PageSaveBar({ character, refresh, notify }: PageProps) {
  const saving = useRef(false);
  const [count, setCount] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const collect = () => {
      const detail = { patch: {} as Config };
      document.dispatchEvent(
        new CustomEvent("starr-collect-config", { detail }),
      );
      return detail.patch;
    };
    const update = () => setCount(Object.keys(collect()).length);
    const observer = new MutationObserver(update);
    const main = document.getElementById("main-content");
    if (main)
      observer.observe(main, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["data-dirty"],
      });
    const save = async () => {
      if (saving.current) return;
      const patch = collect();
      if (!Object.keys(patch).length) return;
      saving.current = true;
      setBusy(true);
      setError("");
      try {
        await api(`/api/characters/${character.id}/config`, {
          method: "PATCH",
          body: json({ patch, revision: character.revision }),
        });
        refresh();
        notify("本页角色设置已保存");
      } catch (error) {
        setError((error as Error).message);
      } finally {
        saving.current = false;
        setBusy(false);
      }
    };
    document.addEventListener("starr-save-page", save);
    document.addEventListener("starr-config-changed", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("starr-save-page", save);
      document.removeEventListener("starr-config-changed", update);
    };
  }, [character.id, character.revision, refresh, notify]);
  if (!count && !error && !busy) return null;
  return (
    <aside className="page-save-bar" aria-label="本页配置保存" role="region">
      <div aria-live="polite">
        <strong>
          {busy ? "正在保存本页配置…" : `${count} 项更改尚未保存`}
        </strong>
        {error && <p role="alert">{error}</p>}
      </div>
      <button
        className="ghost"
        disabled={busy}
        onClick={() => {
          document.dispatchEvent(new CustomEvent("starr-reset-config"));
          setError("");
        }}
      >
        <RotateCcw size={15} />
        还原本页
      </button>
      <button
        className="primary"
        disabled={busy || !count}
        onClick={() =>
          document.dispatchEvent(new CustomEvent("starr-save-page"))
        }
      >
        <Save size={15} />
        {busy ? "保存中…" : "保存本页更改"}
      </button>
    </aside>
  );
}
