import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { StarrStore, hash } from "../src/starrcore/store.mjs";
import { createTools } from "../src/host/tools.mjs";
import { createServer } from "../src/server.mjs";
import http from "node:http";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-test-")),
    store = new StarrStore(path.join(root, "runtime"));
  store.setup({
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
    name: "角色 A",
  });
  const a = store.listCharacters()[0].id,
    b = store.createCharacter({ name: "角色 B" }).id;
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, store, a, b };
}
test("重要记忆提交后可重开；重复事件幂等且不跨角色", (t) => {
  const { root, store, a, b } = fixture(t),
    input = {
      title: "约定",
      content: "周二一起整理知识库",
      kind: "promise",
      importance: 95,
      eventKey: "event-001",
    },
    r = store.saveMemory(a, input);
  assert.equal(store.saveMemory(a, input).id, r.id);
  assert.throws(
    () => store.saveMemory(a, { ...input, content: "其他正文" }),
    /其他内容/,
  );
  assert.equal(store.listMemory(a, { q: "知识库" }).length, 1);
  assert.equal(store.listMemory(b).length, 0);
  const independent = new DatabaseSync(
    path.join(root, "memory", a, ".starr", "memory.sqlite"),
    { readOnly: true },
  );
  assert.equal(
    independent.prepare("SELECT count(*) n FROM records").get().n,
    1,
  );
  assert.equal(
    independent.prepare("PRAGMA integrity_check").get().integrity_check,
    "ok",
  );
  independent.close();
  assert.ok(fs.existsSync(path.join(root, "memory", a, "notes", r.id + ".md")));
});
test("双链来自真实关联；拒绝连接其他角色的记录", (t) => {
  const { root, store, a, b } = fixture(t),
    x = store.saveMemory(a, {
      title: "人物",
      content: "对方喜欢夜晚",
      kind: "person",
    }),
    y = store.saveMemory(a, {
      title: "夜晚",
      content: "一起观星",
      kind: "moment",
    }),
    z = store.saveMemory(b, { title: "私密", content: "另一角色的内容" });
  assert.throws(
    () => store.link(a, { source: x.id, target: z.id }),
    /当前角色/,
  );
  store.link(a, { source: x.id, target: y.id });
  assert.equal(store.graph(a).links.length, 1);
  const note = fs.readFileSync(
    path.join(root, "memory", a, "notes", y.id + ".md"),
    "utf8",
  );
  assert.match(note, new RegExp(x.id));
  assert.match(note, /关联记忆/);
});
test("外部改过的笔记不会被投影覆盖；失败任务保留", (t) => {
  const { root, store, a } = fixture(t),
    x = store.saveMemory(a, { title: "原文", content: "正文" }),
    file = path.join(root, "memory", a, "notes", x.id + ".md");
  fs.appendFileSync(file, "\n用户补充");
  const y = store.saveMemory(a, { title: "新记忆", content: "另一个正文" });
  store.link(a, { source: x.id, target: y.id });
  assert.match(fs.readFileSync(file, "utf8"), /用户补充/);
  assert.equal(store.health(a).outbox[0].status, "failed");
});
test("角色配置有乐观锁，bot 无法扩大授权，可信上下文不能被输入覆盖", (t) => {
  const { store, a, b } = fixture(t),
    tools = createTools(store, { characterId: a }),
    c = store.character(a);
  assert.throws(
    () =>
      tools.starr_config_update({
        patch: { "permissions.botConfig": true },
        revision: c.revision,
      }),
    /授权/,
  );
  store.configure(
    a,
    { "permissions.botConfig": true },
    { revision: c.revision },
  );
  const next = store.character(a);
  tools.starr_config_update({
    patch: { "memory.recallLimit": 7 },
    revision: next.revision,
  });
  assert.equal(store.character(a).config["memory.recallLimit"], 7);
  assert.throws(
    () => store.configure(a, { "tts.voice": "a" }, { revision: 1 }),
    /重新加载/,
  );
  tools.starr_memory_write({
    characterId: b,
    title: "可信范围",
    content: "仍然写入 A",
  });
  assert.equal(store.listMemory(b).length, 0);
  assert.throws(
    () =>
      tools.starr_config_update({
        patch: { "media.baseUrl": "https://bad.invalid" },
        revision: store.character(a).revision,
      }),
    /授权/,
  );
});
test("备份带数据库、笔记和清单，恢复读取与哈希一致", async (t) => {
  const { store, a } = fixture(t);
  store.saveMemory(a, { title: "保存", content: "可恢复正文" });
  const result = await store.backup(a),
    manifest = JSON.parse(
      fs.readFileSync(path.join(result.path, "manifest.json"), "utf8"),
    );
  for (const file of manifest.files)
    assert.equal(
      hash(fs.readFileSync(path.join(result.path, file.path))),
      file.sha256,
    );
  const db = new DatabaseSync(path.join(result.path, "memory.sqlite"), {
    readOnly: true,
  });
  assert.equal(
    db.prepare("SELECT content FROM records").get().content,
    "可恢复正文",
  );
  db.close();
});

test("两个控制台交错修改时拒绝覆盖；配置与审计同一事务", (t) => {
  const { root, store, a } = fixture(t);
  const concurrent = new StarrStore(path.join(root, "runtime"));
  try {
    const original = store.character.bind(store);
    let raced = false;
    store.character = (characterId) => {
      const c = original(characterId);
      if (!raced) {
        raced = true;
        concurrent.configure(
          a,
          { "tts.voice": "较新配置" },
          { revision: c.revision },
        );
      }
      return c;
    };
    assert.throws(
      () => store.configure(a, { "tts.voice": "过期配置" }, { revision: 1 }),
      /重新加载/,
    );
    assert.equal(original(a).config["tts.voice"], "较新配置");
    assert.equal(
      store.db
        .prepare(
          "SELECT count(*) n FROM configuration_audit WHERE character_id=?",
        )
        .get(a).n,
      1,
    );
    raced = false;
    assert.throws(
      () =>
        store.updateCharacter(a, {
          name: "过期名称",
          persona: "",
          revision: original(a).revision,
        }),
      /刷新/,
    );
    assert.equal(original(a).name, "角色 A");
  } finally {
    concurrent.close();
  }
});

test("状态事件重试不重复改变状态；同编号异内容拒绝，未知键拒绝", (t) => {
  const { store, a } = fixture(t);
  const input = {
    revision: 1,
    eventKey: "state-event",
    values: { joy: 75, emotion: "期待", evidence: "测试来源" },
  };
  const result = store.updateState(a, input);
  assert.equal(result.revision, 2);
  store.updateState(a, { revision: 2, values: { energy: 40 } });
  const retry = store.updateState(a, input);
  assert.equal(retry.revision, 2);
  assert.equal(retry.duplicate, true);
  assert.equal(store.getState(a).energy, 40);
  assert.equal(store.stateHistory(a).length, 2);
  assert.throws(
    () => store.updateState(a, { ...input, values: { joy: 76 } }),
    /其他内容/,
  );
  assert.throws(
    () => store.updateState(a, { revision: 3, values: { constructor: 12 } }),
    /未知的状态维度/,
  );
});
test("表情资源导入去重、收藏与关键词持久化；原图缺失不清空库", (t) => {
  const { store, a, b } = fixture(t),
    bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCAIAAAAASUVORK5CYII=",
      "base64",
    ),
    asset = store.addExpression(a, bytes, "验收星星.png");
  assert.equal(store.addExpression(a, bytes, "重复图片").id, asset.id);
  store.updateExpression(a, asset.id, { favorite: true, tags: "星星、平静" });
  assert.equal(store.expressions(a)[0].favorite, 1);
  assert.equal(store.expressions(a)[0].tags, "星星、平静");
  assert.equal(store.expressions(b).length, 0);
  const file = store.expressionFile(a, asset.id).file;
  fs.renameSync(file, file + ".missing");
  assert.throws(() => store.expressionFile(a, asset.id), /原文件缺失/);
  assert.equal(store.expressions(a).length, 1);
});
test("首次目录拒绝重叠与已有数据，未配置状态不谎报成功", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-path-")),
    store = new StarrStore(path.join(root, "runtime"));
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.throws(
    () =>
      store.setup({
        name: "a",
        memoryRoot: path.join(root, "m"),
        backupRoot: path.join(root, "m", "b"),
      }),
    /重叠/,
  );
  fs.mkdirSync(path.join(root, "old"));
  fs.writeFileSync(path.join(root, "old", "existing"), "keep");
  assert.throws(
    () =>
      store.setup({
        name: "a",
        memoryRoot: path.join(root, "old"),
        backupRoot: path.join(root, "b"),
      }),
    /空的新目录/,
  );
  assert.equal(store.installation(), null);
});
test("本机 API 拒绝跨站来源和伪造 Host，未知接口返回 404", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-http-")),
    app = createServer({ dataRoot: root, port: 0 }),
    address = await app.listen(),
    base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await new Promise((r) => app.server.close(r));
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal((await fetch(base + "/api/bootstrap")).status, 200);
  assert.equal(
    (
      await fetch(base + "/api/bootstrap", {
        headers: { Origin: "https://evil.invalid" },
      })
    ).status,
    403,
  );
  const forged = await new Promise((resolve, reject) => {
    http
      .get(
        base + "/api/bootstrap",
        { headers: { Host: "evil.invalid" } },
        (r) => {
          r.resume();
          resolve(r.statusCode);
        },
      )
      .on("error", reject);
  });
  assert.equal(forged, 403);
  assert.equal((await fetch(base + "/api/missing")).status, 404);
});
