import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { StarrStore } from "../src/starrcore/store.mjs";
import { MemoryMaintenance } from "../src/starrcore/maintenance.mjs";
import { readableNotePath, relativePath } from "../src/starrcore/vault.mjs";
import { createServer } from "../src/server.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-vault-")),
    store = new StarrStore(path.join(root, "runtime"));
  store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "记忆库"),
    backupRoot: path.join(root, "备份"),
  });
  const a = store.listCharacters()[0].id;
  const installation = store.installation();
  store.db.prepare("UPDATE installation SET data=? WHERE id=1").run(
    JSON.stringify({
      ...installation,
      vaultLayout: { format: 2, characters: { [a]: "01-合成角色" } },
    }),
  );
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, store, a };
}
test("可读笔记路径保留稳定编号，重名可区分、外部正文不覆盖、跨角色隔离", (t) => {
  const { store, a } = fixture(t),
    input = {
      title: "星光 / 约定：今晚",
      content: "完整正文\n第二行",
      kind: "promise",
    };
  const first = store.saveMemory(a, input),
    second = store.saveMemory(a, { ...input, content: "另一段正文" });
  const file = store.noteFile(a, first);
  assert.match(file, /01-合成角色.*记忆笔记.*03-约定/);
  assert.notEqual(file, store.noteFile(a, second));
  assert.ok(fs.existsSync(file));
  assert.match(
    fs.readFileSync(file, "utf8"),
    new RegExp(`starr_id: ${first.id}`),
  );
  const b = store.createCharacter({ name: "另一个角色" }).id;
  assert.match(store.characterRoot(b), /02-另一个角色-/);
  assert.throws(() => store.noteFile(b, first.id), /不存在/);
  fs.appendFileSync(file, "\n外部修改");
  new MemoryMaintenance(store).resync(a);
  assert.match(fs.readFileSync(file, "utf8"), /外部修改/);
  assert.ok(store.health(a).outbox.length);
  assert.throws(() => relativePath("../另一个角色/记忆.md"), /映射无效/);
  assert.throws(() => relativePath("C:/其他目录"), /映射无效/);
  assert.match(readableNotePath({ ...first, title: "CON" }), /未命名/);
});
test("可读双链与旧编号均能解析，外部导入保留全文并更新双链，备份可以读取", async (t) => {
  const { store, a } = fixture(t),
    first = store.saveMemory(a, { title: "观星", content: "原始全文" }),
    second = store.saveMemory(a, {
      title: "约定",
      content: "约定全文",
      kind: "promise",
    });
  store.link(a, { source: first.id, target: second.id });
  const file = store.noteFile(a, first),
    raw = fs.readFileSync(file, "utf8"),
    target = store.noteLink(a, second);
  assert.ok(raw.includes(`[[${target}|`));
  assert.equal(store.noteIdFromLink(a, target), second.id);
  assert.equal(store.noteIdFromLink(a, second.id), second.id);
  assert.equal(store.noteIdFromLink(a, "../../未知笔记"), null);
  fs.writeFileSync(file, raw.replace("原始全文", "完整的新正文\n第二段"));
  const maintenance = new MemoryMaintenance(store),
    preview = maintenance.external(a, first.id);
  assert.ok(preview.links.includes(second.id));
  maintenance.importExternal(a, {
    id: first.id,
    revision: preview.revision,
    fileHash: preview.fileHash,
  });
  assert.equal(
    store
      .memory(a)
      .prepare("SELECT content FROM records WHERE id=?")
      .get(first.id).content,
    "完整的新正文\n第二段",
  );
  assert.equal(store.noteFile(a, first), file);
  const backup = await store.backup(a);
  assert.match(backup.path, /01-合成角色/);
  assert.ok(fs.existsSync(path.join(backup.path, "vault-layout.json")));
  assert.ok(
    fs.existsSync(
      path.join(backup.path, "notes", path.relative(store.notesRoot(a), file)),
    ),
  );
});
test("健康接口区分独立、宿主已连接与宿主来源未就绪，不能用函数存在性冒充连接", async (t) => {
  const { store, a } = fixture(t);
  for (const scenario of [
    { connected: false },
    { hostOrigin: () => undefined, connected: false },
    { connected: true },
  ]) {
    let app;
    const options = { store, port: 0 };
    if (scenario.connected)
      options.hostOrigin = () =>
        `http://127.0.0.1:${app.server.address().port}`;
    else if (scenario.hostOrigin) options.hostOrigin = scenario.hostOrigin;
    app = createServer(options);
    await app.listen();
    const base = `http://127.0.0.1:${app.server.address().port}`;
    try {
      const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json(),
        health = await (
          await fetch(`${base}/api/characters/${a}/health`)
        ).json();
      assert.equal(bootstrap.host.connected, scenario.connected);
      assert.equal(health.host.connected, scenario.connected);
      assert.equal(
        health.host.status,
        scenario.connected
          ? "connected"
          : scenario.hostOrigin
            ? "unavailable"
            : "standalone",
      );
    } finally {
      app.server.closeAllConnections();
      await new Promise((resolve) => app.server.close(resolve));
    }
  }
});
