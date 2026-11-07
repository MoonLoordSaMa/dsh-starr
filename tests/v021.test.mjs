import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { StarrStore } from "../src/starrcore/store.mjs";
import { Agency } from "../src/agency/service.mjs";
import { QQService } from "../src/qq/service.mjs";
import { createTools } from "../src/host/tools.mjs";
import { animationSheet } from "../src/media/animated.mjs";
import { createQQCapabilities } from "../src/qq/capabilities.mjs";
import { mountMediaServices } from "../src/runtime/media-services.mjs";
import { TabbitBrowser, allowedURL } from "../src/browser/tabbit.mjs";

function fixture(t, driver) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-v021-")),
    store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backups"),
  });
  const id = character.id,
    patch = (value) =>
      store.configure(id, value, { revision: store.character(id).revision });
  patch({
    "agency.enabled": true,
    "agency.level": "social",
    "agency.quietStart": "00:00",
    "agency.quietEnd": "00:00",
    "agency.cooldownMinutes": 5,
    "agency.opportunityMinutes": 0,
    "agency.observeGroups": true,
    "agency.groupEnabled": true,
  });
  const sends = [],
    qq = new QQService(store, {
      secrets: { read: async () => "synthetic" },
      action: async (c, name, args) => {
        sends.push({ name, args });
        return { message_id: "receipt" };
      },
    });
  store.db.prepare("INSERT INTO qq_settings VALUES(1,1,?)").run(
    JSON.stringify({
      ...qq.settings().config,
      enabled: true,
      characterId: id,
      groups: "300001",
      provider: "synthetic",
      model: "synthetic",
    }),
  );
  qq.state = { status: "connected", account: { selfId: "100001" } };
  const agency = new Agency(store, { qq, driver });
  const event = (n = 1, text = "合成群聊话题") => ({
    post_type: "message",
    message_type: "group",
    self_id: 100001,
    user_id: 200001,
    group_id: 300001,
    message_id: n,
    time: Math.floor(Date.now() / 1000),
    message: [{ type: "text", data: { text } }],
  });
  const group = () =>
    store.db.prepare("SELECT * FROM qq_threads WHERE type='group'").get();
  t.after(() => {
    agency.close();
    qq.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, store, id, patch, qq, agency, sends, event, group };
}
test("未被@的群消息仅观察，群自主判断在允许来源群发送且不重复插话", async (t) => {
  let seen;
  const f = fixture(t, {
    run: async (input) => {
      seen = input;
      await input.finish({
        text: "合成话题接续",
        reason: "来自当前群真实讨论",
      });
    },
  });
  f.qq.receive(f.event());
  assert.equal(
    f.store.db.prepare("SELECT status FROM qq_inbox").get().status,
    "observed",
  );
  assert.equal(f.agency.plan(f.id).goal.originSession, f.group().session_id);
  const result = await f.agency.run(f.id);
  assert.equal(result.status, "sent", result.error);
  assert.match(seen.pending, /合成群聊话题/);
  assert.equal(f.sends[0].name, "send_group_msg");
  assert.equal(f.sends[0].args.group_id, "300001");
  assert.notEqual(seen.sessionId, f.group().session_id);
  assert.equal(f.agency.groupOpportunity(f.id), null);
  const restarted = new Agency(f.store, { qq: f.qq, driver: f.agency.driver });
  t.after(() => restarted.close());
  assert.equal(restarted.groupOpportunity(f.id), null);
});
test("群主动回合只继承来源群记忆，不能读取另一私聊且写入仍留来源范围", async (t) => {
  const f = fixture(t, {
    run: async (input) => {
      const tools = createTools(f.store, {
        characterId: f.id,
        sessionId: input.sessionId,
      });
      assert.equal(tools.starr_memory_search({ q: "仅此群" }).length, 1);
      assert.equal(tools.starr_memory_search({ q: "私聊秘密" }).length, 0);
      tools.starr_memory_write({ title: "自主群经历", content: "真实观察" });
      await input.finish({ reason: "记下了群里的经历" });
      return { effect: true };
    },
  });
  f.qq.receive(f.event());
  const source = f.group().session_id;
  f.store.saveMemory(
    f.id,
    { title: "仅此群", content: "合成来源" },
    { sessionId: source, visibility: "conversation" },
  );
  f.store.conversations.ensure({
    sessionId: "other-private",
    characterId: f.id,
    platform: "qq",
    type: "private",
    target: "900001",
  });
  f.store.saveMemory(
    f.id,
    { title: "私聊秘密", content: "不可混入群" },
    { sessionId: "other-private", visibility: "conversation" },
  );
  const result = await f.agency.run(f.id);
  assert.equal(result.status, "silent", result.error);
  const record = f.store.listMemory(f.id, { q: "自主群经历" })[0];
  assert.equal(
    f.store
      .memory(f.id)
      .prepare("SELECT session_id FROM record_visibility WHERE record_id=?")
      .get(record.id).session_id,
    source,
  );
});
test("读取凭据期间撤销群授权阻止外发，待处理来信与暂停会话也阻止主动参与", async (t) => {
  const f = fixture(t, {
    run: (input) => input.finish({ text: "不会发出", reason: "合成" }),
  });
  f.qq.receive(f.event());
  f.qq.secrets.read = async () => {
    f.patch({ "agency.groupEnabled": false });
    return "synthetic";
  };
  const result = await f.agency.run(f.id);
  assert.equal(result.status, "failed");
  assert.equal(f.sends.length, 0);
  f.patch({ "agency.groupEnabled": true });
  const thread = f.group();
  f.store.db.prepare("UPDATE qq_inbox SET status='pending'").run();
  assert.throws(() => f.agency.group(f.id, thread.session_id), /来信/);
  f.store.db.prepare("UPDATE qq_inbox SET status='observed'").run();
  f.store.db
    .prepare("UPDATE chat_sessions SET paused=1 WHERE session_id=?")
    .run(thread.session_id);
  assert.throws(() => f.agency.group(f.id, thread.session_id), /暂停/);
});
test("持续目的保存真实进度并跨存储重开接续，修订冲突和其他会话不能覆盖", async (t) => {
  const f = fixture(t, {
    run: (input) =>
      input.finish({
        completed: false,
        progress: "查到合成资料；下一步继续核验",
        nextAt: new Date(Date.now() + 3600000).toISOString(),
        reason: "需要下次继续",
      }),
  });
  const goal = f.store.createGoal(f.id, {
    title: "长期兴趣",
    reason: "合成项目",
    ongoing: true,
  });
  const result = await f.agency.run(f.id);
  assert.equal(result.status, "silent", result.error);
  const saved = f.store.goals(f.id).find((g) => g.id === goal.id);
  assert.equal(saved.status, "waiting");
  assert.equal(saved.step, 1);
  assert.match(saved.progress, /继续核验/);
  assert.equal(f.agency.plan(f.id).goal, null);
  const reopened = new StarrStore(f.store.dataRoot);
  try {
    assert.equal(reopened.goals(f.id)[0].step, 1);
  } finally {
    reopened.close();
  }
  assert.throws(
    () => f.store.advanceGoal(f.id, { id: goal.id, step: 0, progress: "过期" }),
    /进度已变化/,
  );
  f.store.conversations.ensure({
    sessionId: "another",
    characterId: f.id,
    platform: "web",
    type: "web",
  });
  assert.throws(
    () =>
      createTools(f.store, {
        characterId: f.id,
        sessionId: "another",
      }).starr_goal_update({ id: goal.id, step: 1, progress: "越界" }),
    /当前会话/,
  );
  f.agency.clock = () => Date.now() + 61 * 60000;
  assert.equal(f.agency.plan(f.id).goal.id, goal.id);
  f.agency.driver = {
    run: (input) =>
      input.finish({ reason: "合成长期项目已核验完毕", completed: true }),
  };
  const next = await f.agency.run(f.id);
  assert.equal(next.status, "silent", next.error);
  assert.equal(
    f.store.goals(f.id).find((g) => g.id === goal.id).status,
    "completed",
  );
});
test("自主探索中形成的新目的可调度，普通陌生会话的目的不能借后台执行", async (t) => {
  const f = fixture(t, {
    run: async (input) => {
      createTools(f.store, {
        characterId: f.id,
        sessionId: input.sessionId,
      }).starr_goal_create({
        title: "继续读合成主题",
        reason: "来自本轮探索",
        ongoing: true,
      });
      return input.finish({ reason: "先留下兴趣" });
    },
  });
  f.patch({ "agency.opportunityMinutes": 60 });
  await f.agency.run(f.id);
  assert.equal(f.agency.plan(f.id).goal.title, "继续读合成主题");
});
test("角色可自主归档普通经历，日记始终保护且跨角色不可读", (t) => {
  const f = fixture(t);
  f.patch({ "permissions.botMemoryArchive": true });
  f.store.conversations.ensure({
    sessionId: "source",
    characterId: f.id,
    platform: "web",
    type: "web",
  });
  const tools = createTools(f.store, {
    characterId: f.id,
    sessionId: "source",
  });
  const record = tools.starr_memory_write({
      title: "重复经历",
      content: "合成内容",
    }),
    diary = tools.starr_memory_write({
      kind: "diary",
      title: "日记",
      content: "受保护",
    });
  assert.equal(
    tools.starr_memory_archive({
      id: record.id,
      revision: record.revision,
      reason: "已重复",
    }).originalPreserved,
    true,
  );
  assert.throws(
    () =>
      tools.starr_memory_archive({
        id: diary.id,
        revision: diary.revision,
        reason: "不应归档",
      }),
    /日记受保护/,
  );
  assert.equal(
    f.store
      .memory(f.id)
      .prepare("SELECT content FROM records WHERE id=?")
      .get(diary.id).content,
    "受保护",
  );
});
test("GIF真实解码为多帧拼图，尺寸、帧预算与取消均生效", async (t) => {
  const header = Buffer.alloc(13);
  header.write("GIF89a");
  header.writeUInt16LE(2, 6);
  header.writeUInt16LE(2, 8);
  let invocation;
  const sheet = await animationSheet({}, header, {
    run: async (program, args, options) => {
      invocation = { args, options };
      return Buffer.concat([
        Buffer.alloc(320 * 240 * 3, 40),
        Buffer.alloc(320 * 240 * 3, 180),
      ]);
    },
  });
  assert.equal(sheet.frames.length, 2);
  assert.equal(sheet.bytes.subarray(1, 4).toString(), "PNG");
  assert.ok(invocation.args.includes("24"));
  assert.ok(invocation.args.includes("12"));
  assert.match(sheet.description, /不推断声音/);
  header.writeUInt16LE(65535, 6);
  header.writeUInt16LE(65535, 8);
  await assert.rejects(animationSheet({}, header), /尺寸/);
});
test("QQ原生图片通道将GIF关键帧投给视觉模型，不把原始GIF当静态图", async (t) => {
  const f = fixture(t);
  f.patch({ "chat.tools.images": true });
  const gif = Buffer.from("GIF89a合成");
  let image;
  const unmount = mountMediaServices(f.store, {
    hostVision: {
      supportsRoute: async () => true,
      imageBlock: async (input) => {
        image = input.image;
        return { type: "image" };
      },
    },
  });
  t.after(unmount);
  const cap = createQQCapabilities({
    store: f.store,
    characterId: f.id,
    signal: new AbortController().signal,
    lookup: () => ({
      attachments: [{ type: "image", url: "https://qpic.cn/synthetic" }],
    }),
    download: async () => ({ bytes: gif, mime: "image/gif" }),
    decodeAnimation: async () => ({
      bytes: Buffer.from("png"),
      mime: "image/png",
      description: "动图关键帧",
    }),
  });
  const blocks = await cap.imageBlocks([{ messageId: "1" }], {});
  assert.ok(image.startsWith("data:image/png"));
  assert.match(blocks[0].text, /动图关键帧/);
});
test("浏览器只允许配置域名，分页回执读取真实结果，未授权与异常不假报成功", async (t) => {
  const f = fixture(t);
  f.patch({ "browser.enabled": true, "browser.domains": "example.com" });
  assert.throws(
    () => allowedURL("https://example.com.evil.test/", "example.com"),
    /未获/,
  );
  assert.throws(() => allowedURL("file:///etc/passwd", "example.com"), /未获/);
  const calls = [],
    raw = JSON.stringify({
      url: "https://example.com/",
      title: "合成",
      text: "真实结果",
      links: [],
    });
  const browser = new TabbitBrowser(f.store, {
    invoke: async (program, args, source) => {
      calls.push({ args, source });
      if (args[0] === "resource")
        return { data: raw, nextOffset: raw.length, eof: true };
      if (args[0] === "finish") return { forcedCleanup: false };
      return { status: "succeeded", result: { resourceId: "resource" } };
    },
  });
  const result = await browser.read(f.id, { url: "https://example.com/" });
  assert.equal(result.text, "真实结果");
  assert.equal(result.visualVerified, false);
  assert.ok(calls.some((c) => c.args[0] === "resource"));
  assert.ok(calls.some((c) => c.args[0] === "finish"));
  f.patch({ "browser.enabled": false });
  await assert.rejects(
    browser.read(f.id, { url: "https://example.com/" }),
    /未开启/,
  );
});
test("分享意愿只接受共享经历，独立主人回合可发送且撤回后立即停止", async (t) => {
  const f = fixture(t, {
    run: (input) =>
      input.finish({ text: "合成分享", reason: "已共享的真实经历" }),
  });
  f.patch({ "memory.ownerQQ": "200001", "memory.allowSharedWrites": true });
  const settings = { ...f.qq.settings().config, privateUsers: "200001" };
  f.store.db
    .prepare("UPDATE qq_settings SET data=? WHERE id=1")
    .run(JSON.stringify(settings));
  const owner = f.store.conversations.ensure({
    sessionId: "owner-private",
    characterId: f.id,
    platform: "qq",
    type: "private",
    account: "100001",
    target: "200001",
  });
  f.store.db
    .prepare("INSERT INTO qq_threads VALUES('owner',?,?,'private','200001',0)")
    .run(f.id, owner.session_id);
  f.qq.receive(f.event());
  const group = f.group();
  const tools = createTools(f.store, {
    characterId: f.id,
    sessionId: group.session_id,
  });
  const privateMemory = tools.starr_memory_write({
    title: "群内私密资料",
    content: "不应分享",
  });
  assert.throws(
    () => tools.starr_share_intention({ memoryId: privateMemory.id }),
    /共享/,
  );
  const shared = tools.starr_memory_write({
    title: "一起发现的趣事",
    content: "已明确共享的合成经历",
    visibility: "shared",
  });
  const intention = tools.starr_share_intention({ memoryId: shared.id });
  assert.equal(intention.originSession, undefined);
  assert.equal(intention.shareMemoryId, shared.id);
  assert.equal(
    tools.starr_share_intention({ memoryId: shared.id }).id,
    intention.id,
  );
  const result = await f.agency.run(f.id);
  assert.equal(result.status, "sent", result.error);
  assert.equal(f.sends[0].name, "send_private_msg");
  assert.equal(f.sends[0].args.user_id, "200001");
  assert.equal(
    tools.starr_share_intention({ memoryId: shared.id }).id,
    intention.id,
  );
  const revoked = tools.starr_memory_write({
    title: "后来撤回的经历",
    content: "合成撤回场景",
    visibility: "shared",
  });
  tools.starr_share_intention({ memoryId: revoked.id });
  f.agency.clock = () => Date.now() + 6 * 60000;
  f.agency.driver = {
    run: async (input) => {
      f.store
        .memory(f.id)
        .prepare(
          "UPDATE record_visibility SET visibility='conversation' WHERE record_id=?",
        )
        .run(revoked.id);
      await input.finish({ text: "不应发送", reason: "共享已撤回" });
    },
  };
  const stopped = await f.agency.run(f.id);
  assert.equal(stopped.status, "failed");
  assert.match(stopped.error, /撤回/);
  assert.equal(f.sends.length, 1);
});

test("持续目的外发后驱动报错仍保留下一步，真实回执不会触发重发", async (t) => {
  const f = fixture(t, {
    run: async (input) => {
      await input.finish({
        text: "合成阶段进展",
        reason: "项目还需要继续",
        completed: false,
        progress: "已分享第一阶段；下次继续核验",
        nextAt: new Date(Date.now() + 3600000).toISOString(),
      });
      throw new Error("合成发送后驱动故障");
    },
  });
  f.qq.receive(f.event());
  const goal = f.store.createGoal(
    f.id,
    {
      title: "群内持续项目",
      reason: "来自群内约定",
      ongoing: true,
    },
    { sessionId: f.group().session_id },
  );
  const result = await f.agency.run(f.id);
  assert.equal(result.status, "sent", result.error);
  const saved = f.store.goals(f.id).find((g) => g.id === goal.id);
  assert.equal(saved.status, "waiting");
  assert.equal(saved.step, 1);
  assert.match(saved.progress, /下一|下次/);
  assert.equal(f.sends.length, 1);
  assert.notEqual(f.agency.plan(f.id).goal?.id, goal.id);
});

test("有明确群来源的连接目的无需绑定主人，群授权仍独立核对", async (t) => {
  const f = fixture(t, {
    run: (input) =>
      input.finish({ text: "接续群话题", reason: "当前群的约定" }),
  });
  f.qq.receive(f.event());
  const goal = f.store.createGoal(
    f.id,
    {
      title: "和群友继续交流",
      reason: "群内约定",
      drive: "connection",
      ongoing: true,
    },
    { sessionId: f.group().session_id },
  );
  const plan = f.agency.plan(f.id);
  assert.equal(plan.goal.id, goal.id);
  assert.deepEqual(plan.blockers, []);
  const result = await f.agency.run(f.id);
  assert.equal(result.status, "sent", result.error);
  assert.equal(f.sends[0].name, "send_group_msg");
});

test("截图字节读入后先释放浏览任务，视觉空答复不标记为成功理解", async (t) => {
  const f = fixture(t);
  f.patch({
    "browser.enabled": true,
    "browser.visual": true,
    "browser.domains": "example.com",
  });
  const screenshot = path.join(f.root, "screenshot.png");
  fs.writeFileSync(screenshot, Buffer.from("synthetic-image"));
  let released = false;
  const browser = new TabbitBrowser(f.store, {
    invoke: async (program, args) => {
      if (args[0] === "finish") {
        released = true;
        return { forcedCleanup: false };
      }
      return {
        status: "succeeded",
        result: {
          value: {
            url: "https://example.com/",
            text: "合成网页",
            links: [],
            screenshot: { nextAction: { path: screenshot } },
          },
        },
      };
    },
    understand: async () => {
      assert.equal(released, true);
      return { answer: "" };
    },
  });
  const result = await browser.read(f.id, {
    url: "https://example.com/",
    visual: true,
  });
  assert.equal(result.textVerified, true);
  assert.equal(result.visualVerified, false);
  assert.equal(browser.lastCleanup.confirmed, true);
});
