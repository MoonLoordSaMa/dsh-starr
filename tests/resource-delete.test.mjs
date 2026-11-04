import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { StarrStore } from "../src/starrcore/store.mjs";
import { Singing } from "../src/media/singing.mjs";
import { recycleAsset } from "../src/runtime/recycle.mjs";
import { createServer } from "../src/server.mjs";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCAIAAAAASUVORK5CYII=",
  "base64",
);
const wav = Buffer.alloc(44);
wav.write("RIFF");
wav.write("WAVE", 8);
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-delete-"));
  const store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "删除验收角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const other = store.createCharacter({ name: "隔离角色" });
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return {
    root,
    store,
    a: character.id,
    b: other.id,
    singing: new Singing(store),
  };
}

test("删除表情保存原图与关键词收藏元数据，跨角色隔离，重启后保持移除且可重新导入", (t) => {
  const f = fixture(t),
    asset = f.store.addExpression(f.a, png, "合成星星");
  f.store.updateExpression(f.a, asset.id, {
    tags: "星星、晚安",
    favorite: true,
  });
  const file = f.store.expressionFile(f.a, asset.id).file;
  assert.throws(() => f.store.removeExpression(f.b, asset.id), /不存在/);
  assert.equal(f.store.removeExpression(f.a, asset.id).recoverable, true);
  assert.equal(f.store.expressions(f.a).length, 0);
  assert.equal(fs.existsSync(file), false);
  const trash = path.join(f.store.expressionRoot(f.a), ".trash");
  assert.deepEqual(fs.readFileSync(path.join(trash, asset.id)), png);
  const metadata = JSON.parse(
    fs.readFileSync(path.join(trash, `${asset.id}.json`)),
  );
  assert.equal(metadata.tags, "星星、晚安");
  assert.equal(metadata.favorite, 1);
  assert.equal(metadata._recycle.missingOriginal, false);
  f.store.close();
  const reopened = new StarrStore(path.join(f.root, "runtime"));
  try {
    assert.equal(reopened.expressions(f.a).length, 0);
    assert.notEqual(reopened.addExpression(f.a, png, "再次导入").id, asset.id);
  } finally {
    reopened.close();
  }
});

test("缺失原图和音源可清理残留记录，不伪造文件可恢复；未知编号不删文件", (t) => {
  const f = fixture(t),
    asset = f.store.addExpression(f.a, png, "缺失图片");
  fs.unlinkSync(f.store.expressionFile(f.a, asset.id).file);
  assert.equal(f.store.removeExpression(f.a, asset.id).recoverable, false);
  const song = f.singing.import(f.a, wav, "缺失音频");
  fs.unlinkSync(f.singing.file(f.a, song.id).file);
  assert.equal(f.singing.remove(f.a, song.id).missingOriginal, true);
  assert.throws(() => f.store.removeExpression(f.a, "../outside"), /不存在/);
  assert.throws(() => f.singing.remove(f.a, "../outside"), /没有/);
});

test("回收元数据冲突、数据库失败及目录联接均保留原资源与外部文件", (t) => {
  const f = fixture(t),
    asset = f.store.addExpression(f.a, png, "保留图片");
  const root = f.store.expressionRoot(f.a),
    file = f.store.expressionFile(f.a, asset.id).file;
  assert.throws(
    () =>
      recycleAsset(root, asset, () => {
        throw Error("合成数据库失败");
      }),
    /数据库失败/,
  );
  assert.deepEqual(fs.readFileSync(file), png);
  const trash = path.join(root, ".trash"),
    metadata = path.join(trash, `${asset.id}.json`);
  assert.equal(fs.existsSync(metadata), false);
  fs.writeFileSync(metadata, "原有元数据");
  assert.throws(() => f.store.removeExpression(f.a, asset.id), /EEXIST/);
  assert.equal(fs.existsSync(file), true);
  fs.unlinkSync(metadata);
  fs.rmdirSync(trash);
  const external = path.join(f.root, "outside");
  fs.mkdirSync(external);
  fs.symlinkSync(
    external,
    trash,
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(() => f.store.removeExpression(f.a, asset.id), /回收目录/);
  assert.equal(f.store.expressions(f.a).length, 1);
  assert.deepEqual(fs.readdirSync(external), []);
  fs.unlinkSync(trash);
});

test("删除曲库音源同步移除来源索引并保留来源元数据，默认音色与进行中的转换受保护", (t) => {
  const f = fixture(t),
    song = f.singing.import(f.a, wav, "合成来源音频");
  f.singing.setOrigin(f.a, song.id, {
    platform: "netease",
    id: "12345",
    url: "https://music.163.com/song?id=12345",
  });
  f.store.configure(
    f.a,
    { "sing.referenceId": song.id },
    { revision: f.store.character(f.a).revision },
  );
  assert.throws(() => f.singing.remove(f.a, song.id), /默认参考/);
  f.store.configure(
    f.a,
    { "sing.referenceId": "" },
    { revision: f.store.character(f.a).revision },
  );
  f.singing.active.add(f.a);
  assert.throws(() => f.singing.remove(f.a, song.id), /转换进行中/);
  f.singing.active.clear();
  f.singing.remove(f.a, song.id);
  assert.equal(
    f.singing.db(f.a).prepare("SELECT count(*) AS n FROM song_origins").get().n,
    0,
  );
  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(f.singing.root(f.a), ".trash", `${song.id}.json`),
    ),
  );
  assert.equal(metadata.origins[0].source_id, "12345");
});

test("单独删除翻唱成品保留原音源和内部记录、阻止复用与跨角色删除，并可清理失败记录", (t) => {
  const f = fixture(t),
    song = f.singing.import(f.a, wav, "合成原音源");
  const db = f.singing.db(f.a),
    renderId = "render-delete-test";
  db.prepare("INSERT INTO song_renders VALUES(?,?,?,?,?,?,?,?)").run(
    renderId,
    song.id,
    song.id,
    "fingerprint",
    "done",
    null,
    wav.length,
    new Date().toISOString(),
  );
  fs.writeFileSync(path.join(f.singing.root(f.a), renderId), wav);
  assert.throws(() => f.singing.removeRender(f.b, renderId), /没有/);
  assert.equal(f.singing.removeRender(f.a, renderId).recoverable, true);
  assert.equal(f.singing.list(f.a).renders.length, 0);
  assert.equal(
    db.prepare("SELECT status FROM song_renders WHERE id=?").get(renderId)
      .status,
    "deleted",
  );
  assert.equal(fs.existsSync(f.singing.file(f.a, song.id).file), true);
  assert.throws(() => f.singing.file(f.a, renderId, true), /没有/);
  db.prepare("INSERT INTO song_renders VALUES(?,?,?,?,?,?,?,?)").run(
    "failed-record",
    song.id,
    song.id,
    "failed",
    "failed",
    "合成故障",
    null,
    new Date().toISOString(),
  );
  assert.equal(
    f.singing.removeRender(f.a, "failed-record").missingOriginal,
    true,
  );
});

test("管理员明确确认后可解除默认引用并删除，过期修订拒绝且保留音源", (t) => {
  const f = fixture(t),
    song = f.singing.import(f.a, wav, "默认参考音色");
  f.store.configure(
    f.a,
    { "sing.referenceId": song.id },
    { revision: f.store.character(f.a).revision },
  );
  const revision = f.store.character(f.a).revision;
  assert.throws(
    () =>
      f.singing.remove(f.a, song.id, {
        clearDefault: true,
        revision: revision - 1,
      }),
    /配置已更新/,
  );
  assert.equal(fs.existsSync(f.singing.file(f.a, song.id).file), true);
  const result = f.singing.remove(f.a, song.id, {
    clearDefault: true,
    revision,
  });
  assert.equal(result.defaultCleared, true);
  assert.equal(f.store.character(f.a).config["sing.referenceId"], "");
  assert.equal(f.singing.list(f.a).songs.length, 0);
});

test("临时文件清理失败仍释放转换状态与进程锁，后续可删除音源", async (t) => {
  const f = fixture(t);
  const singing = new Singing(f.store, {
    clip: async () => {
      const render = singing.list(f.a).renders[0];
      fs.mkdirSync(path.join(singing.root(f.a), `${render.id}.source.wav`));
      throw Error("合成裁剪失败");
    },
  });
  const song = singing.import(f.a, wav, "锁释放验收");
  f.store.configure(
    f.a,
    { "sing.mode": "soulx-managed" },
    { revision: f.store.character(f.a).revision },
  );
  await assert.rejects(() =>
    singing.convert(f.a, { sourceId: song.id, referenceId: song.id }),
  );
  assert.equal(singing.list(f.a).busy, false);
  assert.equal(
    fs.existsSync(path.join(f.store.dataRoot, `sing-${f.a}.lock`)),
    false,
  );
  assert.equal(singing.remove(f.a, song.id).status, "removed");
});

test("正式删除接口执行角色校验、拒绝跨站来源，删除后读取404", async (t) => {
  const f = fixture(t),
    app = createServer({ store: f.store, port: 0 });
  const address = await app.listen(),
    base = `http://127.0.0.1:${address.port}`;
  t.after(() => new Promise((resolve) => app.server.close(resolve)));
  const asset = f.store.addExpression(f.a, png, "接口验收"),
    song = f.singing.import(f.a, wav, "接口音频");
  const route = `/api/characters/${f.a}/expressions/${asset.id}`;
  assert.equal(
    (
      await fetch(base + route, {
        method: "DELETE",
        headers: { Origin: "https://evil.invalid" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(base + route.replace(f.a, f.b), { method: "DELETE" })).status,
    404,
  );
  assert.equal((await fetch(base + route, { method: "DELETE" })).status, 200);
  assert.equal((await fetch(base + route)).status, 404);
  assert.equal(
    (
      await fetch(
        `${base}/api/characters/${f.a}/media/songs/source/${song.id}`,
        { method: "DELETE" },
      )
    ).status,
    200,
  );
});
