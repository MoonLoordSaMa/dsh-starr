// 可选远程节点：部署在已安装 SoulX 的机器，以字节上传包装本机 /convert。
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const maxAudio = 15 * 1024 * 1024;
function audio(input) {
  const extension = {
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/flac": "flac",
    "audio/ogg": "ogg",
  }[input?.mime];
  if (
    !extension ||
    typeof input.base64 !== "string" ||
    input.base64.length > maxAudio * 1.34 ||
    !/^[A-Za-z0-9+/=]+$/.test(input.base64)
  )
    throw new Error("音频格式或大小无效");
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.length || bytes.length > maxAudio) throw new Error("音频超出限制");
  return { extension, bytes };
}
export function createSvcNode({
  token,
  backendPort = 8200,
  tempRoot = path.join(os.tmpdir(), "starr-svc-node"),
} = {}) {
  if (typeof token !== "string" || token.length < 16)
    throw new Error("请通过 STARR_SVC_TOKEN 设置至少 16 字符的节点凭据");
  if (!Number.isInteger(backendPort) || backendPort < 1 || backendPort > 65535)
    throw new Error("SoulX 端口无效");
  let busy = false;
  return http.createServer(async (req, res) => {
    const send = (status, value) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(value));
    };
    const provided = Buffer.from(req.headers.authorization || ""),
      expected = Buffer.from(`Bearer ${token}`);
    if (
      provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)
    )
      return send(401, { error: "节点凭据不匹配" });
    if (req.url === "/v1/health" && req.method === "GET")
      return send(200, {
        protocol: "starr-svc-bytes/1",
        busy,
        backendVerified: false,
      });
    if (req.url !== "/v1/svc/convert" || req.method !== "POST")
      return send(404, { error: "节点接口不存在" });
    if (busy) return send(409, { error: "节点正在转换，请稍后重试" });
    busy = true;
    let directory;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 44 * 1024 * 1024) throw new Error("请求超过限制");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks)),
        source = audio(body.source),
        reference = audio(body.reference);
      const {
        pitchShift = 0,
        autoShift = true,
        vocalSep = true,
        nSteps = 32,
        cfg = 3,
      } = body;
      if (
        !Number.isInteger(pitchShift) ||
        pitchShift < -24 ||
        pitchShift > 24 ||
        !Number.isInteger(nSteps) ||
        nSteps < 1 ||
        nSteps > 100 ||
        !Number.isFinite(cfg) ||
        cfg < 0 ||
        cfg > 20 ||
        typeof autoShift !== "boolean" ||
        typeof vocalSep !== "boolean"
      )
        throw new Error("转换参数无效");
      await fs.mkdir(tempRoot, { recursive: true });
      directory = await fs.mkdtemp(path.join(tempRoot, "request-"));
      const target = path.join(directory, `source.${source.extension}`),
        prompt = path.join(directory, `reference.${reference.extension}`);
      await fs.writeFile(target, source.bytes);
      await fs.writeFile(prompt, reference.bytes);
      const response = await fetch(`http://127.0.0.1:${backendPort}/convert`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(1800000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          prompt,
          pitchShift,
          autoShift,
          vocalSep,
          nSteps,
          cfg,
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        return send(502, { error: `本地 SoulX 返回 HTTP ${response.status}` });
      }
      const resultChunks = [];
      let total = 0;
      for await (const chunk of response.body) {
        total += chunk.length;
        if (total > 30 * 1024 * 1024) throw new Error("转换结果超过限制");
        resultChunks.push(chunk);
      }
      const result = JSON.parse(Buffer.concat(resultChunks));
      if (result?.ok !== true || typeof result.wav !== "string")
        return send(502, { error: "本地 SoulX 未返回约定音频" });
      send(200, {
        ok: true,
        wav: result.wav,
        sampleRate: result.sampleRate,
        seconds: result.seconds,
      });
    } catch {
      send(502, { error: "节点转换失败，请检查音频、模型与 SoulX 服务" });
    } finally {
      busy = false;
      if (directory) await fs.rm(directory, { recursive: true, force: true });
    }
  });
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = createSvcNode({
    token: process.env.STARR_SVC_TOKEN,
    backendPort: Number(process.env.SOULX_PORT || 8200),
  });
  server.listen(
    Number(process.env.STARR_SVC_PORT || 8201),
    process.env.STARR_SVC_HOST || "127.0.0.1",
    () => console.log("starr 唱歌字节节点已启动；请用真实音频验证能力"),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => server.close());
}
