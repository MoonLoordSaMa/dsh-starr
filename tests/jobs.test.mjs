import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StarrStore } from "../src/starrcore/store.mjs";
import { defaults } from "../src/starrcore/config.mjs";
import { MemoryJobs, dueSlot } from "../src/jobs/service.mjs";
import { createTools } from "../src/host/tools.mjs";
function fixture(t, driver) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-jobs-")),
    store = new StarrStore(path.join(root, "runtime")),
    { character } = store.setup({
      name: "合成整理角色",
      memoryRoot: path.join(root, "memory"),
      backupRoot: path.join(root, "backup"),
    });
  store.configure(
    character.id,
    { "jobs.provider": "test", "jobs.model": "test" },
    { revision: character.revision },
  );
  const jobs = new MemoryJobs(store, { driver });
  t.after(() => {
    jobs.close();
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { store, jobs, id: character.id, root };
}
test("任务依角色时区判断日记时段，旧回顾不再触发，只补最近一次且遵循补跑窗口", () => {
  const c = {
    ...defaults(),
    "jobs.diaryDay.at": "12:00",
    "jobs.diaryDay.catchUpHours": 2,
  };
  assert.equal(
    dueSlot("diaryDay", c, Date.parse("2026-11-03T05:00:00Z")),
    "2026-11-03@12:00",
  );
  assert.equal(
    dueSlot("diaryDay", c, Date.parse("2026-11-03T07:00:00Z")),
    null,
  );
  assert.equal(dueSlot("weekly", c, Date.parse("2026-11-01T12:00:00Z")), null);
  assert.equal(dueSlot("monthly", c, Date.parse("2026-11-01T12:00:00Z")), null);
  assert.equal(dueSlot("yearly", c, Date.parse("2026-11-01T12:00:00Z")), null);
});

test("模型配置缺失会保留失败任务并提示，不对同一时段持续空转", async (t) => {
  const f = fixture(t);
  const c = f.store.character(f.id);
  f.store.configure(
    f.id,
    { "jobs.diaryDay.enabled": true },
    { revision: c.revision },
  );
  await assert.rejects(
    () => f.jobs.run(f.id, "diaryDay", "missing-model"),
    /配置 DSH/,
  );
  assert.equal(f.jobs.status(f.id).recent[0].status, "failed");
  assert.match(f.jobs.status(f.id).configurationError, /日记模型/);
  assert.equal(
    (await f.jobs.run(f.id, "diaryDay", "missing-model")).status,
    "failed",
  );
  const config = {
    ...defaults(),
    "agency.timezone": "Australia/Lord_Howe",
    "jobs.diaryDay.at": "01:45",
    "jobs.diaryDay.catchUpHours": 6,
  };
  assert.equal(
    dueSlot("diaryDay", config, Date.parse("2026-04-04T16:15:00Z")),
    "2026-04-05@01:45",
  );
});
test("同一日记时段仅执行一次，真实工具保存且重开任务与记录均保留", async (t) => {
  let runs = 0,
    f;
  const driver = {
    run: async (input) => {
      runs++;
      const record = createTools(f.store, {
        characterId: input.characterId,
        sessionId: input.sessionId,
      }).starr_memory_write({
        title: "合成日记",
        content: "只有独立测试资料",
        kind: "diary",
        eventKey: input.eventKey,
      });
      return { recordId: record.id };
    },
  };
  f = fixture(t, driver);
  await f.jobs.run(f.id, "diaryDay", "2026-11-03@12:00");
  await f.jobs.run(f.id, "diaryDay", "2026-11-03@12:00");
  assert.equal(runs, 1);
  assert.equal(f.jobs.status(f.id).recent[0].status, "done");
  assert.equal(f.store.listMemory(f.id).length, 1);
  const second = new StarrStore(path.join(f.root, "runtime"));
  try {
    assert.equal(second.listMemory(f.id)[0].title, "合成日记");
    assert.equal(
      second.db.prepare("SELECT status FROM memory_jobs").get().status,
      "done",
    );
  } finally {
    second.close();
  }
});
test("备份不调用模型；同步冲突保留失败；第二调度器不抢锁", async (t) => {
  const f = fixture(t);
  const backup = await f.jobs.run(f.id, "backup", "test");
  assert.equal(backup.status, "done");
  assert.ok(fs.existsSync(JSON.parse(backup.result).path));
  const other = new MemoryJobs(f.store);
  try {
    await assert.rejects(() => other.run(f.id, "backup"), /另一个宿主/);
  } finally {
    other.close();
  }
  const record = f.store.saveMemory(f.id, {
      title: "同步冲突",
      content: "原文",
    }),
    note = path.join(f.root, "memory", f.id, "notes", `${record.id}.md`);
  fs.writeFileSync(note, "外部改写");
  f.store
    .memory(f.id)
    .prepare("INSERT INTO outbox(id,record_id,created) VALUES('retry',?,?)")
    .run(record.id, new Date().toISOString());
  await assert.rejects(
    () => f.jobs.run(f.id, "projection", "conflict"),
    /冲突/,
  );
  assert.equal(fs.readFileSync(note, "utf8"), "外部改写");
  assert.equal(
    f.jobs.status(f.id).recent.find((r) => r.kind === "projection").status,
    "failed",
  );
});
