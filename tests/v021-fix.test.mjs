import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { StarrStore } from "../src/starrcore/store.mjs";
import { Agency } from "../src/agency/service.mjs";
import { QQService } from "../src/qq/service.mjs";
import { createTools } from "../src/host/tools.mjs";
import { jsonResult } from "../src/host/json-result.mjs";
import { TabbitBrowser } from "../src/browser/tabbit.mjs";
import { BiliActivities } from "../src/bili/activities.mjs";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-fix-"));
  const store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成自主角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const id = character.id;
  const patch = (p) =>
    store.configure(id, p, { revision: store.character(id).revision });
  patch({
    "agency.enabled": true,
    "agency.level": "browse",
    "agency.quietStart": "00:00",
    "agency.quietEnd": "00:00",
  });
  const qq = new QQService(store);
  store.db.prepare("INSERT INTO qq_settings VALUES(1,1,?)").run(
    JSON.stringify({
      ...qq.settings().config,
      provider: "synthetic",
      model: "synthetic",
    }),
  );
  let clock = Date.now();
  const agency = new Agency(store, {
    qq,
    clock: () => clock,
    driver: { run: (input) => input.finish({ reason: "自主决定安静" }) },
  });
  t.after(() => {
    agency.close();
    qq.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return {
    store,
    id,
    agency,
    patch,
    setClock: (v) => (clock = v),
    now: () => clock,
  };
}
test("定期唤醒不创建假目的，状态不提供预设候选，角色决定下次唤醒且重开保留", async (t) => {
  const f = fixture(t);
  const next = new Date(f.now() + 45 * 60000).toISOString();
  assert.deepEqual(f.store.getState(f.id).organism.drives, []);
  assert.deepEqual(f.store.intentions(f.id).candidates, []);
  f.agency.driver = {
    run: (input) =>
      input.finish({ reason: "稍后再自主评估", goalId: null, nextAt: next }),
  };
  assert.equal((await f.agency.run(f.id)).status, "silent");
  assert.equal(f.store.goals(f.id).length, 0);
  f.setClock(f.now() + 21 * 60000);
  assert.equal(f.agency.plan(f.id).goal, null);
  const reopened = new StarrStore(f.store.dataRoot);
  try {
    assert.equal(
      reopened.db.prepare("SELECT next_at FROM agency_wake").get().next_at,
      Date.parse(next),
    );
  } finally {
    reopened.close();
  }
  f.setClock(Date.parse(next) + 1);
  assert.match(f.agency.plan(f.id).goal.id, /^routine:/);
});
test("角色可保存不同优先级目的，跨自主轮次读取并改选或放下，无需预设驱动力", async (t) => {
  const f = fixture(t);
  let low, high;
  f.agency.driver = {
    run: async (input) => {
      const tools = createTools(f.store, {
        characterId: f.id,
        sessionId: input.sessionId,
      });
      low = tools.starr_goal_create({
        title: "整理自己的随笔",
        reason: "自主兴趣",
        priority: 20,
      });
      high = tools.starr_goal_create({
        title: "核验一个有趣问题",
        reason: "自主问题",
        priority: 90,
      });
      return input.finish({ reason: "已决定下一步", goalId: null });
    },
  };
  await f.agency.run(f.id);
  assert.equal(f.agency.plan(f.id).goal.id, high.id);
  assert.equal(low.ongoing, true);
  f.agency.driver = {
    run: (input) => {
      const tools = createTools(f.store, {
        characterId: f.id,
        sessionId: input.sessionId,
      });
      assert.ok(tools.starr_goal_list().some((g) => g.id === low.id));
      return input.finish({
        reason: "自主改选后决定放下随笔",
        goalId: low.id,
        goalStatus: "cancelled",
      });
    },
  };
  await f.agency.run(f.id);
  assert.equal(
    f.store.goals(f.id).find((g) => g.id === low.id).status,
    "cancelled",
  );
  assert.equal(
    f.store.goals(f.id).find((g) => g.id === high.id).status,
    "waiting",
  );
});
test("普通私聊和群聊不能通过目的列表、评估或上下文读出另一会话的目的", (t) => {
  const f = fixture(t);
  for (const sessionId of ["one", "two"])
    f.store.conversations.ensure({
      sessionId,
      characterId: f.id,
      platform: "qq",
      type: "private",
      account: "synthetic",
      target: sessionId,
    });
  const one = createTools(f.store, { characterId: f.id, sessionId: "one" }),
    two = createTools(f.store, { characterId: f.id, sessionId: "two" });
  const goal = one.starr_goal_create({
    title: "仅一号会话可见的私人事项",
    reason: "测试隔离",
  });
  assert.equal(two.starr_goal_list().length, 0);
  assert.equal(two.starr_intention_evaluate().goals.length, 0);
  assert.throws(
    () => two.starr_goal_update({ id: goal.id, step: 0, progress: "越界" }),
    /当前会话/,
  );
  assert.doesNotMatch(
    f.store.conversations.context("two").text,
    /仅一号会话可见/,
  );
});
test("安静时段允许内部探索，实际外发仍受管理员作息约束", async (t) => {
  const f = fixture(t);
  f.patch({ "agency.quietStart": "00:00", "agency.quietEnd": "23:59" });
  f.setClock(Date.parse("2026-11-07T04:00:00Z"));
  assert.equal(f.agency.plan(f.id).blockers.length, 0);
  f.agency.driver = {
    run: (input) => {
      input.reserve("tool");
      assert.throws(() => input.reserve("action"), /安静时段/);
      return input.finish({ reason: "只完成内部探索" });
    },
  };
  assert.equal((await f.agency.run(f.id)).status, "silent");
});
test("宿主同步及异步结果均可无损JSON往返，缺省值不再携带undefined", async () => {
  const input = {
    title: "真实文本",
    vision: undefined,
    items: [null, 0, false, ""],
  };
  assert.deepEqual(jsonResult(input), {
    title: "真实文本",
    items: [null, 0, false, ""],
  });
  assert.equal(jsonResult(undefined), null);
  assert.deepEqual(await jsonResult(Promise.resolve(input)), jsonResult(input));
});
test("浏览器不限制域名和跳转域名，结果严格JSON，失败保留真实错误", async (t) => {
  const f = fixture(t);
  f.patch({ "browser.enabled": true });
  let failed = false;
  const browser = new TabbitBrowser(f.store, {
    invoke: async (_program, args, source) => {
      if (args[0] === "finish") return { finished: true };
      if (source?.includes("page.close"))
        return { status: "succeeded", result: { value: { closed: true } } };
      if (failed)
        return { status: "failed", error: { message: "合成导航错误" } };
      return {
        status: "succeeded",
        result: {
          value: {
            url: "https://another.test/",
            text: "真实模拟结果",
            links: [
              { text: "其他站点", url: "https://third.test/" },
              { url: "javascript:alert(1)" },
            ],
          },
        },
      };
    },
  });
  const result = await browser.read(f.id, { url: "https://arbitrary.test/" });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.equal(result.links.length, 1);
  assert.equal(result.vision, null);
  failed = true;
  await assert.rejects(
    browser.read(f.id, { url: "https://arbitrary.test/" }),
    /合成导航错误/,
  );
});
test("旧固定动态栏目即使保留启用值也不再定时触发", async (t) => {
  const f = fixture(t);
  f.patch({
    "bili.dynamics.enabled": true,
    "bili.dynamics.best.enabled": true,
    "bili.dynamics.best.at": "12:00",
    "bili.watch.enabled": false,
  });
  const activities = new BiliActivities({
    store: f.store,
    activityDriver: {},
    clock: () => Date.parse("2026-11-07T04:10:00Z"),
  });
  let count = 0;
  activities.run = async () => count++;
  await activities.tick(f.id, {}, {}, new AbortController().signal);
  assert.equal(count, 0);
});
