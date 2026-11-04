const nav = page.getByRole("navigation", { name: "主要导航" });
await nav.getByRole("button", { name: /^表情库/ }).click();
const payload = {
  name: "验收星星.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCAIAAAAASUVORK5CYII=",
    "base64",
  ),
};
await page.locator(".filter-toolbar input[type=file]").setInputFiles(payload);
await expect(page.locator(".expression-card")).toHaveCount(1);
await page.getByRole("button", { name: "收藏表情", exact: true }).click();
await expect(
  page.getByRole("button", { name: "取消收藏", exact: true }),
).toBeVisible();
await page.getByRole("button", { name: "验收星星.png", exact: true }).click();
await page
  .getByRole("textbox", { name: "情绪与关键词", exact: true })
  .fill("合成验收、星星、平静");
await page.getByRole("button", { name: "保存关键词", exact: true }).click();
await expect(page.getByRole("dialog")).toHaveCount(0);
await nav.getByRole("button", { name: "心理与身体", exact: true }).click();
await page.getByRole("tab", { name: "目的与约定", exact: true }).click();
await page.getByRole("button", { name: "添加目的", exact: true }).click();
await page
  .getByRole("textbox", { name: "想做什么", exact: true })
  .fill("验收目的：整理星图");
await page
  .getByRole("textbox", { name: "为什么，以及来自哪里", exact: true })
  .fill("合成验收：确认目的保存且不触发任何平台外发");
await page.getByRole("button", { name: "记下这个目的", exact: true }).click();
await expect(page.getByRole("dialog")).toHaveCount(0);
await expect(
  page.getByRole("heading", { name: "验收目的：整理星图", exact: true }),
).toBeVisible();
await page.getByRole("button", { name: "完成", exact: true }).click();
await expect(page.getByText(/已完成/)).toBeVisible();
await page.reload({ waitUntil: "networkidle" });
await nav.getByRole("button", { name: "表情库", exact: true }).click();
await expect(
  page.getByRole("button", { name: "取消收藏", exact: true }),
).toBeVisible();
await expect(
  page.getByText("合成验收、星星、平静", { exact: true }),
).toBeVisible();
await nav.getByRole("button", { name: "插件设置", exact: true }).click();
await page.getByRole("button", { name: "动态效果", exact: true }).click();
await page.getByRole("option", { name: "轻量", exact: true }).click();
await page
  .getByRole("button", { name: "保存更改", exact: true })
  .first()
  .click();
await expect(page.locator("html")).toHaveAttribute("data-motion", "light");
await page.reload({ waitUntil: "networkidle" });
await expect(page.locator("html")).toHaveAttribute("data-motion", "light");
await page.getByRole("button", { name: "动态效果", exact: true }).click();
await page.getByRole("option", { name: "平衡", exact: true }).click();
await page
  .getByRole("button", { name: "保存更改", exact: true })
  .first()
  .click();
await expect(page.locator("html")).toHaveAttribute("data-motion", "default");
return {
  result:
    "表情上传、收藏、关键词、目的创建完成、刷新持久化、动态设置保存与重载均通过",
};
