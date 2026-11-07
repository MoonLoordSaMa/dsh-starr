import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { StarrStore } from "../src/starrcore/store.mjs";
import { Onboarding } from "../src/onboarding/service.mjs";
import { checkSnowLuma } from "../src/onboarding/diagnostics.mjs";
import { installPreset } from "../src/host/preset.mjs";
import { apply as applySession } from "../src/host/qq-session.mjs";
import { modelDiagnostics } from "../src/host/model-check.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-onboard-"));
  const store = new StarrStore(path.join(root, "runtime"));
  const onboarding = new Onboarding(store);
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, store, onboarding };
}
function initialize(onboarding, root) {
  let state = onboarding.save({
    revision: 0,
    step: 3,
    draft: {
      name: "引导角色",
      persona: "有自己的判断，不编造经历",
      memoryRoot: path.join(root, "memory"),
      backupRoot: path.join(root, "backup"),
    },
  });
  state = onboarding.create({ revision: state.revision });
  return state;
}

test("新手草稿可重开，拒绝过期修订；角色创建重试不会重复创建或改目录", (t) => {
  const { root, store, onboarding } = fixture(t);
  const state = initialize(onboarding, root);
  const retry = onboarding.create({ revision: state.revision });
  assert.equal(retry.characterId, state.characterId);
  assert.equal(store.listCharacters().length, 1);
  assert.throws(() => onboarding.save({ revision: 0, step: 1 }), /已变化/);
  const second = new StarrStore(path.join(root, "runtime"));
  try {
    assert.equal(
      new Onboarding(second).status().characterId,
      state.characterId,
    );
  } finally {
    second.close();
  }
  assert.throws(
    () => onboarding.save({ revision: state.revision, step: 7 }),
    /步骤无效/,
  );
  assert.throws(
    () =>
      onboarding.save({
        revision: state.revision,
        step: 1,
        draft: { secret: "不保存密钥" },
      }),
    /未定义/,
  );
});

test("新手初始化支持明确选择已有 Obsidian 库，原笔记和设置保持字节一致", (t) => {
  const { root, store, onboarding } = fixture(t);
  const vault = path.join(root, "vault");
  fs.mkdirSync(path.join(vault, ".obsidian"), { recursive: true });
  fs.writeFileSync(path.join(vault, ".obsidian", "app.json"), '{"test":true}');
  fs.writeFileSync(path.join(vault, "原有笔记.md"), "原有正文");
  let state = onboarding.save({
    revision: 0,
    step: 3,
    draft: {
      name: "库内新角色",
      persona: "人格",
      memoryRoot: vault,
      backupRoot: path.join(root, "backup"),
      allowExistingVault: true,
    },
  });
  state = onboarding.create({ revision: state.revision });
  assert.equal(store.installation().memoryRoot, vault);
  assert.equal(
    fs.readFileSync(path.join(vault, "原有笔记.md"), "utf8"),
    "原有正文",
  );
  assert.equal(
    fs.readFileSync(path.join(vault, ".obsidian", "app.json"), "utf8"),
    '{"test":true}',
  );
  assert.throws(
    () => onboarding.finish({ revision: state.revision }),
    /检查记忆库/,
  );
  state = onboarding.inspectMemory();
  state = onboarding.finish({ revision: state.revision });
  assert.ok(state.completedAt);
  assert.equal(state.checks.memory.database, "ok");
  assert.equal(
    fs.readdirSync(vault).some((name) => name.startsWith(".starr-check-")),
    false,
  );
});

test("旧角色切换使目录检查失效，向导不会覆盖已有的人格、记忆和路径", (t) => {
  const { root, store, onboarding } = fixture(t);
  initialize(onboarding, root);
  let state = onboarding.inspectMemory();
  const b = store.createCharacter({ name: "角色B", persona: "B原人格" });
  store.saveMemory(b.id, { title: "原记忆", content: "仍保留" });
  state = onboarding.save({
    revision: state.revision,
    step: 3,
    characterId: b.id,
    draft: { persona: "不能覆盖B", memoryRoot: path.join(root, "other") },
  });
  assert.equal(state.checks.memory, undefined);
  assert.equal(store.character(b.id).persona, "B原人格");
  assert.equal(store.listMemory(b.id).length, 1);
  assert.equal(store.installation().memoryRoot, path.join(root, "memory"));
});

test("SnowLuma 检测只报告本机端口可达，不把普通监听服务当作账号或回复成功", async (t) => {
  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port;
  const result = await checkSnowLuma({ httpPort: port, wsPort: port });
  assert.equal(result.status, "reachable");
  assert.equal(result.accountVerified, false);
  assert.equal(result.replyVerified, false);
  await assert.rejects(
    () => checkSnowLuma({ httpPort: 0, wsPort: port }),
    /端口/,
  );
});

test("预设自动注册、可审计且卸载清理，异步加载期间卸载也不会残留", async () => {
  let resolveRegistration;
  let removed = 0;
  let definition;
  const preset = installPreset(
    {
      inject(_deps, callback) {
        callback({
          agentPresets: {
            register(value) {
              definition = value;
              return new Promise((resolve) => {
                resolveRegistration = resolve;
              });
            },
          },
          effect: (effect) => effect(),
        });
      },
    },
    "/test/runtime",
  );
  assert.equal(definition.id, "starr-qqchat");
  assert.equal(definition.plugins[0].name, "dsh-starr/qq-session");
  for (const name of [
    "@deepseek-ai/dsh-tool-fs",
    "@deepseek-ai/dsh-tool-fs-search",
    "@deepseek-ai/dsh-agent-instructions",
  ])
    assert.ok(definition.plugins.some((plugin) => plugin.name === name));
  preset.close();
  resolveRegistration(() => {
    removed++;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(removed, 1);
});

test("QQ 预设保留普通工具、约束管理操作，按真实会话固定角色，不随默认角色切换", async (t) => {
  const { root, store, onboarding } = fixture(t);
  let state = initialize(onboarding, root);
  state = onboarding.inspectMemory();
  onboarding.finish({ revision: state.revision });
  const tools = new Map(),
    sections = new Map();
  let guard, filter, mode;
  const close = applySession(
    {
      tools: {
        presentAs(value) {
          mode = value;
          return () => {};
        },
        restrict(value) {
          filter = value;
          return () => {};
        },
        guard(value) {
          guard = value;
          return () => {};
        },
        register(spec) {
          tools.set(spec.name, spec);
          return () => tools.delete(spec.name);
        },
      },
      systemPrompt: {
        section(value) {
          sections.set(value.name, value);
          return () => sections.delete(value.name);
        },
        getSectionOrder: () => 1,
      },
      on() {},
    },
    { dataRoot: path.join(root, "runtime") },
  );
  t.after(close);
  assert.equal(mode, "native");
  assert.equal(filter, undefined);
  assert.match(guard({ name: "exec_command" }), /不执行终端/);
  for (const name of ["read", "write", "edit", "glob", "grep", "read_image"])
    assert.equal(guard({ name }), undefined);
  assert.match(guard({ name: "Config" }), /宿主配置/);
  assert.equal(guard({ name: "starr_memory_search" }), undefined);
  assert.equal(guard({ name: "web_search" }), undefined);
  assert.equal(guard({ name: "browser_navigate" }), undefined);
  assert.equal(guard({ name: "qq_send_message" }), undefined);
  assert.equal(guard({ name: "vision_understand" }), undefined);
  const exec = { agent: { id: "qq-scope-a" } };
  const prefix = sections
    .get("deployment:persona-prefix")
    .text({ scope: exec.agent });
  assert.ok(prefix.startsWith("有自己的判断，不编造经历"));
  assert.ok(prefix.includes("会话修订号：1"));
  const record = await tools
    .get("starr_memory_write")
    .execute(
      { title: "QQ记忆", content: "固定角色", characterId: "untrusted" },
      exec,
    );
  assert.equal(store.listMemory(state.characterId)[0].id, record.id);
  const configRead = tools.get("starr_config_read");
  const configUpdate = tools.get("starr_config_update");
  const initialConfig = await configRead.execute({}, exec);
  assert.throws(
    () =>
      configUpdate.execute(
        {
          revision: initialConfig.revision,
          patch: { "memory.recallLimit": 7 },
        },
        exec,
      ),
    /授权/,
  );
  store.configure(
    state.characterId,
    { "permissions.botConfig": true },
    { revision: initialConfig.revision },
  );
  const authorizedConfig = await configRead.execute({}, exec);
  assert.equal(guard({ name: "starr_config_update" }), undefined);
  assert.throws(
    () =>
      configUpdate.execute(
        {
          revision: authorizedConfig.revision,
          patch: { "memory.recallLimit": 7.5 },
        },
        exec,
      ),
    /整数/,
  );
  configUpdate.execute(
    { revision: authorizedConfig.revision, patch: { "memory.recallLimit": 7 } },
    exec,
  );
  assert.equal(
    store.character(state.characterId).config["memory.recallLimit"],
    7,
  );
  assert.throws(
    () =>
      configUpdate.execute(
        {
          revision: authorizedConfig.revision,
          patch: { "permissions.botConfig": false },
        },
        exec,
      ),
    /授权/,
  );
  const b = store.createCharacter({ name: "角色B", persona: "B人格" });
  onboarding.save({
    revision: onboarding.read().revision,
    step: 6,
    characterId: b.id,
  });
  assert.ok(
    sections
      .get("deployment:persona-prefix")
      .text({ scope: exec.agent })
      .startsWith("有自己的判断，不编造经历"),
  );
  assert.ok(
    !sections
      .get("deployment:persona-prefix")
      .text({ scope: exec.agent })
      .includes(b.name),
  );
  close();
  assert.equal(tools.size, 0);
});

test("模型后台测试识别传输失败与仅文本响应，不输出服务端秘密，不改全局默认模型", async () => {
  let response = "fail";
  const llm = {
    listProviders: () => [{ id: "test", name: "测试连接" }],
    listModels: async () => [{ id: "chat", name: "测试模型" }],
    async *stream(options) {
      assert.equal(
        options.messages[0].content[0].text.includes("私人记忆"),
        false,
      );
      if (response === "fail")
        yield {
          type: "finish",
          reason: {
            kind: "error",
            failure: { code: "TRANSPORT", message: "不要输出这个秘密" },
          },
        };
      else {
        if (["tool", "invalid"].includes(response)) {
          yield {
            type: "tool-call-delta",
            id: "diagnostic-call",
            name: "starr_diagnostic_echo",
            argumentsDelta: '{"value":',
          };
          yield {
            type: "tool-call-delta",
            id: "diagnostic-call",
            argumentsDelta: response === "tool" ? '"STARR_READY"}' : '"WRONG"}',
          };
        }
        yield { type: "finish", reason: { kind: "stop" } };
      }
    },
  };
  const diagnostics = modelDiagnostics({
    inject(_deps, callback) {
      callback({ llm });
    },
  });
  let result = await diagnostics.test({ provider: "test", model: "chat" });
  assert.equal(result.status, "failed");
  assert.equal(JSON.stringify(result).includes("不要输出这个秘密"), false);
  response = "text";
  assert.equal(
    (await diagnostics.test({ provider: "test", model: "chat" })).status,
    "partial",
  );
  response = "tool";
  result = await diagnostics.test({ provider: "test", model: "chat" });
  assert.equal(result.status, "verified");
  assert.equal(result.qqReplyVerified, false);
  response = "invalid";
  assert.equal(
    (await diagnostics.test({ provider: "test", model: "chat" })).status,
    "partial",
  );
});
