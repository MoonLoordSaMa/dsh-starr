const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
globalThis.weightFinalProgress = [];
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const nav = page.getByRole("navigation", { name: "主要导航" });
const checks = [];
for (const name of [
  "概览",
  "角色",
  "记忆",
  "心理与身体",
  "对话",
  "TA 的五官",
  "跨平台会话",
  "表情库",
  "维护任务",
  "插件设置",
]) {
  await nav.getByRole("button", { name, exact: true }).click({ timeout: 8000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name, {
    timeout: 8000,
  });
  checks.push(
    await page.evaluate(
      (name) => ({
        name,
        overflow: document.documentElement.scrollWidth > innerWidth,
        canvases: document.querySelectorAll("canvas").length,
        alerts: Array.from(document.querySelectorAll("[role=alert]")).map(
          (e) => e.textContent,
        ),
      }),
      name,
    ),
  );
  globalThis.weightFinalProgress.push(name);
}
await nav
  .getByRole("button", { name: "记忆", exact: true })
  .click({ timeout: 8000 });
await expect(page.locator(".starmap canvas")).toHaveCount(1);
await page.locator(".memory-row").first().click({ timeout: 8000 });
await expect(page.locator(".memory-detail h2")).toHaveCount(1);
const detailWeight = await page.locator(".detail-facts").innerText();
await page
  .getByRole("button", { name: "全景", exact: true })
  .click({ timeout: 8000 });
await expect(page.locator(".memory-detail h2")).toHaveCount(0);
for (const type of ["人物", "约定", "兴趣", "日记", "概览", "全部"]) {
  await page
    .getByRole("group", { name: "记忆类型" })
    .getByRole("button", { name: new RegExp("^" + type) })
    .click({ timeout: 8000 });
  await expect(page.locator(".starmap canvas")).toHaveCount(1);
}
await page
  .getByRole("button", { name: "记录记忆", exact: true })
  .click({ timeout: 8000 });
await expect(page.getByRole("dialog")).toBeVisible();
await page.keyboard.press("Escape");
await expect(page.getByRole("dialog")).toHaveCount(0);
const restoredFocus = await page
  .getByRole("button", { name: "记录记忆", exact: true })
  .evaluate((el) => el === document.activeElement);
await page.evaluate(() => document.querySelector("main")?.scrollTo(0, 0));
const memory = await page.screenshot({ fullPage: false });
await nav
  .getByRole("button", { name: "心理与身体", exact: true })
  .click({ timeout: 8000 });
await expect(
  page.getByRole("heading", { name: "心情在流动", exact: true }),
).toBeVisible();
const state = await page.screenshot({ fullPage: false });
await nav
  .getByRole("button", { name: "概览", exact: true })
  .click({ timeout: 8000 });
await expect(page.locator(".starmap canvas")).toHaveCount(1);
await expect(page.locator(".spectrum")).toHaveCount(1);
const overview = await page.screenshot({ fullPage: false });
await cdp.detach();
return {
  checks,
  detailWeight,
  restoredFocus,
  errors,
  screenshots: {
    memory: memory.path,
    state: state.path,
    overview: overview.path,
  },
};
