return await page.evaluate(() => ({
  motion: document.documentElement.dataset.motion,
  hidden: document.hidden,
  targets: Array.from(
    document.querySelectorAll(
      ".page-title h1,.page-title p,.panel-heading,.universe-intro,.emotion-title,.config-row,.state-slider,.empty",
    ),
  )
    .filter((el) => el.offsetParent !== null)
    .map((el) => ({
      tag: el.tagName,
      cls: el.className,
      text: el.textContent.slice(0, 30),
      inline: el.getAttribute("style"),
      opacity: getComputedStyle(el).opacity,
      transform: getComputedStyle(el).transform,
    })),
  animations: document
    .getAnimations()
    .map((a) => ({ playState: a.playState, type: a.constructor.name })),
}));
