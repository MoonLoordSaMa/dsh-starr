import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { StarrStore } from "../src/starrcore/store.mjs";
import {
  nativeFileTools,
  fileWorkspace,
  migrateFileWorkspace,
} from "../src/host/native-files.mjs";
import { agencyToolAllowed } from "../src/host/agency-driver.mjs";
import { BrowserSessions } from "../src/browser/session.mjs";
import { createTools } from "../src/host/tools.mjs";
import { mountMediaServices } from "../src/runtime/media-services.mjs";
import { createQQCapabilities } from "../src/qq/capabilities.mjs";
import { capabilityStatus } from "../src/host/capabilities.mjs";
import { Agency } from "../src/agency/service.mjs";
import { QQService } from "../src/qq/service.mjs";
import { createQQDriver } from "../src/host/qq-driver.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-v022-"));
  const store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backups"),
  });
  const id = character.id,
    patch = (p) =>
      store.configure(id, p, { revision: store.character(id).revision });
  const session = (sessionId, target = "200001") =>
    store.conversations.ensure({
      sessionId,
      characterId: id,
      platform: "qq",
      type: "private",
      account: "100001",
      target,
    });
  patch({ "memory.ownerQQ": "200001" });
  session("owner");
  session("other", "300001");
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, store, id, patch, session };
}
test("连续浏览复用自己的页面，作用域隔离，待定回执只查原请求，关闭及撤销权限生效", async (t) => {
  const f = fixture(t);
  f.patch({ "browser.enabled": true, "browser.interact": true });
  const calls = [];
  let pending = true;
  const browser = new BrowserSessions(f.store, {
    invoke: async (program, args, source) => {
      calls.push({ args, source });
      if (args[0] === "tabs") return { tabs: [{ tabId: 77 }] };
      if (args[0] === "finish") return { forcedCleanup: false };
      if (source?.includes("await page.close"))
        return { status: "succeeded", result: { value: { closed: true } } };
      if (pending) {
        pending = false;
        return { status: "running" };
      }
      return {
        status: "succeeded",
        result: {
          value: {
            url: "https://example.test/",
            title: "合成页面",
            text: "已观察",
            controls: [{ ref: "r1", name: "下一页" }],
          },
        },
      };
    },
  });
  const first = await browser.act(
    f.id,
    { action: "open", url: "https://example.test/" },
    { sessionId: "owner" },
  );
  assert.equal(first.persistent, true);
  await browser.act(
    f.id,
    { action: "click", ref: "r1" },
    { sessionId: "owner" },
  );
  const nodes = calls.filter((c) => c.args[0] === "nodejs");
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].args[2], nodes[1].args[2]);
  assert.ok(nodes[1].args.includes("77"));
  await assert.rejects(
    browser.act(f.id, { action: "observe" }, { sessionId: "other" }),
    /没有打开/,
  );
  await browser.act(f.id, { action: "close" }, { sessionId: "owner" });
  assert.equal(browser.sessions.size, 0);
  f.patch({ "browser.interact": false });
  await assert.rejects(
    browser.act(
      f.id,
      { action: "open", url: "https://example.test/" },
      { sessionId: "owner" },
    ),
    /尚未开启/,
  );
});
test("QQ语音先转写并缓存，桥接转换WAV，失败具体说明，撤销权限不再读取", async (t) => {
  const f = fixture(t);
  f.patch({ "chat.tools.audio": true, "asr.connection": "free-local" });
  let transcribes = 0,
    downloads = 0;
  const remove = mountMediaServices(f.store, {
    workbench: {
      hearLocal: async () => {
        transcribes++;
        return { text: "今天想和你聊一会儿" };
      },
    },
  });
  t.after(remove);
  const audio = createQQCapabilities({
    store: f.store,
    characterId: f.id,
    lookup: () => ({
      attachments: [
        {
          type: "record",
          url: "https://example.test/audio",
          file: "qq-record",
        },
      ],
    }),
    download: async (item) => {
      downloads++;
      return {
        bytes: Buffer.from("RIFFsynthetic"),
        mime: item.url.includes("wav")
          ? "audio/wav"
          : "application/octet-stream",
      };
    },
    action: async (name, args) => {
      assert.equal(name, "get_record");
      assert.equal(args.out_format, "wav");
      return { url: "https://example.test/wav" };
    },
    signal: new AbortController().signal,
  });
  const messages = [{ messageId: "m1", text: "[语音，尚未转写]" }];
  const result = await audio.audioMessages(messages);
  assert.match(result[0].text, /今天想和你/);
  await audio.inspect({ messageId: "m1" });
  assert.equal(transcribes, 1);
  assert.equal(downloads, 2);
  f.patch({ "chat.tools.audio": false });
  assert.equal(await audio.audioMessages(messages), messages);
  await assert.rejects(audio.inspect({ messageId: "m1" }), /关闭/);
  f.patch({ "chat.tools.audio": true });
  const broken = createQQCapabilities({
    store: f.store,
    characterId: f.id,
    lookup: () => ({ attachments: [{ type: "record" }] }),
    download: async () => {
      throw new Error("合成下载故障");
    },
    signal: new AbortController().signal,
  });
  assert.match(
    (await broken.audioMessages(messages))[0].text,
    /转写失败.*合成下载故障/,
  );
});
test("能力状态区分已授权与缺少模型，不把配置完整伪报为真实验证", (t) => {
  const f = fixture(t);
  f.patch({
    "chat.tools.audio": true,
    "asr.connection": "shared",
    "asr.model": "",
  });
  const status = capabilityStatus(f.store, f.id, "owner");
  assert.equal(status.hearing.enabled, true);
  assert.equal(status.hearing.configured, false);
  assert.equal(status.hearing.verified, false);
  assert.equal(status.continuousListening, false);
});
test("自主翻唱向可信主人发送实际成品，拒绝重复和权限撤回，不依赖点歌来信", async (t) => {
  const f = fixture(t);
  f.patch({
    "agency.enabled": true,
    "agency.level": "social",
    "agency.quietStart": "00:00",
    "agency.quietEnd": "00:00",
    "agency.opportunityMinutes": 1,
    "sing.allowBot": true,
    "chat.tools.singing": true,
  });
  const sends = [],
    file = path.join(f.root, "song.wav");
  fs.writeFileSync(file, "RIFFsynthetic");
  const remove = mountMediaServices(f.store, {
    singing: {
      file: (id, renderId, render) => {
        assert.equal(id, f.id);
        assert.equal(renderId, "render1");
        assert.equal(render, true);
        return { file };
      },
    },
  });
  t.after(remove);
  const qq = new QQService(f.store, {
    secrets: { read: async () => "synthetic" },
    action: async (c, name, args) => {
      sends.push({ name, args });
      return { message_id: "receipt-1" };
    },
  });
  f.store.db.prepare("INSERT INTO qq_settings VALUES(1,1,?)").run(
    JSON.stringify({
      ...qq.settings().config,
      enabled: true,
      characterId: f.id,
      privateUsers: "200001",
      provider: "synthetic",
      model: "synthetic",
    }),
  );
  qq.state = { status: "connected", account: { selfId: "100001" } };
  f.store.db
    .prepare(
      "INSERT INTO qq_threads VALUES('owner-thread',?,?,'private','200001',0)",
    )
    .run(f.id, "owner");
  const agency = new Agency(f.store, {
    qq,
    driver: {
      run: async (input) => {
        await input.finish({
          songRenderId: "render1",
          text: "想唱这一段给你。",
          reason: "自己选的歌",
        });
        await assert.rejects(
          input.finish({ songRenderId: "render1", reason: "再发一次" }),
          /已经结束/,
        );
      },
    },
  });
  t.after(() => {
    agency.close();
    qq.close();
  });
  const result = await agency.run(f.id);
  assert.equal(result.status, "sent", result.error);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].args.user_id, "200001");
  assert.equal(sends[0].args.message.length, 1);
  assert.equal(sends[0].args.message[0].type, "record");
  assert.match(sends[0].args.message[0].data.file, /^base64:\/\//);
  agency.clock = () => Date.now() + 31 * 60000;
  qq.secrets.read = async () => {
    f.patch({ "chat.tools.singing": false });
    return "synthetic";
  };
  const revoked = await agency.run(f.id);
  assert.equal(revoked.status, "failed");
  assert.match(revoked.error, /关闭/);
  assert.equal(sends.length, 1);
});

test("原生读写在自主回合放行，工作区独立持久化且配置不能由角色改写", async (t) => {
  const f = fixture(t);
  for (const name of nativeFileTools)
    assert.equal(agencyToolAllowed(name, "observe"), true, name);
  assert.equal(agencyToolAllowed("Config", "social"), false);
  assert.equal(agencyToolAllowed("exec_command", "social"), false);
  const root = fileWorkspace(f.store, f.id, { create: true });
  assert.notEqual(root, f.store.dataRoot);
  const other = f.store.createCharacter({ name: "另一位", persona: "合成" });
  assert.notEqual(fileWorkspace(f.store, other.id), root);
  const custom = path.join(f.root, "创作工作区");
  f.patch({ "files.workspaceRoot": custom });
  const reopened = new StarrStore(f.store.dataRoot);
  try {
    assert.equal(fileWorkspace(reopened, f.id, { create: true }), custom);
  } finally {
    reopened.close();
  }
  const tools = createTools(f.store, { characterId: f.id, sessionId: "owner" });
  assert.throws(
    () =>
      tools.starr_config_update({
        revision: f.store.character(f.id).revision,
        patch: { "files.workspaceRoot": root },
      }),
    /授权|不能|允许/,
  );
  const missing = capabilityStatus(f.store, f.id, "owner");
  assert.equal(missing.files.configured, false);
  const status = capabilityStatus(f.store, f.id, "owner", {
    nativeFiles: () => ({ read: true, write: true, edit: true }),
  });
  assert.equal(status.files.configured, true);
  assert.equal(status.files.verified, false);
  assert.equal(status.files.workspace, custom);
});
test("旧QQ会话只迁移运行库目录，保留已选择的用户项目，失败继续抛出", async (t) => {
  const f = fixture(t),
    agent = { session: {} },
    signal = new AbortController().signal;
  const calls = [];
  let cwd = f.store.dataRoot;
  const ctx = {
    workingDirectory: {
      get: () => cwd,
      set: async (a, dir, s) => {
        assert.equal(a, agent);
        assert.equal(s, signal);
        calls.push(dir);
        cwd = dir;
      },
    },
  };
  await migrateFileWorkspace(ctx, f.store, f.id, agent, signal);
  assert.equal(calls[0], fileWorkspace(f.store, f.id));
  cwd = path.join(f.root, "用户项目");
  await migrateFileWorkspace(ctx, f.store, f.id, agent, signal);
  assert.equal(calls.length, 1);
  cwd = f.store.dataRoot;
  ctx.workingDirectory.set = async () => {
    throw Error("合成目录失败");
  };
  await assert.rejects(
    migrateFileWorkspace(ctx, f.store, f.id, agent, signal),
    /合成目录失败/,
  );
});

test("目录迁移通过可选服务查询，未注入或缺少目录服务不会阻断普通会话", async (t) => {
  const f = fixture(t),
    agent = { session: {} },
    signal = new AbortController().signal;
  let directoryService;
  const ctx = {
    get(name) {
      assert.equal(name, "workingDirectory");
      return directoryService;
    },
    get workingDirectory() {
      throw Error('cannot get property "workingDirectory" without inject');
    },
  };
  await migrateFileWorkspace(ctx, f.store, f.id, agent, signal);
  let migrated = false;
  directoryService = {
    get: () => f.store.dataRoot,
    set: async (a, dir, s) => {
      assert.equal(a, agent);
      assert.equal(dir, fileWorkspace(f.store, f.id));
      assert.equal(s, signal);
      migrated = true;
    },
  };
  await migrateFileWorkspace(ctx, f.store, f.id, agent, signal);
  assert.equal(migrated, true);
});

test("QQ恢复旧会话不依赖目录服务注入，迁移后实际提交来信并调用回复工具", async (t) => {
  const f = fixture(t);
  f.store.db.exec(
    "CREATE TABLE IF NOT EXISTS qq_session_bindings(session_id TEXT PRIMARY KEY,character_id TEXT NOT NULL)",
  );
  const tools = new Map(),
    order = [];
  let cwd = f.store.dataRoot;
  const agent = {
    id: "resume-qq",
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
    followup(message) {
      assert.match(message.content[0].text, /恢复会话来信/);
      order.push("followup");
    },
    async whenIdle() {
      await tools
        .get("starr_qq_reply")
        .execute({ text: "实际回复" }, { agent });
    },
    cancel() {},
  };
  const ctx = {
    get(name) {
      assert.equal(name, "workingDirectory");
      return {
        get: () => cwd,
        set: async (a, dir) => {
          assert.equal(a, agent);
          cwd = dir;
          order.push("migrate");
        },
      };
    },
    get workingDirectory() {
      throw Error('cannot get property "workingDirectory" without inject');
    },
    agents: {
      get: () => undefined,
      create: () => assert.fail("应恢复旧会话"),
      resume: async (options) => {
        assert.equal(options.resumeSessionId, agent.id);
        await options.setup(agent.ctx, agent);
        order.push("resume");
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
      started: true,
    },
    settings: { provider: "synthetic", model: "synthetic" },
    input: {
      batchId: "resume-batch",
      messages: [{ userId: "200001", text: "恢复会话来信" }],
    },
    capabilities: { imageBlocks: async () => [] },
    prepared: () => order.push("prepared"),
    reply: async (text) => {
      assert.equal(text, "实际回复");
      order.push("reply");
      return { messageId: "synthetic-receipt" };
    },
    signal: new AbortController().signal,
  });
  assert.equal(cwd, fileWorkspace(f.store, f.id));
  assert.deepEqual(order, [
    "resume",
    "migrate",
    "prepared",
    "followup",
    "reply",
  ]);
});
