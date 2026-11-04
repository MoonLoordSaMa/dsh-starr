const results = [];
for (const p of pages().filter((p) =>
  p.url().startsWith("https://threeui.com/"),
)) {
  await usePage(p);
  results.push({
    url: page.url(),
    main: await page
      .locator("main")
      .innerText()
      .catch(() => null),
    previews: await page
      .locator("a")
      .evaluateAll((els) =>
        els
          .filter(
            (e) =>
              /Open Preview|GitHub/i.test(e.textContent) ||
              /preview/i.test(e.getAttribute("href") || ""),
          )
          .map((e) => ({ text: e.textContent, url: e.href })),
      ),
    frames: await page
      .locator("iframe")
      .evaluateAll((els) =>
        els.map((e) => ({ src: e.src, title: e.title, html: !!e.srcdoc })),
      ),
  });
}
return results;
