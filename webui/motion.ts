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
      if (!ready || !ref.current || !motionDuration(1)) return;
      const root = ref.current;
      const media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const home = identity.endsWith(":overview");
          const targets = root.querySelectorAll(
            home
              ? ".hero-intro h2 span,.hero-intro p,.hero-actions,.hero-status"
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
          if (!home) {
            const prelude = root.querySelector(".page-prelude");
            if (prelude)
              gsap.to(prelude.querySelector(".prelude-verse"), {
                y: -70,
                autoAlpha: 0.12,
                ease: "none",
                scrollTrigger: {
                  trigger: prelude,
                  scroller: root,
                  start: "top top",
                  end: "bottom top",
                  scrub: 0.65,
                  invalidateOnRefresh: true,
                },
              });
          }
          const groups = root.querySelectorAll(
            home
              ? ".chapter-navigation>button,.overview-grid,.bottom-grid"
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
    { xPercent: -110, opacity: 0.9 },
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
