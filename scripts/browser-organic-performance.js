const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function sample(name) {
  return await page.evaluate(async (name) => {
    const intervals = [];
    const longTasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const item of list.getEntries()) longTasks.push(item.duration);
    });
    const longTaskSupported =
      PerformanceObserver.supportedEntryTypes.includes("longtask");
    if (longTaskSupported) observer.observe({ type: "longtask" });
    const started = performance.now();
    let previous = started;
    await new Promise((resolve) => {
      const frame = (now) => {
        intervals.push(now - previous);
        previous = now;
        if (now - started >= 8000) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    observer.disconnect();
    const sorted = intervals.slice().sort((a, b) => a - b);
    return {
      name,
      durationMs: previous - started,
      count: intervals.length,
      medianMs: sorted[Math.floor(sorted.length * 0.5)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      maxMs: sorted[sorted.length - 1],
      over50Ms: intervals.filter((value) => value > 50).length,
      longTaskSupported,
      longTasks,
      motion: document.documentElement.dataset.motion,
      visibility: document.visibilityState,
    };
  }, name);
}
try {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.reload({ waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "工作区导航" });
  await nav.getByRole("button", { name: "观测站", exact: true }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".hero-intro h2 span")].every(
      (e) => Number(getComputedStyle(e).opacity) > 0.98,
    ),
  );
  const samples = [await sample("首页天球仪：强动效")];
  await nav.getByRole("button", { name: "她的世界", exact: true }).click();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "心理与身体", exact: true })
    .click();
  await page.getByRole("tab", { name: "全部感受", exact: true }).click();
  await expect(page.locator(".emotion-key > div")).toHaveCount(18);
  samples.push(await sample("十八种情绪流场：强动效"));
  await page.getByRole("tab", { name: "主要心潮", exact: true }).click();
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.waitForFunction(
    () => document.querySelector(".sidebar").getBoundingClientRect().right <= 1,
    undefined,
    { polling: 100, timeout: 5000 },
  );
  const tablet = await page.evaluate(() => ({
    sidebarRight: document.querySelector(".sidebar").getBoundingClientRect()
      .right,
    sidebarInert: document.querySelector(".sidebar").inert,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  const shot = await page.screenshot({ fullPage: false });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await nav.getByRole("button", { name: "观测站", exact: true }).click();
  return { samples, tablet, shot: shot.path, errors };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
