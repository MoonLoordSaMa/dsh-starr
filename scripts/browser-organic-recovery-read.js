return {
  view: await tabbit.observe({ frames: "none", maxChars: 3500 }),
  data: await page.evaluate(() => ({
    mode: document.documentElement.dataset.motion,
    options: [...document.querySelectorAll("[role=option]")].map(
      (e) => e.textContent,
    ),
    errors: globalThis.kageErrors ?? [],
    console: globalThis.kageConsole ?? [],
  })),
};
