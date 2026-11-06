import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { BiliService } from "../src/bili/service.mjs";
import { biliClient, exactJSON } from "../src/bili/api.mjs";
import { inWindow } from "../src/bili/activities.mjs";

test("单个 B站通道失败不阻断其他收件，会话观察模式保留消息且不调用模型", async (t) => {
  let calls = 0;
  const f = fixture(t, async ({ reply }) => {
    calls++;
    await reply("合成回复");
  });
  f.client.commentFeed = async () => {
    throw Object.assign(new Error("合成评论接口失败"), {
      code: "BILI_COMMENT",
    });
  };
  f.client.dmHistory = async () => [
    {
      messageId: "partial1",
      userId: "200001",
      target: "200001",
      type: "dm",
      text: "合成收件",
      time: Date.now() / 1000,
    },
  ];
  await f.service.poll(f.id, new AbortController().signal);
  assert.equal(calls, 1);
  assert.equal(f.service.status(f.id).runtime.status, "degraded");
  assert.equal(f.service.status(f.id).runtime.channelErrors[0].channel, "评论");
  const c = f.store.character(f.id);
  f.store.configure(
    f.id,
    { "chat.wake.mode": "observe" },
    { revision: c.revision },
  );
  f.receive("observe");
  await f.flush();
  assert.equal(calls, 1);
  assert.equal(f.service.status(f.id).counts.observed, 1);
  f.receive("wake", { text: "合成 B站角色 在吗" });
  await f.flush();
  assert.equal(calls, 2);
});

test("浏览窗口支持跨午夜，兴趣排序有真实消费者，阅读才能形成记忆", async (t) => {
  assert.equal(inWindow("23:00-02:00", "01:30"), true);
  assert.equal(inWindow("23:00-02:00", "15:30"), false);
  const f = fixture(t, async ({ silence }) => silence("安静"));
  const c = f.store.character(f.id);
  f.store.configure(
    f.id,
    {
      "bili.watch.enabled": true,
      "bili.watch.skipChance": 0,
      "bili.watch.candidates": 1,
      "bili.preferences.like": "星星",
    },
    { revision: c.revision },
  );
  const client = {
    ...f.client,
    candidates: async () => [
      { bvid: "BV0000000001", title: "普通话题" },
      { bvid: "BV0000000002", title: "星星研究" },
    ],
    video: async (bvid) => ({
      bvid,
      title: "星星研究",
      visualVerified: false,
      transcriptAvailable: false,
    }),
  };
  f.service.activityDriver = {
    run: async ({ candidates, read, finish }) => {
      assert.equal(candidates[0].title, "星星研究");
      assert.throws(
        () => finish({ title: "抢先写", content: "虚构", score: 90 }),
        /先读取/,
      );
      await read({ bvid: candidates[0].bvid });
      finish({
        title: "读到星星资料",
        content: "只读了标题与简介，没有画面",
        score: 80,
      });
    },
  };
  await f.service.activities.run(
    f.id,
    "watch",
    "synthetic-slot",
    client,
    { selfId: "100001" },
    new AbortController().signal,
  );
  assert.equal(f.store.listMemory(f.id)[0].kind, "interest");
  assert.equal(f.service.activities.list(f.id)[0].status, "done");
});

test("动态类型校验字数和间隔，不明回执不允许同轮重发", async (t) => {
  let sends = 0;
  const f = fixture(t, async () => {});
  let c = f.store.character(f.id);
  f.store.configure(
    f.id,
    {
      "bili.dynamics.enabled": true,
      "bili.dynamics.best.enabled": true,
      "bili.dynamics.best.minChars": 2,
      "bili.dynamics.best.prefix": "星光：",
    },
    { revision: c.revision },
  );
  f.service.activityDriver = {
    run: async ({ publish }) => {
      await assert.rejects(() => publish({ text: "很长".repeat(500) }), /长度/);
      await publish({ text: "合成晨光" });
      await assert.rejects(() => publish({ text: "重复发布" }), /再次/);
    },
  };
  await f.service.activities.run(
    f.id,
    "best",
    "synthetic",
    {
      ...f.client,
      publish: async (text) => {
        sends++;
        assert.equal(text, "星光：合成晨光");
        return { status: "sent", messageId: "1261813571425140745" };
      },
    },
    { selfId: "100001" },
    new AbortController().signal,
  );
  assert.equal(sends, 1);
});

test("浏览视频分享必须取得明确回执，不明结果持久化并阻止再次发送", async (t) => {
  const f = fixture(t, async () => {});
  const c = f.store.character(f.id);
  f.store.configure(
    f.id,
    {
      "bili.watch.enabled": true,
      "bili.watch.skipChance": 0,
      "bili.share.enabled": true,
      "bili.share.target": "200001",
    },
    { revision: c.revision },
  );
  f.receive("share-incoming");
  let attempts = 0,
    secondRound = false;
  const client = {
    ...f.client,
    candidates: async () => [{ bvid: "BV0000000001", title: "合成星空" }],
    video: async (bvid) => ({ bvid, title: "合成星空" }),
    send: async () => {
      attempts++;
      return { status: "sent" };
    },
  };
  f.service.activityDriver = {
    run: async ({ read, share, finish }) => {
      await read({ bvid: "BV0000000001" });
      await assert.rejects(
        () => share({ bvid: "BV0000000001", text: "合成短评", score: 90 }),
        secondRound ? /七天内/ : /明确消息编号/,
      );
      finish({ title: "合成阅读", content: "本轮只阅读合成资料", score: 80 });
    },
  };
  const run = () =>
    f.service.activities.run(
      f.id,
      "watch",
      "synthetic-share",
      client,
      { selfId: "100001" },
      new AbortController().signal,
    );
  await run();
  assert.equal(
    f.store.db.prepare("SELECT status FROM bili_shares").get().status,
    "uncertain",
  );
  assert.equal(
    f.store.db.prepare("SELECT status FROM bili_sends").get().status,
    "uncertain",
  );
  secondRound = true;
  await run();
  assert.equal(attempts, 1);
});

function fixture(t, run, send) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-bili-")),
    store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成 B站角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const id = character.id;
  store.configure(
    id,
    {
      "bili.enabled": true,
      "bili.provider": "test",
      "bili.model": "test",
      "bili.allowedUsers": "200001",
      "bili.dm.enabled": true,
      "bili.comment.enabled": true,
      "bili.live.enabled": true,
      "bili.live.rooms": "900001",
      "bili.personGapMinutes": 0,
      "bili.threadGapMinutes": 0,
      "bili.globalGapSeconds": 0,
    },
    { revision: character.revision },
  );
  const sends = [],
    client = {
      me: async () => ({ selfId: "100001", name: "合成账号" }),
      dmHistory: async () => [],
      commentFeed: async () => [],
      liveHistory: async () => [],
      send:
        send ||
        (async (self, msg, text) => {
          sends.push({ self, msg, text });
          return {
            status: "sent",
            messageId: "1234567890123456789",
            deliveryVerified: true,
          };
        }),
    };
  const service = new BiliService(store, {
    driver: { run, close() {} },
    client: () => client,
    secrets: () => ({
      read: async () => "synthetic-cookie",
      status: () => ({ saved: false }),
    }),
  });
  t.after(() => {
    service.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const receive = (messageId = "1", extra = {}) =>
    service.receive(id, "100001", {
      messageId,
      userId: "200001",
      target: "200001",
      type: "dm",
      text: "合成收件",
      time: Date.now() / 1000,
      ...extra,
    });
  const flush = async () => {
    for (const row of store.db
      .prepare("SELECT * FROM bili_inbox WHERE status='pending'")
      .all())
      await service.process(row, client, new AbortController().signal);
  };
  return { store, id, service, client, sends, receive, flush };
}
test("B站只收允许对象，三种通道独立登记，去重且共享同一角色", async (t) => {
  const f = fixture(t, async ({ reply }) => reply("合成回复"));
  f.receive();
  f.receive();
  f.receive("2", { userId: "200002" });
  f.receive("3", {
    type: "comment",
    target: "1:12:34",
    comment: { type: 1, oid: "12", root: "34", parent: "45" },
  });
  f.receive("4", { type: "live", target: "900001" });
  await f.flush();
  assert.equal(f.sends.length, 3);
  const sessions = f.store.conversations.list(f.id);
  assert.deepEqual(
    new Set(sessions.map((r) => r.type)),
    new Set(["dm", "comment", "live"]),
  );
  assert.ok(
    sessions.every((r) => r.platform === "bili" && r.character_id === f.id),
  );
  assert.equal(f.service.status(f.id).counts.done, 3);
});
test("B站回执结果不明、模型抓住异常和重启后都不会再次外发", async (t) => {
  let count = 0;
  const f = fixture(
    t,
    async ({ reply }) => {
      try {
        await reply("不重发");
      } catch {}
    },
    async () => {
      count++;
      throw Object.assign(new Error("回执丢失"), {
        uncertain: true,
        code: "BILI_TRANSPORT",
      });
    },
  );
  f.receive();
  await f.flush();
  assert.equal(count, 1);
  assert.equal(f.service.status(f.id).counts.uncertain, 1);
  f.store.db.exec("UPDATE bili_inbox SET status='pending'");
  await f.flush();
  assert.equal(count, 1);
});
test("B站发送前重验对象，配额按尝试计数，受理不伪装成可见回执", async (t) => {
  const f = fixture(
    t,
    async ({ reply }) => reply("合成回复"),
    async () => ({
      status: "accepted",
      messageId: null,
      deliveryVerified: false,
    }),
  );
  f.receive();
  await f.flush();
  assert.equal(
    f.store.db.prepare("SELECT status FROM bili_sends").get().status,
    "accepted",
  );
  const c = f.store.character(f.id);
  f.store.configure(
    f.id,
    { "bili.allowedUsers": "200002" },
    { revision: c.revision },
  );
  f.receive("2");
  await f.flush();
  assert.equal(
    f.store.db.prepare("SELECT count(*) n FROM bili_inbox").get().n,
    1,
  );
});
test("B站历史工具不能读取其他对象，暂停会话不触发模型", async (t) => {
  let runs = 0;
  const f = fixture(t, async ({ history, silence }) => {
    runs++;
    const rows = history({ limit: 3 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].target, "200001");
    silence("合成安静");
  });
  f.receive();
  f.receive("2", { type: "live", target: "900001" });
  const live = f.store.conversations.list(f.id).find((r) => r.type === "live");
  f.store.conversations.patch(live.session_id, {
    revision: live.revision,
    patch: { paused: true },
  });
  await f.flush();
  assert.equal(runs, 1);
  assert.equal(f.service.status(f.id).counts.pending, 1);
});
test("B站协议保留大整数编号、校验登录和业务码，不输出凭据", async () => {
  assert.equal(
    exactJSON('{"id":1261813571425140745}').id,
    "1261813571425140745",
  );
  const calls = [],
    cookie = "SESSDATA=synthetic; bili_jct=synthetic-csrf";
  const client = biliClient(cookie, {
    request: async (url, options) => {
      calls.push({ url, options });
      return new Response(
        url.pathname.includes("nav")
          ? '{"code":0,"data":{"isLogin":true,"mid":100001,"uname":"合成账号"}}'
          : '{"code":0,"data":{"msg_key":1261813571425140745}}',
      );
    },
  });
  assert.equal((await client.me()).selfId, "100001");
  const receipt = await client.send(
    "100001",
    { type: "dm", userId: "200001" },
    "测试",
  );
  assert.equal(receipt.messageId, "1261813571425140745");
  assert.equal(calls[1].options.body.get("msg[receiver_id]"), "200001");
  assert.equal(calls[1].options.body.get("csrf"), "synthetic-csrf");
  const rejected = biliClient(cookie, {
    request: async () => new Response('{"code":-412}'),
  });
  await assert.rejects(
    () => rejected.me(),
    (e) => e.risk && !e.message.includes("synthetic"),
  );
  assert.throws(() => biliClient("bad"), /Cookie/);
});
