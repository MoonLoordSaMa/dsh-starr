const kage = await context.newPage();
await usePage(kage);
await page.goto("https://threeui.com/landing-pages/kage-landing-page", {
  waitUntil: "domcontentloaded",
});
const kageView = await tabbit.observe({ frames: "all", maxChars: 9500 });
const kageShot = await page.screenshot({ fullPage: false });
const sylva = await context.newPage();
await usePage(sylva);
await page.goto("https://threeui.com/hero/sylva", {
  waitUntil: "domcontentloaded",
});
const sylvaView = await tabbit.observe({ frames: "all", maxChars: 9500 });
const sylvaShot = await page.screenshot({ fullPage: false });
return {
  kage: { view: kageView, screenshot: kageShot.path },
  sylva: { view: sylvaView, screenshot: sylvaShot.path },
};
