import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { navigation, workspaces } from "./navigation";

/** 到达页底后再发起一次下滑才接续，控件、星图和未保存的表单不会触发。 */
export function PageContinuation({
  page,
  main,
  go,
}: {
  page: string;
  main: RefObject<HTMLElement | null>;
  go: (page: string) => void;
}) {
  const section = workspaces.find((item) => item.pages.includes(page));
  const index = section?.primary.indexOf(page) ?? -1;
  const nextId = index >= 0 ? section?.primary[index + 1] : undefined;
  const next = navigation.find((item) => item.id === nextId);
  const root = useRef<HTMLElement>(null);
  const latestGo = useRef(go);
  latestGo.current = go;
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const scroller = main.current;
    const indicator = root.current;
    if (!scroller || !indicator || !next) return;
    let bottomAt = 0,
      lastWheel = 0,
      amount = 0,
      touchY = 0,
      touchReady = false;
    let wheelReady = false;
    let moved = false;
    const hasChanges = () =>
      Boolean(scroller.querySelector('[data-dirty="true"]'));
    const checkDirty = () => setDirty(hasChanges());
    const observer = new MutationObserver(checkDirty);
    observer.observe(scroller, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-dirty"],
    });
    checkDirty();
    const bottom = () =>
      scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop < 5;
    const update = () => {
      if (!bottom()) {
        bottomAt = 0;
        amount = 0;
        wheelReady = false;
        indicator.style.setProperty("--continue-progress", "0");
      } else if (!bottomAt) bottomAt = performance.now();
    };
    const blocked = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      return (
        moved ||
        hasChanges() ||
        Boolean(document.querySelector('[role="dialog"],.menu-open')) ||
        Boolean(
          element?.closest(
            'input,textarea,select,[role="listbox"],.starmap-wrap,[contenteditable="true"]',
          ),
        )
      );
    };
    const advance = () => {
      if (hasChanges() || moved) return;
      moved = true;
      latestGo.current(next.id);
    };
    const wheel = (event: WheelEvent) => {
      if (blocked(event.target) || event.ctrlKey) return;
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      if (event.deltaY <= 0) {
        amount = 0;
        wheelReady = false;
        indicator.style.setProperty("--continue-progress", "0");
        return;
      }
      // 惯性滚动到达底部后需要停顿，再主动下滑；不吞掉正常页面滚动。
      if (!bottomAt || !bottom() || now - bottomAt < 400) {
        wheelReady = false;
        return;
      }
      if (gap > 220) {
        amount = 0;
        wheelReady = true;
      }
      if (!wheelReady) return;
      amount +=
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? scroller.clientHeight
            : 1);
      indicator.style.setProperty(
        "--continue-progress",
        String(Math.min(1, amount / 190)),
      );
      if (amount >= 190) advance();
    };
    const touchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY || 0;
      touchReady =
        !blocked(event.target) &&
        bottom() &&
        performance.now() - bottomAt > 400;
    };
    const touchEnd = (event: TouchEvent) => {
      if (
        touchReady &&
        !blocked(event.target) &&
        touchY - (event.changedTouches[0]?.clientY || touchY) > 90
      )
        advance();
      touchReady = false;
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    scroller.addEventListener("wheel", wheel, { passive: true });
    scroller.addEventListener("touchstart", touchStart, { passive: true });
    scroller.addEventListener("touchend", touchEnd, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", update);
      scroller.removeEventListener("wheel", wheel);
      scroller.removeEventListener("touchstart", touchStart);
      scroller.removeEventListener("touchend", touchEnd);
    };
  }, [page, next?.id, main]);
  if (page === "overview" || !next) return null;
  return (
    <section className="page-continuation" ref={root} aria-label="下一页">
      <span className="continuation-rule" />
      <div>
        <span>{dirty ? "先收好这一页的更改" : "下一程"}</span>
        <h2>{next.name}</h2>
        <p>
          {dirty
            ? "保存或还原后，即可继续下滑"
            : "已到本页尽头，继续下滑进入下一项"}
        </p>
      </div>
      <button
        disabled={dirty}
        onClick={() => go(next.id)}
        aria-label={`进入${next.name}`}
      >
        <ArrowRight size={23} />
      </button>
      <ArrowDown className="continuation-down" size={15} aria-hidden="true" />
    </section>
  );
}
