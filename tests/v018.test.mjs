import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { StarrStore } from "../src/starrcore/store.mjs";
import { Agency } from "../src/agency/service.mjs";
import { QQService } from "../src/qq/service.mjs";
import { todayOverview } from "../src/agency/today.mjs";
import { modelFailure } from "../src/host/model-failure.mjs";
import { createTools } from "../src/host/tools.mjs";
import { agencyToolAllowed } from "../src/host/agency-driver.mjs";
import {
  expressionBehavior,
  replyDelay,
} from "../src/conversation/behavior.mjs";
import {
  discoverLocalModels,
  discoveryDefaults,
} from "../src/media/discovery.mjs";

function fixture(t, driver) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-v018-")),
    store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成自主角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const patch = (value) =>
    store.configure(character.id, value, {
      revision: store.character(character.id).revision,
    });
  patch({
    "agency.enabled": true,
    "agency.level": "owner",
    "agency.quietStart": "00:00",
    "agency.quietEnd": "00:00",
  });
  const sends = [],
    qq = new QQService(store, {
      secrets: { read: async () => "synthetic" },
      action: async (_config, name, params) => {
        sends.push({ name, params });
        return { message_id: "synthetic-receipt" };
      },
    });
  const agency = new Agency(store, { qq, driver });
  const goal = () =>
    store.createGoal(character.id, {
      title: "想留下一点新感受",
      reason: "合成资料形成的明确目的",
    });
  const owner = () => {
    patch({ "memory.ownerQQ": "200001" });
    const settings = {
      ...qq.settings().config,
      enabled: true,
      characterId: character.id,
      provider: "synthetic",
      model: "synthetic",
      privateUsers: "200001",
    };
    store.db
      .prepare("INSERT INTO qq_settings VALUES(1,1,?)")
      .run(JSON.stringify(settings));
    const session = store.conversations.ensure({
      sessionId: "owner-private",
      characterId: character.id,
      platform: "qq",
      type: "private",
      account: "100001",
      target: "200001",
    });
    store.db
      .prepare(
        "INSERT INTO qq_threads VALUES('owner-thread',?,?, 'private','200001',0)",
      )
      .run(character.id, session.session_id);
    qq.state = { status: "connected", account: { selfId: "100001" } };
  };
  t.after(() => {
    agency.close();
    qq.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { store, character, agency, qq, patch, goal, owner, sends, root };
}
test("平淡、低落和乐观均可获得主动机会，工具回执不依赖驱动重复返回结果", async (t) => {
  for (const [mood, values] of Object.entries({
    平淡: {
      energy: 55,
      joy: 35,
      social: 40,
      curiosity: 25,
      sleepiness: 5,
      fatigue: 10,
      loneliness: 20,
      stimulation: 20,
    },
    低落: {
      energy: 45,
      joy: 5,
      social: 10,
      curiosity: 15,
      confidence: 20,
      loneliness: 30,
      security: 40,
      tension: 45,
      stimulation: 35,
    },
    乐观: { energy: 80, joy: 85, social: 85, curiosity: 80, confidence: 80 },
  })) {
    await t.test(mood, async (t) => {
      let calls = 0;
      const f = fixture(t, {
        run: async (input) => {
          calls++;
          await input.finish({
            text: `合成${mood}主动交流`,
            reason: "来自真实近况的简短接续",
          });
          // 宿主完成工具调用后可能不把工具回执作为驱动返回值。
        },
      });
      f.owner();
      f.store.updateState(f.character.id, {
        revision: f.store.getState(f.character.id).revision,
        values,
        eventKey: `mood-${mood}`,
      });
      const plan = f.agency.plan(f.character.id);
      assert.equal(plan.blockers.length, 0);
      if (mood === "平淡") assert.match(plan.goal.id, /^routine:/);
      const result = await f.agency.run(f.character.id);
      assert.equal(result.status, "sent");
      assert.equal(JSON.parse(result.result).messageId, "synthetic-receipt");
      assert.equal(f.sends.length, 1);
      assert.equal(calls, 1);
    });
  }
});

test("日常主动机会遵守间隔且重启不重复，设为零可关闭，已评估需求不阻塞其他机会", async (t) => {
  const f = fixture(t, {
    run: (input) => input.finish({ reason: "合成安静决定" }),
  });
  let clock = Date.now();
  f.agency.clock = () => clock;
  f.patch({ "agency.opportunityMinutes": 60 });
  const initial = f.agency.plan(f.character.id);
  assert.ok(initial.goal);
  await f.agency.run(f.character.id);
  assert.equal(f.agency.plan(f.character.id).goal, null);
  clock += 61 * 60000;
  const second = f.agency.plan(f.character.id);
  assert.match(second.goal.id, /^routine:/);
  assert.equal(second.blockers.length, 0);
  const restarted = new Agency(f.store, {
    qq: f.qq,
    driver: f.agency.driver,
    clock: () => clock,
  });
  try {
    assert.equal(restarted.plan(f.character.id).id, second.id);
  } finally {
    restarted.close();
  }
  f.patch({ "agency.opportunityMinutes": 0 });
  assert.equal(f.agency.plan(f.character.id).goal, null);
});

test("不急迫的旧需求目的不会阻塞平淡情绪下的日常主动机会", async (t) => {
  const f = fixture(t, {
    run: (input) => input.finish({ reason: "合成安静决定" }),
  });
  f.owner();
  f.store.updateState(f.character.id, {
    revision: f.store.getState(f.character.id).revision,
    values: {
      energy: 80,
      sleepiness: 0,
      fatigue: 0,
      joy: 35,
      curiosity: 25,
      social: 40,
      loneliness: 20,
      stimulation: 20,
    },
    eventKey: "synthetic-not-tired",
  });
  const old = f.store.createGoal(f.character.id, {
    title: "合成休息目的",
    reason: "先前留下的待评估需要",
    drive: "rest",
  });
  assert.ok(
    f.store.intentions(f.character.id).goals.find((g) => g.id === old.id)
      .blockers.length,
  );
  const plan = f.agency.plan(f.character.id);
  assert.match(plan.goal.id, /^routine:/);
  assert.equal(plan.blockers.length, 0);
  const result = await f.agency.run(f.character.id);
  assert.equal(result.status, "silent", result.error);
  assert.equal(
    f.store.goals(f.character.id).find((g) => g.id === old.id).status,
    "waiting",
  );
});

test("模型错误分类保留根因且不暴露服务正文、密钥与路径", () => {
  for (const [error, code] of [
    [
      { code: "TRANSPORT", cause: { status: 401, message: "secret-token" } },
      "MODEL_AUTH",
    ],
    [{ code: "TRANSPORT", cause: { code: "QUOTA_EXCEEDED" } }, "MODEL_QUOTA"],
    [{ statusCode: 429 }, "MODEL_BUSY"],
    [{ code: "ECONNRESET" }, "MODEL_NETWORK"],
    [{ code: "CONTEXT_LENGTH_EXCEEDED" }, "MODEL_CONTEXT"],
    [{ code: "ACCOUNT_SIGN_IN_REQUIRED" }, "MODEL_AUTH"],
    [{ message: "401 invalid credential" }, "MODEL_AUTH"],
    [{ code: "TIMEOUT" }, "MODEL_TIMEOUT"],
  ]) {
    assert.equal(modelFailure(error).code, code);
    assert.doesNotMatch(JSON.stringify(modelFailure(error)), /secret-token/);
  }
});
test("媒体发现从任意目录组合程序、权重与音色，不执行程序也不伪报验证", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "custom-engine-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "models"));
  fs.mkdirSync(path.join(root, "voices"));
  fs.writeFileSync(
    path.join(root, "models", "breeze-custom.gguf"),
    "synthetic",
  );
  fs.writeFileSync(path.join(root, "breeze-server.exe"), "not-executable");
  fs.writeFileSync(path.join(root, "voices", "moon.breeze"), "synthetic");
  const result = await discoverLocalModels({ directories: [root], ports: [] });
  assert.equal(result.profiles.length, 1);
  assert.deepEqual(result.profiles[0].voices, ["moon"]);
  assert.equal(
    result.profiles[0].patch["tts.local.bin"],
    path.join(root, "breeze-server.exe"),
  );
  assert.equal(result.profiles[0].verified, false);
  assert.ok(
    discoveryDefaults({
      "tts.local.modelPath": path.join(root, "models", "breeze-custom.gguf"),
    }).directories.includes(root),
  );
  assert.ok(
    !discoveryDefaults().directories.some((p) => p.startsWith("D:\\Breeze")),
  );
});
test("状态影响文字建议和已开启的停顿，零停顿保持为零，最大时长仍生效", () => {
  const c = {
    "chat.reply.delayMinMs": 1000,
    "chat.reply.delayMaxMs": 1000,
    "chat.reply.perCharMs": 0,
    "chat.reply.longPauseChance": 0,
    "chat.reply.maxDelayMs": 1200,
    "chat.reply.statePacing": true,
  };
  assert.match(
    expressionBehavior({ energy: 10, tension: 90 }).guidance,
    /短一点.*紧张/,
  );
  assert.equal(replyDelay(c, { energy: 10, tension: 90 }, 20), 1200);
  assert.equal(
    replyDelay(
      { ...c, "chat.reply.delayMinMs": 0, "chat.reply.delayMaxMs": 0 },
      { energy: 10 },
      20,
    ),
    0,
  );
  assert.equal(
    replyDelay(
      c,
      { energy: 80, organism: { emotions: [{ name: "期待", intensity: 90 }] } },
      20,
    ),
    600,
  );
});
test("主动工具分层不能解锁管理、屏幕或摄像头，L3也仍仅开放显式工具", () => {
  assert.equal(agencyToolAllowed("starr_memory_read", "owner"), true);
  assert.equal(agencyToolAllowed("starr_bili_read", "owner"), false);
  assert.equal(agencyToolAllowed("starr_bili_read", "browse"), true);
  assert.equal(agencyToolAllowed("starr_bili_social", "browse"), false);
  for (const name of [
    "exec_command",
    "apply_patch",
    "starr_see_now",
    "unknown_tool",
  ])
    assert.equal(agencyToolAllowed(name, "social"), false);
});
test("只读预演不调用模型，L0与暂停阻止执行，权限不能由bot扩大", async (t) => {
  let calls = 0;
  const f = fixture(t, {
    run: async () => {
      calls++;
    },
  });
  f.goal();
  assert.ok(f.agency.plan(f.character.id).dryRun);
  assert.equal(calls, 0);
  f.patch({ "agency.level": "observe" });
  await assert.rejects(() => f.agency.run(f.character.id), /仅观察/);
  f.patch({ "agency.level": "owner", "agency.paused": true });
  await assert.rejects(() => f.agency.run(f.character.id), /暂停/);
  assert.throws(
    () =>
      f.store.configure(
        f.character.id,
        { "agency.level": "social" },
        { revision: f.store.character(f.character.id).revision, bot: true },
      ),
    /允许|授权/,
  );
  assert.equal(calls, 0);
});
test("目的执行可选择安静并持久留痕，不将候选或模型正文伪报为外发", async (t) => {
  const f = fixture(t, {
    run: async (input) => {
      input.reserve("request");
      return input.finish({ reason: "没有新内容，这次不打扰" });
    },
  });
  f.owner();
  f.goal();
  const result = await f.agency.run(f.character.id);
  assert.equal(result.status, "silent");
  assert.equal(f.sends.length, 0);
  assert.equal(result.requests, 1);
  assert.ok(f.agency.plan(f.character.id).blockers.length);
  const today = todayOverview(f.store, f.character.id);
  assert.equal(
    today.events.find((e) => e.kind === "主动目的").status,
    "silent",
  );
  assert.equal(today.counts.proactive, 0);
});
test("主动私聊目标固定为可信主人，同一目的最多一次外发且真实回执入库", async (t) => {
  const f = fixture(t, {
    run: async (input) => {
      input.reserve("request");
      const result = await input.finish({
        text: "刚刚想起那片星光",
        reason: "有值得分享的新内容",
      });
      await assert.rejects(
        () => input.finish({ text: "不能再发", reason: "重复" }),
        /已经结束/,
      );
      return result;
    },
  });
  f.owner();
  const goal = f.goal();
  const result = await f.agency.run(f.character.id);
  assert.equal(result.status, "sent");
  assert.equal(f.sends.length, 1);
  assert.equal(f.sends[0].params.user_id, "200001");
  assert.equal(
    f.store.goals(f.character.id).find((g) => g.id === goal.id).status,
    "completed",
  );
  assert.equal(JSON.parse(result.result).messageId, "synthetic-receipt");
  await assert.rejects(() => f.agency.run(f.character.id), /冷却|没有需要/);
});
test("回执丢失不重试目的，已知回执在后续取消时仍保留成功", async (t) => {
  const f = fixture(t, {
    run: async (input) =>
      input.finish({ text: "一次就好", reason: "测试未知回执" }),
  });
  f.owner();
  f.goal();
  f.qq.action = async () => ({});
  const result = await f.agency.run(f.character.id);
  assert.equal(result.status, "uncertain");
  assert.equal(result.actions, 1);
  const restarted = new Agency(f.store, {
    qq: f.qq,
    driver: {
      run: async () => {
        throw new Error("不可重发");
      },
    },
  });
  assert.ok(restarted.plan(f.character.id).blockers.length);
  restarted.close();
});
test("等待凭据期间撤销权限阻止发送；主人明确说忙或有待处理消息时不主动插话", async (t) => {
  const f = fixture(t, {
    run: async (input) =>
      input.finish({ text: "不应发出", reason: "测试撤销" }),
  });
  f.owner();
  f.goal();
  f.qq.secrets.read = async () => {
    f.patch({ "agency.paused": true });
    return "synthetic";
  };
  const result = await f.agency.run(f.character.id);
  assert.equal(result.status, "failed");
  assert.equal(f.sends.length, 0);
  f.patch({ "agency.paused": false });
  f.store.db
    .prepare(
      "INSERT INTO qq_inbox(event_key,thread_key,payload,status,created) VALUES('busy','owner-thread',?,'done',?)",
    )
    .run(JSON.stringify({ text: "我在开会，不要打扰" }), Date.now() - 3600000);
  assert.match(f.agency.blockers(f.character.id).join(" "), /说忙/);
});
test("请求与工具预算有硬上限，未知模型用量停止下一次自主机会", async (t) => {
  const f = fixture(t, {
    run: async (input) => {
      input.reserve("request");
      assert.throws(() => input.reserve("request"), /预算/);
      input.reserve("tool");
      assert.throws(() => input.reserve("tool"), /预算/);
      return input.finish({ reason: "预算内安静结束" });
    },
  });
  f.owner();
  f.goal();
  f.patch({ "agency.maxRequests": 1, "agency.maxTools": 1 });
  const result = await f.agency.run(f.character.id);
  assert.equal(result.status, "silent");
  assert.equal(result.requests, 1);
  assert.equal(result.tools, 1);
  f.store.db
    .prepare("INSERT INTO chat_usage VALUES('missing',?,?,0,0,0,1,0,?)")
    .run(f.character.id, result.session_id, Date.now());
  assert.match(f.agency.blockers(f.character.id).join(" "), /未报告/);
});
test("另一个角色的主动目的和时间线始终隔离", async (t) => {
  const f = fixture(t, {
    run: async (input) => input.finish({ reason: "安静观察" }),
  });
  f.owner();
  f.goal();
  await f.agency.run(f.character.id);
  const other = f.store.createCharacter({ name: "另一个角色" });
  assert.equal(f.agency.rows(other.id).length, 0);
  assert.equal(todayOverview(f.store, other.id).events.length, 0);
});
test("群聊和别人的私聊目的不能借后台主人身份执行，bot不可伪造目的来源", async (t) => {
  const f = fixture(t, {
    run: async (input) => input.finish({ reason: "安静" }),
  });
  f.owner();
  const group = f.store.conversations.ensure({
    sessionId: "group-source",
    characterId: f.character.id,
    platform: "qq",
    type: "group",
    target: "300001",
  });
  const tools = createTools(f.store, {
    characterId: f.character.id,
    sessionId: group.session_id,
  });
  const goal = tools.starr_goal_create({
    title: "群内秘密目的",
    reason: "不可带到主人私聊",
    originSession: "owner-private",
  });
  assert.equal(goal.originSession, "group-source");
  assert.notEqual(f.agency.plan(f.character.id).goal?.id, goal.id);
  const ownerTools = createTools(f.store, {
    characterId: f.character.id,
    sessionId: "owner-private",
  });
  const own = ownerTools.starr_goal_create({
    title: "主人约定",
    reason: "可信主人私聊来源",
  });
  assert.equal(f.agency.plan(f.character.id).goal.id, own.id);
});
test("连续失败会停止新目的，管理员确认不清除用量和旧目的结果", async (t) => {
  const f = fixture(t, {
    run: async () => {
      throw new Error("synthetic-failure");
    },
  });
  f.owner();
  f.patch({ "agency.failureLimit": 2 });
  let clock = Date.now();
  f.agency.clock = () => clock;
  f.goal();
  await f.agency.run(f.character.id);
  clock += 31 * 60000;
  f.goal();
  await f.agency.run(f.character.id);
  clock += 31 * 60000;
  assert.match(f.agency.blockers(f.character.id).join(" "), /连续失败/);
  const count = f.agency.counters(f.character.id).decisions;
  f.agency.reset(f.character.id);
  assert.doesNotMatch(f.agency.blockers(f.character.id).join(" "), /连续失败/);
  assert.equal(f.agency.counters(f.character.id).decisions, count);
});
test("宿主恢复将未完成外发标为待核对，不重复执行；明确回执优先于后续驱动失败", async (t) => {
  const f = fixture(t, {
    run: async (input) => {
      await input.finish({ text: "只发一次", reason: "真实回执优先" });
      throw new Error("驱动结束失败");
    },
  });
  f.owner();
  f.goal();
  const result = await f.agency.run(f.character.id);
  assert.equal(result.status, "sent");
  assert.equal(f.sends.length, 1);
  f.store.db
    .prepare(
      "INSERT INTO agency_runs(id,character_id,status,reason,actions,created,updated) VALUES('crash',?,'running','模拟宿主退出',1,?,?)",
    )
    .run(f.character.id, Date.now(), Date.now());
  f.agency.start();
  f.agency.stop();
  assert.equal(
    f.agency.rows(f.character.id).find((r) => r.id === "crash").status,
    "uncertain",
  );
  assert.equal(f.sends.length, 1);
});
