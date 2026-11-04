const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
try {
  return {
    shot: await page.screenshot({ fullPage: false }),
    view: await page.evaluate(() => ({
      scroll: document.querySelector("main").scrollTop,
      opacity: getComputedStyle(document.querySelector(".hero-actions"))
        .opacity,
    })),
  };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
