const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
globalThis.kageErrors = [];
globalThis.kageConsole = [];
page.on("pageerror", (e) => globalThis.kageErrors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") globalThis.kageConsole.push(m.text());
});
await page.goto("http://127.0.0.1:17841/#overview", {
  waitUntil: "networkidle",
});
await page.reload({ waitUntil: "networkidle" });
await expect(page.locator(".world-scene canvas")).toHaveCount(1);
await expect(
  page.getByRole("navigation", { name: "工作区导航" }),
).toBeVisible();
await cdp.detach();
return {
  view: await tabbit.observe({ frames: "none", maxChars: 4500 }),
  errors: globalThis.kageErrors,
  console: globalThis.kageConsole,
};
