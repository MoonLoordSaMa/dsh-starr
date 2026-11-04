await expect(page.getByRole("heading", { level: 1 })).toHaveText("概览");
const nav = page.getByRole("navigation", { name: "主要导航" });
const cdp = await context.newCDPSession(page);
await cdp.send("Performance.enable");
let gcSupport = "未请求";
try {
  await page.requestGC();
  gcSupport = "浏览器垃圾回收请求已完成";
} catch (e) {
  gcSupport = "当前浏览器不支持垃圾回收请求";
}
const metrics = async () => {
  const r = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(
    r.metrics
      .filter((x) =>
        ["JSHeapUsedSize", "Nodes", "Documents", "JSEventListeners"].includes(
          x.name,
        ),
      )
      .map((x) => [x.name, x.value]),
  );
};
const rounds = [];
rounds.push({ round: 0, metrics: await metrics() });
for (let r = 1; r <= 3; r++) {
  for (let i = 0; i < 8; i++) {
    await nav
      .getByRole("button", { name: i % 2 ? "概览" : "记忆", exact: true })
      .click();
    await expect(page.locator(".starmap canvas")).toHaveCount(1);
  }
  await page.waitForFunction(
    () =>
      !document
        .querySelector(".page-title h1")
        .getAttribute("style")
        ?.includes("opacity"),
  );
  if (gcSupport === "浏览器垃圾回收请求已完成") await page.requestGC();
  rounds.push({ round: r, metrics: await metrics() });
}
await cdp.detach();
return {
  gcSupport,
  rounds,
  canvases: await page.locator("canvas").count(),
  note: "24次切页分三轮检查；数值仅适用于本机本次短时采样",
};
