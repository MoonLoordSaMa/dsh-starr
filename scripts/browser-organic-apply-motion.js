await page.getByRole("option", { name: "强动效", exact: true }).click();
await page
  .getByRole("button", { name: "保存更改", exact: true })
  .first()
  .click();
await expect(page.locator("html")).toHaveAttribute("data-motion", "vivid");
return { mode: await page.locator("html").getAttribute("data-motion") };
