import { ffmpegPath, runProcess } from "./process.mjs";
import { encodePng } from "../vendor/see-now/png.js";
import { fail } from "../starrcore/store.mjs";

export const isGIF = (bytes) =>
  ["GIF87a", "GIF89a"].includes(bytes?.subarray(0, 6).toString("ascii"));

// 不落盘、不执行附件路径；只解码有尺寸、时长、帧数和输出字节上限的 GIF。
export async function animationSheet(
  config,
  bytes,
  { signal, run = runProcess } = {},
) {
  if (!isGIF(bytes) || bytes.length < 13) throw fail("动图文件头无效");
  const originalWidth = bytes.readUInt16LE(6),
    originalHeight = bytes.readUInt16LE(8);
  if (
    !originalWidth ||
    !originalHeight ||
    originalWidth * originalHeight > 16777216 ||
    bytes.length > 15728640
  )
    throw fail("动图尺寸或大小超过限制", 413);
  const width = 320,
    height = 240,
    frameBytes = width * height * 3;
  const raw = await run(
    ffmpegPath(config),
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-protocol_whitelist",
      "pipe",
      "-f",
      "gif",
      "-ignore_loop",
      "1",
      "-i",
      "pipe:0",
      "-t",
      "12",
      "-vf",
      `fps=2,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x12121a`,
      "-frames:v",
      "24",
      "-threads",
      "1",
      "-pix_fmt",
      "rgb24",
      "-f",
      "rawvideo",
      "pipe:1",
    ],
    { input: bytes, signal, timeout: 20000, maxBytes: frameBytes * 24 },
  );
  signal?.throwIfAborted();
  const count = Math.floor(raw.length / frameBytes);
  if (!count || raw.length % frameBytes)
    throw fail("未取得有效动图帧，请检查媒体程序", 502);
  const take = Math.min(8, count),
    columns = Math.min(4, take),
    rows = Math.ceil(take / columns);
  const canvasWidth = columns * width,
    canvasHeight = rows * height;
  const canvas = Buffer.alloc(canvasWidth * canvasHeight * 3, 18),
    frames = [];
  for (let i = 0; i < take; i++) {
    const frame = take === 1 ? 0 : Math.round((i * (count - 1)) / (take - 1));
    frames.push({ index: i + 1, seconds: frame / 2 });
    for (let y = 0; y < height; y++)
      raw.copy(
        canvas,
        ((Math.floor(i / columns) * height + y) * canvasWidth +
          (i % columns) * width) *
          3,
        frame * frameBytes + y * width * 3,
        frame * frameBytes + (y + 1) * width * 3,
      );
  }
  const png = encodePng(canvas, canvasWidth, canvasHeight);
  return {
    bytes: png,
    mime: "image/png",
    animated: true,
    frames,
    completeAnimation: false,
    sampledThroughEnd: count < 24,
    description: `这是GIF动图关键帧拼图，按从左到右、从上到下阅读，最多采样前12秒。采样时刻：${JSON.stringify(frames)}；仅据这些画面判断动作，不推断声音或未采样内容。`,
  };
}
