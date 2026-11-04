const cdp = await context.newCDPSession(page);
const results = [];
for (const width of [390, 768, 1100]) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: width === 390 ? 844 : 1024,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("button", { name: "观测站", exact: true })
    .click();
  await expect(page.locator(".landing-hero")).toBeVisible();
  const home = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    hero: document
      .querySelector(".landing-hero")
      .getBoundingClientRect()
      .toJSON(),
    controls: [
      ...document.querySelectorAll(
        ".hero-actions button,.workspace-navigation button",
      ),
    ].map((e) => {
      const r = e.getBoundingClientRect();
      return { text: e.textContent, left: r.left, right: r.right };
    }),
  }));
  const homeShot =
    width === 390 ? await page.screenshot({ fullPage: false }) : null;
  await page
    .getByRole("button", { name: "走进记忆的星海", exact: true })
    .click();
  await expect(page.locator(".starmap canvas")).toHaveCount(1);
  await page.locator(".memory-row").first().click();
  await expect(page.locator(".memory-detail h2")).toHaveCount(1);
  const memory = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    detailVisible:
      document.querySelector(".memory-detail").getBoundingClientRect().width >
      0,
    body: [...document.querySelectorAll(".memory-body")].map((e) => ({
      maxHeight: getComputedStyle(e).maxHeight,
      clamp: getComputedStyle(e).webkitLineClamp,
    })),
    visibleOverflows: [...document.querySelectorAll("main button,main input")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return (
          !e.closest(".sr-only") &&
          r.width > 2 &&
          r.height > 2 &&
          r.left >= 0 &&
          r.right > innerWidth + 1 &&
          getComputedStyle(e).visibility !== "hidden"
        );
      })
      .slice(0, 10)
      .map((e) => e.textContent),
  }));
  await page.getByRole("button", { name: "关闭记忆详情", exact: true }).click();
  await page.getByRole("button", { name: "展开导航", exact: true }).click();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "心理与身体", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".sidebar").getBoundingClientRect().right <= 1,
    undefined,
    { polling: 100 },
  );
  const nav = await page.evaluate(() => ({
    hidden: document.querySelector(".sidebar").inert,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  const shot =
    width === 768 ? await page.screenshot({ fullPage: false }) : null;
  results.push({
    width,
    home,
    memory,
    nav,
    homeShot: homeShot?.path,
    stateShot: shot?.path,
  });
}
await page
  .getByRole("navigation", { name: "工作区导航" })
  .getByRole("button", { name: "观测站", exact: true })
  .click();
await cdp.detach();
return {
  results,
  errors: globalThis.kageErrors,
  console: globalThis.kageConsole,
};
