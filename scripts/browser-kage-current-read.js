return {
  ui: await page.evaluate(() => ({
    page: location.hash,
    mode: document.documentElement.dataset.motion,
    visibility: document.visibilityState,
    scroll: document.querySelector("main")?.scrollTop,
    hero: document.querySelector(".hero-actions")
      ? {
          style: document.querySelector(".hero-actions").getAttribute("style"),
          opacity: getComputedStyle(document.querySelector(".hero-actions"))
            .opacity,
        }
      : null,
    errors: [...document.querySelectorAll("[role=alert]")].map(
      (e) => e.textContent,
    ),
  })),
  view: await tabbit.observe({ frames: "none", maxChars: 1200 }),
};
