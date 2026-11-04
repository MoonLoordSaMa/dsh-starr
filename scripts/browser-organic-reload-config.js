await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "动态效果", exact: true }).click();
return {
  options: await page.getByRole("option").allTextContents(),
  revision: await page.evaluate(async () => {
    const c = await (
      await fetch(`/api/characters/${localStorage.getItem("starr-character")}`)
    ).json();
    return c.revision;
  }),
};
