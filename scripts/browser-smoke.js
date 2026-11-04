await expect(
  page.getByRole("heading", { name: "她记得的宇宙", exact: true }),
).toBeVisible();
await page.getByRole("button", { name: "记录记忆", exact: true }).click();
await page
  .getByRole("textbox", { name: "一个简短的标题", exact: true })
  .fill("界面验收：第一颗记忆");
await page
  .getByRole("textbox", { name: "想记住的事", exact: true })
  .fill(
    "这是一条用于界面验收的合成示例，验证即时保存、笔记投影和星图选择。它不属于真实角色的历史。",
  );
await page.getByRole("button", { name: "保存记忆", exact: true }).click();
await expect(page.getByRole("dialog")).toHaveCount(0);
await expect(
  page.getByText("界面验收：第一颗记忆", { exact: true }),
).toBeVisible();
return await page.screenshot({ fullPage: false });
