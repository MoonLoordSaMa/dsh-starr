const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
try {
  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("button", { name: "空间管理", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "插件设置", exact: true })
    .click();
  await page.getByRole("button", { name: "动态效果", exact: true }).click();
  await page.getByRole("option", { name: "减少动态", exact: true }).click();
  await page
    .getByRole("button", { name: "保存更改", exact: true })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("button", { name: "她的世界", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "心理与身体", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.getAnimations().filter((a) => a.playState === "running")
        .length === 0,
    undefined,
    { polling: 100, timeout: 3000 },
  );
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running")
      .map((a) => ({
        cls: a.effect?.target?.className,
        duration: a.effect?.getTiming().duration,
      })),
  );
  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("button", { name: "空间管理", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "插件设置", exact: true })
    .click();
  await page.getByRole("button", { name: "动态效果", exact: true }).click();
  await page.getByRole("option", { name: "强动效", exact: true }).click();
  await page
    .getByRole("button", { name: "保存更改", exact: true })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "vivid");
  return { reducedRunning: running, restored: "vivid" };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
