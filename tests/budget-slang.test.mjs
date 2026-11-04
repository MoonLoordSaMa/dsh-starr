import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import {
  UsageBudget,
  installUsageBudget,
} from "../src/conversation/budget.mjs";
import { Slang } from "../src/conversation/slang.mjs";
import { QQService } from "../src/qq/service.mjs";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-budget-")),
    store = new StarrStore(path.join(root, "runtime")),
    { character } = store.setup({
      name: "用量验收",
      memoryRoot: path.join(root, "memory"),
      backupRoot: path.join(root, "backup"),
    });
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { store, id: character.id };
}
test("真实用量按会话事件去重，缓存不重复算价、旧用量不算当天且缺失不冒充零", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-budget-window-")),
    store = new StarrStore(path.join(root, "runtime"));
  try {
    const { character } = store.setup({
        name: "额度角色",
        memoryRoot: path.join(root, "memory"),
        backupRoot: path.join(root, "backup"),
      }),
      budget = new UsageBudget(store),
      agent = {
        id: "trusted-session",
        session: {
          snapshotEvents: () => [
            {
              seq: 1,
              time: Date.now(),
              type: "assistant/message",
              data: {
                usage: {
                  inputTokens: 1000,
                  outputTokens: 100,
                  cacheReadTokens: 500,
                },
              },
            },
            {
              seq: 2,
              time: Date.now() - 2 * 86400000,
              type: "assistant/message",
              data: { usage: { inputTokens: 100000, outputTokens: 1 } },
            },
          ],
        },
      };
    budget.capture(character.id, agent);
    budget.capture(character.id, agent);
    const status = budget.status(character.id);
    assert.equal(status.requests, 1);
    assert.equal(status.tokens, 1100);
    assert.equal(status.estimatedCostCNY, 0.0014);
    store.configure(
      character.id,
      { "chat.budget.enabled": true, "chat.budget.maxTokens": 1000 },
      { revision: character.revision },
    );
    assert.throws(
      () => budget.check(character.id),
      (error) => error.code === "MODEL_BUDGET",
    );
    budget.capture(character.id, {
      id: "missing",
      session: {
        snapshotEvents: () => [
          { seq: 1, time: Date.now(), type: "assistant/message", data: {} },
        ],
      },
    });
    assert.throws(
      () => budget.check(character.id),
      (error) => error.code === "USAGE_MISSING",
    );
    const other = store.createCharacter({ name: "其他角色" });
    assert.equal(budget.status(other.id).tokens, 0);
  } finally {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("宿主请求前实际执行用量闸门，普通会话不安装钩子，卸载移除", async (t) => {
  const f = fixture(t),
    listeners = new Map(),
    agent = { id: "test-session", session: { snapshotEvents: () => [] } };
  const close = installUsageBudget(
    {
      agents: { requireInitiator: () => agent },
      on: (name, fn) => {
        listeners.set(name, fn);
        return () => listeners.delete(name);
      },
    },
    f.store,
    () => f.store.character(f.id),
  );
  let next = 0;
  await listeners.get("agent/request")({}, async () => {
    next++;
  });
  assert.equal(next, 1);
  close();
  assert.equal(listeners.size, 0);
});

test("DSH 将缓存读入与未缓存输入分开报告时，额度不漏算且重算仍去重", (t) => {
  const { store, id } = fixture(t),
    budget = new UsageBudget(store);
  const agent = {
    id: "cache-split",
    session: {
      snapshotEvents: () => [
        {
          seq: 1,
          time: Date.now(),
          type: "assistant/message",
          data: {
            usage: {
              inputTokens: 1814,
              cacheReadTokens: 76032,
              outputTokens: 186,
              totalTokens: 78032,
            },
          },
        },
      ],
    },
  };
  budget.capture(id, agent);
  budget.capture(id, agent);
  assert.equal(budget.status(id).requests, 1);
  assert.equal(budget.status(id).tokens, 78032);
  assert.ok(
    Math.abs(
      budget.status(id).estimatedCostCNY -
        (1814 * 2 + 76032 * 0.2 + 186 * 3) / 1000000,
    ) < 1e-9,
  );
});
test("学习用语需要本会话真实多条证据，候选不注入，词义与来源重开保留", async (t) => {
  const f = fixture(t);
  const qq = new QQService(f.store);
  t.after(() => qq.close());
  f.store.conversations.ensure({
    sessionId: "qq-a",
    characterId: f.id,
    platform: "qq",
    type: "private",
    account: "100001",
    target: "200001",
  });
  f.store.db
    .prepare(
      "INSERT INTO qq_threads VALUES('thread',?,'qq-a','private','200001',0)",
    )
    .run(f.id);
  for (let i = 1; i <= 2; i++)
    f.store.db
      .prepare(
        "INSERT INTO qq_inbox(event_key,thread_key,payload,created) VALUES(?,'thread',?,?)",
      )
      .run(
        `event-${i}`,
        JSON.stringify({ messageId: String(i), text: "这个芜湖好有趣" }),
        Date.now(),
      );
  f.store.configure(f.id, { "slang.enabled": true }, { revision: 1 });
  const slang = new Slang(f.store);
  assert.throws(
    () =>
      slang.submit("qq-a", {
        term: "芜湖",
        definition: "开心欢呼",
        confidence: 90,
        evidence: ["1", "outside"],
      }),
    /证据/,
  );
  assert.equal(
    slang.submit("qq-a", {
      term: "芜湖",
      definition: "开心欢呼",
      confidence: 90,
      evidence: ["1", "2"],
    }).status,
    "learned",
  );
  assert.ok(
    f.store.conversations
      .context("qq-a", { q: "芜湖" })
      .text.includes("开心欢呼"),
  );
  f.store.conversations.ensure({
    sessionId: "qq-b",
    characterId: f.id,
    platform: "qq",
    type: "private",
    account: "100001",
    target: "200002",
  });
  assert.equal(slang.query("qq-b", "芜湖").length, 0);
  assert.throws(
    () =>
      slang.submit("qq-a", {
        term: "芜湖",
        definition: "别的解释",
        confidence: 90,
        evidence: ["1", "2"],
      }),
    /冷却/,
  );
});
