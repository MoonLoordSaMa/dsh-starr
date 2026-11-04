const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
globalThis.kageErrors = [];
globalThis.kageConsole = [];
page.on("pageerror", (e) => globalThis.kageErrors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") globalThis.kageConsole.push(m.text());
});
await page.reload({ waitUntil: "networkidle" });
const groups = {
  概览: "观测站",
  角色: "她的世界",
  记忆: "她的世界",
  心理与身体: "她的世界",
  对话: "与世界相连",
  "TA 的五官": "与世界相连",
  跨平台会话: "与世界相连",
  表情库: "与世界相连",
  维护任务: "空间管理",
  插件设置: "空间管理",
};
globalThis.kageGo = async (name) => {
  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("button", { name: groups[name], exact: true })
    .click();
  if (name !== "概览")
    await page
      .getByRole("navigation", { name: "主要导航" })
      .getByRole("button", { name, exact: true })
      .click();
  await expect(
    page.getByRole("heading", { level: 1, name, exact: true }),
  ).toHaveCount(1);
};
await kageGo("概览");
await expect(page.locator(".sidebar")).toHaveCount(0);
await expect(page.locator(".world-scene canvas")).toHaveCount(1);
await page.evaluate(
  () => (window.__worldCanvas = document.querySelector(".world-scene canvas")),
);
await page.getByRole("button", { name: "走进记忆的星海", exact: true }).click();
await expect(page.locator(".sidebar nav>button")).toHaveCount(3);
await page.locator(".memory-row").first().click();
await expect(page.locator(".memory-detail h2")).toHaveCount(1);
const reading = await page.evaluate(async () => {
  const detail = document.querySelector(".memory-detail"),
    body = detail.querySelector(".memory-body");
  const graph = await fetch(
    `/api/characters/${localStorage.getItem("starr-character")}/graph`,
  ).then((r) => r.json());
  const node = graph.nodes.find(
    (n) => n.title === detail.querySelector("h2").textContent,
  );
  const r = detail.getBoundingClientRect(),
    m = document.querySelector("main").getBoundingClientRect();
  const result = {
    fullText: body.textContent === node.content,
    displayedLength: body.textContent.length,
    sourceLength: node.content.length,
    onRight: r.left > m.left + m.width * 0.5,
    whiteSpace: getComputedStyle(body).whiteSpace,
    maxHeight: getComputedStyle(body).maxHeight,
  };
  const original = body.textContent;
  const long =
    Array.from(
      { length: 50 },
      (_, i) =>
        `第 ${i + 1} 段：这是完整记忆的长文阅读布局检查，正文应保留换行、自然换行，并允许滚动到最后。`,
    ).join("\n\n") + "\n完整正文结束";
  body.textContent = long;
  result.longTextPresent = body.textContent === long;
  result.bodyClientHeight = body.clientHeight;
  result.bodyScrollHeight = body.scrollHeight;
  detail.scrollTop = detail.scrollHeight;
  result.detailCanScroll = detail.scrollTop > 0;
  body.textContent = original;
  detail.scrollTop = 0;
  return result;
});
assert(
  reading.fullText &&
    reading.onRight &&
    reading.longTextPresent &&
    reading.detailCanScroll,
);
assert(reading.bodyClientHeight >= reading.bodyScrollHeight - 1);
await page.getByRole("button", { name: "返回上一级星图", exact: true }).click();
await expect(page.locator(".memory-detail h2")).toHaveCount(0);
const filters = [];
await page.evaluate(
  () => (window.__mapCanvas = document.querySelector(".starmap canvas")),
);
for (const name of ["人物", "约定", "兴趣", "日记", "概览", "全部"]) {
  await page
    .getByRole("group", { name: "记忆类型" })
    .getByRole("button", { name: new RegExp("^" + name) })
    .click();
  filters.push({
    name,
    sameCanvas: await page.evaluate(
      () => window.__mapCanvas === document.querySelector(".starmap canvas"),
    ),
  });
}
await page.getByRole("button", { name: "记录记忆", exact: true }).click();
await expect(page.getByRole("dialog")).toBeVisible();
await page.keyboard.press("Escape");
await expect(page.getByRole("dialog")).toHaveCount(0);
const focus = await page
  .getByRole("button", { name: "记录记忆", exact: true })
  .evaluate((e) => e === document.activeElement);
const layouts = [];
for (const name of Object.keys(groups)) {
  await kageGo(name);
  layouts.push(
    await page.evaluate(
      (name) => ({
        name,
        overflow: document.documentElement.scrollWidth > innerWidth,
        contextButtons: document.querySelectorAll(".sidebar nav>button").length,
        alerts: [...document.querySelectorAll("[role=alert]")].map(
          (e) => e.textContent,
        ),
      }),
      name,
    ),
  );
}
for (let i = 0; i < 18; i++)
  await kageGo(i % 3 === 0 ? "记忆" : i % 3 === 1 ? "心理与身体" : "插件设置");
const sameBackground = await page.evaluate(
  () => window.__worldCanvas === document.querySelector(".world-scene canvas"),
);
await kageGo("插件设置");
await page.getByRole("button", { name: "动态效果", exact: true }).click();
await page.getByRole("option", { name: "减少动态", exact: true }).click();
await page
  .getByRole("button", { name: "保存更改", exact: true })
  .first()
  .click();
await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
await kageGo("记忆");
await page.locator(".memory-row").first().click();
await expect(page.locator(".memory-detail h2")).toHaveCount(1);
await page.getByRole("button", { name: "全景", exact: true }).click();
await expect(page.locator(".memory-detail h2")).toHaveCount(0);
const reducedAnimations = await page.evaluate(
  () =>
    document.getAnimations().filter((a) => a.playState === "running").length,
);
await kageGo("插件设置");
await page.getByRole("button", { name: "动态效果", exact: true }).click();
await page.getByRole("option", { name: "强动效", exact: true }).click();
await page
  .getByRole("button", { name: "保存更改", exact: true })
  .first()
  .click();
await expect(page.locator("html")).toHaveAttribute("data-motion", "vivid");
await kageGo("记忆");
await page.locator(".memory-row").first().click();
await expect(page.locator(".memory-detail h2")).toHaveCount(1);
await cdp.detach();
return {
  reading,
  filters,
  focus,
  layouts,
  sameBackground,
  reducedAnimations,
  errors: globalThis.kageErrors,
  console: globalThis.kageConsole,
  finalMode: await page.locator("html").getAttribute("data-motion"),
};
