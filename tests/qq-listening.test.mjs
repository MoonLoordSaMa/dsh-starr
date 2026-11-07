import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { createQQDriver } from "../src/host/qq-driver.mjs";

function fixture(t, { enabled = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-listening-"));
  const store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "连续接听测试",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backups"),
  });
  store.configure(
    character.id,
    { "chat.wait.afterReply": enabled },
    { revision: character.revision },
  );
  store.db.exec(
    "CREATE TABLE IF NOT EXISTS qq_session_bindings(session_id TEXT PRIMARY KEY,character_id TEXT NOT NULL)",
  );
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { store, id: character.id };
}

test("回复后接听默认150秒，可配置2–3分钟，越界值被拒绝并保持原配置", (t) => {
  const f = fixture(t);
  const patch = (seconds) =>
    f.store.configure(
      f.id,
      { "chat.wait.afterReplySeconds": seconds },
      { revision: f.store.character(f.id).revision },
    );
  assert.equal(
    f.store.character(f.id).config["chat.wait.afterReplySeconds"],
    150,
  );
  for (const seconds of [120, 180]) {
    patch(seconds);
    assert.equal(
      f.store.character(f.id).config["chat.wait.afterReplySeconds"],
      seconds,
    );
  }
  for (const seconds of [119, 181, 150.5]) assert.throws(() => patch(seconds));
  assert.equal(
    f.store.character(f.id).config["chat.wait.afterReplySeconds"],
    180,
  );
});

for (const mode of ["automatic", "explicit"]) {
  test(`${mode} 连续接听在下一步传入文字、图片及听写，不重复投递完整上下文`, async (t) => {
    const f = fixture(t),
      tools = new Map(),
      hooks = new Map();
    const injected = [],
      sent = [],
      readBatches = [],
      imageBatches = [];
    let followups = 0,
      waits = 0;
    const signal = new AbortController().signal;
    const agent = {
      id: "listen-session",
      status: "idle",
      options: {},
      session: { snapshotEvents: () => [] },
      ctx: {
        on(name, handler) {
          hooks.set(name, handler);
          return () => hooks.delete(name);
        },
        tools: {
          register(spec) {
            tools.set(spec.name, spec);
            return () => tools.delete(spec.name);
          },
        },
      },
      followup() {
        followups++;
      },
      inject(message) {
        injected.push(message);
      },
      async whenIdle() {
        for (let i = 0; i < 3; i++) {
          if (i) {
            assert.equal(injected.length, i);
            const msg = injected[i - 1];
            assert.equal(msg.source.kind, "user");
            assert.match(msg.content[0].text, new RegExp(`补充${i}`));
            assert.match(msg.content[0].text, /实际听写/);
            assert.doesNotMatch(
              msg.content[0].text,
              /本轮系统提示|当前状态|言外之意/,
            );
            assert.equal(msg.content.at(-1).type, "image");
            assert.equal(msg.content.at(-1).attachment.id, `image-${i}`);
          }
          const batch = tools.get("starr_qq_read").execute({}, { agent });
          readBatches.push(batch.batchId);
          await tools
            .get("starr_qq_reply")
            .execute({ text: `回复${i}` }, { agent });
          if (mode === "automatic" && i === 0)
            await assert.rejects(
              tools
                .get("starr_qq_wait_message")
                .execute({ seconds: 45 }, { agent, signal }),
              /120–180/,
            );
          if (mode === "explicit") {
            const result = await tools
              .get("starr_qq_wait_message")
              .execute({}, { agent, signal });
            assert.equal(result.status, i === 2 ? "timeout" : "received");
            assert.equal(
              result.messages,
              undefined,
              "正文通过下一步收件箱投递，回执不重复包含正文",
            );
          }
          await hooks.get("agent/turn-stopping")({ agent, signal });
        }
      },
      cancel() {},
    };
    const ctx = {
      agents: {
        get: () => undefined,
        create: async (opts) => {
          await opts.setup(agent.ctx, agent);
          return { agent };
        },
      },
      agentPresets: { mount: async () => {} },
    };
    const driver = createQQDriver(ctx, f.store);
    t.after(() => driver.close());
    await driver.run({
      thread: {
        sessionId: agent.id,
        characterId: f.id,
        type: "private",
        target: "200001",
        started: false,
      },
      settings: { provider: "synthetic", model: "image-model" },
      input: {
        batchId: "batch0",
        messages: [{ userId: "200001", text: "第一句" }],
      },
      reply: async (text) => {
        sent.push(text);
        return { status: "sent", messageId: String(sent.length) };
      },
      waitMessage: async (args, callerSignal) => {
        assert.equal(callerSignal, signal);
        if (
          args.seconds !== undefined &&
          (args.seconds < 120 || args.seconds > 180)
        )
          throw Error("回复后接听应为 120–180 秒");
        waits++;
        return waits < 3
          ? {
              status: "received",
              batchId: `batch${waits}`,
              watermark: waits,
              messages: [
                {
                  messageId: `m${waits}`,
                  userId: "200001",
                  text: `补充${waits}`,
                },
              ],
            }
          : { status: "timeout" };
      },
      capabilities: {
        audioMessages: async (messages) =>
          messages.map((m) => ({ ...m, text: m.text + " 实际听写" })),
        imageBlocks: async (messages, route) => {
          assert.equal(route.model, "image-model");
          imageBatches.push(messages[0].text);
          return messages[0].messageId
            ? [
                {
                  type: "image",
                  attachment: { id: `image-${messages[0].messageId.slice(1)}` },
                },
              ]
            : [];
        },
      },
      signal,
    });
    assert.equal(followups, 1);
    assert.equal(waits, 3);
    assert.equal(sent.length, 3);
    assert.equal(injected.length, 2);
    assert.deepEqual(readBatches, ["batch0", "batch1", "batch2"]);
    assert.equal(imageBatches.length, 3);
  });
}

test("关闭接听或发送结果不明时不会自动等待，B站保持原有回合结束行为", async (t) => {
  for (const [platform, enabled, status] of [
    ["qq", false, "sent"],
    ["qq", true, "uncertain"],
    ["bili", true, "sent"],
  ]) {
    const f = fixture(t, { enabled }),
      tools = new Map(),
      hooks = new Map();
    let waits = 0;
    const agent = {
      id: `${platform}-${status}-${enabled}`,
      status: "idle",
      options: {},
      session: { snapshotEvents: () => [] },
      ctx: {
        on: (n, h) => {
          hooks.set(n, h);
          return () => hooks.delete(n);
        },
        tools: {
          register: (s) => {
            tools.set(s.name, s);
            return () => tools.delete(s.name);
          },
        },
      },
      followup() {},
      cancel() {},
      async whenIdle() {
        await tools
          .get(`starr_${platform}_reply`)
          .execute({ text: "实际回复" }, { agent });
        await hooks.get("agent/turn-stopping")?.({
          agent,
          signal: new AbortController().signal,
        });
      },
    };
    const driver = createQQDriver(
      {
        agents: {
          get: () => undefined,
          create: async (o) => {
            await o.setup(agent.ctx, agent);
            return { agent };
          },
        },
        agentPresets: { mount: async () => {} },
      },
      f.store,
      { platform },
    );
    t.after(() => driver.close());
    await driver.run({
      thread: {
        sessionId: agent.id,
        characterId: f.id,
        type: "private",
        target: "200001",
        started: false,
      },
      settings: { provider: "synthetic", model: "synthetic" },
      input: { batchId: "batch", messages: [{ text: "合成" }] },
      reply: async () => ({ status }),
      waitMessage: async () => {
        waits++;
        return { status: "timeout" };
      },
      capabilities: { imageBlocks: async () => [] },
      signal: new AbortController().signal,
    });
    assert.equal(waits, 0);
  }
});
