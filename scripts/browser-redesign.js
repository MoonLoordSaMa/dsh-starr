const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
globalThis.starrErrors = [];
page.on("pageerror", (e) => globalThis.starrErrors.push(e.message));
await page.goto("http://127.0.0.1:17841/#overview", {
  waitUntil: "networkidle",
});
await page.reload({ waitUntil: "networkidle" });
await expect(
  page.getByRole("heading", { name: "她记得的宇宙", exact: true }),
).toBeVisible();
await expect(page.locator(".starmap canvas")).toHaveCount(1);
const layout = await page.evaluate(() => ({
  width: innerWidth,
  overflow: document.documentElement.scrollWidth > innerWidth,
  heading: getComputedStyle(document.querySelector("h1")).color,
  background: getComputedStyle(document.documentElement).backgroundColor,
  stars: document.querySelectorAll("canvas").length,
}));
const screenshot = await page.screenshot({ fullPage: false });
await cdp.detach();
return { layout, errors: globalThis.starrErrors, screenshot };
