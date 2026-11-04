return {
  url: page.url(),
  view: await tabbit.observe({ frames: "none", maxChars: 10000 }),
  metrics: await page.evaluate(() => ({
    width: innerWidth,
    canvases: document.querySelectorAll("canvas").length,
  })),
};
