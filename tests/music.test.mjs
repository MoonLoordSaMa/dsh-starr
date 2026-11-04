import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { StarrStore } from "../src/starrcore/store.mjs";
import { Singing } from "../src/media/singing.mjs";
import { MusicCatalog } from "../src/media/music.mjs";
import { neteaseClient, downloadNeteaseMedia } from "../src/media/netease.mjs";
import { createTools } from "../src/host/tools.mjs";
import { mountMediaServices } from "../src/runtime/media-services.mjs";
import { createQQCapabilities } from "../src/qq/capabilities.mjs";
import { agencyToolAllowed } from "../src/host/agency-driver.mjs";
import { createServer } from "../src/server.mjs";
import { selectBiliMediaUrl } from "../src/bili/api.mjs";

test("B站优先取标准CDN备用地址，主地址为P2P或特殊端口不再阻断音源", () => {
  const fallback = "https://cn-test.bilivideo.com/upgcxcode/test.m4s";
  assert.equal(
    selectBiliMediaUrl("https://xy123.mcdn.bilivideo.cn:8082/a", [fallback]),
    fallback,
  );
  assert.equal(
    selectBiliMediaUrl("https://untrusted.edge.mountaintoys.cn:4483/a", [
      fallback,
    ]),
    fallback,
  );
  assert.equal(
    selectBiliMediaUrl(fallback, ["https://evil.invalid/a"]),
    fallback,
  );
  assert.throws(
    () =>
      selectBiliMediaUrl("https://evil.invalid/a", [
        "https://cdn.bilivideo.com:8082/a",
      ]),
    /标准CDN/,
  );
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-music-")),
    store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成音乐角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backups"),
  });
  const id = character.id,
    second = store.createCharacter({ name: "另一个角色" }).id;
  const configure = (patch) =>
    store.configure(id, patch, { revision: store.character(id).revision });
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, store, id, second, configure };
}
function wav() {
  const b = Buffer.alloc(44 + 1600);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(1600, 40);
  return b;
}
const remote = {
  search: async () => [
    {
      platform: "netease",
      id: "123",
      title: "星光小夜曲",
      artists: ["合成歌手"],
      url: "https://music.163.com/#/song?id=123",
    },
  ],
  audio: async (id) => ({
    id: String(id),
    title: "星光小夜曲",
    artists: ["合成歌手"],
    url: "https://m801.music.126.net/test.mp3",
  }),
};

test("网易云公开检索规范化真实字段；音源必须匹配编号、排除试听与受限结果", async () => {
  const calls = [];
  const client = neteaseClient({
    request: async (url, options) => {
      calls.push({ url: String(url), body: Object.fromEntries(options.body) });
      if (String(url).endsWith("/api/search/get"))
        return Response.json({
          code: 200,
          result: {
            songs: [
              {
                id: 123,
                name: "星光",
                artists: [{ name: "歌手" }],
                duration: 123000,
                album: { name: "专辑" },
              },
              { id: 0, name: "无效编号" },
            ],
          },
        });
      if (String(url).endsWith("/api/song/detail/"))
        return Response.json({
          code: 200,
          songs: [{ id: 123, name: "星光", artists: [{ name: "歌手" }] }],
        });
      return Response.json({
        code: 200,
        data: [
          { id: 123, code: 200, url: "http://m801.music.126.net/test.mp3" },
        ],
      });
    },
  });
  const rows = await client.search("星光", { limit: 3 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].duration, 123);
  assert.deepEqual(rows[0].artists, ["歌手"]);
  assert.equal(calls[0].body.limit, "3");
  const audio = await client.audio("123");
  assert.equal(audio.url, "https://m801.music.126.net/test.mp3");
  assert.equal(audio.title, "星光");
  for (const data of [
    [{ id: 123, code: 404, url: null }],
    [
      {
        id: 123,
        code: 200,
        url: "https://m801.music.126.net/test.mp3",
        freeTrialInfo: { start: 0, end: 30 },
      },
    ],
    [{ id: 999, code: 200, url: "https://m801.music.126.net/test.mp3" }],
  ])
    await assert.rejects(
      () =>
        neteaseClient({
          request: async () => Response.json({ code: 200, data }),
        }).audio("123"),
      /音源|试听/,
    );
  await assert.rejects(() => client.audio("123&ids=999"), /编号无效/);
});

test("网易云媒体只允许资源域名与公网解析，拒绝重定向、过大内容和伪协议", async () => {
  let calls = 0;
  const request = async (_url, options) => {
    calls++;
    assert.equal(options.redirect, "error");
    return new Response(Buffer.from("12345"));
  };
  for (const url of [
    "https://127.0.0.1/a",
    "https://evil.test/music.126.net/a",
    "file:///a",
    "https://m801.music.126.net:444/a",
  ])
    await assert.rejects(() => downloadNeteaseMedia(url, { request }), /域名/);
  await assert.rejects(
    () =>
      downloadNeteaseMedia("https://m801.music.126.net/a", {
        lookup: async () => [{ address: "127.0.0.1" }],
        request,
      }),
    /网络/,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    () =>
      downloadNeteaseMedia("https://m801.music.126.net/a", {
        lookup: async () => [{ address: "1.1.1.1" }],
        request,
        maxBytes: 4,
      }),
    /上限/,
  );
  assert.equal(calls, 1);
});

test("QQ会话统一音乐检索保留其他平台结果，B站读取与网络入库不相互冒充", async (t) => {
  const f = fixture(t),
    singing = new Singing(f.store),
    music = new MusicCatalog(f.store, {
      singing,
      netease: remote,
      bili: {
        operations: {
          read: async () => {
            throw new Error("B站登录失效");
          },
        },
      },
    });
  t.after(() => {
    music.close();
    singing.close();
  });
  singing.import(f.id, wav(), "星光 本角色");
  singing.import(f.second, wav(), "星光 他人私密音源");
  f.store.conversations.ensure({
    sessionId: "qq-music",
    characterId: f.id,
    platform: "qq",
    type: "private",
    target: "10001",
  });
  const remove = mountMediaServices(f.store, { singing, music });
  t.after(remove);
  const tools = createTools(f.store, {
    characterId: f.id,
    sessionId: "qq-music",
  });
  let result = await tools.starr_song_search({ q: "星光" });
  assert.equal(result.results.length, 2);
  assert.ok(
    result.sources.find((s) => s.platform === "bili").detail.includes("未授权"),
  );
  assert.equal(result.workflow.canImport, false);
  assert.equal(JSON.stringify(result).includes("他人私密"), false);
  await assert.rejects(
    () => tools.starr_song_source({ platform: "netease", id: "123" }),
    /尚未允许角色保存/,
  );
  f.configure({ "bili.actions.allowBot": true });
  result = await tools.starr_song_search({ q: "星光" });
  assert.equal(
    result.sources.find((s) => s.platform === "bili").detail,
    "B站登录失效",
  );
  assert.equal(result.results.length, 2);
  f.configure({ "sing.search.netease": false });
  result = await tools.starr_song_search({ q: "星光" });
  assert.equal(result.results.length, 1);
  assert.ok(
    result.sources
      .find((s) => s.platform === "netease")
      .detail.includes("停用"),
  );
  assert.equal(agencyToolAllowed("starr_song_search", "owner"), false);
  assert.equal(agencyToolAllowed("starr_song_search", "browse"), true);
});

test("网络音源入库保存来源、去重与角色隔离，重开后仍能由编号解析到角色目录", async (t) => {
  const f = fixture(t),
    singing = new Singing(f.store),
    music = new MusicCatalog(f.store, {
      singing,
      netease: remote,
      download: async () => wav(),
      clip: async (_c, b, options) => {
        assert.equal(options.seconds, 45);
        return b;
      },
    });
  t.after(() => {
    music.close();
    singing.close();
  });
  f.configure({ "sing.source.allowBot": true });
  const song = await music.source(
    f.id,
    { platform: "netease", id: "123" },
    { bot: true },
  );
  assert.equal(song.sourceId, song.id);
  assert.equal(song.title.includes("合成歌手"), true);
  assert.equal(fs.existsSync(singing.file(f.id, song.id).file), true);
  assert.throws(() => singing.file(f.second, song.id), /当前角色没有/);
  const duplicate = await music.source(
    f.id,
    { platform: "netease", id: "123" },
    { bot: true },
  );
  assert.equal(duplicate.id, song.id);
  assert.equal(singing.list(f.id).songs.length, 1);
  const reopened = new StarrStore(f.store.dataRoot);
  try {
    const library = new Singing(reopened).list(f.id);
    assert.equal(library.songs[0].platforms, "netease");
    assert.equal(
      library.songs[0].source_url,
      "https://music.163.com/#/song?id=123",
    );
  } finally {
    reopened.close();
  }
});

test("取音源期间撤权或停止不会保存音频，入库锁可释放后重试", async (t) => {
  const f = fixture(t),
    singing = new Singing(f.store);
  f.configure({ "sing.source.allowBot": true });
  let unblock;
  const blocked = new Promise((r) => (unblock = r));
  const music = new MusicCatalog(f.store, {
    singing,
    netease: remote,
    download: async () => {
      await blocked;
      return wav();
    },
    clip: async (_c, b) => b,
  });
  t.after(() => {
    music.close();
    singing.close();
  });
  const pending = music.source(
    f.id,
    { platform: "netease", id: "123" },
    { bot: true },
  );
  await new Promise((r) => setImmediate(r));
  f.configure({ "sing.source.allowBot": false });
  unblock();
  await assert.rejects(() => pending, /尚未允许/);
  assert.equal(singing.list(f.id).songs.length, 0);
  f.configure({ "sing.source.allowBot": true });
  const saved = await music.source(
    f.id,
    { platform: "netease", id: "123" },
    { bot: true },
  );
  assert.ok(saved.id);
  music.close();
  await assert.rejects(
    () => music.source(f.id, { platform: "netease", id: "123" }, { bot: true }),
    /已停止/,
  );
});

test("B站旧bvid调用与新统一入库兼容，QQ侧无需创建另一个平台会话", async (t) => {
  const f = fixture(t),
    singing = new Singing(f.store);
  f.configure({ "sing.source.allowBot": true, "bili.actions.allowBot": true });
  let captured;
  const music = new MusicCatalog(f.store, {
    singing,
    bili: {
      songSource: async (id, input, library, signal, options) => {
        captured = { id, input, options };
        return library.import(id, wav(), "B站星光");
      },
    },
  });
  t.after(() => {
    music.close();
    singing.close();
  });
  const result = await music.source(
    f.id,
    { bvid: "BV1d4411N7zD" },
    { bot: true },
  );
  assert.equal(result.platform, "bili");
  assert.equal(captured.id, f.id);
  assert.equal(captured.input.bvid, "BV1d4411N7zD");
  assert.equal(captured.options.bot, true);
});

test("QQ完整点歌链：检索、实际入库目录、托管SVC协议转换、音频回执", async (t) => {
  const f = fixture(t),
    singing = new Singing(f.store),
    music = new MusicCatalog(f.store, {
      singing,
      netease: remote,
      download: async () => wav(),
    });
  t.after(() => {
    music.close();
    singing.close();
  });
  const reference = singing.import(f.id, wav(), "合成参考音色");
  f.configure({
    "sing.source.allowBot": true,
    "sing.allowBot": true,
    "chat.tools.singing": true,
    "sing.mode": "soulx-managed",
    "sing.referenceId": reference.id,
  });
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks));
    assert.equal(req.url, "/convert");
    assert.ok(body.target.startsWith(singing.root(f.id)));
    assert.ok(fs.existsSync(body.prompt));
    assert.ok(fs.existsSync(body.target));
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, wav: wav().toString("base64") }));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const engines = {
    withEngine: async (id, kind, request) => {
      assert.equal(id, f.id);
      assert.equal(kind, "sing");
      return request(`http://127.0.0.1:${server.address().port}`);
    },
  };
  f.store.singing = singing;
  f.store.localMedia = engines;
  const remove = mountMediaServices(f.store, {
    singing,
    music,
    localMedia: engines,
  });
  t.after(remove);
  f.store.conversations.ensure({
    sessionId: "qq-song-chain",
    characterId: f.id,
    platform: "qq",
    type: "private",
    target: "10001",
  });
  const tools = createTools(f.store, {
      characterId: f.id,
      sessionId: "qq-song-chain",
    }),
    result = await tools.starr_song_search({ q: "星光", platform: "netease" });
  const source = await tools.starr_song_source({
    platform: result.results[0].platform,
    id: result.results[0].id,
  });
  let sends = 0;
  const cap = createQQCapabilities({
    store: f.store,
    characterId: f.id,
    signal: new AbortController().signal,
    send: async (message) => {
      sends++;
      assert.equal(message[0].type, "record");
      assert.ok(message[0].data.file.startsWith("base64://UklGR"));
      return { status: "sent", messageId: "synthetic-only" };
    },
  });
  const receipt = await cap.sing({ sourceId: source.sourceId });
  assert.equal(receipt.status, "sent");
  assert.equal(sends, 1);
  assert.equal(singing.list(f.id).renders[0].status, "done");
});

test("网页曲库检索复用同一服务，管理员可入库但不自动开启bot权限", async (t) => {
  const f = fixture(t),
    singing = new Singing(f.store),
    music = new MusicCatalog(f.store, {
      singing,
      netease: remote,
      download: async () => wav(),
      clip: async (_c, b) => b,
    });
  t.after(() => {
    music.close();
    singing.close();
  });
  const app = createServer({
    store: f.store,
    port: 0,
    onboardingHost: { music },
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((resolve) => app.server.close(resolve)));
  const base = `http://127.0.0.1:${app.server.address().port}/api/characters/${f.id}/media/songs`;
  const search = await fetch(base + "/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: "星光", platform: "netease" }),
  });
  assert.equal(search.status, 200);
  assert.equal((await search.json()).results[0].id, "123");
  const imported = await fetch(base + "/source", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform: "netease", id: "123" }),
  });
  assert.equal(imported.status, 201);
  assert.ok((await imported.json()).sourceId);
  assert.equal(f.store.character(f.id).config["sing.source.allowBot"], false);
});
