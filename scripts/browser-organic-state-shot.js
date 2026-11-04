const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
try {
  return {
    shot: await page.screenshot({ fullPage: false }),
    layout: await page.evaluate(() => ({
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      emotion: getComputedStyle(document.querySelector(".weather-heading h3"))
        .fontSize,
      mode: document.documentElement.dataset.motion,
      errors: [...document.querySelectorAll("[role=alert]")].map(
        (e) => e.textContent,
      ),
    })),
    errors: globalThis.organicErrors,
    console: globalThis.organicConsole,
  };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
