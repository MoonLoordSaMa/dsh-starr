const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
try {
  globalThis.organicErrors = [];
  globalThis.organicConsole = [];
  page.on("pageerror", (e) => globalThis.organicErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") globalThis.organicConsole.push(m.text());
  });
  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("button", { name: "她的世界", exact: true })
    .click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "心理与身体", exact: true })
    .click();
  await expect(page.locator(".emotion-key > div")).toHaveCount(4);
  return {
    view: await tabbit.observe({ frames: "none", maxChars: 2800 }),
    errors: globalThis.organicErrors,
  };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
