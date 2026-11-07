import { fail } from "../starrcore/store.mjs";

export function connection(config, kind, callerSignal, savedSecret = "") {
  callerSignal?.throwIfAborted();
  const mode = kind ? config[`${kind}.connection`] || "shared" : "shared";
  if (mode === "disabled") throw fail("管理员已停用此模型能力", 403);
  const prefix = mode === "custom" ? kind : "media";
  if (!config[`${prefix}.baseUrl`]) throw fail("请先配置兼容服务地址", 409);
  const env = config[`${prefix}.secretEnv`],
    secret = env ? process.env[env] : savedSecret;
  if (env && !secret)
    throw fail("启动环境中没有找到指定凭据，请配置后重启", 409);
  return {
    base: config[`${prefix}.baseUrl`].replace(/\/+$/, ""),
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    signal: AbortSignal.any([
      ...(callerSignal ? [callerSignal] : []),
      AbortSignal.timeout((config[`${prefix}.timeoutSeconds`] || 60) * 1000),
    ]),
  };
}
async function checked(response) {
  if (!response.ok) {
    await response.body?.cancel();
    throw fail(
      `模型服务返回 HTTP ${response.status}，请核对能力、模型和额度`,
      502,
    );
  }
  return response;
}
export async function speak(
  config,
  input,
  { engines, characterId, signal, secrets, emotion = "" } = {},
) {
  signal?.throwIfAborted();
  if (typeof input !== "string" || !input.trim() || input.length > 2000)
    throw fail("试听文字应为 1–2000 字符");
  if (typeof emotion !== "string" || emotion.length > 100)
    throw fail("语气描述应不超过100字");
  if (emotion && config["tts.emotion.enabled"] !== false)
    config = {
      ...config,
      "tts.instructions": [config["tts.instructions"], `情绪与语气：${emotion}`]
        .filter(Boolean)
        .join("；"),
    };
  if (config["tts.connection"] === "breeze-local") {
    if (!engines || !characterId)
      throw fail("请在 DSH 宿主内使用本地 Breeze 模型", 409);
    return engines.withEngine(characterId, "tts", (base, engineSignal) =>
      speak(
        {
          ...config,
          "tts.connection": "custom",
          "tts.baseUrl": base + "/v1",
          "tts.secretEnv": "",
          "tts.model": "breeze",
          "tts.responseFormat": "wav",
        },
        input,
        {
          signal: AbortSignal.any([engineSignal, ...(signal ? [signal] : [])]),
        },
      ),
    );
  }
  if (!config["tts.model"]) throw fail("请先选择说话模型", 409);
  if (typeof input !== "string" || !input.trim() || input.length > 2000)
    throw fail("试听文字应为 1–2000 字符");
  const c = connection(
    config,
    "tts",
    signal,
    await secrets?.key(characterId, "tts", config),
  );
  await secrets?.assertConnection?.(c.base);
  const r = await checked(
    await fetch(`${c.base}/audio/speech`, {
      method: "POST",
      signal: c.signal,
      headers: { ...c.headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config["tts.model"],
        voice: config["tts.voice"],
        input,
        speed: config["tts.speed"],
        ...(config["tts.instructions"]
          ? { instructions: config["tts.instructions"] }
          : {}),
        response_format: config["tts.responseFormat"] || "mp3",
      }),
    }),
  );
  if (Number(r.headers.get("content-length")) > 20 * 1024 * 1024) {
    await r.body.cancel();
    throw fail("语音输出过大", 502);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of r.body) {
    size += chunk.length;
    if (size > 20 * 1024 * 1024) throw fail("语音输出过大", 502);
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  const wav =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WAVE";
  const mp3 =
    bytes.length >= 3 &&
    (bytes.subarray(0, 3).toString() === "ID3" ||
      (bytes[0] === 255 && (bytes[1] & 224) === 224));
  if (!(config["tts.responseFormat"] === "wav" ? wav : mp3))
    throw fail("说话服务没有返回约定的音频格式", 502);
  bytes.mediaType =
    config["tts.responseFormat"] === "wav" ? "audio/wav" : "audio/mpeg";
  return bytes;
}
export async function see(
  config,
  { image, prompt },
  { signal, secrets, characterId, hostVision, sessionId, modelSelection } = {},
) {
  if (
    typeof image !== "string" ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) ||
    image.length > 11000000
  )
    throw fail("只支持不超过 8MB 的 PNG、JPEG、WebP 图片");
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 3000)
    throw fail("请填写 1–3000 字的图片问题");
  signal?.throwIfAborted();
  if (config["vision.connection"] === "host") {
    if (!hostVision || !characterId)
      throw fail("DSH视觉服务尚未接入，请从宿主内打开starr", 409);
    return hostVision.see(
      characterId,
      { image, prompt },
      { signal, sessionId, modelSelection },
    );
  }
  if (!config["vision.model"]) throw fail("请先选择看图模型", 409);
  const c = connection(
    config,
    "vision",
    signal,
    await secrets?.key(characterId, "vision", config),
  );
  await secrets?.assertConnection?.(c.base);
  const r = await checked(
    await fetch(`${c.base}/chat/completions`, {
      method: "POST",
      signal: c.signal,
      headers: { ...c.headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config["vision.model"],
        max_tokens: config["vision.maxTokens"] || 4096,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    }),
  );
  const result = await r.json(),
    answer = result.choices?.[0]?.message?.content;
  if (result.choices?.[0]?.finish_reason === "length")
    throw Object.assign(
      fail(
        "图片分析达到输出令牌上限，请在视觉页调高“视觉输出令牌上限”后重试",
        502,
      ),
      { code: "MODEL_OUTPUT_LIMIT" },
    );
  if (typeof answer !== "string")
    throw fail("服务没有返回可显示的图片理解文本", 502);
  return {
    answer,
    model: config["vision.model"],
    verifiedAt: new Date().toISOString(),
  };
}
export async function hear(
  config,
  bytes,
  type = "audio/wav",
  { signal, secrets, characterId } = {},
) {
  if (
    config["asr.connection"] === "free-local" ||
    (config["asr.connection"] === "auto" && !config["media.baseUrl"])
  ) {
    if (!secrets || !characterId) throw fail("免费本地听写服务尚未接入", 409);
    return secrets.hearLocal(characterId, bytes, type, signal);
  }
  if (!config["asr.model"]) throw fail("请先选择听写模型", 409);
  if (!bytes.length || bytes.length > 15 * 1024 * 1024)
    throw fail("音频文件须为 1B–15MB");
  const extension = {
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
  }[type];
  if (!extension) throw fail("请使用 WAV、MP3、M4A、WebM 或 Ogg 音频");
  const c = connection(
    config,
    "asr",
    signal,
    await secrets?.key(characterId, "asr", config),
  );
  await secrets?.assertConnection?.(c.base);
  const body = new FormData();
  body.set("model", config["asr.model"]);
  body.set("file", new Blob([bytes], { type }), `audio.${extension}`);
  if (config["asr.language"]) body.set("language", config["asr.language"]);
  const r = await checked(
      await fetch(`${c.base}/audio/transcriptions`, {
        method: "POST",
        signal: c.signal,
        headers: c.headers,
        body,
      }),
    ),
    result = await r.json();
  if (typeof result.text !== "string") throw fail("服务没有返回听写文本", 502);
  return {
    text: result.text,
    model: config["asr.model"],
    verifiedAt: new Date().toISOString(),
  };
}
