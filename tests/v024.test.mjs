import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { MemoryMaintenance } from "../src/starrcore/maintenance.mjs";
import {
  taskAgent,
  taskSessionId,
  nameSession,
} from "../src/host/task-session.mjs";
import { createAgencyDriver } from "../src/host/agency-driver.mjs";
import { QQService } from "../src/qq/service.mjs";
import { fields } from "../src/starrcore/config.mjs";
import { jobKinds } from "../src/jobs/config.mjs";
import { dueSlot } from "../src/jobs/service.mjs";
import { createServer } from "../src/server.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-v024-"));
  const store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const id = character.id,
    other = store.createCharacter({ name: "其他角色" }).id;
  const session = (sessionId, characterId = id, type = "group") =>
    store.conversations.ensure({
      sessionId,
      characterId,
      platform: "qq",
      type,
      target: sessionId,
    });
  const patch = (value) =>
    store.configure(id, value, { revision: store.character(id).revision });
  session("source");
  session("new-group");
  session("new-private", id, "private");
  session("other-role", other);
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, store, id, other, session, patch };
}

test("自主修订持久化并保留原文，不改来源与范围，拒绝旧修订、日记及越界", (t) => {
  const f = fixture(t),
    m = new MemoryMaintenance(f.store);
  f.patch({ "memory.defaultVisibility": "conversation" });
  const row = f.store.saveMemory(
    f.id,
    { title: "旧理解", content: "旧正文", anchor: true },
    { sessionId: "source", visibility: "conversation" },
  );
  const diary = f.store.saveMemory(
    f.id,
    { title: "今天", content: "日记逐字保留", kind: "diary" },
    { sessionId: "source", visibility: "conversation" },
  );
  assert.throws(
    () =>
      m.update(
        f.id,
        { id: row.id, revision: 1, content: "越界", reason: "猜的" },
        "new-group",
      ),
    /无法修改/,
  );
  assert.throws(
    () =>
      m.update(
        f.id,
        { id: row.id, revision: 1, content: "越界", reason: "猜的" },
        "other-role",
      ),
    /角色不匹配/,
  );
  assert.throws(
    () =>
      m.update(
        f.id,
        { id: diary.id, revision: 1, content: "改日记", reason: "整理" },
        "source",
      ),
    /日记/,
  );
  const updated = m.update(
    f.id,
    {
      id: row.id,
      revision: 1,
      title: "新的理解",
      content: "来自真实相处的完整新正文",
      reason: "我们重新谈清楚了",
      anchor: true,
    },
    "source",
  );
  assert.equal(updated.revision, 2);
  assert.throws(
    () =>
      m.update(
        f.id,
        { id: row.id, revision: 1, content: "过期覆盖", reason: "旧请求" },
        "source",
      ),
    /已变化/,
  );
  const db = f.store.memory(f.id),
    current = db.prepare("SELECT * FROM records WHERE id=?").get(row.id);
  assert.equal(current.source, row.source);
  assert.equal(current.created, row.created);
  assert.deepEqual(
    {
      ...db
        .prepare("SELECT * FROM record_visibility WHERE record_id=?")
        .get(row.id),
    },
    { record_id: row.id, visibility: "conversation", session_id: "source" },
  );
  const audit = JSON.parse(
    db.prepare("SELECT data FROM audit WHERE type='memory-update'").get().data,
  );
  assert.equal(audit.before.content, "旧正文");
  assert.equal(audit.actor, "source");
  assert.equal(
    db.prepare("SELECT content FROM records WHERE id=?").get(diary.id).content,
    "日记逐字保留",
  );
  const reopened = new StarrStore(f.store.dataRoot);
  try {
    assert.equal(
      reopened.listMemory(f.id, { q: "新的理解" })[0].content,
      current.content,
    );
  } finally {
    reopened.close();
  }
});

test("新群和新私聊延续共享长期理解，私密锚点不泄露，旧类别检索兼容且预算受控", (t) => {
  const f = fixture(t);
  f.patch({
    "memory.defaultVisibility": "conversation",
    "context.anchorMemoryLimit": 2,
  });
  const shared = f.store.saveMemory(
    f.id,
    {
      title: "相处习惯",
      content: "先听对方再开口 " + "自然相处 ".repeat(1500),
      anchor: true,
    },
    { sessionId: "source", visibility: "shared" },
  );
  f.store.saveMemory(
    f.id,
    { title: "私聊秘密锚点", content: "不能公开的合成内容", anchor: true },
    { sessionId: "source", visibility: "conversation" },
  );
  const legacy = f.store.saveMemory(
    f.id,
    { title: "旧兴趣", content: "以前的记录" },
    { sessionId: "source", visibility: "shared" },
  );
  f.store
    .memory(f.id)
    .prepare("UPDATE records SET kind='interest' WHERE id=?")
    .run(legacy.id);
  assert.ok(
    f.store
      .listMemory(f.id, { kind: "moment" })
      .some((r) => r.id === legacy.id),
  );
  for (const s of ["new-group", "new-private"]) {
    const snapshot = f.store.conversations.context(s);
    assert.match(snapshot.text, /先听对方再开口/);
    assert.doesNotMatch(snapshot.text, /私聊秘密锚点|不能公开的合成内容/);
    assert.ok(
      snapshot.text.length <=
        f.store.character(f.id).config["context.maxChars"],
    );
    assert.ok(
      f.store.conversations
        .visibleMemories(s, { kind: "moment", limit: 30 })
        .some((r) => r.id === shared.id),
    );
  }
  assert.equal(
    f.store.conversations.visibleMemories("other-role", { id: shared.id })
      .length,
    0,
  );
});

test("稳定后台会话复用并能冷恢复，保留手改标题，不同来源隔离且运行中拒绝抢用", async (t) => {
  const f = fixture(t),
    handles = new Map();
  let created = 0,
    resumed = 0,
    title = "",
    manual = false;
  const scope = {};
  const ctx = {
    get: () => ({
      get: () => ({ title, source: { kind: manual ? "user" : "agent" } }),
      rename: (_s, value) => {
        title = value;
        manual = true;
      },
    }),
    agentPresets: { mount: async () => {} },
    agents: {
      get: (id) => handles.get(id),
      create: async (o) => {
        created++;
        await o.setup(scope);
        const agent = {
          ctx: scope,
          status: "idle",
          options: {},
          session: { snapshotEvents: [] },
        };
        handles.set(o.sessionId, agent);
        return { agent };
      },
      resume: async (o) => {
        resumed++;
        return {
          agent: {
            ctx: scope,
            status: "idle",
            options: {},
            session: { snapshotEvents: [] },
          },
        };
      },
    },
  };
  const sessionId = taskSessionId(f.id, "agency", "group-a");
  const options = {
    sessionId,
    characterId: f.id,
    title: "自主活动",
    provider: "p",
    model: "m",
    signal: new AbortController().signal,
  };
  const one = await taskAgent(ctx, f.store, options),
    two = await taskAgent(ctx, f.store, { ...options, model: "m2" });
  assert.equal(one.agent, two.agent);
  assert.equal(created, 1);
  assert.equal(two.agent.options.model, "m2");
  title = "我自己起的标题";
  assert.equal(nameSession(ctx, two.agent, "系统标题"), false);
  assert.equal(title, "我自己起的标题");
  two.agent.status = "running";
  await assert.rejects(taskAgent(ctx, f.store, options), /尚未结束/);
  handles.clear();
  await taskAgent(ctx, f.store, options);
  assert.equal(resumed, 1);
  assert.notEqual(sessionId, taskSessionId(f.id, "agency", "group-b"));
  assert.notEqual(sessionId, taskSessionId(f.other, "agency", "group-a"));
  await assert.rejects(
    taskAgent(ctx, f.store, { ...options, characterId: f.other }),
    /角色不匹配/,
  );
});

test("复用自主驱动不会残留上次工具回调，失败也释放本轮监听与注册", async (t) => {
  const f = fixture(t),
    registered = new Map(),
    listeners = new Map();
  let guards = 0,
    shouldFail = false;
  f.store.db.exec(
    "CREATE TABLE qq_session_bindings(session_id TEXT PRIMARY KEY,character_id TEXT NOT NULL)",
  );
  const scope = {
    tools: {
      guard: () => {
        guards++;
        return () => guards--;
      },
      register: (def) => {
        assert.equal(registered.has(def.name), false);
        registered.set(def.name, def);
        return () => registered.delete(def.name);
      },
    },
    on: (name, fn) => {
      listeners.set(name, fn);
      return () => listeners.delete(name);
    },
  };
  const agent = {
    ctx: scope,
    options: {},
    status: "idle",
    session: {},
    followup() {},
    cancel() {},
    whenIdle: async () => {
      if (shouldFail) throw Error("合成驱动错误");
      await registered
        .get("starr_agency_finish")
        .execute({ reason: "本轮决定" });
    },
  };
  const ctx = { agents: { get: () => agent }, get: () => undefined };
  const driver = createAgencyDriver(ctx, f.store),
    seen = [];
  const input = {
    characterId: f.id,
    sessionId: "source",
    provider: "p",
    model: "m",
    signal: new AbortController().signal,
    check: () => f.store.character(f.id).config,
    reserve() {},
    goal: {},
    finish: async () => seen.push("first"),
  };
  await driver.run(input);
  await driver.run({ ...input, finish: async () => seen.push("second") });
  assert.deepEqual(seen, ["first", "second"]);
  assert.equal(registered.size, 0);
  assert.equal(listeners.size, 0);
  assert.equal(guards, 0);
  shouldFail = true;
  await assert.rejects(driver.run(input), /合成驱动错误/);
  assert.equal(registered.size, 0);
  assert.equal(listeners.size, 0);
  assert.equal(guards, 0);
});

test("允许群自主参与时未@也交给模型，关闭和历史观察不唤醒，禁群仍拒绝", (t) => {
  const f = fixture(t);
  f.patch({
    "agency.enabled": true,
    "agency.observeGroups": true,
    "agency.groupEnabled": true,
    "chat.wake.mode": "awake",
    "chat.wake.probability": 0,
  });
  const qq = new QQService(f.store);
  t.after(() => qq.close());
  f.store.db.prepare("INSERT INTO qq_settings VALUES(1,1,?)").run(
    JSON.stringify({
      ...qq.settings().config,
      enabled: true,
      characterId: f.id,
      groups: "300001",
      requireMention: true,
    }),
  );
  qq.state = { status: "connected", account: { selfId: "100001" } };
  const event = (id, group = 300001) => ({
    post_type: "message",
    message_type: "group",
    self_id: 100001,
    user_id: 200001,
    group_id: group,
    message_id: id,
    message: [{ type: "text", data: { text: "今天想聊点什么" } }],
  });
  qq.receive(event(1));
  assert.equal(
    f.store.db
      .prepare("SELECT status FROM qq_inbox ORDER BY seq DESC LIMIT 1")
      .get().status,
    "pending",
  );
  qq.receive(event(2), { observe: true });
  assert.equal(
    f.store.db
      .prepare("SELECT status FROM qq_inbox ORDER BY seq DESC LIMIT 1")
      .get().status,
    "observed",
  );
  f.patch({ "agency.groupEnabled": false });
  qq.receive(event(3));
  assert.equal(
    f.store.db
      .prepare("SELECT status FROM qq_inbox ORDER BY seq DESC LIMIT 1")
      .get().status,
    "observed",
  );
  qq.receive(event(4, 400001));
  assert.equal(
    f.store.db.prepare("SELECT count(*) n FROM qq_inbox").get().n,
    3,
  );
  f.patch({ "agency.groupEnabled": true, "agency.paused": true });
  qq.receive(event(5));
  assert.equal(
    f.store.db
      .prepare("SELECT status FROM qq_inbox ORDER BY seq DESC LIMIT 1")
      .get().status,
    "observed",
  );
});

test("退役浏览配置与周期任务没有可执行入口，旧 enabled 值不复活回顾", (t) => {
  const f = fixture(t),
    c = { ...f.store.character(f.id).config, "jobs.weekly.enabled": true };
  assert.ok(!fields.some((f) => f.key.startsWith("browser.")));
  for (const kind of ["organize", "weekly", "monthly", "yearly"]) {
    assert.ok(!Object.hasOwn(jobKinds, kind));
    assert.equal(dueSlot(kind, c), null);
  }
});

test("基本连接、模型和连续接听配置直接可见，底层调参仍属高级", () => {
  for (const key of [
    "media.baseUrl",
    "tts.connection",
    "tts.model",
    "tts.voice",
    "asr.connection",
    "asr.model",
    "vision.connection",
    "vision.host.provider",
    "vision.host.model",
    "sing.mode",
    "sing.referenceId",
    "chat.wait.afterReply",
    "chat.wait.afterReplySeconds",
    "chat.reply.burstEnabled",
    "chat.reply.burstMax",
  ]) {
    const field = fields.find((f) => f.key === key);
    assert.ok(field, key);
    assert.equal(field.advanced, false, key);
  }
  assert.equal(
    fields.find((f) => f.key === "chat.wait.defaultMs").advanced,
    true,
  );
  assert.ok(
    fields.filter((f) => f.page === "permissions").every((f) => !f.advanced),
  );
});

test("整页配置一次提交与记忆修订接口持久化，冲突拒绝且不覆盖", async (t) => {
  const f = fixture(t),
    app = createServer({ store: f.store, port: 0 });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => app.server.close(resolve)));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const send = (p, body) =>
    fetch(base + p, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const revision = f.store.character(f.id).revision;
  const patch = {
    "chat.reply.burstEnabled": true,
    "chat.wait.defaultMs": 150000,
    "chat.reply.burstMax": 4,
  };
  assert.equal(
    (await send(`/api/characters/${f.id}/config`, { revision, patch })).status,
    200,
  );
  assert.equal(
    (
      await send(`/api/characters/${f.id}/config`, {
        revision,
        patch: { "chat.reply.burstEnabled": false },
      })
    ).status,
    409,
  );
  assert.equal(f.store.character(f.id).config["chat.reply.burstEnabled"], true);
  const row = f.store.saveMemory(f.id, {
    title: "可编辑",
    content: "最初的理解",
  });
  const result = await fetch(
    base + `/api/characters/${f.id}/memory-workshop/update`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        revision: 1,
        content: "一起谈清楚的新理解",
        reason: "合成验证",
      }),
    },
  );
  assert.equal(result.status, 200);
  assert.equal(f.store.listMemory(f.id, { q: "新理解" })[0].revision, 2);
});
