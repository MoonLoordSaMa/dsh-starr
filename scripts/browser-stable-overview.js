const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
const state = await page.evaluate(() => ({
  title: document.querySelector("h1").textContent,
  dimmed: Array.from(
    document.querySelectorAll(
      "main .panel-heading,main .universe-intro,main .page-title h1",
    ),
  )
    .filter((el) => getComputedStyle(el).opacity !== "1")
    .map((el) => ({
      className: el.className,
      opacity: getComputedStyle(el).opacity,
    })),
}));
assert.equal(state.title, "概览");
assert.equal(state.dimmed.length, 0);
const shot = await page.screenshot({ fullPage: false });
await cdp.detach();
return { state, overview: shot.path };
