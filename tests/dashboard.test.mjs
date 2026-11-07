import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { dashboardStatus } from "../src/runtime/dashboard.mjs";
import { createServer } from "../src/server.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-dashboard-"));
  const store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backups"),
  });
  const id = character.id;
  const patch = (value) =>
    store.configure(id, value, { revision: store.character(id).revision });
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { store, id, root, patch };
}
test("首页状态只报告真实连接，配置完整不伪报模型在线，也不触发外部调用", (t) => {
  const f = fixture(t);
  f.patch({
    "bili.enabled": true,
    "bili.provider": "test-provider",
    "bili.model": "test-model",
    "bili.allowedUsers": "200001",
    "tts.connection": "custom",
    "tts.baseUrl": "http://127.0.0.1:19001/v1",
    "tts.model": "test-model",
    "agency.enabled": true,
    "agency.level": "browse",
  });
  const services = {
    host: { connected: true },
    qq: {
      status: () => ({
        config: { characterId: f.id, enabled: true },
        runtime: {
          status: "connected",
          listening: [{ seconds: 150, deadlineAt: Date.now() + 150000 }],
        },
      }),
    },
    bili: {
      status: () => ({
        hostReady: true,
        runtime: { status: "degraded", lastPollAt: new Date().toISOString() },
      }),
    },
    agency: {
      running: new Map(),
      status: () => ({ hostReady: true, blockers: [] }),
    },
  };
  const first = dashboardStatus(f.store, f.id, services);
  const item = (id) => first.items.find((v) => v.id === id);
  assert.equal(item("host").status, "online");
  assert.equal(item("qq").status, "online");
  assert.match(item("qq").text, /接听/);
  assert.equal(item("bili").status, "error");
  assert.equal(item("tts").status, "configured");
  assert.equal(item("agency").status, "ready");
  assert.equal(first.listening[0].seconds, 150);
  f.patch({ "agency.paused": true, "tts.connection": "disabled" });
  const second = dashboardStatus(f.store, f.id, services);
  assert.equal(second.items.find((v) => v.id === "agency").status, "paused");
  assert.equal(second.items.find((v) => v.id === "tts").status, "disabled");
});
test("状态与最近预览按角色隔离，QQ不泄露其他角色接听信息，记忆持久化保留全文", (t) => {
  const f = fixture(t);
  const other = f.store.createCharacter({ name: "另一个角色" });
  const text = "合成正文\n\n" + "保留完整记忆。".repeat(80);
  f.store.saveMemory(f.id, { title: "此角色的记忆", content: text });
  f.store.saveMemory(other.id, {
    title: "其他角色的私人记忆",
    content: "不应出现在当前首页",
  });
  const services = {
    qq: {
      status: () => ({
        config: { characterId: other.id, enabled: true },
        runtime: {
          status: "connected",
          listening: [{ seconds: 150, deadlineAt: 123 }],
        },
      }),
    },
  };
  const result = dashboardStatus(f.store, f.id, services);
  assert.equal(result.items.find((v) => v.id === "qq").status, "needs-config");
  assert.deepEqual(result.listening, []);
  assert.equal(result.memory.count, 1);
  assert.equal(result.memory.recent[0].title, "此角色的记忆");
  assert.ok(result.memory.recent[0].preview.length <= 220);
  assert.ok(!JSON.stringify(result).includes("其他角色的私人记忆"));
  const reopened = new StarrStore(path.join(f.root, "runtime"));
  try {
    assert.equal(reopened.listMemory(f.id)[0].content, text);
    assert.equal(dashboardStatus(reopened, f.id).memory.count, 1);
  } finally {
    reopened.close();
  }
});
test("管理员状态接口返回独立预览真实空态，未知角色与非本机来源失败", async (t) => {
  const f = fixture(t);
  const app = createServer({ store: f.store, port: 0 });
  await app.listen();
  t.after(
    () =>
      new Promise((resolve) => {
        app.server.close(resolve);
        app.server.closeAllConnections();
      }),
  );
  const root = `http://127.0.0.1:${app.server.address().port}`;
  const response = await fetch(`${root}/api/characters/${f.id}/dashboard`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.memory.count, 0);
  assert.equal(data.items.find((v) => v.id === "host").status, "unavailable");
  assert.equal(
    (await fetch(`${root}/api/characters/missing/dashboard`)).status,
    404,
  );
  assert.equal(
    (
      await fetch(`${root}/api/characters/${f.id}/dashboard`, {
        headers: { Origin: "https://invalid.test" },
      })
    ).status,
    403,
  );
});
