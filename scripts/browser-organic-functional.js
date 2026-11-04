const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
try {
  const nav = page.getByRole("navigation", { name: "工作区导航" });
  await nav.getByRole("button", { name: "她的世界", exact: true }).click();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "心理与身体", exact: true })
    .click();
  await expect(page.locator(".emotion-key > div")).toHaveCount(8);
  const normalCount = await page
    .locator(".emotion-current")
    .getAttribute("data-emotion-count");
  await page.getByRole("tab", { name: "全部感受", exact: true }).click();
  const expected = await page.evaluate(async () => {
    const s = await (
      await fetch(
        `/api/characters/${localStorage.getItem("starr-character")}/state`,
      )
    ).json();
    return s.organism.emotions.filter((e) => e.intensity > 0).length;
  });
  await expect(page.locator(".emotion-key > div")).toHaveCount(expected);
  assert(expected > 8);
  const allCount = await page
    .locator(".emotion-current")
    .getAttribute("data-emotion-count");
  await page.getByRole("tab", { name: "主要心潮", exact: true }).click();
  await page.getByRole("button", { name: "经历类型", exact: true }).click();
  await page.getByRole("option", { name: "有所完成", exact: true }).click();
  const evidence = `独立预览验收：模拟完成小任务，验证心理与身体驱动链路 ${Date.now()}`;
  await page
    .getByRole("textbox", { name: "发生了什么，为什么这样判断", exact: true })
    .fill(evidence);
  const before = await page.evaluate(
    async () =>
      await (
        await fetch(
          `/api/characters/${localStorage.getItem("starr-character")}/state`,
        )
      ).json(),
  );
  await page.getByRole("button", { name: "记录这次经历", exact: true }).click();
  await expect(
    page.getByRole("textbox", {
      name: "发生了什么，为什么这样判断",
      exact: true,
    }),
  ).toHaveValue("");
  const after = await page.evaluate(
    async () =>
      await (
        await fetch(
          `/api/characters/${localStorage.getItem("starr-character")}/state`,
        )
      ).json(),
  );
  assert(
    after.revision === before.revision + 1 &&
      after.confidence > before.confidence,
  );
  await page.getByRole("tab", { name: "经历的回声", exact: true }).click();
  await expect(page.locator(".history-row").first()).toContainText(evidence);
  await page.getByRole("tab", { name: "愿望与目的", exact: true }).click();
  await expect(page.locator(".drive-row")).toHaveCount(10);
  await page
    .getByRole("button", { name: "留下这个愿望", exact: true })
    .first()
    .click();
  await expect(page.locator(".purpose-row")).toHaveCount(1);
  const goal = await page.evaluate(async () => {
    const gs = await (
      await fetch(
        `/api/characters/${localStorage.getItem("starr-character")}/goals`,
      )
    ).json();
    return gs[0];
  });
  assert(!!goal.drive && !!goal.action);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "愿望与目的", exact: true }).click();
  await expect(page.locator(".purpose-row")).toHaveCount(1);
  const persisted = await page.evaluate(async () => {
    const s = await (
      await fetch(
        `/api/characters/${localStorage.getItem("starr-character")}/state`,
      )
    ).json();
    return { revision: s.revision, evidence: s.evidence };
  });
  assert(
    persisted.revision === after.revision && persisted.evidence === evidence,
  );
  await page.getByRole("button", { name: "先放下", exact: true }).click();
  await expect(page.locator(".purpose-row")).toContainText("已放下");
  await page.getByRole("tab", { name: "心潮与体感", exact: true }).click();
  return {
    normalCount,
    allCount,
    expected,
    experience: {
      beforeRevision: before.revision,
      afterRevision: after.revision,
      beforeConfidence: before.confidence,
      afterConfidence: after.confidence,
      persisted: true,
    },
    goal: {
      drive: goal.drive,
      action: goal.action,
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
