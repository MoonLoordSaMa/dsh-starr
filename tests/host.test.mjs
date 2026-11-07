import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { apply, toolSpecifications } from "../src/host/plugin.mjs";

test("starr 工具只注册到已绑定会话，普通会话与全局均不暴露；卸载移除", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-host-")),
    store = new StarrStore(path.join(root, "runtime"));
  store.setup({
    name: "宿主测试",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const characterId = store.listCharacters()[0].id;
  store.close();
  const registered = new Map(),
    globalTools = new Map(),
    ordinaryTools = new Map(),
    events = new Map(),
    trusted = {
      id: "trusted-session",
      ctx: {
        tools: {
          register(spec) {
            assert.equal(registered.has(spec.name), false);
            registered.set(spec.name, spec);
            return () => registered.delete(spec.name);
          },
        },
      },
    },
    ordinary = {
      id: "ordinary-session",
      ctx: {
        tools: {
          register(spec) {
            ordinaryTools.set(spec.name, spec);
            return () => ordinaryTools.delete(spec.name);
          },
        },
      },
    },
    ctx = {
      tools: {
        register(spec) {
          globalTools.set(spec.name, spec);
          return () => globalTools.delete(spec.name);
        },
      },
      on(name, callback) {
        events.set(name, callback);
        return () => events.delete(name);
      },
      inject(dependencies, callback) {
        if (!dependencies.includes("agents")) return;
        callback({
          agents: {
            list: () => [trusted, ordinary],
            get: (id) => [trusted, ordinary].find((agent) => agent.id === id),
          },
          on: ctx.on,
          effect: (effect) => effect(),
        });
      },
    };
  apply(ctx, {
    dataRoot: path.join(root, "runtime"),
    sessionBindings: { "trusted-session": characterId },
  });
  t.after(() => {
    events.get("dispose")?.();
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal(registered.size, toolSpecifications.length);
  for (const name of [
    "starr_memory_archive",
    "starr_voice_list",
    "starr_link_parse",
    "starr_memory_update",
    "starr_goal_list",
    "starr_goal_update",
  ])
    assert.ok(registered.has(name));
  assert.equal(globalTools.size, 0);
  assert.equal(ordinaryTools.size, 0);
  const write = registered.get("starr_memory_write"),
    exec = {
      agent: { id: "trusted-session" },
      signal: new AbortController().signal,
    };
  assert.throws(
    () =>
      write.execute(
        { title: "拒绝", content: "无绑定" },
        { agent: { id: "untrusted" }, signal: exec.signal },
      ),
    /不属于当前/,
  );
  const record = await write.execute(
    { title: "宿主记忆", content: "可信范围", source: "用户本人" },
    exec,
  );
  assert.ok(record.id);
  assert.equal(record.source, "DSH 会话 trusted-session");
  const found = await registered
    .get("starr_memory_search")
    .execute({ q: "可信" }, exec);
  assert.equal(found.length, 1);
  assert.equal(typeof registered.get("starr_config_read").execute, "function");
  events.get("agent/created")({ agent: trusted });
  assert.equal(registered.size, toolSpecifications.length);
  events.get("agent/disposed")({ agent: trusted });
  assert.equal(registered.size, 0);
  assert.throws(() => write.execute({}, exec), /绑定已停止/);
  events.get("agent/created")({ agent: trusted });
  assert.equal(registered.size, toolSpecifications.length);
  events.get("dispose")();
  assert.equal(registered.size, 0);
  assert.equal(globalTools.size, 0);
});
