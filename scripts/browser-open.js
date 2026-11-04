await page.goto("http://127.0.0.1:17841/", { waitUntil: "networkidle" });
globalThis.starrErrors = [];
page.on("pageerror", (e) => globalThis.starrErrors.push(e.message));
return await tabbit.observe({ frames: "none", maxChars: 5000 });
