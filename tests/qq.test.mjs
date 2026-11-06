import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { StarrStore } from "../src/starrcore/store.mjs";
import { QQService, normalizeQQEvent } from "../src/qq/service.mjs";
import { QQSecrets } from "../src/qq/secrets.mjs";
import { waitForMessages } from "../src/qq/wait-message.mjs";
import {
  onebotAction,
  checkOnebot,
  checkOnebotSocket,
  OneBotConnection,
} from "../src/qq/onebot.mjs";
import { createQQDriver } from "../src/host/qq-driver.mjs";
import { Onboarding } from "../src/onboarding/service.mjs";
import {
  createQQCapabilities,
  downloadAttachment,
} from "../src/qq/capabilities.mjs";

test("QQ NT官方图片地址允许下载，仿冒域名和非标准地址仍被拒绝", async (t) => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), redirect: options.redirect });
    return new Response(png, { headers: { "Content-Type": "image/png" } });
  });
  const url =
    "https://multimedia.nt.qq.com.cn/download?appid=1407&fileid=synthetic&rkey=synthetic";
  const result = await downloadAttachment({ url }, 1024);
  assert.deepEqual(result.bytes, png);
  assert.equal(result.mime, "image/png");
  assert.deepEqual(calls, [{ url, redirect: "error" }]);
  for (const url of [
    "https://multimedia.nt.qq.com.cn.evil.example/download",
    "https://evilmultimedia.nt.qq.com.cn/download",
    "https://other.qq.com.cn/download",
    "http://multimedia.nt.qq.com.cn/download",
    "https://multimedia.nt.qq.com.cn:8443/download",
    "https://user:password@multimedia.nt.qq.com.cn/download",
  ])
    await assert.rejects(() => downloadAttachment({ url }, 1024), /域名/);
  assert.equal(calls.length, 1);
});

test("QQ 附件只能来自本对象，收藏与表情发送使用同一角色库，下载拒绝本地与未知地址", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-qq-media-")),
    store = new StarrStore(path.join(root, "runtime")),
    { character } = store.setup({
      name: "附件测试",
      memoryRoot: path.join(root, "memory"),
      backupRoot: path.join(root, "backup"),
    });
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  store.configure(
    character.id,
    { "chat.tools.collectSticker": true },
    { revision: character.revision },
  );
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
    sent = [];
  const capabilities = createQQCapabilities({
    store,
    characterId: character.id,
    lookup: (id) => {
      if (id !== "received") throw new Error("越界消息");
      return {
        attachments: [
          { type: "image", url: "https://gchat.qpic.cn/synthetic" },
        ],
      };
    },
    signal: new AbortController().signal,
    download: async () => ({ bytes: png, mime: "image/png" }),
    action: async () => ({}),
    send: async (segments) => {
      sent.push(segments);
      return { status: "sent", messageId: "test" };
    },
  });
  const item = await capabilities.collect({
    messageId: "received",
    name: "开心",
  });
  assert.equal(capabilities.stickers()[0].id, item.id);
  await capabilities.sticker({ id: item.id });
  assert.equal(sent[0][0].type, "image");
  await assert.rejects(
    () => capabilities.collect({ messageId: "other", name: "错误" }),
    /越界/,
  );
  await assert.rejects(
    () => capabilities.inspect({ messageId: "received" }),
    /关闭/,
  );
  const other = store.createCharacter({ name: "另一个角色" });
  assert.throws(() => store.expressionFile(other.id, item.id), /不存在/);
  await assert.rejects(
    () => downloadAttachment({ url: "http://127.0.0.1/private" }, 1024),
    /域名/,
  );
  await assert.rejects(
    () =>
      downloadAttachment({ url: "https://qpic.cn.evil.example/image" }, 1024),
    /域名/,
  );
});

test("QQ 角色表情外发与文字共用单批回执，重复调用不能多发", async (t) => {
  let expressionId;
  const f = await fixture(t, async ({ capabilities, reply }) => {
    await capabilities.sticker({ id: expressionId });
    await assert.rejects(() => reply("再发一次"), /不可重复/);
  });
  expressionId = f.store.addExpression(
    f.characterId,
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
    "合成表情",
  ).id;
  f.incoming(event(91001));
  await f.flush();
  assert.equal(f.sends.length, 1);
  assert.equal(f.sends[0].params.message[0].type, "image");
  assert.equal(f.sends[0].params.message[0].data.sub_type, 1);
  assert.equal(f.service.status().counts.done, 1);
});

test("群聊接收拍一拍与纯@事件，发送使用SnowLuma原生路由和群@段", async (t) => {
  const settings = {
    privateUsers: "200001",
    groups: "300001",
    requireMention: true,
  };
  const poke = normalizeQQEvent(
    {
      post_type: "notice",
      notice_type: "notify",
      sub_type: "poke",
      self_id: "100001",
      user_id: "200001",
      target_id: "100001",
      group_id: "300001",
      time: 1760000000,
    },
    settings,
    "100001",
  );
  assert.equal(poke.type, "group");
  assert.match(poke.text, /拍了拍/);
  assert.equal(
    normalizeQQEvent(
      {
        post_type: "notice",
        notice_type: "notify",
        sub_type: "poke",
        self_id: "100001",
        user_id: "200001",
        target_id: "999999",
        group_id: "300001",
        time: 1760000000,
      },
      settings,
      "100001",
    ),
    null,
  );
  const mention = event(73, "", {
    message_type: "group",
    group_id: "300001",
    message: [{ type: "at", data: { qq: "100001" } }],
  });
  assert.equal(
    normalizeQQEvent(mention, settings, "100001").text,
    "[对方 @ 了你]",
  );
  const f = await fixture(t, async ({ reply }) =>
    reply("你好", undefined, "200001"),
  );
  await f.service.configure({
    revision: f.service.settings().revision,
    patch: { groups: "300001" },
  });
  f.incoming(
    event(74, "", {
      message_type: "group",
      group_id: "300001",
      message: [{ type: "at", data: { qq: "100001" } }],
    }),
  );
  await f.flush();
  assert.equal(f.sends[0].params.message[0].type, "at");
  assert.equal(f.sends[0].params.message[0].data.qq, "200001");
  assert.equal(f.sends[0].name, "send_group_msg");
});

test("拍一拍只回应收到事件对应的私聊好友", async (t) => {
  const f = await fixture(t, async ({ capabilities }) =>
    capabilities.poke({ userId: "200001" }),
  );
  f.store.configure(
    f.characterId,
    { "chat.tools.poke": true },
    { revision: 1 },
  );
  f.incoming(event(75));
  await f.flush();
  assert.equal(f.sends[0].name, "send_poke");
  assert.equal(f.sends[0].params.user_id, "200001");
  assert.equal(f.sends[0].params.group_id, undefined);
});

test("引用来信保留原消息上下文，引用回复只能指向当前会话已收到消息", async (t) => {
  const seen = [];
  const f = await fixture(t, async ({ input, reply }) => {
    seen.push(input.messages[0]);
    if (input.messages[0].messageId === "quote-source")
      await reply("原消息收到");
    else await reply("我说的是这条", input.messages[0].replyToId);
  });
  f.incoming(event("quote-source", "原消息正文"));
  await f.flush();
  f.incoming(
    event("quote-followup", "想问这条", {
      message: [
        { type: "reply", data: { id: "quote-source" } },
        { type: "text", data: { text: "想问这条" } },
      ],
    }),
  );
  await f.flush();
  assert.equal(seen[1].replyToId, "quote-source");
  assert.deepEqual(seen[1].replyTo, {
    messageId: "quote-source",
    available: true,
    senderName: "",
    userId: "200001",
    text: "原消息正文",
  });
  assert.deepEqual(f.sends.at(-1).params.message[0], {
    type: "reply",
    data: { id: "quote-source" },
  });
  assert.equal(f.sends.at(-1).params.message[1].data.text, "我说的是这条");
});

test("当前会话里对方引用角色的旧回复时保留内容并可继续引用", async (t) => {
  const seen = [];
  let sentId = "";
  const f = await fixture(t, async ({ input, reply }) => {
    seen.push(input.messages[0]);
    if (input.messages[0].messageId === "outgoing-source")
      sentId = (await reply("我之前说过的话")).messageId;
    else await reply("我接着解释", input.messages[0].replyToId);
  });
  f.incoming(event("outgoing-source", "你刚才说了什么"));
  await f.flush();
  assert.ok(sentId);
  f.incoming(
    event("outgoing-followup", "解释一下", {
      message: [
        { type: "reply", data: { id: sentId } },
        { type: "text", data: { text: "解释一下" } },
      ],
    }),
  );
  await f.flush();
  assert.equal(seen[1].replyTo.available, true);
  assert.equal(seen[1].replyTo.text, "我之前说过的话");
  assert.deepEqual(f.sends.at(-1).params.message[0], {
    type: "reply",
    data: { id: sentId },
  });
});

test("引用验证会拒绝另一位好友会话里的真实消息编号", async (t) => {
  const f = await fixture(t, async ({ reply }) => reply("当前私聊回复"));
  f.incoming(event("private-a", "甲的消息"));
  await f.flush();
  await f.service.configure({
    revision: f.service.settings().revision,
    patch: { privateUsers: "200001,200002" },
  });
  f.service.driver.run = async ({ reply }) => {
    await assert.rejects(() => reply("不能跨好友引用", "private-a"), {
      status: 403,
    });
    await reply("乙的正常回复");
  };
  f.incoming(event("private-b", "乙的消息", { user_id: 200002 }));
  await f.flush();
  assert.equal(f.sends.length, 2);
  assert.equal(f.sends.at(-1).params.message[0].data.text, "乙的正常回复");
});

test("回复后等待一次接管新批次，不额外消耗唤醒额度", async (t) => {
  let f;
  f = await fixture(t, async ({ input, reply, waitMessage }) => {
    if (input.messages[0].messageId === "wait-first") {
      await reply("我在听");
      const arrived = new Promise((resolve) =>
        setTimeout(() => {
          f.incoming(event("wait-second", "再补充一句"));
          resolve();
        }, 0),
      );
      const result = await waitMessage({ seconds: 30 });
      await arrived;
      assert.equal(result.status, "received");
      assert.equal(result.messages[0].messageId, "wait-second");
      await reply("我接着听");
    }
  });
  f.store.configure(
    f.characterId,
    { "chat.tools.wait": false },
    { revision: f.store.character(f.characterId).revision },
  );
  f.incoming(event("wait-first", "先说一句"));
  await f.flush();
  assert.equal(f.sends.length, 2);
  assert.equal(
    f.store.db
      .prepare("SELECT count(*) n FROM chat_rates WHERE kind='wake'")
      .get().n,
    1,
  );
  assert.deepEqual(
    f.store.db
      .prepare("SELECT status FROM qq_inbox ORDER BY seq")
      .all()
      .map((row) => row.status),
    ["done", "done"],
  );
});

test("QQ群聊默认支持有限分段回复，引用与@只附在第一条", async (t) => {
  let runs = 0;
  const f = await fixture(t, async ({ reply, burst }) => {
    runs++;
    if (runs === 1) await reply("先收到啦");
    else await burst(["我先说重点", "还有一句补充"], "group-source", "200001");
  });
  await f.service.configure({
    revision: f.service.settings().revision,
    patch: { groups: "300001", requireMention: true },
  });
  const groupMessage = (id, text, quotedId) =>
    event(id, text, {
      message_type: "group",
      group_id: 300001,
      message: [
        ...(quotedId ? [{ type: "reply", data: { id: quotedId } }] : []),
        { type: "at", data: { qq: "100001" } },
        { type: "text", data: { text } },
      ],
    });
  f.incoming(groupMessage("group-source", "先前的话"));
  await f.flush();
  f.incoming(groupMessage("group-followup", "你怎么看", "group-source"));
  await f.flush();
  assert.equal(f.sends.length, 3);
  assert.equal(f.sends[1].name, "send_group_msg");
  assert.equal(f.sends[1].params.message[0].type, "reply");
  assert.equal(f.sends[1].params.message[1].type, "at");
  assert.equal(f.sends[1].params.message[2].data.text, "我先说重点");
  assert.deepEqual(f.sends[2].params.message, [
    { type: "text", data: { text: "还有一句补充" } },
  ]);
});

test("普通群聊回复按空行分段并保留单换行，超过条数合并尾段而不丢字", async (t) => {
  const f = await fixture(t, ({ reply }) =>
    reply("第一段\n保留换行\n\n第二段\n\n第三段\n\n第四段", "paragraph-source"),
  );
  await f.service.configure({
    revision: f.service.settings().revision,
    patch: { groups: "300001" },
  });
  clearInterval(f.service.timer);
  f.incoming(
    event("paragraph-source", "你好", {
      message_type: "group",
      group_id: 300001,
      message: [
        { type: "at", data: { qq: "100001" } },
        { type: "text", data: { text: "你好" } },
      ],
    }),
  );
  await f.flush();
  assert.deepEqual(
    f.sends.map((item) => item.params.message.at(-1).data.text),
    ["第一段\n保留换行", "第二段", "第三段\n\n第四段"],
  );
  assert.deepEqual(f.sends[0].params.message.slice(0, 2), [
    { type: "reply", data: { id: "paragraph-source" } },
    { type: "at", data: { qq: "200001" } },
  ]);
  assert.equal(f.sends[1].params.message.length, 1);
  assert.equal(f.service.status().counts.done, 1);
});

test("真实连接的消息分发允许群戳一戳通知进入回复链路，忽略其他通知", async (t) => {
  const f = await fixture(t, ({ reply }) => reply("收到你的戳一戳啦"));
  await f.service.configure({
    revision: f.service.settings().revision,
    patch: { groups: "300001" },
  });
  clearInterval(f.service.timer);
  t.mock.method(
    globalThis,
    "fetch",
    async (url) =>
      new Response(
        JSON.stringify({
          status: "ok",
          retcode: 0,
          data: String(url).includes("get_login_info")
            ? { user_id: 100001 }
            : { online: true },
        }),
      ),
  );
  let socket;
  class TestSocket extends EventTarget {
    constructor() {
      super();
      socket = this;
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }
    close() {}
  }
  t.mock.method(globalThis, "WebSocket", function () {
    return new TestSocket();
  });
  const connection = new OneBotConnection(
    { httpPort: 3000, wsPort: 3001 },
    {
      onState() {},
      onEvent: (message) => f.service.receive(message),
    },
  );
  t.after(() => connection.close());
  await connection.connect();
  const notification = {
    post_type: "notice",
    notice_type: "notify",
    sub_type: "poke",
    self_id: 100001,
    group_id: 300001,
    user_id: 200001,
    target_id: 100001,
    time: 1793937600,
  };
  const dispatch = (value) =>
    socket.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(value) }),
    );
  dispatch({ ...notification, sub_type: "honor" });
  dispatch({ ...notification, target_id: 200002 });
  dispatch({ ...notification, group_id: 300002 });
  assert.equal(
    f.store.db.prepare("SELECT count(*) n FROM qq_inbox").get().n,
    0,
  );
  dispatch(notification);
  dispatch(notification);
  await f.flush();
  assert.equal(f.sends.length, 1);
  assert.equal(f.sends[0].name, "send_group_msg");
  assert.equal(f.sends[0].params.message.at(-1).data.text, "收到你的戳一戳啦");
  assert.equal(f.service.status().counts.done, 1);
});

test("等待消息超时使用单一截止时间，不在空收件箱持续轮询", async () => {
  let now = 0;
  const result = await waitForMessages({
    milliseconds: 700,
    signal: new AbortController().signal,
    clock: () => now,
    read: () => [],
    sleep: async (milliseconds) => {
      now += milliseconds;
    },
  });
  assert.deepEqual(result, []);
  assert.equal(now, 700);
});

const event = (id, text = "你好", extra = {}) => ({
  post_type: "message",
  message_type: "private",
  self_id: 100001,
  user_id: 200001,
  message_id: id,
  message: [{ type: "text", data: { text } }],
  ...extra,
});
async function fixture(t, run, action) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-qq-"));
  const store = new StarrStore(path.join(root, "runtime"));
  store.setup({
    name: "QQ 合成角色",
    persona: "只用于独立验收",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const characterId = store.listCharacters()[0].id;
  const sends = [];
  let handlers;
  const service = new QQService(store, {
    driver: { run, close() {} },
    secrets: {
      status: () => ({ saved: false, storage: "test" }),
      read: async () => "synthetic-token",
    },
    connection: (_options, callbacks) => {
      handlers = callbacks;
      return {
        connect() {
          callbacks.onState({
            status: "connected",
            account: { selfId: "100001" },
          });
        },
        close() {},
      };
    },
    action:
      action ||
      (async (_options, name, params) => {
        sends.push({ name, params });
        return { message_id: 900001 + sends.length };
      }),
  });
  t.after(() => {
    service.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  await service.configure({
    revision: 0,
    patch: {
      enabled: true,
      characterId,
      provider: "test",
      model: "test",
      privateUsers: "200001",
      mergeMs: 200,
    },
  });
  clearInterval(service.timer);
  const flush = async () => {
    store.db
      .prepare(
        "UPDATE qq_inbox SET created=created-1000,next_at=0 WHERE status='pending'",
      )
      .run();
    service.pump();
    await Promise.all([...service.running.values()]);
  };
  return {
    root,
    store,
    service,
    characterId,
    sends,
    incoming: (message) => handlers.onEvent(message),
    account: (selfId) =>
      handlers.onState({ status: "connected", account: { selfId } }),
    flush,
  };
}

test("QQ 收件校验账号、白名单和群内 @，平台文本不能改变收件目标", () => {
  const settings = {
    privateUsers: "200001",
    groups: "300001",
    requireMention: true,
  };
  assert.equal(normalizeQQEvent(event(1), settings, "100001").target, "200001");
  assert.equal(
    normalizeQQEvent(event(1, "", { user_id: 200002 }), settings, "100001"),
    null,
  );
  assert.equal(
    normalizeQQEvent(event(1, "", { self_id: 100002 }), settings, "100001"),
    null,
  );
  assert.equal(
    normalizeQQEvent(event(1, "", { user_id: 100001 }), settings, "100001"),
    null,
  );
  const group = event(2, "群消息", { message_type: "group", group_id: 300001 });
  assert.equal(normalizeQQEvent(group, settings, "100001"), null);
  group.message.unshift({ type: "at", data: { qq: "100001" } });
  assert.equal(normalizeQQEvent(group, settings, "100001").target, "300001");
});

test("同一条 QQ 消息重复上报只回复一次，目标来自可信事件，正文不自动转发", async (t) => {
  const f = await fixture(t, async ({ reply }) => {
    await reply("收到啦");
    return { text: "这段最终正文不能转发" };
  });
  f.incoming(event(10));
  f.incoming(event(10));
  await f.flush();
  await f.flush();
  assert.equal(f.sends.length, 1);
  assert.equal(f.sends[0].params.user_id, "200001");
  assert.equal(f.sends[0].params.message[0].data.text, "收到啦");
  assert.equal(f.service.status().counts.done, 1);
});

test("旧版会话行为接回：观察、关键词、拒收、软等待与历史读取均由真实配置控制", async (t) => {
  let invocation = 0,
    latest;
  const f = await fixture(t, async (api) => {
    invocation++;
    latest = api;
    if (invocation === 1)
      api.wait({ milliseconds: 1000, reason: "等一句补充" });
    else await api.reply("继续啦");
  });
  const configure = (patch) =>
    f.store.configure(f.characterId, patch, {
      revision: f.store.character(f.characterId).revision,
    });
  configure({
    "chat.wake.mode": "observe",
    "chat.wake.keywords": "天文",
    "chat.access.deniedUsers": "200009",
  });
  f.incoming(event(7001, "随口说说"));
  await f.flush();
  assert.equal(invocation, 0);
  f.incoming(event(7002, "天文研究"));
  await f.flush();
  assert.equal(invocation, 1);
  assert.equal(latest.history({ limit: 2 })[0].messageId, "7001");
  assert.throws(() => latest.history({ messageId: "other" }), { status: 404 });
  f.incoming(event(7003, "天文还有一件事"));
  await f.flush();
  assert.equal(invocation, 1);
  f.store.db.prepare("UPDATE chat_runtime SET wake_after=0").run();
  await f.flush();
  assert.equal(invocation, 2);
  configure({ "chat.tools.history": false });
  assert.throws(() => latest.history(), { status: 403 });
});

test("旧版分条与引用接回：逐条持久回执，失败后不重发已成功部分，越界引用被拒绝", async (t) => {
  const f = await fixture(
    t,
    async ({ burst }) => burst(["第一句", "第二句", "第三句"]),
    async (_options, name, params) => {
      f.sends.push({ name, params });
      if (f.sends.length === 2)
        throw Object.assign(new Error("模拟回执丢失"), { uncertain: true });
      return { message_id: "part-one" };
    },
  );
  f.store.configure(
    f.characterId,
    { "chat.reply.burstEnabled": true },
    { revision: 1 },
  );
  f.incoming(event(7101));
  await f.flush();
  await f.flush();
  assert.equal(f.sends.length, 2);
  const parts = f.store.db
    .prepare("SELECT status FROM qq_send_parts ORDER BY position")
    .all();
  assert.deepEqual(
    parts.map((p) => p.status),
    ["sent", "uncertain"],
  );
  assert.equal(f.service.status().counts.uncertain, 1);
  f.service.driver.run = async ({ reply }) => {
    await assert.rejects(() => reply("不可引用", "not-current"), {
      status: 403,
    });
    await reply("引用收到的消息", "7102");
  };
  f.incoming(event(7102));
  await f.flush();
  assert.equal(f.sends.at(-1).params.message[0].type, "reply");
});

test("唤醒额度、回复长度和单轮摘录预算实际生效；完整消息仍可读取", async (t) => {
  let calls = 0;
  const f = await fixture(t, async ({ input, history, reply, silence }) => {
    calls++;
    assert.ok(input.messages.reduce((n, m) => n + m.text.length, 0) <= 500);
    assert.equal(
      history({ messageId: input.messages[0].messageId }).text.length,
      800,
    );
    await assert.rejects(() => reply("字".repeat(101)), { status: 400 });
    silence("当前不发送长文");
  });
  f.store.configure(
    f.characterId,
    {
      "chat.wake.maxPerMinute": 1,
      "chat.reply.maxChars": 100,
      "chat.context.batchChars": 500,
    },
    { revision: 1 },
  );
  f.incoming(event(7201, "星".repeat(800)));
  await f.flush();
  assert.equal(calls, 1);
  f.incoming(event(7202, "星".repeat(800)));
  await f.flush();
  assert.equal(calls, 1);
  assert.equal(
    f.store.db
      .prepare(
        "SELECT error FROM qq_inbox WHERE json_extract(payload,'$.messageId')='7202'",
      )
      .get().error,
    "RATE_LIMIT",
  );
});

test("管理员可恢复单会话状态，bot 收尾不能改用途；问句规则与刷屏冷却可解释", async (t) => {
  const f = await fixture(t, async ({ closeConversation }) =>
    closeConversation({ revision: 1, summary: "这一段聊完了" }),
  );
  f.incoming(event(7301, "再见"));
  await f.flush();
  const session = f.store.conversations.list(f.characterId)[0];
  assert.equal(
    f.store.conversations.get(session.session_id).behavior.mode,
    "observe",
  );
  f.store.conversations.patch(session.session_id, {
    revision: 2,
    patch: { mode: "awake" },
  });
  assert.equal(
    f.store.conversations.get(session.session_id).behavior.mode,
    "awake",
  );
  f.store.configure(
    f.characterId,
    { "chat.guard.enabled": true, "chat.guard.maxConsecutive": 2 },
    { revision: 1 },
  );
  for (let i = 0; i < 3; i++) f.incoming(event(7310 + i));
  await f.flush();
  assert.ok(
    f.store.db
      .prepare("SELECT error FROM qq_inbox WHERE error='SPAM_COOLDOWN'")
      .get(),
  );
});

test("思考期间新来的消息不被旧水位确认，短消息合并不串对话", async (t) => {
  let release;
  let runs = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const batches = [];
  const f = await fixture(t, async ({ input, reply }) => {
    batches.push(input);
    if (++runs === 1) await gate;
    await reply(`第${runs}批`);
  });
  f.incoming(event(11, "第一句"));
  f.incoming(event(12, "补一句"));
  const pending = f.flush();
  f.incoming(event(13, "思考时新来的"));
  release();
  await pending;
  assert.equal(f.service.status().counts.pending, 1);
  assert.equal(f.service.status().counts.done, 2);
  await f.flush();
  assert.deepEqual(
    batches.map((batch) => batch.messages.length),
    [2, 1],
  );
  assert.equal(f.sends.length, 2);
});

test("OneBot 发送结果不明保留待核对，重启恢复和手动重试也不重复发送", async (t) => {
  let sends = 0;
  const f = await fixture(
    t,
    async ({ reply }) => {
      await reply("测试");
    },
    async () => {
      sends++;
      throw Object.assign(new Error("断线"), {
        uncertain: true,
        code: "ONEBOT_TRANSPORT",
      });
    },
  );
  f.incoming(event(14));
  await f.flush();
  assert.equal(f.service.status().counts.uncertain, 1);
  f.service.retryFailed();
  await f.flush();
  f.incoming(event(14));
  await f.service.restart();
  clearInterval(f.service.timer);
  await f.flush();
  assert.equal(sends, 1);
  assert.equal(f.service.status().counts.uncertain, 1);
});

test("模型未调用平台工具时不假报已回复，有限重试后保留明确失败", async (t) => {
  let runs = 0;
  const f = await fixture(t, async () => {
    runs++;
    return { text: "只是模型正文" };
  });
  f.incoming(event(15));
  await f.flush();
  await f.flush();
  await f.flush();
  await f.flush();
  assert.equal(runs, 3);
  assert.equal(f.sends.length, 0);
  assert.equal(f.service.status().counts.failed, 1);
  assert.equal(f.service.status().recent[0].error, "NO_PLATFORM_REPLY");
});

test("可选择安静；重复结束调用被拒绝，更换角色使用独立平台上下文", async (t) => {
  const sessions = [];
  const f = await fixture(t, async ({ thread, silence }) => {
    sessions.push(thread.sessionId);
    silence("本条无需回复");
    assert.throws(() => silence("不能再次结束"), /已经完成/);
  });
  f.incoming(event(16));
  await f.flush();
  const b = f.store.createCharacter({ name: "另一个合成角色" });
  await f.service.configure({
    revision: f.service.settings().revision,
    patch: { characterId: b.id },
  });
  clearInterval(f.service.timer);
  f.incoming(event(17));
  await f.flush();
  assert.equal(new Set(sessions).size, 2);
  assert.equal(f.sends.length, 0);
  assert.equal(f.service.status().counts.done, 2);
  await assert.rejects(
    () => f.service.configure({ revision: 0, patch: { enabled: false } }),
    /已更新/,
  );
});

test("同一批次重复调用发送工具只产生一个平台请求", async (t) => {
  const f = await fixture(t, async ({ reply }) => {
    await reply("只发一次");
    await assert.rejects(() => reply("第二次"), /不可重复/);
  });
  f.incoming(event(20));
  await f.flush();
  assert.equal(f.sends.length, 1);
  assert.equal(f.service.status().counts.done, 1);
});

test("模型捕获发送工具异常后仍保留真实平台认证失败原因", async (t) => {
  const f = await fixture(
    t,
    async ({ reply }) => {
      try {
        await reply("测试失败");
      } catch {}
    },
    async () => {
      throw Object.assign(new Error("令牌无效"), { code: "ONEBOT_AUTH" });
    },
  );
  f.incoming(event(25));
  await f.flush();
  assert.equal(f.service.status().counts.failed, 1);
  assert.equal(f.service.status().recent[0].error, "ONEBOT_AUTH");
});

test("暂停打断旧批次不会发送或污染新状态，恢复后只处理一次", async (t) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let runs = 0;
  const f = await fixture(t, async ({ reply }) => {
    if (++runs === 1) await gate;
    await reply("恢复后处理");
  });
  f.incoming(event(21));
  const processing = f.flush();
  await f.service.configure({ revision: 1, patch: { enabled: false } });
  release();
  await processing;
  assert.equal(f.sends.length, 0);
  assert.equal(f.service.status().runtime.status, "stopped");
  assert.equal(f.service.status().runtime.lastError, undefined);
  await f.service.configure({ revision: 2, patch: { enabled: true } });
  clearInterval(f.service.timer);
  await f.flush();
  assert.equal(f.sends.length, 1);
});

test("更换登录账号后旧账号队列不能借新账号发出，上下文也分开", async (t) => {
  const sessions = [];
  const f = await fixture(t, async ({ thread, reply }) => {
    sessions.push(thread.sessionId);
    await reply("账号隔离");
  });
  f.incoming(event(22));
  f.account("100002");
  f.incoming(event(23, "新账号消息", { self_id: 100002 }));
  await f.flush();
  assert.equal(f.sends.length, 1);
  assert.equal(f.service.status().counts.pending, 1);
  f.account("100001");
  await f.flush();
  assert.equal(f.sends.length, 2);
  assert.equal(new Set(sessions).size, 2);
});

test("连接页同步已完成向导，旧修订不能覆盖新配置或密钥", async (t) => {
  const f = await fixture(t, async ({ silence }) => silence("测试"));
  const onboarding = new Onboarding(f.store);
  const state = onboarding.read();
  state.completedAt = new Date().toISOString();
  state.characterId = f.characterId;
  state.checks.snowluma = { status: "verified" };
  onboarding.write(state, 0);
  let saves = 0;
  f.service.secrets.save = async () => {
    saves++;
  };
  const results = await Promise.allSettled([
    f.service.configure({
      revision: 1,
      patch: { httpPort: 3010, privateUsers: "200002" },
      token: "synthetic-a",
    }),
    f.service.configure({
      revision: 1,
      patch: { httpPort: 3020 },
      token: "synthetic-b",
    }),
  ]);
  clearInterval(f.service.timer);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  assert.equal(saves, 1);
  const next = onboarding.read();
  assert.equal(next.draft.httpPort, 3010);
  assert.equal(next.draft.qqPrivateUsers, "200002");
  assert.equal(next.checks.snowluma, undefined);
  assert.equal(f.service.validateOnboarding(next).httpPort, 3010);
});

test("移除授权后历史待处理消息不会发出，旧连接事件在重配后失效", async (t) => {
  const f = await fixture(t, async ({ reply }) => {
    await reply("不应发出");
  });
  f.incoming(event(18));
  await f.service.configure({
    revision: f.service.settings().revision,
    patch: { privateUsers: "200002" },
  });
  clearInterval(f.service.timer);
  await f.flush();
  assert.equal(f.sends.length, 0);
  assert.equal(f.service.status().counts.pending, 1);
});

test("同一数据目录的第二个驱动不会抢占运行锁或重置首个驱动的收件状态", async (t) => {
  const f = await fixture(t, async ({ silence }) => silence("无须回复"));
  const second = new QQService(f.store, { driver: { run() {}, close() {} } });
  try {
    await second.restart();
    assert.equal(second.status().runtime.code, "IN_USE");
    assert.equal(f.service.status().runtime.status, "connected");
  } finally {
    second.close();
  }
});

test("HTTP 200 不等于 OneBot 成功，401、离线和没有消息编号均不能报告已发送", async (t) => {
  let mode = "unauthorized";
  const server = http.createServer((req, res) => {
    if (mode === "unauthorized") return res.writeHead(401).end();
    const data =
      req.url === "/get_login_info"
        ? { user_id: 100001 }
        : mode === "online"
          ? { online: true }
          : { online: false };
    res
      .writeHead(200, { "Content-Type": "application/json" })
      .end(JSON.stringify({ status: "ok", retcode: 0, data }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const options = { httpPort: server.address().port };
  await assert.rejects(() => onebotAction(options, "get_status"), {
    code: "ONEBOT_AUTH",
  });
  mode = "offline";
  await assert.rejects(() => checkOnebot(options), { code: "QQ_OFFLINE" });
  mode = "online";
  assert.equal((await checkOnebot(options)).selfId, "100001");
  await assert.rejects(() => onebotAction(options, "send_private_msg"), {
    uncertain: true,
  });
  await assert.rejects(() => checkOnebotSocket({ wsPort: options.httpPort }), {
    code: "WS_CONNECTION",
  });
});

test(
  "Windows 令牌经系统加密后可读取，文件与状态均不包含明文",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-secret-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const secrets = new QQSecrets(root),
      token = `synthetic-${crypto.randomUUID()}`;
    await secrets.save(token);
    assert.equal(await secrets.read("STARR_TEST_NONEXISTENT"), token);
    assert.equal(
      fs.readFileSync(secrets.file).includes(Buffer.from(token)),
      false,
    );
    assert.equal(JSON.stringify(secrets.status()).includes(token), false);
    secrets.clear();
    assert.equal(await secrets.read("STARR_TEST_NONEXISTENT"), "");
  },
);

test("宿主适配使用 Agent 接口，回复工具固定会话，再次调用复用同一 Session", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-driver-"));
  const store = new StarrStore(root);
  store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  store.db.exec(
    "CREATE TABLE qq_session_bindings(session_id TEXT PRIMARY KEY,character_id TEXT NOT NULL)",
  );
  const tools = new Map(),
    messages = [],
    agents = new Map(),
    hooks = new Map(),
    events = [];
  let replyCount = 0,
    created = 0,
    failure = null,
    selected;
  const make = async (options) => {
    created++;
    const agent = {
      id: options.sessionId,
      status: "idle",
      options: {},
      session: { snapshotEvents: () => events },
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
      followup(message) {
        messages.push(message);
        events.push({ type: "user/message", data: message });
      },
      async whenIdle() {
        assert.equal(tools.has("starr_qq_burst"), true);
        assert.deepEqual(
          Object.keys(tools.get("starr_qq_burst").parameters.properties),
          ["texts", "quoteId", "mentionUserId"],
        );
        selected = await hooks.get("agent/request")({}, async () => ({
          provider: "old",
          model: "old",
          reasoningEffort: "high",
          messages: [],
        }));
        if (failure) {
          hooks.get("agent/error")({ error: failure });
          return;
        }
        await tools
          .get("starr_qq_reply")
          .execute({ text: "实际工具调用" }, { agent });
      },
      cancel() {},
    };
    await options.setup(agent.ctx, agent);
    agents.set(agent.id, agent);
    return { agent };
  };
  const driver = createQQDriver(
    {
      agents: {
        get: (id) => agents.get(id),
        create: async (options) => make(options),
      },
      agentPresets: { mount: async () => {} },
    },
    store,
  );
  t.after(() => {
    driver.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const args = {
    thread: {
      sessionId: "session-qq-test",
      characterId: store.listCharacters()[0].id,
      type: "group",
      target: "200001",
      started: false,
    },
    settings: { provider: "test", model: "test" },
    capabilities: {
      imageBlocks: async (_messages, selection) => {
        assert.deepEqual(selection, { provider: "test", model: "test" });
        return [{ type: "image", attachment: { id: "synthetic-durable-ref" } }];
      },
    },
    input: {
      batchId: "batch",
      messages: [{ userId: "200001", text: "测试输入" }],
    },
    reply: async () => {
      replyCount++;
      return { messageId: "1" };
    },
    signal: new AbortController().signal,
  };
  await driver.run(args);
  await driver.run(args);
  assert.equal(created, 1);
  assert.equal(replyCount, 2);
  assert.ok(messages[0].content[0].text.includes("测试输入"));
  assert.deepEqual(messages[0].content[1], {
    type: "image",
    attachment: { id: "synthetic-durable-ref" },
  });
  assert.equal(messages[1].content.length, 1);
  assert.match(messages[0].content[0].text, /【本轮系统提示 · 当前角色】/);
  assert.match(messages[0].content[0].text, /【本轮上下文 · 言外之意】/);
  assert.match(messages[0].content[0].text, /【当前状态】/);
  assert.match(messages[0].content[0].text, /【本轮平台来信】/);
  assert.ok(messages[1].content[0].text.includes("接着回应前文尚未回复"));
  assert.match(messages[0].content[0].text, /直接以当前角色回应/);
  assert.doesNotMatch(messages[0].content[0].text, /最终模型正文仅供宿主查看/);
  assert.equal(messages[1].content[0].text.includes("测试输入"), false);
  assert.equal(selected.provider, "test");
  assert.equal(selected.model, "test");
  assert.equal(selected.reasoningEffort, undefined);
  failure = { code: "429", message: "insufficient_quota" };
  await assert.rejects(() => driver.run(args), { code: "MODEL_QUOTA" });
  failure = { message: "authentication failed 401" };
  await assert.rejects(() => driver.run(args), { code: "MODEL_AUTH" });
  failure = { message: "server busy 429" };
  await assert.rejects(() => driver.run(args), { code: "MODEL_BUSY" });
  assert.throws(
    () =>
      tools
        .get("starr_qq_reply")
        .execute({ text: "越权" }, { agent: { id: "other" } }),
    /不属于/,
  );
});

test("B站复用宿主驱动时不暴露 QQ 引用、@ 或回复后等待能力", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-bili-driver-"));
  const store = new StarrStore(root);
  store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  store.db.exec(
    "CREATE TABLE qq_session_bindings(session_id TEXT PRIMARY KEY,character_id TEXT NOT NULL)",
  );
  const tools = new Map(),
    messages = [];
  let agent;
  const driver = createQQDriver(
    {
      agents: {
        get: () => agent,
        create: async (options) => {
          agent = {
            id: options.sessionId,
            status: "idle",
            options: {},
            session: { snapshotEvents: () => [] },
            ctx: {
              on: () => () => {},
              tools: {
                register(spec) {
                  tools.set(spec.name, spec);
                  return () => tools.delete(spec.name);
                },
              },
            },
            followup: (message) => messages.push(message),
            async whenIdle() {
              const reply = tools.get("starr_bili_reply");
              assert.deepEqual(Object.keys(reply.parameters.properties), [
                "text",
              ]);
              assert.equal(tools.has("starr_bili_wait_message"), false);
              assert.doesNotMatch(
                messages[0].content[0].text,
                /quoteId|wait_message/,
              );
              await reply.execute({ text: "B站回复" }, { agent });
            },
            cancel() {},
          };
          await options.setup(agent.ctx, agent);
          return { agent };
        },
      },
      agentPresets: { mount: async () => {} },
    },
    store,
    { platform: "bili" },
  );
  t.after(() => {
    driver.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  await driver.run({
    thread: {
      sessionId: "session-bili-test",
      characterId: store.listCharacters()[0].id,
      type: "private",
      target: "200001",
      started: false,
    },
    settings: { provider: "test", model: "test" },
    input: {
      batchId: "bili-batch",
      messages: [{ userId: "200001", text: "你好" }],
    },
    reply: async () => ({ messageId: "1" }),
    signal: new AbortController().signal,
  });
});
