import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { EventEmitter } from "node:events";
import { StarrStore } from "../src/starrcore/store.mjs";
import { LocalMedia } from "../src/media/local.mjs";
import { Singing } from "../src/media/singing.mjs";
import { createSvcNode } from "../src/media/svc-node.mjs";
import { mountMediaServices } from "../src/runtime/media-services.mjs";
import { createTools } from "../src/host/tools.mjs";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-local-media-")),
    store = new StarrStore(path.join(root, "runtime")),
    { character } = store.setup({
      name: "合成媒体角色",
      memoryRoot: path.join(root, "memory"),
      backupRoot: path.join(root, "backup"),
    });
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  store.localModelLeaseRoot = store.dataRoot;
  return { root, store, id: character.id };
}

test("角色预设复用主插件媒体服务，启动探测期间停止不会遗留子进程", async (t) => {
  const f = fixture(t),
    second = new StarrStore(f.store.dataRoot);
  const sessionId = "shared-media-session";
  f.store.conversations.ensure({
    sessionId,
    characterId: f.id,
    platform: "web",
    type: "web",
  });
  const c = f.store.character(f.id);
  f.store.configure(f.id, { "sing.allowBot": true }, { revision: c.revision });
  const marker = {},
    controller = new AbortController();
  let called = 0;
  const remove = mountMediaServices(f.store, {
    localMedia: marker,
    singing: {
      convert: async (id, input, manager, signal) => {
        called++;
        assert.equal(id, f.id);
        assert.equal(manager, marker);
        assert.equal(signal, controller.signal);
        return { id: "render" };
      },
    },
  });
  try {
    await createTools(second, {
      characterId: f.id,
      sessionId,
      signal: controller.signal,
    }).starr_sing({ sourceId: "source" });
    assert.equal(called, 1);
  } finally {
    remove();
  }
  await assert.rejects(
    async () =>
      createTools(second, { characterId: f.id, sessionId }).starr_sing({
        sourceId: "source",
      }),
    /尚未就绪/,
  );
  second.close();
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  let starts = 0;
  const manager = new LocalMedia(f.store, {
    probe: () => pending,
    launch: () => {
      starts++;
      throw new Error("不应启动");
    },
  });
  t.after(() => manager.close());
  const result = manager.withEngine(f.id, "tts", () => {});
  await manager.stop(f.id, "tts");
  release(false);
  await assert.rejects(() => result, /abort/i);
  assert.equal(starts, 0);
});
test("本地引擎只启动管理员指定文件，同一角色并发复用进程，只停止自己启动的子进程", async (t) => {
  const f = fixture(t),
    executable = path.join(f.root, "synthetic.exe"),
    model = path.join(f.root, "synthetic.gguf"),
    voices = path.join(f.root, "voices");
  fs.writeFileSync(executable, "synthetic");
  fs.writeFileSync(model, "synthetic");
  fs.mkdirSync(voices);
  const character = f.store.character(f.id);
  f.store.configure(
    f.id,
    {
      "tts.local.bin": executable,
      "tts.local.modelPath": model,
      "tts.local.voicesDir": voices,
      "tts.local.gpuIndex": 2,
    },
    { revision: character.revision },
  );
  const launches = [];
  let probes = 0,
    killed = 0;
  const manager = new LocalMedia(f.store, {
    probe: async () => ++probes > 1,
    launch: (exe, args, options) => {
      launches.push({ exe, args, options });
      const child = new EventEmitter();
      child.pid = 123;
      child.exitCode = null;
      child.kill = () => {
        killed++;
        child.exitCode = 0;
      };
      return child;
    },
  });
  t.after(() => manager.close());
  const results = await Promise.all([
    manager.withEngine(f.id, "tts", (base) => base),
    manager.withEngine(f.id, "tts", (base) => base),
  ]);
  assert.equal(results[0], "http://127.0.0.1:8100");
  assert.equal(launches.length, 1);
  assert.equal(launches[0].options.shell, false);
  assert.equal(launches[0].options.windowsHide, true);
  assert.equal(launches[0].options.env.GGML_VULKAN_DEVICE, "2");
  assert.equal(manager.status(f.id)[0].status, "listening");
  await manager.stop(f.id, "tts");
  assert.equal(killed, 1);
  const busy = new LocalMedia(f.store, {
    probe: async () => true,
    launch: () => {
      throw new Error("不应启动");
    },
  });
  t.after(() => busy.close());
  await assert.rejects(
    () => busy.withEngine(f.id, "tts", () => {}),
    /端口已被占用/,
  );
});
test("唱歌字节节点真实往返上传，模型路径留在节点内，缓存与角色隔离生效", async (t) => {
  const f = fixture(t),
    wav = Buffer.from("RIFF0000WAVEsynthetic-audio"),
    calls = [];
  const soulx = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    calls.push(body);
    assert.ok(fs.existsSync(body.target));
    assert.ok(fs.existsSync(body.prompt));
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        wav: wav.toString("base64"),
        seconds: 1,
        sampleRate: 24000,
      }),
    );
  });
  await new Promise((resolve) => soulx.listen(0, "127.0.0.1", resolve));
  const token = "synthetic-node-token-123456",
    node = createSvcNode({
      token,
      backendPort: soulx.address().port,
      tempRoot: path.join(f.root, "node-temp"),
    });
  await new Promise((resolve) => node.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => node.close(resolve));
    await new Promise((resolve) => soulx.close(resolve));
  });
  process.env.STARR_TEST_SVC_TOKEN = token;
  t.after(() => delete process.env.STARR_TEST_SVC_TOKEN);
  const c = f.store.character(f.id);
  f.store.configure(
    f.id,
    {
      "sing.mode": "soulx-bytes",
      "sing.baseUrl": `http://127.0.0.1:${node.address().port}/v1`,
      "sing.secretEnv": "STARR_TEST_SVC_TOKEN",
    },
    { revision: c.revision },
  );
  const singing = new Singing(f.store, {
    connectionPolicy: () => {},
    clip: async (_config, bytes) => bytes,
  });
  t.after(() => singing.close());
  const source = singing.import(f.id, wav, "合成音源"),
    reference = singing.import(
      f.id,
      Buffer.concat([wav, Buffer.from("reference")]),
      "合成音色",
    );
  const result = await singing.convert(f.id, {
    sourceId: source.id,
    referenceId: reference.id,
  });
  assert.equal(result.status, "done");
  assert.equal(
    fs.readFileSync(singing.file(f.id, result.id, true).file).toString(),
    wav.toString(),
  );
  const cached = await singing.convert(f.id, {
    sourceId: source.id,
    referenceId: reference.id,
  });
  assert.equal(cached.cached, true);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].target.includes(path.join("node-temp", "request-")),
    true,
  );
  assert.equal(calls[0].target.includes(source.id), false);
  const other = f.store.createCharacter({ name: "另一个角色" });
  assert.throws(() => singing.file(other.id, source.id), /没有这首/);
  const unauthorized = await fetch(
    `http://127.0.0.1:${node.address().port}/v1/health`,
  );
  assert.equal(unauthorized.status, 401);
});
test("曲库保留失败记录，停用与假音频不能伪装成功", async (t) => {
  const f = fixture(t),
    singing = new Singing(f.store, {
      clip: async (_config, bytes) => bytes,
      connectionPolicy: () => {},
    });
  t.after(() => singing.close());
  assert.throws(
    () => singing.import(f.id, Buffer.from("not audio"), "错误"),
    /实际/,
  );
  await assert.rejects(
    () => singing.convert(f.id, { sourceId: "other" }),
    /连接方式/,
  );
  const wav = Buffer.from("RIFF0000WAVEsynthetic"),
    source = singing.import(f.id, wav, "合成");
  const server = http.createServer((req, res) =>
    res.end(
      JSON.stringify({
        ok: true,
        wav: Buffer.from("not wav").toString("base64"),
      }),
    ),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const c = f.store.character(f.id);
  f.store.configure(
    f.id,
    {
      "sing.mode": "soulx-bytes",
      "sing.baseUrl": `http://127.0.0.1:${server.address().port}`,
    },
    { revision: c.revision },
  );
  await assert.rejects(
    () =>
      singing.convert(f.id, { sourceId: source.id, referenceId: source.id }),
    /有效 WAV/,
  );
  assert.equal(singing.list(f.id).renders[0].status, "failed");
});

test("旧配置的永不卸载与超长闲置均固定为5分钟", (t) => {
  const { store, id } = fixture(t);
  store.db.prepare("UPDATE characters SET config=? WHERE id=?").run(
    JSON.stringify({
      "tts.local.idleSeconds": 0,
      "sing.local.idleSeconds": 600,
    }),
    id,
  );
  assert.equal(store.character(id).config["tts.local.idleSeconds"], 300);
  assert.equal(store.character(id).config["sing.local.idleSeconds"], 300);
});
