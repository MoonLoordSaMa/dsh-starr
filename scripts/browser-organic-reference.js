return {
  view: await tabbit.observe({ frames: "none", maxChars: 8000 }),
  metadata: await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    text: document.querySelector("#v_desc")?.innerText,
    subtitles: [
      ...document.querySelectorAll('[class*="subtitle"],[aria-label*="字幕"]'),
    ]
      .slice(0, 12)
      .map((e) => ({ text: e.textContent, cls: e.className })),
  })),
};
