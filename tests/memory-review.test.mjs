import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { StarrStore } from "../src/starrcore/store.mjs";
import { prepareMemoryReview } from "../scripts/prepare-memory-review.mjs";

function fixture(t, count = 2) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-review-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new StarrStore(path.join(root, "runtime"));
  const { character } = store.setup({
    name: "合成角色",
    memoryRoot: path.join(root, "memory"),
    backupRoot: path.join(root, "backups"),
  });
  const id = character.id;
  store.db.prepare("UPDATE installation SET data=?").run(
    JSON.stringify({
      ...store.installation(),
      vaultLayout: { format: 2, characters: { [id]: "01-合成角色" } },
    }),
  );
  const notes = Array.from({ length: count }, (_, i) =>
    store.saveMemory(id, { title: `旧笔记 ${i}`, content: `合成原文 ${i}` }),
  );
  const diary = store.saveMemory(id, {
    kind: "diary",
    title: "合成日记",
    content: `逐字保留的日记\n\n[[${store.noteLink(id, notes[0].id)}]]`,
  });
  const diaryFile = path.relative(
    store.notesRoot(id),
    store.noteFile(id, diary),
  );
  const dbFile = path.join(store.characterRoot(id), ".starr/memory.sqlite"),
    notesRoot = store.notesRoot(id);
  store.close();
  const backupRoot = path.join(root, "export");
  fs.mkdirSync(backupRoot);
  fs.copyFileSync(
    path.join(root, "runtime/installation.sqlite"),
    path.join(backupRoot, "installation.sqlite"),
  );
  fs.copyFileSync(dbFile, path.join(backupRoot, "memory.sqlite"));
  fs.cpSync(notesRoot, path.join(backupRoot, "记忆笔记"), { recursive: true });
  const plan = {
    characterId: id,
    notes: [
      {
        title: "精简理解",
        content: "合成的新理解",
        sources: [notes[0].id],
        anchor: true,
      },
    ],
    archive: notes.slice(1).map((row) => ({ id: row.id, reason: "合成精简" })),
  };
  const planFile = path.join(root, "plan.json");
  const write = () => fs.writeFileSync(planFile, JSON.stringify(plan));
  write();
  const destination = path.join(root, "review");
  return {
    root,
    id,
    notes,
    diary,
    diaryFile,
    backupRoot,
    plan,
    planFile,
    destination,
    write,
    run: () => prepareMemoryReview({ backupRoot, planFile, destination }),
  };
}

test("审核副本处理超过一批投影，源备份不变，原文可恢复，日记与旧引用保留", (t) => {
  const f = fixture(t, 125);
  const hash = (file) =>
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const sourceFiles = [
    "memory.sqlite",
    "installation.sqlite",
    path.join("记忆笔记", f.diaryFile),
  ];
  const before = sourceFiles.map((p) => hash(path.join(f.backupRoot, p)));
  const report = f.run();
  assert.equal(report.before, 125);
  assert.equal(report.after, 1);
  assert.equal(report.diaryFilesUnchanged, 1);
  assert.deepEqual(
    sourceFiles.map((p) => hash(path.join(f.backupRoot, p))),
    before,
  );
  const store = new StarrStore(path.join(f.destination, "runtime"));
  try {
    const db = store.memory(f.id);
    assert.equal(
      db.prepare("SELECT count(*) n FROM record_archive").get().n,
      125,
    );
    assert.equal(
      db.prepare("SELECT content FROM records WHERE id=?").get(f.notes[100].id)
        .content,
      f.notes[100].content,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM outbox WHERE status<>'done'").get().n,
      0,
    );
    assert.equal(
      db.prepare("SELECT content FROM records WHERE id=?").get(f.diary.id)
        .content,
      f.diary.content,
    );
    assert.equal(
      hash(path.join(store.notesRoot(f.id), f.diaryFile)),
      before[2],
    );
    assert.equal(report.compatibility.length, 1);
    assert.ok(
      fs.existsSync(path.join(store.notesRoot(f.id), report.compatibility[0])),
    );
    assert.equal(store.character(f.id).config["agency.enabled"], false);
    assert.equal(store.character(f.id).config["bili.enabled"], false);
    assert.ok(store.installation().memoryRoot.startsWith(f.destination));
  } finally {
    store.close();
  }
  assert.throws(f.run, /已存在/);
});

test("审核整理拒绝漏掉来源、扩大私密范围、旧目录格式和输入重叠", (t) => {
  const f = fixture(t);
  f.plan.archive = [];
  f.write();
  assert.throws(f.run, /未说明去向/);
  assert.equal(fs.existsSync(f.destination), false);
  const db = new DatabaseSync(path.join(f.backupRoot, "memory.sqlite"));
  for (const [i, row] of f.notes.entries())
    db.prepare("INSERT OR REPLACE INTO record_visibility VALUES(?,?,?)").run(
      row.id,
      "conversation",
      `private-${i}`,
    );
  db.close();
  f.plan.notes[0].sources = f.notes.map((r) => r.id);
  f.write();
  assert.throws(f.run, /可见范围/);
  assert.throws(
    () =>
      prepareMemoryReview({
        ...f,
        destination: path.join(f.backupRoot, "output"),
      }),
    /不能重叠/,
  );
  const runtime = new DatabaseSync(
    path.join(f.backupRoot, "installation.sqlite"),
  );
  const install = JSON.parse(
    runtime.prepare("SELECT data FROM installation").get().data,
  );
  delete install.vaultLayout;
  runtime
    .prepare("UPDATE installation SET data=?")
    .run(JSON.stringify(install));
  runtime.close();
  assert.throws(f.run, /仅支持可读目录格式 2/);
  assert.equal(fs.existsSync(f.destination), false);
});
