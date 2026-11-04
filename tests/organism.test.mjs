import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { createTools } from "../src/host/tools.mjs";
import {
  normalizeState,
  applyExperience,
  deriveOrganism,
  evolveState,
  publicState,
  evaluateIntentions,
  stateDimensions,
  inQuietTime,
} from "../src/starrcore/organism.mjs";
const time = Date.parse("2026-11-03T04:00:00Z");
const quietConfig = {
  "agency.enabled": true,
  "agency.timezone": "Asia/Shanghai",
  "agency.quietStart": "23:00",
  "agency.quietEnd": "08:00",
  "agency.cooldownMinutes": 30,
};
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-organism-"));
  const store = new StarrStore(path.join(root, "runtime"));
  store.setup({
    name: "角色 A",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backup"),
  });
  const a = store.listCharacters()[0].id,
    b = store.createCharacter({ name: "角色 B" }).id;
  t.after(() => {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { store, a, b, root };
}
test("同一时刻可期待又焦虑，负面感受不被愉悦覆盖", () => {
  let state = normalizeState({
    joy: 82,
    arousal: 75,
    tension: 76,
    security: 30,
    curiosity: 80,
  });
  state = applyExperience(state, "novelty", 80, "新事物", time);
  const view = deriveOrganism(state);
  assert.ok(view.emotions.find((e) => e.id === "anticipation").intensity >= 40);
  assert.ok(view.emotions.find((e) => e.id === "anxiety").intensity >= 40);
  assert.equal(view.mixed, true);
  assert.ok(view.emotions.some((e) => e.valence > 0 && e.intensity > 50));
  assert.ok(view.emotions.some((e) => e.valence < 0 && e.intensity > 50));
});
test("不同经历改变相应身体与心理，休息可缓解过载而不抹除所有余韵", () => {
  const base = normalizeState();
  const overload = applyExperience(base, "overload", 90, "持续互动", time);
  const rest = applyExperience(overload, "rest", 80, "休息过", time);
  assert.ok(
    overload.energy < base.energy && overload.stimulation > base.stimulation,
  );
  assert.ok(rest.energy > overload.energy && rest.fatigue < overload.fatigue);
  assert.ok(rest._affect.anxiety > 0);
  const meal = applyExperience(base, "meal", 80, "吃饭", time);
  const drink = applyExperience(base, "drink", 80, "喝水", time);
  assert.ok(meal.hunger < base.hunger && meal.thirst === base.thirst);
  assert.ok(drink.thirst < base.thirst && drink.hunger === base.hunger);
});
test("身体匮乏提升休憩目的，孤独与低社交并存时不强制靠近", () => {
  const state = publicState(
    normalizeState({
      energy: 8,
      fatigue: 91,
      sleepiness: 94,
      loneliness: 95,
      social: 12,
    }),
    1,
    time,
  );
  const evaluated = evaluateIntentions(state, quietConfig, [], time);
  assert.equal(evaluated.candidates[0].id, "rest");
  assert.equal(evaluated.candidates[0].status, "ready");
  assert.match(
    evaluated.candidates.find((d) => d.id === "connection").blockers.join(" "),
    /不愿社交/,
  );
  assert.ok(
    evaluated.candidates
      .filter((d) => d.external)
      .every((d) => d.status === "waiting"),
  );
  assert.equal(evaluated.execution, "proposal-only");
});
test("关闭主动性、跨午夜安静时段、冷却与未来约定均可解释地等待", () => {
  const night = Date.parse("2026-11-03T16:15:00Z");
  assert.equal(inQuietTime(night, "23:00", "08:00", "Asia/Shanghai"), true);
  assert.equal(inQuietTime(time, "23:00", "08:00", "Asia/Shanghai"), false);
  assert.equal(inQuietTime(time, "12:00", "12:00", "Asia/Shanghai"), false);
  const s = publicState(
    normalizeState({ loneliness: 90, social: 85 }),
    1,
    night,
  );
  const goals = [
    {
      id: "done",
      title: "已联系",
      status: "completed",
      due: null,
      updated: new Date(night - 60000).toISOString(),
      external: true,
    },
    {
      id: "future",
      title: "以后休息",
      status: "waiting",
      due: new Date(night + 3600000).toISOString(),
      drive: "rest",
    },
  ];
  const result = evaluateIntentions(s, quietConfig, goals, night);
  assert.equal(result.quiet, true);
  assert.equal(result.cooldown, true);
  assert.match(
    result.candidates.find((d) => d.id === "connection").blockers.join(" "),
    /安静时段.*冷却/,
  );
  assert.match(
    result.goals.find((g) => g.id === "future").blockers.join(" "),
    /时间还没到/,
  );
  assert.ok(
    evaluateIntentions(
      s,
      { ...quietConfig, "agency.enabled": false },
      [],
      night,
    ).candidates.every((d) => d.status === "waiting"),
  );
});
test("长时离线演化有上限，时钟倒退不反向累积，所有维度仍有限且有界", () => {
  const raw = {
    ...normalizeState({ energy: 99, hunger: 99, thirst: 99 }),
    _updatedAt: new Date(time).toISOString(),
    _affect: { anxiety: 60 },
  };
  const sixHours = evolveState(raw, time + 6 * 3600000);
  const tenDays = evolveState(raw, time + 10 * 86400000);
  for (const d of stateDimensions) {
    assert.equal(sixHours[d.key], tenDays[d.key]);
    assert.ok(
      Number.isFinite(tenDays[d.key]) &&
        tenDays[d.key] >= 0 &&
        tenDays[d.key] <= 100,
    );
  }
  assert.equal(evolveState(raw, time - 3600000).energy, raw.energy);
  assert.equal(evolveState(raw, time - 3600000)._updatedAt, raw._updatedAt);
  assert.ok(tenDays._affect.anxiety < raw._affect.anxiety);
});
test("经历原子持久化、重试去重、修订冲突及角色隔离；派生字段不能回灌", (t) => {
  const { store, a, b, root } = fixture(t);
  const input = {
    revision: 1,
    eventKey: "same-experience",
    kind: "threat",
    intensity: 80,
    evidence: "不安全的处境",
  };
  const first = store.recordExperience(a, input);
  assert.equal(first.revision, 2);
  assert.ok(first.security < store.getState(b).security);
  const retry = store.recordExperience(a, input);
  assert.equal(retry.duplicate, true);
  assert.equal(store.getState(a).revision, 2);
  assert.throws(
    () => store.recordExperience(a, { ...input, intensity: 20 }),
    /其他内容/,
  );
  assert.throws(
    () => store.recordExperience(a, { ...input, eventKey: "raced" }),
    /刷新/,
  );
  assert.throws(
    () =>
      store.updateState(a, {
        revision: 2,
        values: { organism: first.organism },
      }),
    /未知/,
  );
  assert.equal(store.stateHistory(a).length, 1);
  assert.equal(store.stateHistory(a)[0].experience.kind, "threat");
  const other = new StarrStore(path.join(root, "runtime"));
  try {
    assert.equal(other.getState(a).security, first.security);
    assert.equal(other.getState(a).revision, 2);
  } finally {
    other.close();
  }
  const row = store
    .memory(a)
    .prepare("SELECT data FROM state WHERE id=1")
    .get().data;
  store.getState(a);
  store.intentions(a);
  assert.equal(
    store.memory(a).prepare("SELECT data FROM state WHERE id=1").get().data,
    row,
  );
});
test("工具绑定可信经历来源，目的与驱动力重开仍关联，评估不创建或执行任务", (t) => {
  const { store, a, b } = fixture(t);
  store.conversations.ensure({ sessionId: "bound", characterId: a });
  const tools = createTools(store, { characterId: a, sessionId: "bound" });
  const result = tools.starr_experience_record({
    characterId: b,
    revision: 1,
    eventKey: "trusted",
    kind: "bond",
    intensity: 70,
    evidence: "被理解",
    source: "伪造",
  });
  assert.match(result.evidence, /^DSH 会话 bound/);
  assert.equal(store.getState(b).revision, 1);
  const goal = tools.starr_goal_create({
    title: "歇一会",
    reason: "有些疲劳",
    drive: "rest",
  });
  assert.equal(goal.drive, "rest");
  assert.equal(store.goals(a)[0].action, "rest");
  const count = store.goals(a).length;
  tools.starr_intention_evaluate();
  tools.starr_intention_evaluate();
  assert.equal(store.goals(a).length, count);
  assert.equal(store.goals(b).length, 0);
  assert.throws(
    () =>
      tools.starr_goal_create({
        title: "错误",
        reason: "无效驱动",
        drive: "constructor",
      }),
    /未知/,
  );
});
