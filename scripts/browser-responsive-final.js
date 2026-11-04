const cdp = await context.newCDPSession(page);
const measurements = [];
const shots = [];
for (const width of [390, 768]) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: width === 390 ? 844 : 1024,
    deviceScaleFactor: 1,
    mobile: false,
  });
  if (
    await page
      .getByRole("button", { name: "展开导航", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "展开导航", exact: true }).click();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: width === 390 ? "概览" : "记忆", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".sidebar").getBoundingClientRect().right <= 1,
  );
  await expect(page.locator(".starmap canvas")).toHaveCount(1);
  measurements.push(
    await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      menuClosed:
        document.querySelector(".sidebar").getBoundingClientRect().right <= 1,
      visibleOverflows: Array.from(
        document.querySelectorAll("main button,main input"),
      )
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            !el.closest(".sr-only") &&
            r.width > 2 &&
            r.height > 2 &&
            r.left >= 0 &&
            r.right > innerWidth + 1 &&
            getComputedStyle(el).visibility !== "hidden"
          );
        })
        .slice(0, 10)
        .map((el) => el.textContent),
    })),
  );
  shots.push({ width, screenshot: await page.screenshot({ fullPage: false }) });
}
await cdp.detach();
return { measurements, shots };
