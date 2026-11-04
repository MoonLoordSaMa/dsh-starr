globalThis.atlasErrors = [];
page.on("pageerror", (e) => globalThis.atlasErrors.push(e.message));
await page.reload({ waitUntil: "networkidle" });
await page
  .getByRole("navigation", { name: "主要导航" })
  .getByRole("button", { name: "记忆", exact: true })
  .click();
await expect(page.locator(".starmap canvas")).toHaveCount(1);
await page.evaluate(() => {
  window.__atlasCanvas = document.querySelector(".starmap canvas");
});
const canvasChecks = [];
for (const kind of ["人物", "约定", "兴趣", "日记", "概览", "全部"]) {
  await page
    .getByRole("group", { name: "记忆类型" })
    .getByRole("button", { name: new RegExp("^" + kind) })
    .click();
  canvasChecks.push(
    await page.evaluate(
      (kind) => ({
        kind,
        sameCanvas:
          window.__atlasCanvas === document.querySelector(".starmap canvas"),
        labels: document.querySelectorAll(".cluster-label").length,
      }),
      kind,
    ),
  );
}
await page
  .getByRole("group", { name: "记忆类型" })
  .getByRole("button", { name: /^人物/ })
  .click();
await page.locator(".memory-row").first().click();
await expect(page.locator(".memory-detail h2")).toHaveCount(1);
await page.getByRole("button", { name: "返回上一级星图", exact: true }).click();
await expect(page.locator(".memory-detail h2")).toHaveCount(0);
await expect(
  page
    .getByRole("group", { name: "记忆类型" })
    .getByRole("button", { name: /^人物/ }),
).toHaveAttribute("aria-pressed", "true");
await page.getByRole("button", { name: "返回上一级星图", exact: true }).click();
await expect(
  page
    .getByRole("group", { name: "记忆类型" })
    .getByRole("button", { name: /^全部/ }),
).toHaveAttribute("aria-pressed", "true");
await page.getByRole("button", { name: "全景", exact: true }).click();
return {
  canvasChecks,
  errors: globalThis.atlasErrors,
  scene: await page.locator(".starmap").getAttribute("aria-label"),
  page: await tabbit.observe({ frames: "none", maxChars: 6500 }),
};
