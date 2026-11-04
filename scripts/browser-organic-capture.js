const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
globalThis.captureErrors = [];
page.on("pageerror", (e) => captureErrors.push(e.message));
const out = { layouts: [], shots: {} };
async function layout(name) {
  return await page.evaluate(
    (name) => ({
      name,
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      alerts: [...document.querySelectorAll("[role=alert]")].map(
        (e) => e.textContent,
      ),
      outside: [
        ...document.querySelectorAll("main button,main input,main textarea"),
      ]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.width &&
            r.height &&
            r.top >= 0 &&
            r.top < innerHeight &&
            r.right > innerWidth + 2
          );
        })
        .map((e) => e.textContent.slice(0, 25)),
    }),
    name,
  );
}
async function settled() {
  await page.waitForFunction(
    () => {
      const h = document.querySelector(".page-title h1");
      return !h || Number(getComputedStyle(h).opacity) > 0.98;
    },
    undefined,
    { polling: 100, timeout: 6000 },
  );
}
try {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.reload({ waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "工作区导航" });
  await nav.getByRole("button", { name: "她的世界", exact: true }).click();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "心理与身体", exact: true })
    .click();
  await expect(page.locator(".emotion-key > div")).toHaveCount(8);
  await settled();
  out.shots.state = (await page.screenshot({ fullPage: false })).path;
  out.layouts.push(await layout("心潮1440"));
  await page.getByRole("tab", { name: "全部感受", exact: true }).click();
  await expect(page.locator(".emotion-key > div")).toHaveCount(18);
  out.shots.allEmotions = (await page.screenshot({ fullPage: false })).path;
  await page.getByRole("tab", { name: "主要心潮", exact: true }).click();
  for (const size of [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      ...size,
      deviceScaleFactor: 1,
      mobile: false,
    });
    out.layouts.push(await layout(`心潮${size.width}`));
    out.shots[`state${size.width}`] = (
      await page.screenshot({ fullPage: false })
    ).path;
  }
  await nav.getByRole("button", { name: "观测站", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("main").scrollTop < 1 &&
      [...document.querySelectorAll(".hero-intro h2 span")].every(
        (e) => Number(getComputedStyle(e).opacity) > 0.98,
      ),
    undefined,
    { polling: 100, timeout: 6000 },
  );
  out.layouts.push(await layout("首页390"));
  out.shots.home390 = (await page.screenshot({ fullPage: false })).path;
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  out.shots.home = (await page.screenshot({ fullPage: false })).path;
  out.poem = await page.locator(".hero-intro h2").innerText();
  out.layouts.push(await layout("首页1440"));
  out.errors = captureErrors;
  return out;
} finally {
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.detach();
}
