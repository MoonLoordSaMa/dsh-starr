const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
try {
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "心潮与体感", exact: true }).click();
  await expect(page.locator(".emotion-key > div")).toHaveCount(8);
  const normalCount = await page
    .locator(".emotion-current")
    .getAttribute("data-emotion-count");
  await page.getByRole("tab", { name: "全部感受", exact: true }).click();
  const evidence = await page.evaluate(async () => {
    const id = localStorage.getItem("starr-character");
    const [s, h, g] = await Promise.all([
      fetch(`/api/characters/${id}/state`).then((r) => r.json()),
      fetch(`/api/characters/${id}/state/history`).then((r) => r.json()),
      fetch(`/api/characters/${id}/goals`).then((r) => r.json()),
    ]);
    const e = h.find((e) =>
      e.after.evidence.includes("独立预览验收：模拟完成小任务"),
    );
    const goal = g.find((x) => x.id === "f6bdbcaf-0b74-4526-b3b8-bdfc26f23d19");
    return {
      count: s.organism.emotions.filter((e) => e.intensity > 0).length,
      revision: s.revision,
      event: e
        ? {
            beforeRevision: e.before.revision,
            afterRevision: e.after.revision,
            beforeConfidence: e.before.confidence,
            afterConfidence: e.after.confidence,
            persisted: s.evidence === e.after.evidence,
          }
        : null,
      goal,
    };
  });
  await expect(page.locator(".emotion-key > div")).toHaveCount(evidence.count);
  const allCount = await page
    .locator(".emotion-current")
    .getAttribute("data-emotion-count");
  assert(
    evidence.event.persisted &&
      evidence.event.afterRevision === evidence.event.beforeRevision + 1,
  );
  assert(
    evidence.goal.drive === "achievement" && evidence.goal.action === "work",
  );
  await page.getByRole("tab", { name: "愿望与目的", exact: true }).click();
  const row = page.locator(".purpose-row").filter({
    has: page.getByRole("heading", {
      name: evidence.goal.title,
      exact: true,
    }),
  });
  await row.getByRole("button", { name: "先放下", exact: true }).click();
  await expect(row).toContainText("已放下");
  await page.getByRole("tab", { name: "心潮与体感", exact: true }).click();
  return {
    normalCount,
    allCount,
    event: evidence.event,
    goal: {
      drive: evidence.goal.drive,
      action: evidence.goal.action,
      persisted: true,
      status: "cancelled",
    },
    errors: globalThis.kageErrors ?? [],
    console: globalThis.kageConsole ?? [],
    mode: await page.locator("html").getAttribute("data-motion"),
  };
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
