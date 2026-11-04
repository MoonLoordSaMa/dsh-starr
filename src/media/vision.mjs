import { createPipeline } from "../vendor/see-now/pipeline.js";
import { spawnFrames } from "../vendor/see-now/capture.js";
import { ffmpegPath } from "./process.mjs";
import { see } from "./compatible.mjs";
import { fail } from "../starrcore/store.mjs";

export class VisionCapture {
  constructor(
    store,
    { capture = spawnFrames, understand = see, hostVision } = {},
  ) {
    this.store = store;
    this.capture = capture;
    this.understand = understand;
    this.hostVision = hostVision;
    this.active = new Map();
    this.closed = false;
  }
  async inspect(
    characterId,
    {
      source = { kind: "screen" },
      seconds = 3,
      prompt = "描述所见画面及变化",
      signal,
      secrets,
      sessionId,
      modelSelection,
    } = {},
  ) {
    const config = this.store.character(characterId).config;
    if (this.closed) throw fail("视觉采集已关闭", 409);
    if (!["screen", "camera", "file"].includes(source.kind))
      throw fail("不支持的画面来源");
    if (source.kind !== "file" && !config[`vision.${source.kind}.enabled`])
      throw fail("请先由管理员开启此画面来源", 403);
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 45)
      throw fail("采集片段应为1–45秒");
    if (source.kind !== "file" && seconds > 12)
      throw fail("实时采集每次最多12秒");
    if (
      (config["vision.connection"] !== "host" && !config["vision.model"]) ||
      config["vision.connection"] === "disabled"
    )
      throw fail("请先配置视觉模型，采集程序本身不能理解画面", 409);
    if (config["vision.connection"] === "host") {
      if (!this.hostVision) throw fail("DSH视觉服务尚未接入", 409);
      await this.hostVision.select(characterId, {
        sessionId,
        modelSelection,
        signal,
      });
    }
    signal?.throwIfAborted();
    if (this.active.size >= 2 || this.active.has(characterId))
      throw fail("画面分析正在进行", 409);
    const controller = new AbortController();
    signal = AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]);
    const entry = {
      cancel: () => controller.abort(fail("视觉采集已关闭", 409)),
    };
    this.active.set(characterId, entry);
    const pipeline = createPipeline({
      width: 640,
      height: 360,
      fps: 4,
      queueDepth: 2,
      silentFloorSec: 4,
      integralSeconds: 2,
    });
    let timer,
      timeout = false,
      run;
    const abort = () => run?.stop();
    try {
      run = this.capture({
        source,
        width: 640,
        height: 360,
        fps: 4,
        ffmpegPath: ffmpegPath(config),
        onFrame: (frame) => {
          if (frame.t <= seconds) pipeline.push(frame);
          if (frame.t >= seconds) run?.stop();
        },
      });
      entry.stop = () => run.stop();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) run.stop();
      timer = setTimeout(
        () => {
          timeout = true;
          run.stop();
        },
        source.kind === "file" ? 60000 : (seconds + 12) * 1000,
      );
      await run.done;
      signal?.throwIfAborted();
      if (this.closed) throw fail("视觉采集已关闭", 409);
      if (timeout) throw fail("画面采集超时，未取得完整片段", 504);
      pipeline.finish();
      let sheet, next;
      while ((next = pipeline.take())) sheet = next;
      if (!sheet?.png?.length)
        throw fail("没有采集到有效画面，请检查媒体程序或屏幕录制权限", 502);
      const current = this.store.character(characterId).config;
      if (
        [
          "vision.connection",
          "vision.host.provider",
          "vision.host.model",
          "vision.model",
          "vision.baseUrl",
          "media.baseUrl",
        ].some((key) => current[key] !== config[key])
      )
        throw fail("视觉连接已改变，本次画面不再提交理解", 409);
      if (source.kind !== "file" && !current[`vision.${source.kind}.enabled`])
        throw fail("管理员已关闭此画面来源，本次画面不再提交理解", 403);
      const frames = sheet.frames.map((f, i) => ({
        index: i + 1,
        seconds: f.t,
      }));
      const result = await this.understand(
        config,
        {
          image: `data:image/png;base64,${sheet.png.toString("base64")}`,
          prompt: `${prompt}\n这是关键帧拼图，各格编号及时间：${JSON.stringify(frames)}。仅描述这些画面，不能声称看过完整视频或听过声音。`,
        },
        {
          signal,
          characterId,
          secrets,
          hostVision: this.hostVision,
          sessionId,
          modelSelection,
        },
      );
      signal.throwIfAborted();
      return {
        ...result,
        source: source.kind,
        visualVerified: true,
        completeVideo: false,
        audioVerified: false,
        sampled: { from: sheet.from, to: sheet.to, frames },
        image: `data:image/png;base64,${sheet.png.toString("base64")}`,
        engine: "dsh-see-now@0.0.10",
      };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      run?.stop();
      this.active.delete(characterId);
    }
  }
  close() {
    this.closed = true;
    for (const entry of this.active.values()) {
      entry.cancel();
      entry.stop?.();
    }
  }
}
