globalThis.starrCDP = await context.newCDPSession(page);
await globalThis.starrCDP.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await page.reload({ waitUntil: "networkidle" });
await expect(
  page.getByRole("heading", { name: "她记得的宇宙", exact: true }),
).toBeVisible();
return await page.screenshot({ fullPage: false });
