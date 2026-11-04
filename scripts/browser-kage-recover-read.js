return {
  view: await tabbit.observe({ frames: "none", maxChars: 2200 }),
  state: await page.evaluate(() => ({
    page: location.hash,
    mode: document.documentElement.dataset.motion,
    labels: [...document.querySelectorAll(".cluster-label")].map((e) => ({
      label: e.textContent,
      transform: e.style.transform,
      visibility: e.style.visibility,
    })),
    body: document.querySelector(".memory-body")?.textContent,
    world: document.querySelectorAll(".world-scene canvas").length,
  })),
};
