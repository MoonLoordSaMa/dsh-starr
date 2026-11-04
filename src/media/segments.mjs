import { fail } from "../starrcore/store.mjs";

export const chorusHint = (title) =>
  /高潮|副歌|精华片段|\b(?:chorus|hook)\b/i.test(title);
export function segmentRequest(segment = "chorus", startSeconds) {
  if (
    !["chorus", "opening"].includes(segment) ||
    (startSeconds !== undefined &&
      (!Number.isFinite(startSeconds) ||
        startSeconds < 0 ||
        startSeconds > 14400))
  )
    throw fail("片段偏好或起点无效，起点应为0–14400秒");
}

// 重复歌词只作为副歌候选证据，不将文字重复宣称为音乐高潮识别。
export function lyricChorus(lrc, duration = 0) {
  if (typeof lrc !== "string" || lrc.length > 250000) return null;
  const rows = [];
  const offset =
    Math.max(
      -30000,
      Math.min(30000, Number(lrc.match(/\[offset:([+-]?\d+)\]/i)?.[1]) || 0),
    ) / 1000;
  for (const line of lrc.split(/\r?\n/).slice(0, 5000)) {
    const text = line.replace(/\[[^\]]*\]/g, "").trim();
    if (
      /作词|作曲|编曲|制作人|录音|混音|版权所有|lyrics\s*:|composer\s*:/i.test(
        text,
      )
    )
      continue;
    const normalized = text.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "");
    if (normalized.length < 2) continue;
    for (const match of line.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g)) {
      const seconds = Number(match[2]),
        time = Number(match[1]) * 60 + seconds + offset;
      if (
        seconds < 60 &&
        time >= 0 &&
        time < 14400 &&
        (!duration || time < duration - 8)
      )
        rows.push({ time, normalized });
    }
  }
  rows.sort((a, b) => a.time - b.time);
  const groups = new Map();
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i],
      b = rows[i + 1];
    if (
      a.time < 15 ||
      b.time - a.time < 0.5 ||
      b.time - a.time > 15 ||
      a.normalized.length + b.normalized.length < 8
    )
      continue;
    const key = `${a.normalized}\n${b.normalized}`,
      entries = groups.get(key) || [];
    if (!entries.length || a.time - entries.at(-1).time > 20) entries.push(a);
    groups.set(key, entries);
  }
  const candidates = [...groups.values()]
    .filter((group) => group.length >= 2)
    .sort((a, b) => b.length - a.length || a[0].time - b[0].time);
  if (!candidates.length) return null;
  return {
    startSeconds: Math.max(
      0,
      Math.round((candidates[0][0].time - 1.5) * 10) / 10,
    ),
    method: "lyrics-repeat",
    detail: "根据多次重复的连续歌词定位副歌候选，尚非音频结构识别",
  };
}

export function chooseSegment({
  segment = "chorus",
  startSeconds,
  title = "",
  lyrics = "",
  duration = 0,
} = {}) {
  segmentRequest(segment, startSeconds);
  if (startSeconds !== undefined) {
    if (duration && startSeconds >= duration)
      throw fail("片段起点超出音源时长");
    return { startSeconds, method: "manual", detail: "按明确指定的起点截取" };
  }
  if (segment === "opening")
    return { startSeconds: 0, method: "opening", detail: "按要求截取开头" };
  if (chorusHint(title))
    return {
      startSeconds: 0,
      method: "title-hint",
      detail: "音源标题标注高潮或副歌，优先使用该剪辑；未做音频结构识别",
    };
  return (
    lyricChorus(lyrics, duration) || {
      startSeconds: 0,
      method: "fallback",
      detail: "未获得可靠副歌位置，本次从开头截取，可指定起点重新入库",
    }
  );
}
