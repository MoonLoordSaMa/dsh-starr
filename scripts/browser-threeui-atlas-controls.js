const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
try {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("button", { name: "她的世界", exact: true })
    .click();
  const nav = page.getByRole("navigation", { name: "主要导航" });
  await nav.getByRole("button", { name: "记忆", exact: true }).click();
  await page.getByRole("button", { name: "全景", exact: true }).click();
  await expect(page.locator(".starmap canvas")).toHaveCount(1);
  const map = page.locator(".starmap");
  const box = await map.boundingBox();
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y);
  const positions = () =>
    page.locator(".cluster-label").evaluateAll((items) =>
      items.map((e) => ({
        id: e.getAttribute("aria-label"),
        visible: getComputedStyle(e).visibility !== "hidden",
        x: new DOMMatrix(getComputedStyle(e).transform).m41,
        y: new DOMMatrix(getComputedStyle(e).transform).m42,
      })),
    );
  // 等候真实投影位置收敛，避免在阻尼动画中采样。
  const settled = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          let last = "",
            since = performance.now(),
            start = since;
          function frame(now) {
            const next = [...document.querySelectorAll(".cluster-label")]
              .map((e) => e.style.transform)
              .join("|");
            if (next !== last) {
              last = next;
              since = now;
            }
            if (now - since > 450 || now - start > 6000)
              resolve(now - since > 450);
            else requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }),
    );
  await settled();
  const initial = await positions();
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(center.x + 110, center.y + 45, { steps: 15 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await page.mouse.move(center.x, center.y);
  const displaced = await positions();
  await page.waitForFunction(
    (expected) => {
      const items = [...document.querySelectorAll(".cluster-label")];
      return items.every((e, i) => {
        const m = new DOMMatrix(getComputedStyle(e).transform);
        return (
          Math.abs(m.m41 - expected[i].x) < 2 &&
          Math.abs(m.m42 - expected[i].y) < 2
        );
      });
    },
    initial,
    { timeout: 10000 },
  );
  const recentered = await positions();
  // 真正的鼠标拾取，不以列表点击代替星点选择。
  let picked = null;
  for (let row = 1; row < 9 && !picked; row++) {
    for (let col = 1; col < 17 && !picked; col++) {
      const x = box.x + (box.width * col) / 18,
        y = box.y + 64 + ((box.height - 122) * row) / 10;
      await page.mouse.move(x, y);
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            let start = performance.now();
            function frame(now) {
              if (now - start > 70) resolve(true);
              else requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
          }),
      );
      const text = await page
        .locator(".map-bottom > span")
        .first()
        .textContent();
      if (text.includes("权重")) {
        await page.mouse.click(x, y);
        await expect(page.locator(".memory-detail h2")).toHaveCount(1);
        picked = {
          text,
          title: await page.locator(".memory-detail h2").textContent(),
        };
      }
    }
  }
  assert(picked, "未在扫描范围内拾取星点");
  // 空白处依照当前层级返回，独立于工具栏。
  await map.click({ position: { x: 20, y: box.height - 65 } });
  await expect(page.locator(".memory-detail h2")).toHaveCount(0);
  await page.getByRole("button", { name: /聚焦人物星团/ }).click();
  await expect(
    page
      .getByRole("group", { name: "记忆类型" })
      .getByRole("button", { name: /^人物/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await map.click({ position: { x: 20, y: box.height - 65 } });
  await expect(
    page
      .getByRole("group", { name: "记忆类型" })
      .getByRole("button", { name: /^全部/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "全景", exact: true }).click();
  await settled();
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 150, center.y - 50, { steps: 20 });
  await page.mouse.up();
  await page.mouse.wheel(0, -100);
  await settled();
  const rotated = await positions();
  const screenshot = await page.screenshot({ fullPage: false });
  const result = {
    initial,
    displaced,
    recentered,
    picked,
    rotated,
    screenshot: screenshot.path,
    emptyBack: true,
    rotateAndWheel: true,
    onlyOneMap: (await page.locator(".starmap canvas").count()) === 1,
  };
  await page.getByRole("button", { name: "全景", exact: true }).click();
  return result;
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
