await page.reload({ waitUntil: "networkidle" });
await page
  .getByRole("navigation", { name: "主要导航" })
  .getByRole("button", { name: "概览", exact: true })
  .click();
await expect(page.locator(".starmap canvas")).toHaveCount(1);
return {
  view: await tabbit.observe({ frames: "none", maxChars: 6500 }),
  css: await page.evaluate(() => ({
    theme: [...document.styleSheets].length,
    overflow: document.documentElement.scrollWidth > innerWidth,
  })),
};
