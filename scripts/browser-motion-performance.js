await page.reload({ waitUntil: "networkidle" });
const nav = page.getByRole("navigation", { name: "主要导航" });
await nav.getByRole("button", { name: "心理与身体", exact: true }).click();
await page.getByRole("tab", { name: "目的与约定", exact: true }).click();
await page.waitForFunction(() => {
  const target = document.querySelector(".tabs [aria-selected=true]"),
    mark = document.querySelector(".tabs-active-mark");
  const a = target.getBoundingClientRect(),
    b = mark.getBoundingClientRect();
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.width - b.width) < 1;
});
await page.getByRole("tab", { name: "变化与来源", exact: true }).focus();
await page.keyboard.press("ArrowRight");
await expect(
  page.getByRole("tab", { name: "习惯与调节", exact: true }),
).toBeFocused();
await nav.getByRole("button", { name: "插件设置", exact: true }).click();
await page.getByRole("button", { name: "动态效果", exact: true }).click();
await page.getByRole("option", { name: "减少动态", exact: true }).click();
await page
  .getByRole("button", { name: "保存更改", exact: true })
  .first()
  .click();
await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
await nav.getByRole("button", { name: "记忆", exact: true }).click();
await page
  .getByRole("button", { name: /窗边的微光 · 示例 1/ })
  .last()
  .click();
await expect(page.locator(".memory-detail h2")).toHaveText(
  "窗边的微光 · 示例 1",
);
await page.getByRole("button", { name: "全景", exact: true }).click();
await expect(page.locator(".memory-detail h2")).toHaveCount(0);
const reducedAnimations = await page.evaluate(
  () =>
    document.getAnimations().filter((a) => a.playState === "running").length,
);
await nav.getByRole("button", { name: "插件设置", exact: true }).click();
await page.getByRole("button", { name: "动态效果", exact: true }).click();
await page.getByRole("option", { name: "平衡", exact: true }).click();
await page
  .getByRole("button", { name: "保存更改", exact: true })
  .first()
  .click();
await expect(page.locator("html")).toHaveAttribute("data-motion", "default");
await nav.getByRole("button", { name: "概览", exact: true }).click();
await expect(page.locator(".starmap canvas")).toHaveCount(1);
const cdp = await context.newCDPSession(page);
await cdp.send("Performance.enable");
const sample = async () => {
  const m = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(
    m.metrics
      .filter((x) =>
        ["JSHeapUsedSize", "Nodes", "Documents", "JSEventListeners"].includes(
          x.name,
        ),
      )
      .map((x) => [x.name, x.value]),
  );
};
const before = await sample();
for (let i = 0; i < 18; i++) {
  await nav
    .getByRole("button", { name: i % 2 ? "概览" : "记忆", exact: true })
    .click();
  await expect(page.locator(".starmap canvas")).toHaveCount(1);
}
const after = await sample();
const timing = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const frames = [],
        longTasks = [];
      let last = performance.now(),
        start = last;
      const observer = new PerformanceObserver((list) =>
        longTasks.push(...list.getEntries().map((e) => Math.round(e.duration))),
      );
      observer.observe({ type: "longtask", buffered: false });
      function sample(t) {
        frames.push(t - last);
        last = t;
        if (t - start < 8000) {
          requestAnimationFrame(sample);
          return;
        }
        observer.disconnect();
        const sorted = frames.filter((x) => x > 0).sort((a, b) => a - b);
        resolve({
          durationMs: Math.round(t - start),
          frameIntervals: sorted.length,
          medianFrameIntervalMs:
            Math.round(sorted[Math.floor(sorted.length * 0.5)] * 10) / 10,
          p95FrameIntervalMs:
            Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
          longTasksOver50Ms: longTasks.length,
          maxLongTaskMs: Math.max(0, ...longTasks),
          canvases: document.querySelectorAll("canvas").length,
        });
      }
      requestAnimationFrame(sample);
    }),
);
await cdp.detach();
return {
  tabs: "滑块定位与键盘切换通过",
  reducedAnimations,
  before,
  after,
  timing,
  note: "8秒前台主线程帧间隔采样，不等于GPU渲染帧率；18次切页资源快照不替代长期泄漏测试",
};
