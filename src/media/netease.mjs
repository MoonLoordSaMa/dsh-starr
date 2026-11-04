import dns from "node:dns/promises";
import net from "node:net";
import { fail } from "../starrcore/store.mjs";

const songId = (value) => {
  const id = String(value ?? "");
  if (!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))
    throw fail("网易云歌曲编号无效");
  return id;
};
export const neteaseSongUrl = (id) =>
  `https://music.163.com/#/song?id=${songId(id)}`;

// 仅使用公开搜索与平台返回的可播放地址；不接第三方解锁、会员或付费绕过服务。
export function neteaseClient({ request = fetch } = {}) {
  const call = async (pathname, params, signal) => {
    signal?.throwIfAborted();
    let response;
    try {
      response = await request(`https://music.163.com${pathname}`, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: "https://music.163.com/",
          "User-Agent": "Mozilla/5.0",
        },
        body: new URLSearchParams(params),
        signal: AbortSignal.any([
          ...(signal ? [signal] : []),
          AbortSignal.timeout(15000),
        ]),
      });
    } catch {
      signal?.throwIfAborted();
      throw fail("网易云暂时无法连接，请稍后重试或改用B站", 503);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw fail(`网易云接口返回 HTTP ${response.status}`, 502);
    }
    const chunks = [];
    let size = 0;
    try {
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) throw fail("网易云响应超过读取上限", 502);
        chunks.push(chunk);
      }
    } catch (e) {
      await response.body?.cancel().catch(() => {});
      throw e;
    }
    let result;
    try {
      result = JSON.parse(Buffer.concat(chunks));
    } catch {
      throw fail("网易云返回无效响应", 502);
    }
    if (result?.code !== 200)
      throw fail("网易云暂不允许此次读取，可能受到登录或频率限制", 502);
    return result;
  };
  return {
    async search(q, { limit = 8, signal } = {}) {
      if (typeof q !== "string" || !q.trim() || q.length > 100)
        throw fail("搜索词应为1–100字");
      const result = await call(
        "/api/search/get",
        {
          s: q.trim(),
          type: "1",
          limit: String(Math.min(10, limit)),
          offset: "0",
        },
        signal,
      );
      if (
        result.result?.songs !== undefined &&
        !Array.isArray(result.result.songs)
      )
        throw fail("网易云搜索结果格式无效", 502);
      return (result.result?.songs || []).slice(0, limit).flatMap((row) => {
        let id;
        try {
          id = songId(row.id);
        } catch {
          return [];
        }
        return [
          {
            platform: "netease",
            id,
            title: String(row.name || "未命名歌曲").slice(0, 200),
            artists: (Array.isArray(row.artists) ? row.artists : [])
              .slice(0, 10)
              .map((a) => String(a.name || "").slice(0, 100)),
            album: String(row.album?.name || "").slice(0, 200),
            duration: Math.max(0, Number(row.duration) / 1000 || 0),
            url: neteaseSongUrl(id),
            availability: "需在入库时向平台确认可播放权限",
          },
        ];
      });
    },
    async lyrics(id, signal) {
      const result = await call(
        "/api/song/lyric",
        { id: songId(id), lv: "-1", kv: "-1", tv: "-1" },
        signal,
      );
      return typeof result.lrc?.lyric === "string"
        ? result.lrc.lyric.slice(0, 250000)
        : "";
    },
    async audio(id, signal) {
      id = songId(id);
      const result = await call(
        "/api/song/enhance/player/url",
        { ids: `[${id}]`, br: "128000" },
        signal,
      );
      const row = Array.isArray(result.data)
        ? result.data.find((r) => String(r.id) === id)
        : null;
      if (row?.freeTrialInfo || row?.freeTrialPrivilege?.listenType === 1)
        throw fail(
          "这首歌仅返回试听片段，不能作为完整音源；请更换可播放版本或自行导入音频",
          409,
        );
      if (!row || row.code !== 200 || !row.url)
        throw fail(
          "网易云未提供可播放音源，可能受版权、会员、付费或地区限制；可改用B站或自行导入",
          409,
        );
      let url;
      try {
        url = new URL(row.url);
      } catch {
        throw fail("网易云音源地址无效", 502);
      }
      // 旧接口有时返回HTTP，仅在相同的受信域名上升级为HTTPS。
      if (url.protocol === "http:") url.protocol = "https:";
      validateMediaUrl(url);
      const details = await call(
        "/api/song/detail/",
        { ids: `[${id}]` },
        signal,
      );
      const detail = Array.isArray(details.songs)
        ? details.songs.find((s) => String(s.id) === id)
        : null;
      return {
        id,
        url: url.href,
        title: String(detail?.name || `网易云 ${id}`).slice(0, 120),
        duration: Math.max(0, Number(detail?.duration || row.time) / 1000 || 0),
        artists: (detail?.artists || [])
          .slice(0, 5)
          .map((a) => String(a.name || "").slice(0, 60)),
      };
    },
  };
}

function validateMediaUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw fail("网易云音源地址无效", 403);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.endsWith(".music.126.net")
  )
    throw fail("音源不属于允许的网易云资源域名", 403);
  return url;
}
export async function downloadNeteaseMedia(
  value,
  {
    signal,
    request = fetch,
    lookup = dns.lookup,
    maxBytes = 32 * 1024 * 1024,
  } = {},
) {
  const url = validateMediaUrl(value);
  signal?.throwIfAborted();
  const addresses = await lookup(url.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some(
      ({ address }) =>
        net.isIP(address) !== 4 ||
        /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(address),
    )
  )
    throw fail("网易云音源解析到不可用网络", 403);
  const response = await request(url, {
    redirect: "error",
    signal: AbortSignal.any([
      ...(signal ? [signal] : []),
      AbortSignal.timeout(90000),
    ]),
    headers: { Referer: "https://music.163.com/", "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw fail(`网易云音源读取失败（HTTP ${response.status}）`, 502);
  }
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes)
        throw fail("网易云音源超过32MB读取上限，请更换音源", 413);
      chunks.push(chunk);
    }
  } catch (e) {
    await response.body?.cancel().catch(() => {});
    throw e;
  }
  if (!size) throw fail("网易云音源内容为空", 502);
  return Buffer.concat(chunks);
}
