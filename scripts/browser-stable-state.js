const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
const settled = await page.evaluate(() =>
  Array.from(
    document.querySelectorAll("main .panel-heading,main .state-slider"),
  ).every((el) => getComputedStyle(el).opacity === "1"),
);
assert.equal(settled, true);
const state = await page.screenshot({ fullPage: false });
await page
  .getByRole("navigation", { name: "主要导航" })
  .getByRole("button", { name: "概览", exact: true })
  .click();
await expect(page.getByRole("heading", { level: 1 })).toHaveText("概览");
await cdp.detach();
return { state: state.path, settled };
