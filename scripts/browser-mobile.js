const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: false,
});
await page.getByRole("button", { name: "展开导航", exact: true }).click();
await page
  .getByRole("navigation", { name: "主要导航" })
  .getByRole("button", { name: /^概览/ })
  .click();
await expect(
  page.getByRole("heading", { name: "她记得的宇宙", exact: true }),
).toBeVisible();
const result = await page.evaluate(() => ({
  width: innerWidth,
  height: innerHeight,
  overflow: document.documentElement.scrollWidth > innerWidth,
  navVisible:
    document.querySelector(".sidebar").getBoundingClientRect().right > 10,
  buttons: Array.from(document.querySelectorAll("main button"))
    .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
    .map((e) => e.textContent),
}));
const screenshot = await page.screenshot({ fullPage: false });
await cdp.detach();
return { result, screenshot };
