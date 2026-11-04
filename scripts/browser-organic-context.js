// Adapted from TabbitAi/tabbit-webmcp @
// 13fef01b80ce371aeb53cf92bd3c677bb25c24bd. See ../WEBMCP-SOURCE.md for
// provenance and limitations. Each function is a standalone page.evaluate
// callback; nothing executes on load.

// 读取视频信息 — read. 读取当前 Bilibili
// 视频的标题、作者、时长、字幕和可用格式。
async function bilibili_get_video_context(rawInput = {}) {
  const bilibiliAdapter = {
    matches: (url) =>
      url.protocol === "https:" &&
      url.hostname === "www.bilibili.com" &&
      /^\/video\/(BV[\w]+|av\d+)\/?$/i.test(url.pathname),
  };
  const routeUrl = new URL(location.href);
  if (!bilibiliAdapter.matches(routeUrl))
    throw new Error(
      "UNSUPPORTED_ROUTE: Open a supported Bilibili page for this recipe.",
    );
  if (!(
    typeof rawInput === "object" &&
    rawInput !== null &&
    !Array.isArray(rawInput) &&
    Object.keys(rawInput).every((key) => [].includes(key))
  ))
    throw new Error(
      "VALIDATION_ERROR: Inputs do not match the documented recipe contract.",
    );
  const win = globalThis;
  const meta = (name) =>
    document
      .querySelector(`meta[property="${name}"],meta[name="${name}"]`)
      ?.content?.trim() || "";
  const text = (selectors) => {
    for (const selector of selectors) {
      const value = document.querySelector(selector)?.textContent?.trim();
      if (value) return value;
    }
    return "";
  };
  const absolute = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    try {
      return new URL(raw, location.href).href;
    } catch {
      return "";
    }
  };
  const duration = (value) => {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  };
  const authBlock = text([
    ".login-container",
    ".login-mask",
    '[class*="captcha"]',
    '[class*="verify"]',
  ]);
  if (authBlock && /登录|验证码|verify|sign in/i.test(authBlock))
    return {
      data: null,
      error: {
        code: /验证码|verify/i.test(authBlock)
          ? "PERMISSION_DENIED"
          : "AUTH_REQUIRED",
        message: authBlock.slice(0, 180),
        recoverable: true,
      },
    };
  const pageError = text([
    "#error-screen",
    ".error-container",
    '[class*="error-page"]',
    '[class*="exception"]',
  ]);
  if (/频繁|too many requests|rate limit|稍后再试/i.test(pageError))
    return {
      data: null,
      error: {
        code: "RATE_LIMITED",
        message: pageError.slice(0, 180),
        recoverable: true,
      },
    };
  if (
    /已删除|不存在|private video|video unavailable|内容无法查看/i.test(
      pageError,
    )
  )
    return {
      data: null,
      error: {
        code: "CONTENT_UNAVAILABLE",
        message: pageError.slice(0, 180),
        recoverable: false,
      },
    };
  const jsonLd = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  )
    .flatMap((node) => {
      try {
        const parsed = JSON.parse(node.textContent || "null");
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    })
    .find((entry) => entry && typeof entry === "object");
  const publicUrl = () =>
    "bilibili" === "youtube"
      ? `${location.origin}/watch?v=${encodeURIComponent(
          new URL(location.href).searchParams.get("v") || "",
        )}`
      : `${location.origin}${location.pathname}`;
  let context = {};
  let formats = [];
  let subtitles = [];
  {
    const state = win.__INITIAL_STATE__ || {};
    const play = win.__playinfo__?.data || {};
    const video = state.videoData || {};
    const owner = video.owner || {};
    formats = [
      ...(play.durl || []).map((entry) => ({
        url: absolute(entry.url),
        mimeType: "video/mp4",
        quality: entry.quality || null,
        muxed: true,
      })),
      ...(play.dash?.video || []).map((entry) => ({
        url: absolute(entry.baseUrl || entry.base_url),
        mimeType: entry.mimeType || "video/mp4",
        quality: entry.height || null,
        muxed: false,
      })),
    ];
    subtitles = (video.subtitle?.list || state.subtitle?.subtitles || []).map(
      (entry) => ({
        language: entry.lan || entry.lan_doc || "unknown",
        label: entry.lan_doc || entry.lan || "",
        url: absolute(entry.subtitle_url || entry.url),
      }),
    );
    if (video.cid && (video.bvid || video.aid)) {
      try {
        const params = new URLSearchParams({ cid: String(video.cid) });
        if (video.bvid) params.set("bvid", String(video.bvid));
        if (video.aid) params.set("aid", String(video.aid));
        const response = await fetch(
          `https://api.bilibili.com/x/player/wbi/v2?${params}`,
          { credentials: "include", signal: AbortSignal.timeout(15000) },
        );
        const payload = response.ok ? await response.json() : null;
        const tracks = payload?.data?.subtitle?.subtitles;
        if (Array.isArray(tracks) && tracks.length)
          subtitles = tracks.map((entry) => ({
            language: entry.lan || entry.lan_doc || "unknown",
            label: entry.lan_doc || entry.lan || "",
            url: absolute(entry.subtitle_url || entry.url),
          }));
      } catch {
        /* Keep any usable first-screen subtitle tracks. */
      }
    }
    subtitles = subtitles.filter((entry) => entry.url);
    context = {
      id: video.bvid || video.aid || location.pathname.split("/")[2],
      bvid: video.bvid || null,
      aid: video.aid || null,
      title: video.title || meta("og:title") || document.title,
      author: owner.name || meta("author") || "",
      duration: duration(video.duration || jsonLd?.duration),
      canonicalUrl: publicUrl(),
      subtitles: subtitles.map(({ url: _url, ...entry }) => entry),
      formats: formats.map(({ url: _url, ...entry }) => entry),
    };
  }
  return { data: context };
}

const contextData = await page.evaluate(bilibili_get_video_context, {});
const shot = await page.screenshot({ fullPage: false });
return { contextData, shot };
