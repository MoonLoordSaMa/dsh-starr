const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
try {
  await page.reload({ waitUntil: "networkidle" });
  return {
    view: await tabbit.observe({ frames: "none", maxChars: 4000 }),
    state: await page.evaluate(async () => {
      const b = await (await fetch("/api/bootstrap")).json();
      const s = await (
        await fetch(`/api/characters/${b.characters[0].id}/state`)
      ).json();
      return {
        emotion: s.emotion,
        revision: s.revision,
        body: s.energy,
        organism: !!s.organism,
        mode: document.documentElement.dataset.motion,
      };
    }),
  };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
