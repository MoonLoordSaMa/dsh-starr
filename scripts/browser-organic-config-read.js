return await page.evaluate(async () => {
  const id = localStorage.getItem("starr-character");
  const c = await (await fetch(`/api/characters/${id}`)).json();
  return {
    mode: document.documentElement.dataset.motion,
    savedMode: c.config["ui.motion"],
    revision: c.revision,
    alerts: [...document.querySelectorAll("[role=alert],.inline-error")].map(
      (e) => e.textContent,
    ),
    options: [...document.querySelectorAll("[role=option]")].map(
      (e) => e.textContent,
    ),
  };
});
