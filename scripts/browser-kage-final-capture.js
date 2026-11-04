const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
try {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  globalThis.finalKageErrors = [];
  globalThis.finalKageConsole = [];
  page.on("pageerror", (e) => globalThis.finalKageErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") globalThis.finalKageConsole.push(m.text());
  });
  await page.reload({ waitUntil: "networkidle" });
  const workspace = page.getByRole("navigation", { name: "工作区导航" });
  await workspace.getByRole("button", { name: "观测站", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("main").scrollTop < 1 &&
      parseFloat(
        getComputedStyle(document.querySelector(".hero-actions")).opacity,
      ) > 0.99,
    undefined,
    { polling: 100, timeout: 10000 },
  );
  await expect(page.locator(".world-scene canvas")).toHaveCount(1);
  const home = await page.screenshot({ fullPage: false });
  await page
    .getByRole("button", { name: "走进记忆的星海", exact: true })
    .click();
  await page.locator(".memory-row").first().click();
  await page.waitForFunction(
    () =>
      parseFloat(
        getComputedStyle(document.querySelector(".page-title h1")).opacity,
      ) > 0.99 &&
      parseFloat(
        getComputedStyle(document.querySelector(".route-curtain")).opacity,
      ) < 0.02,
    undefined,
    { polling: 100, timeout: 10000 },
  );
  const memory = await page.screenshot({ fullPage: false });
  const rightReading = await page.locator(".memory-detail").evaluate((e) => ({
    bounds: e.getBoundingClientRect().toJSON(),
    body: e.querySelector(".memory-body").textContent,
    fullTextLabel: e.querySelector(".detail-content-label").textContent,
  }));
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await workspace.getByRole("button", { name: "观测站", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("main").scrollTop < 1 &&
      parseFloat(
        getComputedStyle(document.querySelector(".hero-actions")).opacity,
      ) > 0.99,
    undefined,
    { polling: 100, timeout: 10000 },
  );
  const mobile = await page.screenshot({ fullPage: false });
  const mobileLayout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    mainScroll: document.querySelector("main").scrollTop,
    heroTop: document.querySelector(".landing-hero").getBoundingClientRect()
      .top,
  }));
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await workspace.getByRole("button", { name: "观测站", exact: true }).click();
  const timing = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const frames = [],
          longTasks = [];
        let last = performance.now(),
          start = last;
        const observer = new PerformanceObserver((list) =>
          longTasks.push(...list.getEntries().map((e) => e.duration)),
        );
        observer.observe({ type: "longtask", buffered: false });
        function tick(t) {
          frames.push(t - last);
          last = t;
          if (t - start < 8000) {
            requestAnimationFrame(tick);
            return;
          }
          observer.disconnect();
          const sorted = frames.filter((x) => x > 0).sort((a, b) => a - b);
          resolve({
            durationMs: Math.round(t - start),
            frameIntervals: sorted.length,
            medianMs:
              Math.round(sorted[Math.floor(sorted.length * 0.5)] * 10) / 10,
            p95Ms:
              Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
            longTasksOver50ms: longTasks.length,
            maxLongTaskMs: Math.round(Math.max(0, ...longTasks)),
            mode: document.documentElement.dataset.motion,
            canvases: document.querySelectorAll("canvas").length,
          });
        }
        requestAnimationFrame(tick);
      }),
  );
  return {
    screenshots: { home: home.path, memory: memory.path, mobile: mobile.path },
    rightReading,
    mobileLayout,
    timing,
    errors: globalThis.finalKageErrors,
    console: globalThis.finalKageConsole,
  };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
