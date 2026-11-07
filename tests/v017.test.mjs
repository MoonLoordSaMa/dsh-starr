import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { StarrStore } from "../src/starrcore/store.mjs";
import { VisionCapture } from "../src/media/vision.mjs";
import { MediaWorkbench } from "../src/media/workbench.mjs";
import { audioClip, runProcess, ffmpegPath } from "../src/media/process.mjs";
import { speak, hear } from "../src/media/compatible.mjs";
import { socialCapabilities } from "../src/qq/social.mjs";
import { BiliService } from "../src/bili/service.mjs";
import { readableNotePath } from "../src/starrcore/vault.mjs";
import { createTools } from "../src/host/tools.mjs";
import { Singing } from "../src/media/singing.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-v017-")),
    store = new StarrStore(path.join(root, "runtime"));
  store.localModelLeaseRoot = store.dataRoot;
  store.setup({
    name: "初始角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const id = store.createCharacter({ name: "合成角色" }).id;
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const configure = (patch) =>
    store.configure(id, patch, { revision: store.character(id).revision });
  const session = (name, platform = "qq") =>
    store.conversations.ensure({
      sessionId: name,
      characterId: id,
      platform,
      type: platform === "qq" ? "private" : "dm",
      account: "10001",
      target: "20002",
    });
  return { root, store, id, configure, session };
}
function wav(seconds, rate = 8000) {
  const b = Buffer.alloc(44 + seconds * rate * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(b.length - 44, 40);
  return b;
}
function duration(b) {
  let rate = 0;
  for (let n = 12; n + 8 <= b.length;) {
    const name = b.toString("ascii", n, n + 4),
      size = b.readUInt32LE(n + 4);
    if (name === "fmt ") rate = b.readUInt32LE(n + 16);
    if (name === "data") return Math.min(size, b.length - n - 8) / rate;
    n += 8 + size + (size % 2);
  }
  throw Error("没有音频数据");
}
test("视觉采集按管理员权限拒绝，关键帧附真实时间，停止后不残留采集", async (t) => {
  const f = fixture(t);
  let stopped = 0,
    interpreted;
  const vision = new VisionCapture(f.store, {
    capture: ({ onFrame }) => {
      const run = {
        stop: () => {
          stopped++;
        },
        done: new Promise((resolve) =>
          setImmediate(() => {
            for (let i = 0; i <= 12; i++)
              onFrame({ t: i / 4, buf: Buffer.alloc(640 * 360 * 3, i * 19) });
            resolve({});
          }),
        ),
      };
      return run;
    },
    understand: async (_c, input) => {
      interpreted = input;
      return { answer: "合成关键帧" };
    },
  });
  t.after(() => vision.close());
  await assert.rejects(() => vision.inspect(f.id), /管理员/);
  f.configure({
    "vision.screen.enabled": true,
    "vision.model": "mock-vision",
    "vision.connection": "shared",
  });
  const result = await vision.inspect(f.id);
  assert.equal(result.visualVerified, true);
  assert.equal(result.completeVideo, false);
  assert.equal(result.audioVerified, false);
  assert.ok(result.sampled.frames.length > 0);
  assert.ok(
    result.sampled.frames.every(
      (frame) => frame.seconds >= 0 && frame.seconds <= 3,
    ),
  );
  assert.match(interpreted.image, /^data:image\/png;base64,/);
  assert.match(interpreted.prompt, /不能声称看过完整视频/);
  assert.ok(stopped);
  assert.equal(vision.active.size, 0);
  await assert.rejects(
    () => vision.inspect(f.id, { source: { kind: "camera" } }),
    /管理员/,
  );
  await assert.rejects(() => vision.inspect(f.id, { seconds: 13 }), /12秒/);
  vision.close();
  await assert.rejects(() => vision.inspect(f.id), /关闭/);
});
test("一键共享覆盖500条以外，QQ与B站同库检索；可撤销、跨角色不可读", (t) => {
  const f = fixture(t);
  f.session("qq");
  f.session("bili", "bili");
  f.configure({ "memory.projectionEnabled": false });
  for (let n = 0; n < 505; n++)
    f.store.saveMemory(
      f.id,
      { title: `视频见闻${n}`, content: `星际尘埃${n}` },
      { sessionId: "bili", visibility: "conversation" },
    );
  assert.equal(
    f.store.conversations.visibleMemories("qq", { q: "星际尘埃504" }).length,
    0,
  );
  const batch = f.store.shareAllMemories(f.id);
  assert.equal(batch.count, 505);
  const record = f.store.conversations.visibleMemories("qq", {
    q: "星际尘埃504",
  })[0];
  assert.ok(record);
  assert.equal(record.importance, 50);
  f.store.shareAllMemories(f.id, { restoreBatch: batch.batchId });
  assert.equal(
    f.store.conversations.visibleMemories("qq", { q: "星际尘埃504" }).length,
    0,
  );
  assert.ok(
    f.store.conversations.visibleMemories("bili", { q: "星际尘埃504" }).length,
  );
  const other = f.store.createCharacter({ name: "其他" }).id;
  assert.throws(
    () => f.store.shareAllMemories(other, { restoreBatch: batch.batchId }),
    /不存在/,
  );
  f.configure({ "memory.defaultVisibility": "shared" });
  const fresh = createTools(f.store, {
    characterId: f.id,
    sessionId: "bili",
  }).starr_memory_write({ title: "新见闻", content: "共享新事" });
  assert.equal(
    f.store.conversations.visibleMemories("qq", { id: fresh.id }).length,
    1,
  );
});

test("共享后资料另被修改时拒绝整批撤销，不覆盖新的共享决定", (t) => {
  const f = fixture(t);
  const row = f.store.saveMemory(f.id, {
    title: "待共享",
    content: "真实资料",
  });
  const batch = f.store.shareAllMemories(f.id);
  const revision = f.store
    .memory(f.id)
    .prepare("SELECT revision FROM records WHERE id=?")
    .get(row.id).revision;
  f.store.setMemoryVisibility(f.id, row.id, {
    revision,
    visibility: "unclassified",
  });
  assert.throws(
    () => f.store.shareAllMemories(f.id, { restoreBatch: batch.batchId }),
    /变化|修改|调整|撤销/,
  );
  assert.equal(
    f.store
      .memory(f.id)
      .prepare("SELECT visibility FROM record_visibility WHERE record_id=?")
      .get(row.id).visibility,
    "unclassified",
  );
});

test("采集途中撤销屏幕授权时不再把画面提交给模型", async (t) => {
  const f = fixture(t);
  f.configure({
    "vision.screen.enabled": true,
    "vision.model": "mock",
    "vision.connection": "shared",
  });
  let calls = 0;
  const vision = new VisionCapture(f.store, {
    capture: ({ onFrame }) => ({
      stop() {},
      done: new Promise((resolve) =>
        setImmediate(() => {
          for (let i = 0; i < 12; i++)
            onFrame({ t: i / 4, buf: Buffer.alloc(640 * 360 * 3, i * 19) });
          f.configure({ "vision.screen.enabled": false });
          resolve();
        }),
      ),
    }),
    understand: async () => {
      calls++;
      return { answer: "不应调用" };
    },
  });
  t.after(() => vision.close());
  await assert.rejects(() => vision.inspect(f.id), /关闭此画面来源/);
  assert.equal(calls, 0);
  assert.equal(vision.active.size, 0);
});

test("实际短视频正常读到结尾可生成关键帧拼图，不误报屏幕掉线", async (t) => {
  const f = fixture(t),
    file = path.join(f.root, "短视频.mp4");
  f.configure({
    "vision.model": "synthetic-vision",
    "vision.connection": "shared",
  });
  await runProcess(ffmpegPath(), [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=duration=2:size=640x360:rate=4",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    file,
  ]);
  const vision = new VisionCapture(f.store, {
    understand: async () => ({ answer: "仅验证采集与拼图" }),
  });
  t.after(() => vision.close());
  const result = await vision.inspect(f.id, {
    source: { kind: "file", path: file },
    seconds: 3,
  });
  assert.ok(result.sampled.frames.length);
  assert.ok(result.sampled.frames.every((frame) => frame.seconds < 2));
  assert.equal(result.completeVideo, false);
});

test("QQ空间没有编号的回执保持待核对，同批不可再次外发", async (t) => {
  const f = fixture(t);
  f.session("qq");
  f.store.db.exec("CREATE TABLE qq_send_parts(id TEXT,batch_id TEXT)");
  f.configure({ "chat.tools.qzone": true });
  let posted = 0;
  const social = socialCapabilities({
    store: f.store,
    characterId: f.id,
    thread: { session_id: "qq", type: "private", target: "20002" },
    messages: [{ userId: "20002" }],
    batchId: "unknown-receipt",
    signal: new AbortController().signal,
    action: async (kind) => {
      if (kind === "get_version_info") return { app_name: "SnowLuma" };
      posted++;
      return {};
    },
  });
  await assert.rejects(() => social.qzone({ text: "合成说说" }), /人工核对/);
  assert.equal(
    f.store.db
      .prepare("SELECT status FROM qq_social_log WHERE kind='qzone'")
      .get().status,
    "uncertain",
  );
  await assert.rejects(
    () => social.qzone({ text: "合成说说" }),
    /已执行|待核对/,
  );
  assert.equal(posted, 1);
});
test("自由笔记兼容旧类别和自然标题，日记日期与目录保持", (t) => {
  const f = fixture(t),
    base = {
      id: "memory-test",
      title: "2026-11-04 夜记",
      created: "2026-11-04T00:00:00Z",
      kind: "diary",
    };
  assert.match(readableNotePath(base), /^05-日记\/2026-11-04 夜记/);
  assert.match(
    readableNotePath({ ...base, kind: "self", title: "我是谁" }),
    /^笔记\//,
  );
  for (const kind of [
    "person",
    "promise",
    "interest",
    "summary",
    "self",
    "moment",
  ]) {
    assert.equal(
      f.store.saveMemory(f.id, {
        kind,
        title: "自由的理解 " + kind,
        content: "不按周期凑流水",
      }).kind,
      "moment",
    );
  }
});

test("系统加密媒体密钥不落明文、角色隔离；bot不能修改凭据和新增授权", async (t) => {
  const f = fixture(t),
    bench = new MediaWorkbench(f.store);
  if (process.platform !== "win32") return t.skip("当前系统使用环境变量");
  await bench.secret(f.id, "tts").save("synthetic-media-secret");
  const c = { ...f.store.character(f.id).config, "tts.connection": "custom" };
  assert.equal(await bench.key(f.id, "tts", c), "synthetic-media-secret");
  assert.equal(
    fs
      .readFileSync(bench.secret(f.id, "tts").file)
      .includes(Buffer.from("synthetic-media-secret")),
    false,
  );
  const other = f.store.createCharacter({ name: "其他角色" }).id;
  assert.equal(await bench.key(other, "tts", c), "");
  f.configure({ "permissions.botConfig": true });
  const tools = createTools(f.store, { characterId: f.id });
  for (const key of [
    "chat.tools.qzone",
    "vision.screen.enabled",
    "tts.local.bin",
    "media.secretEnv",
    "memory.defaultVisibility",
  ])
    assert.throws(
      () =>
        tools.starr_config_update({
          patch: { [key]: true },
          revision: f.store.character(f.id).revision,
        }),
      /权限|允许|授权|修改|字段/,
    );
  bench.secret(f.id, "tts").clear();
  assert.equal(bench.secret(f.id, "tts").status().saved, false);
});
test("免费ASR默认选择本地，停用与缺少环境不会伪装成转写成功", async (t) => {
  const f = fixture(t),
    calls = [];
  const config = f.store.character(f.id).config;
  const result = await hear(config, wav(1), "audio/wav", {
    characterId: f.id,
    secrets: {
      hearLocal: (...args) => {
        calls.push(args);
        return { text: "本地转写" };
      },
    },
  });
  assert.equal(result.text, "本地转写");
  assert.equal(calls[0][0], f.id);
  const bench = new MediaWorkbench(f.store);
  await assert.rejects(
    () => bench.hearLocal(f.id, wav(1), "audio/wav"),
    /准备免费听写/,
  );
  await assert.rejects(
    () =>
      hear(
        { ...config, "asr.connection": "disabled", "asr.model": "x" },
        wav(1),
      ),
    /停用/,
  );
});
test("Breeze参考音色需持久化回执；语气传入生成服务，云端不假装训练", async (t) => {
  const f = fixture(t);
  let body;
  const server = http.createServer(async (req, res) => {
    const data = [];
    for await (const b of req) data.push(b);
    body = Buffer.concat(data).toString();
    if (req.url === "/v1/voices")
      return res.end(
        JSON.stringify({ id: "synthetic", saved: true, seconds: 5 }),
      );
    res.end(wav(1));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const bench = new MediaWorkbench(f.store, {
    engines: {
      withEngine: (_id, _kind, run) =>
        run(
          `http://127.0.0.1:${server.address().port}`,
          new AbortController().signal,
        ),
    },
  });
  const input = {
    name: "synthetic",
    transcript: "准确原文",
    base64: wav(5).toString("base64"),
  };
  await assert.rejects(() => bench.registerVoice(f.id, input), /仅支持本地/);
  f.configure({ "tts.connection": "breeze-local" });
  assert.equal((await bench.registerVoice(f.id, input)).saved, true);
  assert.equal(f.store.character(f.id).config["tts.voice"], "synthetic");
  assert.match(body, /ref_text/);
  await speak(
    {
      ...f.store.character(f.id).config,
      "tts.connection": "custom",
      "tts.baseUrl": `http://127.0.0.1:${server.address().port}/v1`,
      "tts.model": "mock",
      "tts.responseFormat": "wav",
    },
    "你好",
    { emotion: "轻快" },
  );
  assert.match(JSON.parse(body).instructions, /轻快/);
});
test("本地翻唱输入和最终音频都硬限制45秒，并保留曲库成品", async (t) => {
  const f = fixture(t);
  let sourceSeconds, referenceSeconds;
  const service = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const b of req) chunks.push(b);
    const data = JSON.parse(Buffer.concat(chunks));
    sourceSeconds = duration(fs.readFileSync(data.target));
    referenceSeconds = duration(fs.readFileSync(data.prompt));
    res.end(JSON.stringify({ ok: true, wav: wav(60).toString("base64") }));
  });
  await new Promise((r) => service.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => service.close(r)));
  const singing = new Singing(f.store, { connectionPolicy: () => {} });
  t.after(() => singing.close());
  f.configure({
    "sing.mode": "soulx-managed",
    "sing.local.port": service.address().port,
  });
  const song = singing.import(f.id, wav(60), "60秒输入");
  const result = await singing.convert(
    f.id,
    {
      sourceId: song.id,
      referenceId: song.id,
    },
    {
      withEngine: (_id, _kind, run) =>
        run(`http://127.0.0.1:${service.address().port}`),
    },
  );
  assert.equal(sourceSeconds, 45);
  assert.equal(referenceSeconds, 30);
  assert.equal(
    duration(fs.readFileSync(singing.file(f.id, result.id, true).file)),
    45,
  );
  assert.equal(
    fs
      .readdirSync(singing.root(f.id))
      .some(
        (name) =>
          name.endsWith(".source.wav") || name.endsWith(".reference.wav"),
      ),
    false,
  );
});
test("QQ社交操作绑定当前对象和管理员范围，不明回执不重复，跨轮保留审计", async (t) => {
  const f = fixture(t);
  f.session("qq");
  f.store.db.exec("CREATE TABLE qq_send_parts(id TEXT,batch_id TEXT)");
  const calls = [],
    signal = new AbortController().signal;
  const social = socialCapabilities({
    store: f.store,
    characterId: f.id,
    thread: { session_id: "qq", type: "private", target: "20002" },
    messages: [{ userId: "20002" }],
    batchId: "batch",
    signal,
    action: async (action, params) => {
      calls.push({ action, params });
      return action === "get_version_info"
        ? { app_name: "SnowLuma" }
        : action === "send_qzone_msg"
          ? { tid: "qzone-1" }
          : null;
    },
  });
  await assert.rejects(
    async () => social.qzone({ text: "合成测试" }),
    /未授权/,
  );
  f.configure({
    "chat.tools.qzone": true,
    "chat.tools.status": true,
    "chat.tools.friendRemark": true,
  });
  assert.equal((await social.qzone({ text: "合成测试" })).messageId, "qzone-1");
  assert.equal(
    calls.find((c) => c.action === "send_qzone_msg").params.ugc_right,
    4,
  );
  await assert.rejects(() => social.qzone({ text: "重复" }), /已执行|待核对/);
  await social.status({ status: "busy" });
  await social.friendRemark({ text: "当前好友" });
  assert.equal(
    calls.find((c) => c.action === "set_friend_remark").params.user_id,
    "20002",
  );
});
test("B站自主评论和动态使用真实候选编号，私信只允许已联系对象，重复和越权拒绝", async (t) => {
  const f = fixture(t);
  f.session("qq");
  const calls = [];
  const client = {
    me: async () => ({ selfId: "10001" }),
    video: async () => ({ aid: "123456" }),
    send: async (_self, message, text) => {
      calls.push({ message, text });
      return { status: "sent", messageId: "comment-1" };
    },
    publish: async (text) => {
      calls.push({ text });
      return { status: "sent", messageId: "dynamic-1" };
    },
  };
  const bili = new BiliService(f.store, {
    client: () => client,
    secrets: () => ({ read: async () => "synthetic" }),
  });
  t.after(() => bili.close());
  f.configure({
    "bili.enabled": true,
    "bili.provider": "mock",
    "bili.model": "mock",
    "bili.allowedUsers": "20002",
    "bili.globalGapSeconds": 0,
  });
  await assert.rejects(
    () =>
      bili.autonomy.execute(f.id, "qq", {
        kind: "comment",
        text: "合成",
        bvid: "BV1234567890",
      }),
    /未授权/,
  );
  f.configure({
    "bili.autonomy.comment": true,
    "bili.autonomy.dynamic": true,
    "bili.autonomy.dm": true,
  });
  await bili.autonomy.execute(f.id, "qq", {
    kind: "comment",
    text: "合成评论",
    bvid: "BV1234567890",
  });
  assert.equal(calls[0].message.comment.oid, "123456");
  await assert.rejects(
    () =>
      bili.autonomy.execute(f.id, "qq", {
        kind: "comment",
        text: "合成评论",
        bvid: "BV1234567890",
      }),
    /已提交/,
  );
  await assert.rejects(
    () =>
      bili.autonomy.execute(f.id, "qq", {
        kind: "dm",
        target: "30003",
        text: "合成",
      }),
    /未被管理员/,
  );
  await assert.rejects(
    () =>
      bili.autonomy.execute(f.id, "qq", {
        kind: "dm",
        target: "20002",
        text: "合成",
      }),
    /尚未联系/,
  );
  const result = await bili.autonomy.execute(f.id, "qq", {
    kind: "dynamic",
    text: "合成动态",
  });
  assert.equal(result.deliveryVerified, false);
});
