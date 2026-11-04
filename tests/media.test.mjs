import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { speak, see, hear, connection } from "../src/media/compatible.mjs";
import { defaults } from "../src/starrcore/config.mjs";

test("各模型可独立选择本地服务，云端密钥不串用，停用实际拒绝调用", async () => {
  process.env.STARR_SYNTHETIC_MEDIA_KEY = "synthetic-key";
  try {
    const c = {
      ...defaults(),
      "media.baseUrl": "https://example.invalid/v1",
      "media.secretEnv": "STARR_SYNTHETIC_MEDIA_KEY",
      "tts.connection": "custom",
      "tts.baseUrl": "http://127.0.0.1:8100/v1",
      "tts.model": "synthetic",
    };
    assert.equal(connection(c, "tts").base, "http://127.0.0.1:8100/v1");
    assert.deepEqual(connection(c, "tts").headers, {});
    assert.equal(
      connection(c, "vision").headers.Authorization,
      "Bearer synthetic-key",
    );
    await assert.rejects(
      () => speak({ ...c, "tts.connection": "disabled" }, "测试"),
      /停用/,
    );
    assert.throws(
      () =>
        connection(
          { ...c, "tts.secretEnv": "STARR_SYNTHETIC_NOT_PRESENT" },
          "tts",
        ),
      /没有找到/,
    );
  } finally {
    delete process.env.STARR_SYNTHETIC_MEDIA_KEY;
  }
});

test("兼容媒体驱动按能力分别请求；不把错误响应当作成功", async (t) => {
  const calls = [],
    server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      calls.push({
        path: req.url,
        body: body.toString(),
        headers: req.headers,
      });
      if (req.url === "/v1/audio/speech") {
        res.setHeader("Content-Type", "audio/mpeg");
        return res.end(Buffer.from("ID3-test-audio-protocol"));
      }
      if (req.url === "/v1/audio/transcriptions") {
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ text: "本地协议测试" }));
      }
      if (req.url === "/v1/chat/completions") {
        res.setHeader("Content-Type", "application/json");
        return res.end(
          JSON.stringify({
            choices: [{ message: { content: "图片协议测试" } }],
          }),
        );
      }
      res.writeHead(404);
      res.end();
    });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const config = {
    ...defaults(),
    "media.baseUrl": `http://127.0.0.1:${server.address().port}/v1`,
    "tts.model": "tts-test",
    "asr.model": "asr-test",
    "vision.model": "vision-test",
    "vision.connection": "shared",
  };
  assert.equal(
    (await speak(config, "测试文字")).toString(),
    "ID3-test-audio-protocol",
  );
  assert.equal(JSON.parse(calls[0].body).voice, "alloy");
  assert.equal(
    (
      await see(config, {
        image: "data:image/png;base64,aGVsbG8=",
        prompt: "看见什么",
      })
    ).answer,
    "图片协议测试",
  );
  assert.equal(
    JSON.parse(calls[1].body).messages[0].content[1].type,
    "image_url",
  );
  assert.equal(
    (await hear(config, Buffer.from("audio-test"), "audio/wav")).text,
    "本地协议测试",
  );
  assert.match(
    calls[2].headers["content-type"],
    /^multipart\/form-data; boundary=/,
  );
  await assert.rejects(
    () =>
      speak(
        { ...config, "media.baseUrl": config["media.baseUrl"] + "/missing" },
        "测试",
      ),
    /HTTP 404/,
  );
  await assert.rejects(
    () => see(config, { image: "file:///private.png", prompt: "读取" }),
    /只支持/,
  );
  await assert.rejects(
    () => speak({ ...config, "tts.model": "" }, "测试"),
    /选择说话模型/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => speak(config, "已中止", { signal: controller.signal }),
    /abort/i,
  );
});

test("HTTP 200 的 JSON 错误与空音频不能算作说话成功", async (t) => {
  const server = http.createServer((_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "合成错误" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await assert.rejects(
    () =>
      speak(
        {
          ...defaults(),
          "media.baseUrl": `http://127.0.0.1:${server.address().port}/v1`,
          "tts.model": "test",
        },
        "测试",
      ),
    /音频格式/,
  );
});
