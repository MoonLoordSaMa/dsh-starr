import dns from "node:dns/promises";
import { fail } from "../starrcore/store.mjs";
import { hasOnlyPublicAddresses } from "../runtime/network.mjs";
export async function downloadBiliMedia(
  value,
  {
    signal,
    maxBytes = 64 * 1024 * 1024,
    request = fetch,
    lookup = dns.lookup,
  } = {},
) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    ![".bilivideo.com", ".bilivideo.cn", ".hdslb.com", ".akamaized.net"].some(
      (suffix) => url.hostname.endsWith(suffix),
    )
  )
    throw fail("视频媒体地址不属于允许的B站资源域名", 403);
  const addresses = await lookup(url.hostname, { all: true });
  if (!hasOnlyPublicAddresses(addresses))
    throw fail("视频媒体地址解析到不可用网络", 403);
  const response = await request(url, {
    redirect: "error",
    signal: AbortSignal.any([
      ...(signal ? [signal] : []),
      AbortSignal.timeout(90000),
    ]),
    headers: {
      Referer: "https://www.bilibili.com/",
      "User-Agent": "Mozilla/5.0",
    },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw fail(`媒体读取失败（HTTP ${response.status}）`, 502);
  }
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes)
        throw fail("视频媒体超过本次读取上限，请选择更短视频或较低画质", 413);
      chunks.push(chunk);
    }
  } catch (e) {
    await response.body?.cancel().catch(() => {});
    throw e;
  }
  if (!size) throw fail("媒体内容为空", 502);
  return Buffer.concat(chunks);
}
