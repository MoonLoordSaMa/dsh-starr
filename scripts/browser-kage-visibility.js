const cdp = await context.newCDPSession(page);
const before = await page.evaluate(() => ({
  visibility: document.visibilityState,
  focus: document.hasFocus(),
}));
try {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  const after = await page.evaluate(() => ({
    visibility: document.visibilityState,
    focus: document.hasFocus(),
  }));
  return { before, after };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
