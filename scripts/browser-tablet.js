const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 768,
  height: 1024,
  deviceScaleFactor: 1,
  mobile: false,
});
await page.getByRole("button", { name: "展开导航", exact: true }).click();
await page
  .getByRole("navigation", { name: "主要导航" })
  .getByRole("button", { name: "记忆", exact: true })
  .click();
await expect(page.locator(".starmap canvas")).toBeVisible();
const result = await page.evaluate(() => ({
  width: innerWidth,
  height: innerHeight,
  overflow: document.documentElement.scrollWidth > innerWidth,
  canvases: document.querySelectorAll("canvas").length,
}));
const screenshot = await page.screenshot({ fullPage: false });
await cdp.detach();
return { result, screenshot };
