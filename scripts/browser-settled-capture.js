const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
const shots = {};
const settled = [];
for (const [name, key] of [
  ["心理与身体", "state"],
  ["概览", "overview"],
]) {
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await page.waitForFunction(
    () =>
      Array.from(
        document.querySelectorAll(
          ".page-title h1,.page-title p,.panel-heading,.universe-intro,.emotion-title,.config-row,.state-slider,.empty",
        ),
      )
        .filter((el) => el.offsetParent !== null)
        .every((el) => !el.style.opacity && !el.style.transform),
    {},
    { timeout: 8000 },
  );
  settled.push(
    await page.evaluate(() => ({
      title: document.querySelector("h1").textContent,
      hiddenTargets: Array.from(
        document.querySelectorAll(
          "main .panel-heading,main .state-slider,main .universe-intro",
        ),
      ).filter((el) => getComputedStyle(el).opacity < 0.99).length,
    })),
  );
  const shot = await page.screenshot({ fullPage: false });
  shots[key] = shot.path;
}
await cdp.detach();
return { settled, screenshots: shots };
