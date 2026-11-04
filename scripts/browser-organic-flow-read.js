return {
  state: await page.evaluate(async () => {
    const id = localStorage.getItem("starr-character");
    const [s, g] = await Promise.all([
      fetch(`/api/characters/${id}/state`).then((r) => r.json()),
      fetch(`/api/characters/${id}/goals`).then((r) => r.json()),
    ]);
    return {
      revision: s.revision,
      evidence: s.evidence,
      goals: g.map((x) => ({
        id: x.id,
        title: x.title,
        status: x.status,
        drive: x.drive,
        action: x.action,
      })),
      mode: document.documentElement.dataset.motion,
    };
  }),
  view: await tabbit.observe({ frames: "none", maxChars: 500 }),
};
