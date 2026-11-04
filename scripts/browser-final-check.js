const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
globalThis.starrErrors = [];
globalThis.starrConsole = [];
page.on("pageerror", (e) => globalThis.starrErrors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") globalThis.starrConsole.push(m.text());
});
await page.reload({ waitUntil: "networkidle" });
const nav = page.getByRole("navigation", { name: "主要导航" });
await nav.getByRole("button", { name: "记忆", exact: true }).click();
await expect(page.locator(".starmap canvas")).toBeVisible();
await page
  .getByRole("button", { name: /窗边的微光 · 示例 1/ })
  .last()
  .click();
await expect(page.locator(".memory-detail h2")).toHaveText(
  "窗边的微光 · 示例 1",
);
await page.getByRole("button", { name: "全景", exact: true }).click();
await expect(page.locator(".memory-detail h2")).toHaveCount(0);
for (const type of ["人物", "约定", "兴趣", "日记", "概览", "全部"]) {
  await page
    .getByRole("group", { name: "记忆类型" })
    .getByRole("button", { name: new RegExp("^" + type) })
    .click();
  await expect(page.locator(".starmap canvas")).toHaveCount(1);
}
const rect = await page.locator(".starmap canvas").boundingBox();
await page.mouse.move(rect.x + rect.width * 0.62, rect.y + rect.height * 0.45);
await page.mouse.wheel(0, -150);
await page.getByRole("button", { name: "全景", exact: true }).click();
const memoryShot = await page.screenshot({ fullPage: false });
await page.getByRole("button", { name: "记录记忆", exact: true }).click();
await expect(page.getByRole("dialog")).toBeVisible();
await page.keyboard.press("Escape");
await expect(page.getByRole("dialog")).toHaveCount(0);
const restoredFocus = await page
  .getByRole("button", { name: "记录记忆", exact: true })
  .evaluate((el) => el === document.activeElement);
await nav.getByRole("button", { name: "心理与身体", exact: true }).click();
await expect(
  page.getByRole("heading", { name: "心情在流动", exact: true }),
).toBeVisible();
const stateShot = await page.screenshot({ fullPage: false });
await nav.getByRole("button", { name: "插件设置", exact: true }).click();
await page.getByRole("button", { name: "动态效果", exact: true }).click();
await expect(
  page.getByRole("listbox", { name: "动态效果", exact: true }),
).toBeVisible();
await page.keyboard.press("Escape");
await expect(
  page.getByRole("listbox", { name: "动态效果", exact: true }),
).toHaveCount(0);
await page
  .getByRole("button", { name: "当前允许的调整项", exact: true })
  .click();
await expect(
  page.getByText("每次改动写入审计记录，权限仅作用于这个角色。", {
    exact: true,
  }),
).toBeVisible();
await page
  .getByRole("button", { name: "当前允许的调整项", exact: true })
  .click();
await expect(page.locator(".disclosure-grid")).toHaveAttribute("inert", "");
const settingsShot = await page.screenshot({ fullPage: false });
const pages = [
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
];
const layoutChecks = [];
for (const name of pages) {
  await nav.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  layoutChecks.push(
    await page.evaluate(
      (name) => ({
        page: name,
        overflow: document.documentElement.scrollWidth > innerWidth,
        canvases: document.querySelectorAll("canvas").length,
        alerts: Array.from(document.querySelectorAll("[role=alert]")).map(
          (e) => e.textContent,
        ),
      }),
      name,
    ),
  );
}
for (let i = 0; i < 24; i++) {
  const name = i % 3 === 0 ? "记忆" : i % 3 === 1 ? "心理与身体" : "插件设置";
  await nav.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}
await nav.getByRole("button", { name: "概览", exact: true }).click();
await expect(page.locator(".starmap canvas")).toHaveCount(1);
await expect(page.locator(".spectrum")).toHaveCount(1);
const overviewShot = await page.screenshot({ fullPage: false });
const result = {
  layoutChecks,
  restoredFocus,
  pageErrors: globalThis.starrErrors,
  consoleErrors: globalThis.starrConsole,
  screenshots: {
    memory: memoryShot.path,
    state: stateShot.path,
    settings: settingsShot.path,
    overview: overviewShot.path,
  },
};
await cdp.detach();
return result;
