await page.getByRole("button", { name: "继续", exact: true }).click();
await page
  .getByRole("textbox", { name: "角色名称", exact: true })
  .fill("预览角色");
await page
  .getByRole("textbox", { name: "人格与相处方式", exact: true })
  .fill(
    "这是界面与功能验收专用的隔离角色，记忆中的合成示例不属于真实斯塔。现有角色与正式备份均不改写。",
  );
await page.getByRole("button", { name: "继续", exact: true }).click();
await page.getByRole("button", { name: "进入 starr", exact: true }).click();
await expect(
  page.getByRole("heading", { name: "概览", exact: true }),
).toBeVisible();
return await tabbit.observe({ frames: "none", maxChars: 5500 });
