import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { createHostVision } from "../src/host/vision.mjs";
import { see } from "../src/media/compatible.mjs";
import { createQQCapabilities } from "../src/qq/capabilities.mjs";
import { mountMediaServices } from "../src/runtime/media-services.mjs";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=",
  "base64",
);
const image = `data:image/png;base64,${png.toString("base64")}`;
function fixture(t, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-host-vision-"));
  const store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "视觉测试",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const calls = [],
    saved = [],
    removers = [],
    agents = new Map();
  const services = {
    llm: {
      listModels: async (provider) => [
        { provider, id: "flash", inputModalities: ["text", "image"] },
        { provider, id: "text", inputModalities: ["text"] },
      ],
      async *stream(request) {
        calls.push(request);
        yield { type: "text-delta", text: "看到了" };
        yield { type: "text-delta", text: "图片" };
        yield { type: "finish", reason: { kind: "stop" } };
      },
      ...options.llm,
    },
    attachments: {
      async saveImage(input) {
        saved.push(input);
        return { id: "durable-image", mediaType: input.mediaType };
      },
      ...options.attachments,
    },
    agents: { get: (id) => agents.get(id) },
    agentDefaultModel: {
      currentSelection: () => ({ provider: "default", model: "flash" }),
    },
  };
  const vision = createHostVision(
    {
      inject(deps, fn) {
        fn({
          ...services,
          effect(effect) {
            const remove = effect();
            if (remove) removers.push(remove);
          },
        });
      },
    },
    store,
    options,
  );
  const configure = (patch) =>
    store.configure(character.id, patch, {
      revision: store.character(character.id).revision,
    });
  t.after(() => {
    vision.close();
    removers.reverse().forEach((fn) => fn());
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return {
    store,
    id: character.id,
    vision,
    calls,
    saved,
    configure,
    agents,
    services,
    removers,
  };
}

test("宿主视觉无需HTTP地址或另配密钥，真实字节先保存为附件引用再进入模型请求", async (t) => {
  const f = fixture(t),
    result = await see(
      f.store.character(f.id).config,
      { image, prompt: "图片是什么" },
      { characterId: f.id, hostVision: f.vision },
    );
  assert.equal(result.answer, "看到了图片");
  assert.equal(result.connection, "host");
  assert.deepEqual(Buffer.from(f.saved[0].data), png);
  assert.deepEqual(f.calls[0].messages[0].content[1], {
    type: "image",
    attachment: { id: "durable-image", mediaType: "image/png" },
  });
  assert.equal(f.calls[0].provider, "default");
  assert.equal(f.calls[0].maxTokens, 4096);
  assert.deepEqual(f.calls[0].tools, []);
  await assert.rejects(
    () => f.vision.imageBlock({ image: "data:image/png;base64,YQ=" }),
    /有效/,
  );
});

test("视觉选路遵循显式选择、当前会话、角色和DSH默认，并始终拒绝跨角色会话", async (t) => {
  const f = fixture(t, {
    characterSelection: () => ({ provider: "character", model: "flash" }),
  });
  f.store.conversations.ensure({
    sessionId: "own",
    characterId: f.id,
    platform: "qq",
    type: "private",
    target: "20001",
  });
  f.agents.set("own", { options: { provider: "session", model: "flash" } });
  assert.equal((await f.vision.select(f.id)).provider, "character");
  assert.equal(
    (await f.vision.select(f.id, { sessionId: "own" })).provider,
    "session",
  );
  assert.equal(
    (
      await f.vision.select(f.id, {
        modelSelection: { provider: "internal", model: "flash" },
      })
    ).provider,
    "internal",
  );
  f.configure({
    "vision.host.provider": "explicit",
    "vision.host.model": "flash",
  });
  assert.equal(
    (await f.vision.select(f.id, { sessionId: "own" })).provider,
    "explicit",
  );
  const other = f.store.createCharacter({ name: "其他角色" }).id;
  f.store.conversations.ensure({
    sessionId: "other",
    characterId: other,
    platform: "qq",
    type: "private",
    target: "30001",
  });
  await assert.rejects(
    () => f.vision.select(f.id, { sessionId: "other" }),
    /不属于/,
  );
});

test("纯文字与不存在的模型在保存图片前拒绝，host字段必须成对配置", async (t) => {
  const f = fixture(t);
  assert.throws(
    () => f.configure({ "vision.host.provider": "only-provider" }),
    /成对/,
  );
  for (const model of ["text", "missing"]) {
    f.configure({ "vision.host.provider": "test", "vision.host.model": model });
    await assert.rejects(
      () => f.vision.see(f.id, { image, prompt: "看图" }),
      /支持图片/,
    );
  }
  assert.equal(f.saved.length, 0);
  assert.equal(f.calls.length, 0);
  f.configure({ "vision.connection": "disabled" });
  await assert.rejects(
    () => f.vision.see(f.id, { image, prompt: "看图" }),
    /未启用/,
  );
});

test("错误、中止、截断、缺少结束与空回答均不能伪装成视觉成功", async (t) => {
  for (const reason of [
    "error",
    "aborted",
    "length",
    "max-tokens",
    "tool-calls",
    "missing",
    "empty",
  ]) {
    const f = fixture(t, {
      llm: {
        async *stream() {
          if (reason !== "empty") yield { type: "text-delta", text: "不完整" };
          if (reason !== "missing")
            yield {
              type: "finish",
              reason: { kind: reason === "empty" ? "stop" : reason },
            };
        },
      },
    });
    await assert.rejects(
      () => f.vision.see(f.id, { image, prompt: "看图" }),
      /失败|完整/,
    );
  }
});

test("真实宿主的max-tokens结束原因明确报告输出不足，保留配置上限且不返回半截答案", async (t) => {
  for (const kind of ["max-tokens", "length"]) {
    const f = fixture(t, {
      llm: {
        async *stream(request) {
          assert.equal(request.maxTokens, 1000);
          yield { type: "text-delta", text: "尚未写完的分析" };
          yield { type: "finish", reason: { kind } };
        },
      },
    });
    f.configure({ "vision.maxTokens": 1000 });
    await assert.rejects(
      () => f.vision.see(f.id, { image, prompt: "逐格分析视频" }),
      (error) => {
        assert.equal(error.code, "MODEL_OUTPUT_LIMIT");
        assert.match(error.message, /视觉输出令牌上限/);
        assert.doesNotMatch(error.message, /不支持|拒绝|尚未写完/);
        return true;
      },
    );
  }
});

test("列表等待中取消或卸载服务立即结束，不再保存或提交图片", async (t) => {
  const f = fixture(t, { llm: { listModels: () => new Promise(() => {}) } }),
    controller = new AbortController();
  const pending = f.vision.see(
    f.id,
    { image, prompt: "看图" },
    { signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(() => pending, /取消|超时/);
  const second = f.vision.see(f.id, { image, prompt: "看图" });
  f.vision.close();
  await assert.rejects(() => second, /停止|取消|超时/);
  assert.equal(f.saved.length, 0);
});

test("保存附件过程中切换连接，不会向旧模型继续提交图片", async (t) => {
  let release;
  const f = fixture(t, {
    attachments: {
      saveImage: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    },
  });
  const pending = f.vision.see(f.id, { image, prompt: "看图" });
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  f.configure({ "vision.connection": "disabled" });
  release({ id: "durable" });
  await assert.rejects(() => pending, /已改变/);
  assert.equal(f.calls.length, 0);
});

test("QQ只向支持图片的当前聊天模型提交本会话附件，失败明确降级且不接收越界编号", async (t) => {
  const f = fixture(t);
  f.configure({ "chat.tools.images": true });
  const remove = mountMediaServices(f.store, { hostVision: f.vision });
  t.after(remove);
  let downloads = 0;
  const cap = createQQCapabilities({
    store: f.store,
    characterId: f.id,
    modelSelection: { provider: "chat", model: "flash" },
    signal: new AbortController().signal,
    lookup: (id) => {
      if (id !== "received") throw new Error("越界消息");
      return {
        attachments: [{ type: "image", url: "https://gchat.qpic.cn/test" }],
      };
    },
    download: async () => {
      downloads++;
      return { bytes: png, mime: "image/png" };
    },
  });
  assert.deepEqual(
    await cap.imageBlocks([{ messageId: "received" }], {
      provider: "chat",
      model: "text",
    }),
    [],
  );
  assert.equal(downloads, 0);
  const blocks = await cap.imageBlocks([{ messageId: "received" }]);
  assert.equal(blocks[1].type, "image");
  assert.match(blocks[0].text, /received/);
  const result = await cap.inspect({ messageId: "received" });
  assert.equal(result.answer, "看到了图片");
  await assert.rejects(
    () => cap.imageBlocks([{ messageId: "foreign" }]),
    /越界/,
  );
  const bad = createQQCapabilities({
    store: f.store,
    characterId: f.id,
    modelSelection: { provider: "chat", model: "flash" },
    signal: new AbortController().signal,
    lookup: () => ({ attachments: [{ type: "image" }] }),
    download: async () => {
      throw new Error("附件已过期");
    },
  });
  const failed = await bad.imageBlocks([{ messageId: "received" }]);
  assert.equal(failed.length, 1);
  assert.match(failed[0].text, /未加载/);
  f.configure({ "chat.tools.images": false });
  assert.deepEqual(await cap.imageBlocks([{ messageId: "received" }]), []);
});

test("QQ直接图片限制总量与数量，下载途中撤销授权不继续投递", async (t) => {
  const f = fixture(t);
  f.configure({ "chat.tools.images": true });
  const remove = mountMediaServices(f.store, { hostVision: f.vision });
  t.after(remove);
  let downloads = 0;
  const make = (download) =>
    createQQCapabilities({
      store: f.store,
      characterId: f.id,
      modelSelection: { provider: "chat", model: "flash" },
      signal: new AbortController().signal,
      lookup: () => ({
        attachments: Array.from({ length: 5 }, () => ({ type: "image" })),
      }),
      download,
    });
  const cap = make(async (_item, limit) => {
    downloads++;
    assert.ok(limit > 0);
    return { bytes: Buffer.alloc(8 * 1024 * 1024), mime: "image/png" };
  });
  const blocks = await cap.imageBlocks([{ messageId: "received" }]);
  assert.equal(downloads, 1);
  assert.equal(blocks.filter((b) => b.type === "image").length, 1);
  assert.equal(blocks.filter((b) => b.type === "text").length, 3);
  const revoked = make(async () => {
    f.configure({ "chat.tools.images": false });
    return { bytes: png, mime: "image/png" };
  });
  await assert.rejects(
    () => revoked.imageBlocks([{ messageId: "received" }]),
    /关闭/,
  );
});
