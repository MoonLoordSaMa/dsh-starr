import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fail } from "../starrcore/store.mjs";

export function ffmpegPath(config = {}) {
  if (
    config["media.ffmpegPath"] &&
    !fs
      .statSync(config["media.ffmpegPath"], { throwIfNoEntry: false })
      ?.isFile()
  )
    throw fail("管理员指定的FFmpeg程序不存在，请重新选择", 409);
  return (
    [
      config["media.ffmpegPath"],
      process.env.DSH_FFMPEG_PATH,
      process.env.FFMPEG_PATH,
      path.join(
        process.env.DSH_HOME || path.join(os.homedir(), ".dsh"),
        "tools",
        "ffmpeg",
        "bin",
        process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
      ),
      path.join(
        os.homedir(),
        ".dsh",
        "bin",
        process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
      ),
    ].find((p) => p && fs.statSync(p, { throwIfNoEntry: false })?.isFile()) ||
    "ffmpeg"
  );
}
export function runProcess(
  program,
  args,
  { input, signal, timeout = 180000, maxBytes = 20 * 1024 * 1024 } = {},
) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    });
    const chunks = [];
    let size = 0,
      done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (error) {
        child.kill();
        // 互斥许可只能在子进程真正退出后释放，避免取消后重叠加载模型。
        if (child.exitCode !== null || !child.pid) reject(error);
        else child.once("close", () => reject(error));
      } else resolve(value);
    };
    const abort = () => finish(signal.reason || fail("操作已取消", 409));
    const timer = setTimeout(() => finish(fail("媒体处理超时", 504)), timeout);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.on("error", () =>
      finish(fail("媒体程序未能启动，请在能力配置中检查程序与依赖", 409)),
    );
    child.stdout.on("data", (b) => {
      size += b.length;
      if (size > maxBytes) return finish(fail("媒体处理结果超过上限", 413));
      chunks.push(b);
    });
    child.stderr.resume();
    child.on("close", (code) =>
      finish(
        code === 0
          ? null
          : fail("媒体处理失败，请检查依赖、模型与输入格式", 502),
        Buffer.concat(chunks),
      ),
    );
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}
export async function audioClip(
  config,
  bytes,
  { seconds = 45, startSeconds = 0, signal } = {},
) {
  if (
    !Number.isFinite(startSeconds) ||
    startSeconds < 0 ||
    startSeconds > 14400
  )
    throw fail("音频片段起点无效");
  return runProcess(
    ffmpegPath(config),
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-i",
      "pipe:0",
      "-ss",
      String(startSeconds),
      "-t",
      String(Math.min(45, seconds)),
      "-vn",
      "-ar",
      "44100",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      "-f",
      "wav",
      "pipe:1",
    ],
    { input: bytes, signal },
  );
}
