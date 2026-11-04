const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
const layout = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > innerWidth,
  labels: Array.from(document.querySelectorAll(".cluster-label")).map((el) => ({
    label: el.textContent,
    hidden: el.hidden,
    rect: {
      x: el.getBoundingClientRect().x,
      y: el.getBoundingClientRect().y,
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
    },
  })),
  errors: document.querySelectorAll("[role=alert]").length,
}));
const shot = await page.screenshot({ fullPage: false });
await cdp.detach();
return { layout, screenshot: shot.path };
