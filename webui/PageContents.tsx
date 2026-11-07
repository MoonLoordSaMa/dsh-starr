import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

// 长配置页提供就地目录；只滚动当前页，不切换路由。
export function PageContents({ identity }: { identity: string }) {
  const ref = useRef<HTMLElement>(null);
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    const root = ref.current?.closest(".page-content");
    if (!root) return;
    let signature = "";
    let focused = false;
    const characterId = identity.split(":")[0];
    const key = `starr-config-focus:${characterId}`;
    const field = sessionStorage.getItem(key);
    const update = () => {
      const headings = Array.from(
        root.querySelectorAll<HTMLElement>(".panel-heading h2"),
      );
      const next = headings.map((heading, index) => {
        heading.id ||= `section-${identity.replaceAll(":", "-")}-${index}`;
        return { id: heading.id, title: heading.textContent || "" };
      });
      const value = JSON.stringify(next);
      if (value !== signature) {
        signature = value;
        setItems(next);
      }
      if (field && !focused) {
        const target =
          document.getElementById(field) ||
          root.querySelector<HTMLElement>(
            `[data-config-key="${CSS.escape(field)}"]`,
          );
        if (target && root.contains(target)) {
          focused = true;
          sessionStorage.removeItem(key);
          let parent = target.parentElement;
          while (parent && parent !== root) {
            if (parent instanceof HTMLDetailsElement) parent.open = true;
            parent = parent.parentElement;
          }
          requestAnimationFrame(() => {
            target.closest(".config-row")?.scrollIntoView({ block: "center" });
            target.focus({ preventScroll: true });
          });
        }
      }
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [identity]);
  return (
    <nav
      ref={ref}
      className="page-contents"
      aria-label="本页内容"
      hidden={items.length < 2}
    >
      <span>本页内容</span>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            const target = document.getElementById(item.id);
            target?.closest("section")?.scrollIntoView({ block: "start" });
          }}
        >
          <ArrowDown size={12} />
          {item.title}
        </button>
      ))}
    </nav>
  );
}
