import { useEffect, useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(useGSAP, ScrollTrigger);

export function motionDuration(seconds: number) {
  return document.documentElement.dataset.motion === "reduced" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : document.documentElement.dataset.motion === "light"
      ? seconds * 0.65
      : seconds;
}

export function usePageEntrance(
  ref: RefObject<HTMLElement | null>,
  identity: string,
  ready: boolean,
  mode: string,
) {
  useGSAP(
    (_context, contextSafe) => {
      // 系统偏好交给 matchMedia 监听，切回普通动效时也能重新建立滚动渐变。
      if (!ready || !ref.current || mode === "reduced") return;
      const root = ref.current;
      const media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const topbar = root.closest(".app-shell")?.querySelector(".topbar");
          if (topbar)
            gsap.to(topbar, {
              "--topbar-glass": 0.68,
              "--topbar-shadow": 0.06,
              ease: "none",
              scrollTrigger: {
                trigger: root,
                scroller: root,
                start: "top top",
                end: () => `+=${root.clientHeight * 0.7}`,
                scrub: 0.45,
                invalidateOnRefresh: true,
              },
            });
          // 背景按需加载，不能依赖本次挂载时画布已出现。
          // 将进度放在共同父级，后加载的遮罩也能继承当前值。
          const sceneRoot = root.closest(".app-shell")?.parentElement;
          if (sceneRoot)
            gsap.fromTo(
              sceneRoot,
              {
                "--world-overlay-opacity": 0.16,
              },
              {
                "--world-overlay-opacity": 0.32,
                ease: "none",
                scrollTrigger: {
                  trigger: root,
                  scroller: root,
                  start: "top top",
                  end: () => `+=${root.clientHeight * 0.9}`,
                  scrub: 0.55,
                  invalidateOnRefresh: true,
                },
              },
            );
          const home = identity.endsWith(":overview");
          const targets = root.querySelectorAll(
            home
              ? ".observatory-heading-copy,.observatory-actions,.observatory-scene-note,.observatory-scroll"
              : ".prelude-verse h2 span,.prelude-verse p,.prelude-caption,.prelude-continue",
          );
          gsap.from(targets, {
            y: 30,
            autoAlpha: 0,
            duration: motionDuration(0.9),
            stagger: 0.075,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          });
          if (home) {
            const hero = root.querySelector(".observatory-hero");
            if (hero)
              gsap.to(hero.querySelector(".observatory-heading"), {
                y: -35,
                opacity: 0.35,
                ease: "none",
                scrollTrigger: {
                  trigger: hero,
                  scroller: root,
                  start: "top top",
                  end: "bottom top",
                  scrub: 0.7,
                },
              });
          } else {
            const prelude = root.querySelector(".page-prelude");
            if (prelude)
              gsap.fromTo(
                prelude.querySelector(".prelude-verse"),
                { autoAlpha: 1 },
                {
                  y: -22,
                  // 停在本页时诗句保持可读；离开首屏才逐渐退到背景里。
                  autoAlpha: 0.42,
                  ease: "none",
                  scrollTrigger: {
                    trigger: prelude,
                    scroller: root,
                    start: "top -12%",
                    end: "bottom top",
                    scrub: 0.65,
                    invalidateOnRefresh: true,
                  },
                },
              );
          }
          const groups = root.querySelectorAll(
            home
              ? ".journey-stop>*,.observatory-metrics,.observatory-grid,.companion-overview,.observatory-today"
              : ".page-title,.page-content>.settings-stack>.panel,.page-content>.panel,.related-routes",
          );
          const observer = new IntersectionObserver(
            contextSafe!((entries: IntersectionObserverEntry[]) => {
              for (const entry of entries)
                if (entry.isIntersecting) {
                  gsap.fromTo(
                    entry.target,
                    { y: 25, autoAlpha: 0 },
                    {
                      y: 0,
                      autoAlpha: 1,
                      duration: motionDuration(0.65),
                      ease: "power3.out",
                      clearProps: "transform,opacity,visibility",
                      overwrite: "auto",
                    },
                  );
                  observer.unobserve(entry.target);
                }
            }),
            { root, threshold: 0.05 },
          );
          groups.forEach((node) => observer.observe(node));
          return () => observer.disconnect();
        },
        root,
      );
      return () => media.revert();
    },
    { scope: ref, dependencies: [identity, ready, mode], revertOnUpdate: true },
  );
}

export { gsap };

export function playRouteTransition() {
  const curtain = document.querySelector(".route-curtain");
  if (!curtain || !motionDuration(1)) return;
  gsap.killTweensOf(curtain);
  gsap.fromTo(
    curtain,
    { xPercent: -110, opacity: 0.28 },
    {
      xPercent: 110,
      opacity: 0,
      duration: motionDuration(0.42),
      ease: "power2.inOut",
    },
  );
}

/** ThreeUI Sylva 的指针高光边缘适配：仅对当前控件更新，不增加画布或常驻循环。 */
export function useSurfaceLight(mode: string) {
  useEffect(() => {
    if (
      mode === "reduced" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const selector =
      ".primary,.tabs,.select-trigger,.map-reset,.cluster-label,.sidebar nav>button";
    let target: HTMLElement | null = null;
    let bounds: DOMRect | null = null;
    let frame = 0;
    let x = 0,
      y = 0;
    function clear() {
      target?.style.setProperty("--spec-bright", "0");
      target = null;
      bounds = null;
      cancelAnimationFrame(frame);
      frame = 0;
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const next =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(selector)
          : null;
      if (next !== target) {
        clear();
        target = next;
        if (target) {
          bounds = target.getBoundingClientRect();
          target.dataset.surface = "";
        }
      }
      if (!target || !bounds) return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!target || !bounds) return;
        target.style.setProperty(
          "--spec-angle",
          `${Math.atan2(y - bounds.top - bounds.height / 2, x - bounds.left - bounds.width / 2)}rad`,
        );
        target.style.setProperty("--spec-bright", "0.75");
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("scroll", clear, true);
    addEventListener("blur", clear);
    return () => {
      clear();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("scroll", clear, true);
      removeEventListener("blur", clear);
    };
  }, [mode]);
}
