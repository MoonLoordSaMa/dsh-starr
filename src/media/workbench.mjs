import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { QQSecrets } from "../qq/secrets.mjs";
import { connection } from "./compatible.mjs";
import { runProcess } from "./process.mjs";
import { fail } from "../starrcore/store.mjs";
import { localModels, requireManagedModelConnection } from "./local-models.mjs";

export class MediaWorkbench {
  constructor(store, { engines } = {}) {
    this.store = store;
    this.engines = engines;
    this.active = new Set();
    this.abort = new AbortController();
    this.gate = localModels(store);
  }
  secret(characterId, kind) {
    this.store.character(characterId);
    if (!["media", "tts", "asr", "vision"].includes(kind))
      throw fail("媒体能力无效");
    const dir = path.join(this.store.dataRoot, "media-secrets", characterId);
    fs.mkdirSync(dir, { recursive: true });
    return new QQSecrets(dir, kind);
  }
  async key(characterId, kind, config) {
    if (!characterId) return "";
    const prefix = config[`${kind}.connection`] === "custom" ? kind : "media";
    return this.secret(characterId, prefix).read(
      config[`${prefix}.secretEnv`] || "",
    );
  }
  assertConnection(value) {
    return requireManagedModelConnection(value);
  }
  status(characterId) {
    const config = this.store.character(characterId).config;
    return {
      credentials: Object.fromEntries(
        ["media", "tts", "asr", "vision"].map((k) => [
          k,
          this.secret(characterId, k).status(),
        ]),
      ),
      capabilities: ["tts", "asr", "vision"].map((kind) => ({
        kind,
        mode: config[`${kind}.connection`],
        model: config[`${kind}.model`],
        verified: false,
      })),
      localAsr: {
        defaultFree: config["asr.connection"] === "free-local",
        installing: this.active.has("asr-install"),
        runtimeInstalled: fs.existsSync(this.asrPython()),
        note: "免费指本机推理无需API费用；首次准备需要下载依赖和开源权重。安装完成仍需转写验证。",
      },
      localModels: this.gate.status(),
    };
  }
  asrPython() {
    return path.join(
      this.store.dataRoot,
      "media-runtime",
      "asr",
      process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
    );
  }
  async prepareAsr(characterId, signal) {
    const c = this.store.character(characterId).config;
    if (this.active.has("asr-install")) throw fail("免费听写环境正在准备", 409);
    this.active.add("asr-install");
    const combined = AbortSignal.any([
      this.abort.signal,
      ...(signal ? [signal] : []),
    ]);
    try {
      const root = path.dirname(path.dirname(this.asrPython()));
      if (!fs.existsSync(this.asrPython())) {
        fs.mkdirSync(path.dirname(root), { recursive: true });
        await runProcess(
          c["asr.local.python"] ||
            (process.platform === "win32" ? "python.exe" : "python3"),
          ["-m", "venv", root],
          { signal: combined },
        );
      }
      await runProcess(
        this.asrPython(),
        [
          "-m",
          "pip",
          "install",
          "--disable-pip-version-check",
          "faster-whisper==1.2.1",
          "av==15.1.0",
        ],
        { signal: combined, timeout: 600000, maxBytes: 2097152 },
      );
      return {
        status: "installed",
        verified: false,
        detail:
          "听写运行环境已安装。首次转写会自动取得免费模型；转写成功后才算能力验证通过。",
      };
    } finally {
      this.active.delete("asr-install");
    }
  }
  hearLocal(characterId, bytes, mime, signal) {
    return this.gate.run(`${characterId}:asr`, {}, () =>
      this.hearLocalInternal(characterId, bytes, mime, signal),
    );
  }
  async hearLocalInternal(characterId, bytes, mime, signal) {
    const c = this.store.character(characterId).config;
    if (!["auto", "free-local"].includes(c["asr.connection"]))
      throw fail("当前未选择免费本地听写", 409);
    if (!bytes?.length || bytes.length > 15 * 1024 * 1024)
      throw fail("听写音频应为1B–15MB");
    const ext = {
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
      "audio/webm": "webm",
    }[mime];
    if (!ext) throw fail("不支持的听写音频格式");
    // 准备流程将依赖装进隔离环境；不要又回到创建环境时使用的基础Python。
    const python = fs.existsSync(this.asrPython())
      ? this.asrPython()
      : c["asr.local.python"];
    if (!python)
      throw fail(
        "免费听写已默认选中，请先点击“准备免费听写”安装本地运行环境",
        409,
      );
    const key = `hear:${characterId}`;
    if (this.active.has(key)) throw fail("本角色正在转写", 409);
    this.active.add(key);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "starr-asr-"));
    try {
      const input = path.join(tmp, `input.${ext}`);
      fs.writeFileSync(input, bytes);
      const result = await runProcess(
        python,
        [
          fileURLToPath(new URL("./whisper.py", import.meta.url)),
          input,
          c["asr.local.modelPath"] || c["asr.local.model"] || "small",
          c["asr.language"] || "",
          path.join(this.store.dataRoot, "media-runtime", "asr-models"),
        ],
        {
          signal: AbortSignal.any([
            this.abort.signal,
            ...(signal ? [signal] : []),
          ]),
          timeout: (c["asr.timeoutSeconds"] || 300) * 1000,
          maxBytes: 262144,
        },
      );
      const parsed = JSON.parse(result);
      if (typeof parsed.text !== "string")
        throw fail("本地听写没有返回文本", 502);
      return {
        ...parsed,
        model: c["asr.local.model"] || "small",
        provider: "faster-whisper",
        verifiedAt: new Date().toISOString(),
      };
    } finally {
      this.active.delete(key);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  async registerVoice(characterId, { name, transcript, base64 }, signal) {
    const config = this.store.character(characterId).config;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(name || ""))
      throw fail("音色标识限1–64位字母、数字、横线与下划线");
    if (
      typeof transcript !== "string" ||
      !transcript.trim() ||
      transcript.length > 4000
    )
      throw fail("请填写参考录音的准确文字");
    if (
      typeof base64 !== "string" ||
      !/^[A-Za-z0-9+/=]+$/.test(base64) ||
      base64.length > 14000000
    )
      throw fail("参考音频应为不超过10MB的WAV文件");
    const bytes = Buffer.from(base64, "base64");
    if (
      bytes.subarray(0, 4).toString() !== "RIFF" ||
      bytes.subarray(8, 12).toString() !== "WAVE"
    )
      throw fail("参考音频必须为实际WAV文件");
    if (config["tts.connection"] !== "breeze-local")
      throw fail(
        "当前自动建立音色仅支持本地 Breeze；云端服务没有统一音色训练协议，请填写服务已创建的音色编号",
        409,
      );
    if (!this.engines) throw fail("本地音色服务尚未就绪", 409);
    return this.engines.withEngine(
      characterId,
      "tts",
      async (base, engineSignal) => {
        const form = new FormData();
        form.set(
          "ref_audio",
          new Blob([bytes], { type: "audio/wav" }),
          "reference.wav",
        );
        form.set("ref_text", transcript);
        form.set("name", name);
        const response = await fetch(`${base}/v1/voices`, {
          method: "POST",
          body: form,
          signal: AbortSignal.any([
            engineSignal,
            ...(signal ? [signal] : []),
            AbortSignal.timeout(180000),
          ]),
        }).catch((error) => {
          if (signal?.aborted || engineSignal.aborted) throw error;
          throw fail(
            "Breeze在处理参考录音时断开连接，音色配置尚未改变；请检查引擎、模型与参考音频的兼容性，已有音色仍可继续使用",
            502,
          );
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw fail(`建立音色失败（HTTP ${response.status}）`, 502);
        }
        const voice = await response.json();
        if (voice?.id !== name || voice.saved !== true)
          throw fail("服务没有返回持久化音色回执", 502);
        this.store.configure(
          characterId,
          { "tts.voice": name },
          { revision: this.store.character(characterId).revision },
        );
        return {
          id: name,
          saved: true,
          seconds: voice.seconds,
          training: "reference-encoding",
          detail:
            "参考音频已编码为可复用音色，已自动选用；这不代表重新训练基础模型。",
        };
      },
    );
  }
  close() {
    this.abort.abort();
    this.gate.close();
  }
}
