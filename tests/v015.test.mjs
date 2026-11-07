import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { BiliLogin } from "../src/bili/login.mjs";
import { BiliOperations } from "../src/bili/operations.mjs";
import { MemoryMaintenance } from "../src/starrcore/maintenance.mjs";
import { PlatformBridge } from "../src/bridge/service.mjs";
import { socialCapabilities } from "../src/qq/social.mjs";
import { Singing } from "../src/media/singing.mjs";
import { createTools } from "../src/host/tools.mjs";
import { BiliService } from "../src/bili/service.mjs";
import { fields } from "../src/starrcore/config.mjs";
import {
  fieldRoute,
  navigation,
  poems,
  workspaces,
} from "../webui/navigation.ts";
import { mountMediaServices } from "../src/runtime/media-services.mjs";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-v015-")),
    store = new StarrStore(path.join(root, "runtime"));
  store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const a = store.listCharacters()[0].id,
    b = store.createCharacter({ name: "隔离角色" }).id;
  for (const sessionId of ["current", "other"])
    store.conversations.ensure({
      sessionId,
      platform: "qq",
      type: "group",
      target: "123456",
      characterId: a,
    });
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const configure = (patch) =>
    store.configure(a, patch, { revision: store.character(a).revision });
  return { root, store, a, b, configure };
}
const response = (data, headers = {}) =>
  new Response(JSON.stringify({ code: 0, data }), { headers });
test("扫码只暴露官方地址与随机会话号，确认后验证并保存且不返回凭据", async () => {
  let now = 1000,
    calls = 0,
    saved;
  const login = new BiliLogin({
    clock: () => now,
    request: async (url) => {
      calls++;
      return String(url).includes("generate")
        ? response({
            url: "https://passport.bilibili.com/h5-app/passport/login/scan?key=scan_key_123",
            qrcode_key: "scan_key_123",
          })
        : response(
            { code: 0 },
            {
              "set-cookie":
                "SESSDATA=synthetic-secret; Path=/, bili_jct=csrf-synthetic; Path=/",
            },
          );
    },
    verify: async (cookie) => {
      assert.match(cookie, /synthetic-secret/);
      return { selfId: "123456", name: "合成账号" };
    },
    save: async (id, cookie) => (saved = { id, cookie }),
  });
  // 标准 Fetch 的 getSetCookie 保留独立 Cookie，不合并 Set-Cookie。
  login.request = async (url) => {
    calls++;
    const r = String(url).includes("generate")
      ? response({
          url: "https://account.bilibili.com/h5/account-h5/auth/scan-web",
          qrcode_key: "scan_key_123",
        })
      : response({ code: 0 });
    if (String(url).includes("poll"))
      r.headers.getSetCookie = () => [
        "SESSDATA=synthetic-secret; Path=/",
        "bili_jct=csrf-synthetic; Path=/",
      ];
    return r;
  };
  const qr = await login.create("a");
  assert.ok(qr.id);
  assert.equal(qr.key, undefined);
  await assert.rejects(() => login.poll("b", qr.id), /失效/);
  const result = await login.poll("a", qr.id);
  assert.equal(result.status, "saved");
  assert.equal(saved.id, "a");
  assert.doesNotMatch(
    JSON.stringify(result),
    /synthetic-secret|csrf-synthetic/,
  );
  const before = calls;
  await login.poll("a", qr.id);
  assert.equal(calls, before);
  login.close();
});
test("扫码取消、等待节流、过期与非官方地址均有明确状态", async () => {
  let now = 1000,
    resolvePoll,
    calls = 0;
  const login = new BiliLogin({
    clock: () => now,
    request: async (url) => {
      calls++;
      if (String(url).includes("generate"))
        return response({
          url: "https://passport.bilibili.com/scan",
          qrcode_key: "valid_key_123",
        });
      return new Promise(
        (resolve) => (resolvePoll = () => resolve(response({ code: 86101 }))),
      );
    },
  });
  const qr = await login.create("a"),
    pending = login.poll("a", qr.id);
  assert.equal((await login.poll("a", qr.id)).retryAfterMs, 2500);
  assert.equal(calls, 2);
  login.cancel("a", qr.id);
  resolvePoll();
  await assert.rejects(() => pending, /取消/);
  const next = await login.create("a");
  now += 180001;
  assert.equal((await login.poll("a", next.id)).status, "expired");
  login.request = async () =>
    response({ url: "https://example.com/login", qrcode_key: "valid_key_123" });
  await assert.rejects(() => login.create("a"), /可信/);
  login.close();
});
test("归档保留原文与审计，隔离其他会话，恢复与重开仍生效", (t) => {
  const f = fixture(t),
    m = new MemoryMaintenance(f.store),
    tools = createTools(f.store, { characterId: f.a, sessionId: "current" });
  const r = tools.starr_memory_write({
    title: "需归档的经历",
    content: "正文完整保留",
  });
  assert.throws(
    () =>
      m.archive(
        f.a,
        { id: r.id, revision: r.revision, reason: "整理" },
        "other",
      ),
    /不可操作/,
  );
  m.archive(f.a, { id: r.id, revision: r.revision, reason: "整理" }, "current");
  assert.equal(f.store.listMemory(f.a).length, 0);
  assert.equal(f.store.overview(f.a).counts.archived, 1);
  assert.equal(
    f.store
      .memory(f.a)
      .prepare("SELECT content FROM records WHERE id=?")
      .get(r.id).content,
    r.content,
  );
  assert.match(
    fs.readFileSync(
      path.join(f.root, "memory", f.a, "notes", `${r.id}.md`),
      "utf8",
    ),
    /archived: true/,
  );
  m.archive(f.a, {
    id: r.id,
    revision: r.revision + 1,
    reason: "恢复",
    restore: true,
  });
  assert.equal(f.store.listMemory(f.a)[0].content, r.content);
  assert.equal(m.status(f.b).counts.total, 0);
});
test("Obsidian 合并校验哈希和修订，保留旧文、更新检索并同步真实双链", (t) => {
  const f = fixture(t),
    m = new MemoryMaintenance(f.store);
  const a = f.store.saveMemory(f.a, { title: "旧标题", content: "旧正文" }),
    b = f.store.saveMemory(f.a, { title: "关联目标", content: "目标正文" });
  const file = path.join(f.root, "memory", f.a, "notes", `${a.id}.md`),
    raw = fs.readFileSync(file, "utf8");
  fs.writeFileSync(
    file,
    raw
      .replace("# 旧标题", "# 银河主题")
      .replace("旧正文", `银河新增正文\n\n[[${b.id}|目标]]`),
  );
  const preview = m.external(f.a, a.id);
  assert.equal(preview.changed, true);
  assert.deepEqual(preview.links, [b.id]);
  assert.throws(
    () =>
      m.importExternal(f.a, {
        id: a.id,
        revision: preview.revision,
        fileHash: "old",
      }),
    /变化/,
  );
  m.importExternal(f.a, preview);
  assert.equal(f.store.listMemory(f.a, { q: "银河" }).length, 1);
  assert.equal(
    f.store.memory(f.a).prepare("SELECT count(*) n FROM links").get().n,
    1,
  );
  const audit = m
    .status(f.a)
    .recent.find((row) => row.type === "memory-import");
  assert.match(audit.data, /旧正文/);
  assert.equal(m.reindex(f.a).status, "rebuilt");
});
test("B站预览不外发，账号与角色核对、一次令牌、编辑保图及结果不明恢复", async (t) => {
  const f = fixture(t);
  f.configure({ "bili.actions.enabled": true });
  let writes = 0,
    selfId = "123456";
  const original = {
    id: "999",
    author: selfId,
    text: "旧正文",
    pics: [{ img_src: "https://i0.hdslb.com/test.png" }],
  };
  const client = {
    dynamic: async () => original,
    writeDynamic: async (input) => {
      writes++;
      assert.deepEqual(input.pics, original.pics);
      return { status: "sent", messageId: "999", deliveryVerified: true };
    },
    me: async () => ({ selfId }),
  };
  const service = {
      store: f.store,
      closed: false,
      connect: async () => ({ client, account: { selfId } }),
    },
    ops = new BiliOperations(service);
  const preview = await ops.preview(f.a, {
    kind: "edit",
    id: "999",
    text: "新正文",
  });
  assert.equal(writes, 0);
  await assert.rejects(
    () => ops.execute(f.b, { token: preview.token }),
    /过期/,
  );
  assert.equal(
    (await ops.execute(f.a, { token: preview.token })).status,
    "sent",
  );
  assert.equal(writes, 1);
  await assert.rejects(
    () => ops.execute(f.a, { token: preview.token }),
    /过期/,
  );
  const next = await ops.preview(f.a, { kind: "delete", id: "999", text: "" });
  selfId = "654321";
  await assert.rejects(
    () => ops.execute(f.a, { token: next.token }),
    /账号已经变化/,
  );
  f.store.db
    .prepare(
      "INSERT INTO bili_operation_log VALUES('old',?,'publish','sending','{}',NULL,?)",
    )
    .run(f.a, Date.now());
  ops.recover();
  assert.equal(
    ops.status(f.a).recent.find((r) => r.id === "old").status,
    "uncertain",
  );
});
test("星桥要求双重授权，读取期间撤销配置不发送，成功与不明回执均不重发", async (t) => {
  const f = fixture(t);
  f.configure({ "bridge.enabled": true, "bridge.targets": "group:123456" });
  let sends = 0;
  const config = {
      enabled: true,
      characterId: f.a,
      groups: "123456",
      privateUsers: "",
      tokenEnv: "TEST",
    },
    qq = {
      settings: () => ({ config }),
      secrets: { read: async () => "synthetic" },
      action: async () => {
        sends++;
        return { message_id: "88" };
      },
    };
  const bridge = new PlatformBridge(f.store, { qq, bili: {} });
  t.after(() => bridge.close());
  await assert.rejects(
    () => bridge.deliver(f.a, "video", "a", "group:999999", "hello"),
    /授权/,
  );
  assert.equal(
    (await bridge.deliver(f.a, "video", "a", "group:123456", "hello")).status,
    "sent",
  );
  await bridge.deliver(f.a, "video", "a", "group:123456", "hello");
  assert.equal(sends, 1);
  f.configure({ "bridge.minGapSeconds": 10 });
  bridge.clock = () => Date.now() + 20000;
  qq.action = async () => {
    sends++;
    return {};
  };
  await assert.rejects(
    () => bridge.deliver(f.a, "video", "b", "group:123456", "hello"),
    /待核对/,
  );
  assert.equal(
    (await bridge.deliver(f.a, "video", "b", "group:123456", "hello")).status,
    "uncertain",
  );
  assert.equal(sends, 2);
  qq.secrets.read = async () => {
    config.enabled = false;
    return "synthetic";
  };
  bridge.clock = () => Date.now() + 40000;
  await assert.rejects(
    () => bridge.deliver(f.a, "video", "c", "group:123456", "hello"),
    /授权/,
  );
  assert.equal(sends, 2);
});
test("星桥首次动态检查只建水位，之后仅分享同账号新公开动态", async (t) => {
  const f = fixture(t);
  f.configure({
    "bridge.enabled": true,
    "bridge.targets": "group:123456",
    "bridge.dynamics": true,
  });
  let now = Date.now(),
    sends = 0;
  let feed = [{ id: "1", author: "777777", text: "旧动态", time: now / 1000 }];
  const qq = {
    settings: () => ({
      config: { enabled: true, characterId: f.a, groups: "123456" },
    }),
    secrets: { read: async () => "" },
    action: async () => {
      sends++;
      return { message_id: "88" };
    },
  };
  const bridge = new PlatformBridge(f.store, {
    clock: () => now,
    qq,
    bili: {
      connect: async () => ({
        account: { selfId: "777777" },
        client: { feed: async () => feed },
      }),
    },
  });
  t.after(() => bridge.close());
  await bridge.tick(f.a);
  assert.equal(sends, 0);
  now += 301000;
  feed.push({ id: "2", author: "777777", text: "新动态", time: now / 1000 });
  await bridge.tick(f.a);
  assert.equal(sends, 1);
  now += 301000;
  await bridge.tick(f.a);
  assert.equal(sends, 1);
  now += 301000;
  feed.push({
    id: "3",
    author: "777777",
    text: "又一条新动态",
    time: now / 1000,
  });
  await bridge.tick(f.a);
  assert.equal(sends, 2, "已发动态不能阻塞之后的新动态");
});

test("星桥分次完成全部 QQ 目标，已发记录不阻塞后续收件者", async (t) => {
  const f = fixture(t);
  f.configure({
    "bridge.enabled": true,
    "bridge.targets": "group:123456,private:234567",
    "bridge.videos": true,
    "bridge.dynamics": false,
    "bridge.times": "12:00",
    "bridge.minGapSeconds": 10,
    "agency.timezone": "UTC",
  });
  let now = Date.UTC(2026, 10, 6, 12, 0);
  const sent = [];
  const bridge = new PlatformBridge(f.store, {
    clock: () => now,
    qq: {
      settings: () => ({
        config: {
          enabled: true,
          characterId: f.a,
          groups: "123456",
          privateUsers: "234567",
        },
      }),
      secrets: { read: async () => "synthetic" },
      action: async (settings, action, args) => {
        sent.push({ action, args });
        return { message_id: String(sent.length) };
      },
    },
    bili: {},
  });
  t.after(() => bridge.close());
  f.store.db.exec(
    "CREATE TABLE IF NOT EXISTS bili_activities(character_id TEXT,kind TEXT,status TEXT,data TEXT,created INTEGER)",
  );
  f.store.db
    .prepare("INSERT INTO bili_activities VALUES(?,'watch','done',?,?)")
    .run(f.a, JSON.stringify({ videos: ["BV0000000001"] }), now);
  await bridge.tick(f.a);
  assert.equal(sent.length, 1);
  await bridge.tick(f.a);
  assert.equal(sent.length, 1, "冷却期间不额外发送");
  now += 11000;
  await bridge.tick(f.a);
  assert.equal(sent.length, 2);
  assert.equal(sent[1].action, "send_private_msg");
  assert.equal(sent[1].args.user_id, "234567");
  now += 11000;
  await bridge.tick(f.a);
  assert.equal(sent.length, 2, "本时段重查不重复发送");
});
test("QQ 社交能力固定当前群、当前批用户，反馈持久化且撤销权限立即生效", async (t) => {
  const f = fixture(t);
  f.configure({ "chat.tools.members": true, "chat.tools.poke": true });
  let actions = [];
  f.store.db.exec(
    "CREATE TABLE IF NOT EXISTS qq_send_parts(batch_id TEXT,status TEXT)",
  );
  const caps = socialCapabilities({
    store: f.store,
    characterId: f.a,
    thread: { session_id: "current", type: "group", target: "123456" },
    messages: [{ userId: "222222" }],
    batchId: "batch",
    signal: new AbortController().signal,
    action: async (name, args) => {
      actions.push({ name, args });
      return [{ user_id: "222222", nickname: "合成成员" }];
    },
  });
  assert.equal((await caps.members())[0].name, "合成成员");
  assert.equal(actions[0].args.group_id, "123456");
  await assert.rejects(() => caps.poke({ userId: "333333" }), /真实发言/);
  await caps.poke({ userId: "222222" });
  await assert.rejects(() => caps.poke({ userId: "222222" }), /已执行/);
  caps.feedback({ text: "合成问题" });
  assert.equal(
    f.store.db
      .prepare("SELECT count(*) n FROM qq_social_log WHERE kind='feedback'")
      .get().n,
    1,
  );
  f.configure({ "chat.tools.members": false });
  await assert.rejects(() => caps.members(), /未授权/);
});
test("曲库移除保留回收音源与元数据，默认参考受保护，跨角色无权移除", (t) => {
  const f = fixture(t),
    singing = new Singing(f.store),
    bytes = Buffer.alloc(44);
  bytes.write("RIFF");
  bytes.write("WAVE", 8);
  const song = singing.import(f.a, bytes, "合成音源");
  f.configure({ "sing.referenceId": song.id });
  assert.throws(() => singing.remove(f.a, song.id), /默认参考/);
  assert.throws(() => singing.remove(f.b, song.id), /没有/);
  f.configure({ "sing.referenceId": "" });
  const trash = path.join(singing.root(f.a), ".trash");
  fs.mkdirSync(trash, { recursive: true });
  const metadata = path.join(trash, `${song.id}.json`);
  fs.writeFileSync(metadata, "合成冲突资料");
  assert.throws(() => singing.remove(f.a, song.id), /EEXIST/);
  assert.ok(fs.existsSync(singing.file(f.a, song.id).file));
  fs.unlinkSync(metadata);
  assert.equal(singing.remove(f.a, song.id).recoverable, true);
  assert.equal(singing.list(f.a).songs.length, 0);
  assert.ok(
    fs.existsSync(path.join(singing.root(f.a), ".trash", `${song.id}.json`)),
  );
  assert.equal(singing.clearCache(f.a).originalsPreserved, true);
});
test("全部有效配置均有实际功能路由，四个工作区完整覆盖且左栏没有隐藏功能", () => {
  for (const field of fields.filter(field=>field.page!=="retired")) {
    const route = fieldRoute(field.page);
    assert.notEqual(route, "settings", field.key);
    assert.ok(
      navigation.some((item) => item.id === route),
      field.key,
    );
  }
  assert.equal(workspaces.length, 4);
  const chatWorkspace = workspaces.find((workspace) => workspace.id === "chat");
  assert.ok(chatWorkspace?.pages.includes("chat-rules"));
  assert.equal(chatWorkspace?.pages.includes("host-chat"), false);
  for (const workspace of workspaces)
    assert.deepEqual(workspace.primary, workspace.pages);
  for (const item of navigation) {
    assert.equal(
      workspaces.filter((w) => w.pages.includes(item.id)).length,
      ["settings","permissions","appearance","maintenance"].includes(item.id) ? 0 : 1,
      item.id,
    );
    if (item.id !== "overview")
      assert.ok(poems[item.id]?.every(Boolean), item.id);
  }
});
test("B站登录独立于回复驱动，取消正在生成的二维码不会遗留可轮询会话", async (t) => {
  const f = fixture(t),
    service = new BiliService(f.store);
  t.after(() => service.close());
  assert.equal(service.status(f.a).hostReady, false);
  assert.equal(service.status(f.a).loginReady, true);
  let resolve;
  service.login.request = () => new Promise((r) => (resolve = r));
  const pending = service.login.create(f.a);
  service.login.cancel(f.a);
  resolve(
    response({
      url: "https://account.bilibili.com/h5/account-h5/auth/scan-web",
      qrcode_key: "cancelled_valid_key",
    }),
  );
  await assert.rejects(() => pending, /取消/);
  assert.equal(service.login.sessions.size, 0);
});
test("星桥在读取令牌期间停止后不再外发", async (t) => {
  const f = fixture(t);
  f.configure({ "bridge.enabled": true, "bridge.targets": "group:123456" });
  let resolve,
    sends = 0;
  const config = { enabled: true, characterId: f.a, groups: "123456" },
    qq = {
      settings: () => ({ config }),
      secrets: { read: () => new Promise((r) => (resolve = r)) },
      action: async () => {
        sends++;
        return { message_id: "88" };
      },
    };
  const bridge = new PlatformBridge(f.store, { qq, bili: {} });
  t.after(() => bridge.close());
  const pending = bridge.deliver(
    f.a,
    "video",
    "test-stop",
    "group:123456",
    "合成测试",
  );
  bridge.stop();
  resolve("test");
  await assert.rejects(() => pending, /停止/);
  assert.equal(sends, 0);
});
test("角色公开资料工具确有消费者，拒绝私人历史与未授权调用", async (t) => {
  const f = fixture(t);
  let calls = 0;
  const remove = mountMediaServices(f.store, {
    bili: {
      operations: {
        read: async (id, input) => {
          calls++;
          assert.equal(id, f.a);
          return { kind: input.kind };
        },
      },
    },
  });
  t.after(remove);
  const tools = createTools(f.store, {
    characterId: f.a,
    sessionId: "current",
  });
  assert.throws(
    () => tools.starr_bili_read({ kind: "search", q: "星系" }),
    /未授权/,
  );
  f.configure({ "bili.actions.allowBot": true });
  assert.throws(
    () => tools.starr_bili_read({ kind: "history" }),
    /仅开放公开资料/,
  );
  assert.equal(
    (await tools.starr_bili_read({ kind: "search", q: "星系" })).kind,
    "search",
  );
  assert.equal(calls, 1);
});
test("表情像素上限覆盖 WebP 尺寸，不能用小文件携带超大画布绕过", (t) => {
  const f = fixture(t),
    image = Buffer.alloc(30);
  image.write("RIFF");
  image.write("WEBP", 8);
  image.write("VP8X", 12);
  image.writeUIntLE(20000, 24, 3);
  image.writeUIntLE(20000, 27, 3);
  assert.throws(
    () => f.store.addExpression(f.a, image, "超大画布"),
    /像素超过/,
  );
});
