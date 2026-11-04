const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
const shot = await page.screenshot({ fullPage: false });
const layout = await page.evaluate(() => ({
  labels: [...document.querySelectorAll(".cluster-label")].map((e) => ({
    name: e.textContent,
    hidden: e.hidden,
    transform: e.style.transform,
  })),
  canvases: document.querySelectorAll("canvas").length,
  main: document.querySelector("main").getBoundingClientRect().toJSON(),
}));
await cdp.detach();
return { screenshot: shot.path, layout };
