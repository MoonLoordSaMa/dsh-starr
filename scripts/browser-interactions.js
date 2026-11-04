globalThis.starrErrors = [];
page.on("pageerror", (e) => globalThis.starrErrors.push(e.message));
const nav = page.getByRole("navigation", { name: "主要导航" });
await nav.getByRole("button", { name: "记忆", exact: true }).click();
await expect(
  page.getByRole("heading", { name: "记忆", exact: true }),
).toBeVisible();
await page
  .getByRole("button", { name: /窗边的微光 · 示例 1/ })
  .last()
  .click();
await expect(page.locator(".memory-detail h2")).toHaveText(
  "窗边的微光 · 示例 1",
);
await page.getByRole("button", { name: "全景", exact: true }).click();
await expect(page.locator(".memory-detail h2")).toHaveCount(0);
for (const type of ["人物", "约定", "兴趣", "日记", "概览", "全部"])
  await page
    .getByRole("group", { name: "记忆类型" })
    .getByRole("button", { name: new RegExp("^" + type) })
    .click();
await nav.getByRole("button", { name: "心理与身体", exact: true }).click();
await expect(
  page.getByRole("heading", { name: "心情在流动", exact: true }),
).toBeVisible();
await page.getByRole("slider", { name: "唤醒" }).fill("85");
await page
  .getByRole("textbox", { name: "变化的理由或来源", exact: true })
  .fill("隔离预览验收：确认波谱速度和状态持久化");
await page.getByRole("button", { name: "记录这次变化", exact: true }).click();
await expect(page.getByRole("status")).toContainText("状态与来源已记录");
await nav.getByRole("button", { name: "插件设置", exact: true }).click();
await page.getByRole("button", { name: "动态效果", exact: true }).click();
await page.getByRole("option", { name: "平衡", exact: true }).click();
await page
  .getByRole("button", { name: "当前允许的调整项", exact: true })
  .click();
await expect(
  page.getByText("每次改动写入审计记录，权限仅作用于这个角色。"),
).toBeVisible();
for (let i = 0; i < 20; i++) {
  await nav
    .getByRole("button", {
      name: i % 2 === 0 ? "记忆" : "心理与身体",
      exact: true,
    })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    i % 2 === 0 ? "记忆" : "心理与身体",
  );
}
await nav.getByRole("button", { name: "TA 的五官", exact: true }).click();
await page.getByRole("tab", { name: "看见", exact: true }).click();
await expect(
  page.getByRole("button", { name: "选择、粘贴或拖入图片", exact: true }),
).toBeVisible();
await nav.getByRole("button", { name: "表情库", exact: true }).click();
await expect(
  page.getByRole("heading", { name: "把她的表情带回来", exact: true }),
).toBeVisible();
await nav.getByRole("button", { name: "维护任务", exact: true }).click();
await expect(page.getByText("完整性正常", { exact: true })).toBeVisible();
return {
  errors: globalThis.starrErrors,
  viewport: await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    overflow: document.documentElement.scrollWidth > innerWidth,
    canvases: document.querySelectorAll("canvas").length,
  })),
  interactions:
    "星图聚焦/全景、六次筛选、状态保存、下拉/展开、20次切页、看图入口、表情空态、健康检查",
};
