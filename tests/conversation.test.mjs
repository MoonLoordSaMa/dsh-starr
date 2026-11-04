import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { createTools } from "../src/host/tools.mjs";
import { installChatContext } from "../src/host/chat-context.mjs";
import { createServer } from "../src/server.mjs";
import { conversationDelivery } from "../src/host/chat-delivery.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-chat-"));
  const store = new StarrStore(path.join(root, "runtime"));
  store.setup({
    name: "角色甲",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const a = store.listCharacters()[0].id,
    b = store.createCharacter({ name: "角色乙" }).id;
  for (const [sessionId, platform, type, target, characterId] of [
    ["qq-a", "qq", "private", "1001", a],
    ["qq-b", "qq", "private", "1002", a],
    ["qq-group", "qq", "group", "2001", a],
    ["bili-a", "bili", "dm", "3001", a],
    ["web-a", "web", "web", "", a],
    ["bili-b", "bili", "dm", "3002", b],
  ])
    store.conversations.ensure({
      sessionId,
      platform,
      type,
      target,
      characterId,
    });
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return {
    root,
    store,
    a,
    b,
    tools: (id) =>
      createTools(store, {
        characterId: store.conversations.get(id).character_id,
        sessionId: id,
      }),
  };
}

test("主人历史访问需要管理员绑定，撤回共享的其他私聊仍不开放，低分旧记忆可主动检索", (t) => {
  const { store, a, tools } = fixture(t);
  store.conversations.ensure({
    sessionId: "owner",
    characterId: a,
    platform: "qq",
    type: "private",
    target: "10001",
  });
  const legacy = store.saveMemory(a, {
    title: "月亮往事",
    content: "完整个人历史",
    importance: 1,
  });
  store
    .memory(a)
    .prepare("UPDATE records SET created='2000-01-01T00:00:00Z' WHERE id=?")
    .run(legacy.id);
  assert.equal(tools("owner").starr_memory_status().accessible, 0);
  store.configure(
    a,
    { "memory.ownerQQ": "10001", "permissions.botConfig": true },
    { revision: store.character(a).revision },
  );
  assert.throws(
    () =>
      store.configure(
        a,
        { "memory.ownerQQ": "10002" },
        { bot: true, revision: store.character(a).revision },
      ),
    { status: 403 },
  );
  const hidden = tools("qq-b").starr_memory_write({
    title: "另一位的秘密",
    content: "月亮秘密",
  });
  store.setMemoryVisibility(a, hidden.id, {
    visibility: "unclassified",
    revision: 1,
  });
  assert.equal(tools("owner").starr_memory_status().database, "ok");
  assert.equal(tools("owner").starr_memory_status().accessible, 1);
  assert.equal(
    tools("owner").starr_memory_search({ q: "月亮" })[0].id,
    legacy.id,
  );
  assert.equal(
    tools("owner").starr_memory_read({ id: legacy.id }).content,
    "完整个人历史",
  );
  assert.equal(
    store.conversations.visibleMemories("owner", { automatic: true }).length,
    0,
  );
  assert.throws(() => tools("owner").starr_memory_read({ id: hidden.id }), {
    status: 404,
  });
  for (const session of [
    "qq-a",
    "qq-b",
    "qq-group",
    "bili-a",
    "bili-b",
    "web-a",
  ])
    assert.throws(() => tools(session).starr_memory_read({ id: legacy.id }), {
      status: 404,
    });
  const reopened = new StarrStore(store.dataRoot);
  try {
    assert.equal(reopened.conversations.memoryStatus("owner").accessible, 1);
  } finally {
    reopened.close();
  }
});

test("最近经历、日记和长期锚点按预算去重，后续请求可立即获取新记忆，摘录保留完整JSON", (t) => {
  const { store, a, tools } = fixture(t),
    db = store.memory(a);
  const anchor = tools("qq-a").starr_memory_write({
    title: "长期约定",
    content: "约定全文",
    anchor: true,
  });
  db.prepare(
    "UPDATE records SET created='2000-01-01T00:00:00Z' WHERE id=?",
  ).run(anchor.id);
  const diary = tools("qq-a").starr_memory_write({
    title: "昨夜日记",
    content: '日记含有"引号"和\\路径\n第二段',
    kind: "diary",
  });
  const earlier = store.conversations.context("qq-a", { q: "无关话题" });
  assert.ok(earlier.memories.some((r) => r.id === anchor.id));
  assert.ok(earlier.memories.some((r) => r.id === diary.id));
  const recent = tools("qq-a").starr_memory_write({
    title: "刚发生",
    content: "今晚新经历",
  });
  const later = store.conversations.context("qq-a", { q: "另外的话题" });
  assert.ok(later.memories.some((r) => r.id === recent.id));
  assert.equal(
    new Set(later.memories.map((r) => r.id)).size,
    later.memories.length,
  );
  assert.ok(later.text.includes("sort=recent"));
  assert.ok(later.text.includes("当前时间"));
  for (const budget of [0, 300, 800, 2400]) {
    store.configure(
      a,
      { "context.memoryChars": budget },
      { revision: store.character(a).revision },
    );
    const preview = store.conversations.context("qq-a");
    assert.ok(preview.chars <= preview.budget);
    const section = preview.sections.find((s) => s.name === "相关记忆");
    const rows = section
      ? section.text
          .split("\n")
          .slice(1)
          .map((line) => JSON.parse(line))
      : [];
    assert.deepEqual(
      rows.map((r) => r.id),
      preview.memories.map((r) => r.id),
    );
    if (section) assert.ok(section.chars <= budget);
  }
});

test("大库召回不丢失五千条以外的旧相关记忆，完整正文按需返回且仍隔离私聊", (t) => {
  const { store, a } = fixture(t),
    db = store.memory(a),
    body = "完整内容".repeat(100);
  const insert = db.prepare(
    "INSERT INTO records(id,title,content,kind,importance,confidence,anchor,source,fingerprint,created) VALUES(?,?,?,'moment',90,90,?,'合成验收',?,?)",
  );
  const scope = db.prepare("INSERT INTO record_visibility VALUES(?,?,?)");
  db.exec("BEGIN");
  try {
    for (let i = 0; i < 5100; i++) {
      insert.run(
        `bulk-${i}`,
        "普通资料",
        body,
        0,
        `bulk-${i}`,
        "2026-11-03T00:00:00Z",
      );
      scope.run(`bulk-${i}`, "shared", "");
    }
    insert.run(
      "old-relevant",
      "星系研究",
      body + "星系知识完整正文",
      1,
      "old",
      "2020-01-01T00:00:00Z",
    );
    scope.run("old-relevant", "shared", "");
    insert.run(
      "old-private",
      "星系秘密",
      body,
      1,
      "private",
      "2026-11-03T00:00:00Z",
    );
    scope.run("old-private", "conversation", "qq-b");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  const start = performance.now(),
    rows = store.conversations.visibleMemories("qq-a", {
      q: "星系研究",
      limit: 6,
    });
  assert.equal(rows[0].id, "old-relevant");
  assert.equal(rows[0].content, body + "星系知识完整正文");
  assert.equal(
    rows.some((row) => row.id === "old-private"),
    false,
  );
  t.diagnostic(
    `5102 条合成记忆检索 ${Math.round(performance.now() - start)} 毫秒，返回 ${rows.length} 条正文`,
  );
});

test("私聊、群聊、平台与角色隔离；共享撤销恢复来源范围且保留审计", (t) => {
  const { store, a, tools } = fixture(t);
  const record = tools("qq-a").starr_memory_write({
    title: "私密约定",
    content: "蓝莓可丽饼",
    eventKey: "same",
  });
  assert.equal(
    tools("qq-a").starr_memory_read({ id: record.id }).content,
    "蓝莓可丽饼",
  );
  for (const id of ["qq-b", "qq-group", "bili-a", "bili-b"]) {
    assert.equal(tools(id).starr_memory_search({ q: "蓝莓" }).length, 0);
    assert.throws(() => tools(id).starr_memory_read({ id: record.id }), {
      status: 404,
    });
  }
  store.setMemoryVisibility(a, record.id, {
    visibility: "shared",
    revision: 1,
  });
  for (const id of ["qq-b", "qq-group", "bili-a"])
    assert.equal(tools(id).starr_memory_search({ q: "蓝莓" })[0].id, record.id);
  assert.equal(tools("bili-b").starr_memory_search({ q: "蓝莓" }).length, 0);
  assert.throws(
    () =>
      store.setMemoryVisibility(a, record.id, {
        visibility: "unclassified",
        revision: 1,
      }),
    { status: 409 },
  );
  store.setMemoryVisibility(a, record.id, {
    visibility: "unclassified",
    revision: 2,
  });
  assert.equal(tools("qq-a").starr_memory_search({ q: "蓝莓" }).length, 1);
  assert.equal(tools("bili-a").starr_memory_search({ q: "蓝莓" }).length, 0);
  assert.equal(
    store
      .memory(a)
      .prepare("SELECT count(*) n FROM audit WHERE type='memory-scope'")
      .get().n,
    3,
  );
});

test("共享需授权、非法范围不产生残留；幂等重试不会重新扩大管理员已撤销的范围", (t) => {
  const { store, a, tools } = fixture(t),
    input = {
      title: "书单",
      content: "天文入门",
      eventKey: "book",
      visibility: "shared",
    };
  assert.throws(() => tools("qq-a").starr_memory_write(input), { status: 403 });
  assert.throws(
    () =>
      tools("qq-a").starr_memory_write({ ...input, visibility: "everyone" }),
    { status: 400 },
  );
  assert.equal(store.listMemory(a).length, 0);
  store.configure(
    a,
    { "memory.allowSharedWrites": true },
    { revision: store.character(a).revision },
  );
  const record = tools("qq-a").starr_memory_write(input);
  store.setMemoryVisibility(a, record.id, {
    revision: 1,
    visibility: "unclassified",
  });
  assert.equal(tools("qq-a").starr_memory_write(input).id, record.id);
  assert.equal(tools("bili-a").starr_memory_search({ q: "天文" }).length, 0);
  assert.throws(
    () =>
      tools("qq-a").starr_memory_write({
        ...input,
        visibility: "conversation",
      }),
    { status: 409 },
  );
  const other = tools("qq-b").starr_memory_write({
    ...input,
    visibility: "conversation",
  });
  assert.notEqual(record.id, other.id);
  assert.throws(
    () =>
      tools("qq-a").starr_memory_link({
        source: record.id,
        target: other.id,
        kind: "semantic",
        weight: 0.5,
      }),
    { status: 404 },
  );
  assert.throws(
    () => createTools(store, { characterId: a, sessionId: "missing" }),
    { status: 404 },
  );
});

test("会话摘要与用途有修订和持久化，bot 不能修改权限、分类或暂停", (t) => {
  const { store, a, tools } = fixture(t);
  const first = tools("qq-a").starr_chat_note({
    revision: 1,
    summary: "聊了天文",
    pending: "明天整理书单",
  });
  assert.equal(first.revision, 2);
  assert.throws(
    () => tools("qq-a").starr_chat_note({ revision: 1, summary: "覆盖" }),
    { status: 409 },
  );
  for (const patch of [
    { paused: true },
    { purpose: "management" },
    { title: "任意" },
  ])
    assert.throws(
      () => store.conversations.patch("qq-a", { revision: 2, patch }, "bot"),
      { status: 403 },
    );
  store.conversations.patch("qq-a", {
    revision: 2,
    patch: { purpose: "task", title: "天文协作", paused: true },
  });
  assert.equal(
    store.conversations.list(a).find((s) => s.session_id === "qq-a").purpose,
    "task",
  );
  const reopened = new StarrStore(store.dataRoot);
  try {
    assert.equal(reopened.conversations.get("qq-a").summary, "聊了天文");
    assert.equal(reopened.conversations.get("qq-a").paused, 1);
  } finally {
    reopened.close();
  }
  assert.throws(
    () =>
      store.conversations.ensure({
        sessionId: "qq-a",
        characterId: a,
        platform: "qq",
        type: "private",
        target: "different",
      }),
    { status: 409 },
  );
});

test("注入遵守字符预算、按主题召回且全文按需读取；动态关闭后保留人格和边界", (t) => {
  const { store, a, tools } = fixture(t);
  store.updateCharacter(a, {
    revision: 1,
    name: "角色甲",
    persona: "角色核心{{不可插值}}".repeat(300),
  });
  store.configure(
    a,
    {
      "context.maxChars": 2200,
      "context.personaChars": 600,
      "context.memoryChars": 500,
      "context.summaryChars": 400,
    },
    { revision: store.character(a).revision },
  );
  const record = tools("qq-a").starr_memory_write({
    title: "天文书单",
    content: "星系研究".repeat(500),
    importance: 95,
  });
  tools("qq-a").starr_memory_write({
    title: "甜点",
    content: "可丽饼",
    importance: 100,
  });
  tools("qq-a").starr_chat_note({
    revision: 1,
    summary: "讨论星空",
    pending: "读书",
  });
  const preview = store.conversations.context("qq-a", { q: "星系研究" });
  assert.ok(preview.text.length <= 2200);
  assert.equal(preview.chars, preview.text.length);
  assert.ok(preview.memories.some((r) => r.id === record.id));
  assert.equal(
    tools("qq-a").starr_memory_read({ id: record.id }).content.length,
    2000,
  );
  assert.ok(
    preview.sections
      .find((s) => s.name === "当前状态")
      .text.includes("intensity"),
  );
  store.configure(
    a,
    { "context.enabled": false },
    { revision: store.character(a).revision },
  );
  assert.deepEqual(
    store.conversations.context("qq-a").sections.map((s) => s.name),
    ["角色核心", "会话边界"],
  );
});

test("旧版未分类记忆仅管理员管理会话可见，升级表结构和数据不会丢失", (t) => {
  const { store, a, tools } = fixture(t);
  const old = store.saveMemory(a, { title: "旧记忆", content: "旧测试数据" });
  assert.equal(tools("qq-a").starr_memory_search({ q: "旧" }).length, 0);
  assert.equal(tools("web-a").starr_memory_search({ q: "旧" }).length, 0);
  store.conversations.patch("web-a", {
    revision: 1,
    patch: { purpose: "management" },
  });
  assert.equal(
    tools("web-a").starr_memory_read({ id: old.id }).content,
    "旧测试数据",
  );
  const db = store.memory(a);
  db.exec("DROP TABLE record_visibility");
  store.memories.delete(a);
  db.close();
  assert.ok(store.memory(a).prepare("SELECT * FROM record_visibility").all());
  assert.equal(store.listMemory(a)[0].id, old.id);
});

test("最新网页输入在组装前参与召回，动态快照不插值；卸载清除监听与注入", (t) => {
  const { store, a, tools } = fixture(t),
    sections = new Map(),
    contexts = new Map(),
    events = new Map();
  const record = tools("web-a").starr_memory_write({
    title: "新主题",
    content: "木星卫星",
    importance: 80,
  });
  const mount = (map, value) => {
    map.set(value.name, value);
    return () => map.delete(value.name);
  };
  const ctx = {
    on: (name, fn) => {
      events.set(name, fn);
      return () => events.delete(name);
    },
    systemPrompt: {
      section: (s) => mount(sections, s),
      context: (s) => mount(contexts, s),
      getSectionOrder: () => 0,
    },
  };
  const close = installChatContext(ctx, store, () => store.character(a));
  events.get("agent/inbox/claimed")({
    turn: 1,
    message: {
      role: "user",
      source: { kind: "user" },
      content: [{ type: "text", text: "木星卫星" }],
    },
  });
  const scope = {
    id: "web-a",
    session: {
      snapshotEvents: () => [
        {
          type: "user/message",
          data: {
            source: { kind: "runtime-context" },
            content: [{ type: "text", text: "旧快照" }],
          },
        },
      ],
    },
  };
  const dynamic = contexts.get("starr:conversation");
  assert.equal(dynamic.interpolate, false);
  assert.equal(dynamic.required, true);
  assert.ok(dynamic.text({ scope }).includes(record.id));
  assert.equal(store.conversations.get("web-a").query, "木星卫星");
  assert.ok(
    !sections
      .get("deployment:persona-prefix")
      .text({ scope })
      .includes("会话边界"),
  );
  close();
  assert.equal(events.size + sections.size + contexts.size, 0);
});

test("角色专用系统提示保留原人设，动态开关、保存后的新资料与请求核验分别生效", (t) => {
  const { store, a, tools } = fixture(t);
  store.updateCharacter(a, {
    revision: 1,
    name: "角色甲",
    persona: "自然接话{{不要插值}}",
  });
  const sections = new Map(),
    contexts = new Map(),
    listeners = new Map();
  const messages = [],
    events = [];
  const agent = {
    id: "qq-a",
    session: { snapshotEvents: () => events, deriveMessages: () => messages },
  };
  const mount = (map, entry) => {
    map.set(entry.name, entry);
    return () => map.delete(entry.name);
  };
  const close = installChatContext(
    {
      agents: { requireInitiator: () => agent },
      on: (name, fn) => {
        listeners.set(name, fn);
        return () => listeners.delete(name);
      },
      systemPrompt: {
        section: (s) => mount(sections, s),
        context: (s) => mount(contexts, s),
        getSectionOrder: () => 0,
      },
    },
    store,
    () => store.character(a),
    { roleConversation: true },
  );
  t.after(close);
  const prefix = sections.get("deployment:persona-prefix"),
    dynamic = contexts.get("starr:conversation");
  assert.equal(prefix.complete, true);
  const core = prefix.text({ scope: agent });
  assert.match(core, /^自然接话\{\{不要插值\}\}/);
  assert.match(core, /不把日常聊天改写成执行任务或工作汇报/);
  assert.match(core, /路径、凭据、管理员或自身授权/);
  assert.equal(store.conversations.context(agent.id).lastInjection, null);
  const record = tools(agent.id).starr_memory_write({
    title: "此刻经历",
    content: "刚刚读完木星卫星图册",
  });
  store.conversations.query(agent.id, "木星卫星");
  const current = dynamic.text({ scope: agent });
  assert.match(current, /刚刚读完木星卫星图册/);
  messages.push(
    { role: "system", content: [{ type: "text", text: core }] },
    { role: "user", content: [{ type: "text", text: current }] },
  );
  events.push(
    { type: "system/message", seq: 1, data: { message: messages[0] } },
    {
      type: "user/message",
      seq: 2,
      data: { ...messages[1], source: { kind: "runtime-context" } },
    },
    {
      type: "assistant/message",
      seq: 12,
      time: Date.now(),
      data: {},
    },
  );
  listeners.get("agent/status")({ status: "idle" });
  const receipt = store.conversations.context(agent.id).lastInjection;
  assert.equal(receipt.verified, true);
  assert.equal(receipt.requestSeq, 12);
  assert.ok(receipt.memories.some((r) => r.id === record.id));
  store.configure(
    a,
    { "context.enabled": false },
    { revision: store.character(a).revision },
  );
  assert.doesNotMatch(dynamic.text({ scope: agent }), /刚刚读完木星卫星图册/);
  assert.match(prefix.text({ scope: agent }), /自然接话/);
  assert.equal(store.character(a).persona, "自然接话{{不要插值}}");
  events.splice(0, 2);
  listeners.get("agent/status")({ status: "idle" });
  assert.equal(
    store.conversations.context(agent.id).lastInjection.verified,
    false,
  );
});

test("简单叫名字不按角色名泛召回，不相干锚点不占话题线索，搜索摘录有上限且全文可读", (t) => {
  const { store, a, tools } = fixture(t);
  store.updateCharacter(a, { revision: 1, name: "斯塔", persona: "当前人设" });
  const anchor = tools("qq-a").starr_memory_write({
    title: "2020 年概览",
    content: "斯塔喜欢旧式称呼".repeat(2000),
    anchor: true,
    kind: "summary",
  });
  tools("qq-a").starr_memory_write({
    title: "天文约定",
    content: "一起研究木星卫星",
    kind: "promise",
  });
  assert.deepEqual(
    store.conversations.visibleMemories("qq-a", { q: "斯塔", automatic: true }),
    [],
  );
  assert.equal(
    store.conversations
      .visibleMemories("qq-a", { q: "木星卫星", automatic: true })
      .some((r) => r.id === anchor.id),
    false,
  );
  const preview = store.conversations.context("qq-a", { q: "斯塔" });
  const lane = preview.sections
    .find((s) => s.name === "相关记忆")
    .text.split("\n")
    .slice(1)
    .map((s) => JSON.parse(s));
  assert.equal(
    lane.some((r) => r.id === anchor.id && r.lane === "最近发生"),
    false,
  );
  const result = tools("qq-a").starr_memory_search({ q: "斯塔" })[0];
  assert.equal(result.id, anchor.id);
  assert.equal(result.content.length, 600);
  assert.equal(result.truncated, true);
  assert.equal(result.contentChars, anchor.content.length);
  assert.equal(
    tools("qq-a").starr_memory_read({ id: anchor.id }).content,
    anchor.content,
  );
  store.conversations.ensure({
    sessionId: "owner",
    characterId: a,
    platform: "qq",
    type: "private",
    target: "10001",
  });
  store.configure(
    a,
    { "memory.ownerQQ": "10001" },
    { revision: store.character(a).revision },
  );
  assert.match(
    store.conversations.context("owner").text,
    /已由管理员绑定确认的主人/,
  );
  assert.match(store.conversations.context("qq-b").text, /未通过主人身份绑定/);
});

test("自动来信完整展示注入快照，只有可信投递去重；工具修改资料后重新注入", (t) => {
  const { store, a, tools } = fixture(t),
    sections = new Map(),
    contexts = new Map(),
    listeners = new Map(),
    events = [];
  const agent = { id: "qq-a", session: { snapshotEvents: () => events } };
  const mount = (map, entry) => {
    map.set(entry.name, entry);
    return () => map.delete(entry.name);
  };
  const close = installChatContext(
    {
      agents: { requireInitiator: () => agent },
      on: (name, fn) => {
        listeners.set(name, fn);
        return () => listeners.delete(name);
      },
      systemPrompt: {
        section: (s) => mount(sections, s),
        context: (s) => mount(contexts, s),
        getSectionOrder: () => 0,
      },
    },
    store,
    () => store.character(a),
    { roleConversation: true },
  );
  t.after(close);
  const preview = store.conversations.context(agent.id),
    message = {
      id: "delivery-a",
      source: { kind: "user" },
      role: "user",
      content: [
        { type: "text", text: conversationDelivery(preview, "来自QQ的正文") },
      ],
    };
  const dynamic = contexts.get("starr:conversation");
  assert.notEqual(dynamic.text({ scope: agent }), "");
  store.conversations.recordDelivery(agent.id, message.id, preview);
  events.push({ seq: 1, type: "user/message", data: message });
  listeners.get("agent/inbox/claimed")({ message, turn: 1 });
  const core = sections.get("deployment:persona-prefix").text({ scope: agent });
  assert.equal(dynamic.text({ scope: agent }), "");
  for (const section of preview.sections)
    assert.ok(message.content[0].text.includes(section.text));
  events.push(
    {
      seq: 2,
      type: "system/message",
      data: { message: { content: [{ type: "text", text: core }] } },
    },
    { seq: 3, type: "assistant/message", data: {}, time: Date.now() },
  );
  listeners.get("agent/status")({ status: "idle" });
  assert.equal(
    store.conversations.context(agent.id).lastInjection.placement,
    "message",
  );
  assert.equal(
    store.conversations.context(agent.id).lastInjection.verified,
    true,
  );
  tools(agent.id).starr_memory_write({
    title: "新经历",
    content: "资料已变化",
  });
  assert.match(dynamic.text({ scope: agent }), /资料已变化/);
  assert.throws(
    () => store.conversations.recordDelivery("qq-b", message.id, preview),
    { status: 403 },
  );
  const reloaded = new StarrStore(store.dataRoot);
  try {
    assert.equal(
      reloaded.conversations.delivery(agent.id).messageId,
      message.id,
    );
  } finally {
    reloaded.close();
  }
});

test("会话和共享范围接口拒绝跨角色、跨站与过期修改", async (t) => {
  const { store, a, b, tools } = fixture(t),
    app = createServer({ store, port: 0 });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  t.after(() => app.server.close());
  const base = `http://127.0.0.1:${app.server.address().port}/api/characters`;
  assert.equal((await fetch(`${base}/${b}/chats/qq-a`)).status, 404);
  assert.equal(
    (
      await fetch(`${base}/${a}/chats/qq-a`, {
        method: "PATCH",
        headers: { origin: "https://other.invalid" },
        body: JSON.stringify({ revision: 1, patch: { summary: "bad" } }),
      })
    ).status,
    403,
  );
  const record = tools("qq-a").starr_memory_write({
    title: "接口测试",
    content: "局部数据",
  });
  const response = await fetch(`${base}/${a}/memory-scope/${record.id}`, {
    method: "PATCH",
    body: JSON.stringify({ revision: 1, visibility: "shared" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revision, 2);
  assert.equal(
    (
      await fetch(`${base}/${a}/memory-scope/${record.id}`, {
        method: "PATCH",
        body: JSON.stringify({ revision: 1, visibility: "unclassified" }),
      })
    ).status,
    409,
  );
});
