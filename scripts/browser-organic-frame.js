const video = page.locator("video").first();
await video.evaluate((v) => {
  v.pause();
  v.currentTime = 8;
  v.scrollIntoView({ block: "center" });
});
await page.mouse.move(1350, 100);
const shot = await page.screenshot({ fullPage: false });
return { time: await video.evaluate((v) => v.currentTime), shot };
