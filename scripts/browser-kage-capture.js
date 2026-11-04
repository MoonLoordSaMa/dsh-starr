const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
const screenshot = await page.screenshot({ fullPage: false });
const layout = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > innerWidth,
  hero: document
    .querySelector(".landing-hero")
    ?.getBoundingClientRect()
    .toJSON(),
  world: document
    .querySelector(".world-scene")
    ?.getBoundingClientRect()
    .toJSON(),
  canvases: document.querySelectorAll("canvas").length,
  errors: document.querySelectorAll("[role=alert]").length,
}));
await cdp.detach();
return { screenshot: screenshot.path, layout };
