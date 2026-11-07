import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { StarrStore } from "../src/starrcore/store.mjs";
import { MemoryMaintenance } from "../src/starrcore/maintenance.mjs";
import { readableNotePath, relativePath } from "../src/starrcore/vault.mjs";

// 输入为事先导出的备份。只创建独立审核副本，不能覆盖目标或写回输入。
export function prepareMemoryReview({ backupRoot, planFile, destination }) {
  const input = fs.realpathSync(backupRoot);
  // 解析最近的真实父目录，目录联接不能绕过输入/输出隔离。
  const realDestination = (value) => {
    if (fs.existsSync(value)) return fs.realpathSync(value);
    const parent = path.dirname(value);
    if (parent === value) throw new Error("审核目录的父目录不存在");
    return path.join(realDestination(parent), path.basename(value));
  };
  const target = realDestination(path.resolve(destination));
  if (fs.existsSync(target)) throw new Error("审核目录已存在，请选择新目录");
  const inside = (a, b) => {
    const rel = path.relative(a, b);
    return !rel || (!rel.startsWith("..") && !path.isAbsolute(rel));
  };
  if (inside(input, target) || inside(target, input))
    throw new Error("审核目录和输入备份不能重叠");
  const originalRuntime = new DatabaseSync(
    path.join(input, "installation.sqlite"),
    { readOnly: true },
  );
  try {
    const originalInstallation = JSON.parse(
      originalRuntime.prepare("SELECT data FROM installation").get().data,
    );
    if (originalInstallation.vaultLayout?.format !== 2)
      throw new Error("审核整理仅支持可读目录格式 2，请先独立导出该格式的备份");
  } finally {
    originalRuntime.close();
  }
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  const source = new DatabaseSync(path.join(input, "memory.sqlite"), {
    readOnly: true,
  });
  const diaryBefore = source
    .prepare("SELECT * FROM records WHERE kind='diary' ORDER BY id")
    .all();
  const active = source
    .prepare(
      "SELECT r.* FROM records r WHERE r.kind<>'diary' AND r.id NOT IN(SELECT record_id FROM record_archive)",
    )
    .all();
  const scopes = new Map(
    source
      .prepare("SELECT * FROM record_visibility")
      .all()
      .map((r) => [r.record_id, r]),
  );
  source.close();
  const known = new Set(active.map((r) => r.id)),
    covered = new Set();
  if (
    !Array.isArray(plan.notes) ||
    !Array.isArray(plan.archive) ||
    !plan.characterId
  )
    throw new Error("精简方案无效");
  for (const n of plan.notes) {
    if (
      !n.sources?.length ||
      typeof n.title !== "string" ||
      typeof n.content !== "string"
    )
      throw new Error("笔记缺少正文或来源");
    const sourceScopes = n.sources.map(
      (id) => scopes.get(id) || { visibility: "unclassified", session_id: "" },
    );
    if (
      new Set(
        sourceScopes.map((s) => JSON.stringify([s.visibility, s.session_id])),
      ).size > 1 &&
      !sourceScopes.every((s) => s.visibility === "shared")
    )
      throw new Error("合并不能扩大原记忆的可见范围");
    for (const id of n.sources) {
      if (!known.has(id)) throw new Error("合并来源不是活动非日记");
      covered.add(id);
    }
  }
  for (const n of plan.archive) {
    if (!known.has(n.id)) throw new Error("归档来源无效");
    covered.add(n.id);
  }
  if (covered.size !== known.size) throw new Error("有旧笔记未说明去向");
  fs.mkdirSync(path.join(target, "runtime"), { recursive: true });
  fs.copyFileSync(
    path.join(input, "installation.sqlite"),
    path.join(target, "runtime/installation.sqlite"),
  );
  const runtime = new DatabaseSync(
    path.join(target, "runtime/installation.sqlite"),
  );
  const install = JSON.parse(
    runtime.prepare("SELECT data FROM installation").get().data,
  );
  install.memoryRoot = path.join(target, "记忆库");
  install.backupRoot = path.join(target, "备份");
  // 审核副本只包含计划角色，避免其他角色记录仍指向原目录。
  if (runtime.prepare("SELECT count(*) n FROM characters").get().n !== 1)
    throw new Error("多角色备份请先分别导出，不能自动混合");
  if (
    !runtime
      .prepare("SELECT 1 FROM characters WHERE id=?")
      .get(plan.characterId)
  )
    throw new Error("方案与备份角色不一致");
  const role = runtime
    .prepare("SELECT config FROM characters WHERE id=?")
    .get(plan.characterId);
  const config = JSON.parse(role.config);
  for (const key of Object.keys(config))
    if (key.startsWith("jobs.") && key.endsWith(".enabled"))
      config[key] = false;
  config["agency.enabled"] = false;
  config["bili.enabled"] = false;
  config["files.workspaceRoot"] = path.join(target, "文件工作区");
  runtime
    .prepare("UPDATE characters SET config=? WHERE id=?")
    .run(JSON.stringify(config), plan.characterId);
  if (
    runtime
      .prepare("SELECT 1 FROM sqlite_master WHERE name='qq_settings'")
      .get()
  ) {
    const row = runtime
      .prepare("SELECT data FROM qq_settings WHERE id=1")
      .get();
    if (row)
      runtime
        .prepare("UPDATE qq_settings SET data=? WHERE id=1")
        .run(JSON.stringify({ ...JSON.parse(row.data), enabled: false }));
  }
  runtime
    .prepare("UPDATE installation SET data=?")
    .run(JSON.stringify(install));
  runtime.close();
  const folder =
    install.vaultLayout?.characters?.[plan.characterId] || plan.characterId;
  const roleRoot = path.join(install.memoryRoot, relativePath(folder));
  fs.mkdirSync(path.join(roleRoot, ".starr"), { recursive: true });
  fs.copyFileSync(
    path.join(input, "memory.sqlite"),
    path.join(roleRoot, ".starr/memory.sqlite"),
  );
  const notesRoot = path.join(
    roleRoot,
    install.vaultLayout?.format === 2 ? "记忆笔记" : "notes",
  );
  if (fs.existsSync(path.join(input, "记忆笔记")))
    fs.cpSync(path.join(input, "记忆笔记"), notesRoot, {
      recursive: true,
      filter: (file) => {
        if (fs.lstatSync(file).isSymbolicLink()) throw new Error("备份含联接");
        return true;
      },
    });
  const store = new StarrStore(path.join(target, "runtime")),
    maintenance = new MemoryMaintenance(store),
    db = store.memory(plan.characterId);
  const digest = (value) =>
    crypto
      .createHash("sha256")
      .update(typeof value === "string" ? value : JSON.stringify(value))
      .digest("hex");
  const walk = (dir) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .flatMap((e) =>
            e.isDirectory()
              ? walk(path.join(dir, e.name))
              : [path.join(dir, e.name)],
          )
      : [];
  const diaryFiles = walk(notesRoot).filter((p) =>
    path.relative(notesRoot, p).startsWith("05-日记"),
  );
  const diaryHashes = new Map(
    diaryFiles.map((p) => [p, digest(fs.readFileSync(p).toString())]),
  );
  const redirects = new Map();
  for (const file of diaryFiles) {
    for (const match of fs
      .readFileSync(file, "utf8")
      .matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
      const id = store.noteIdFromLink(plan.characterId, match[1]);
      if (id) redirects.set(id, match[1]);
    }
  }
  const mapping = [];
  try {
    for (const row of active)
      maintenance.archive(plan.characterId, {
        id: row.id,
        revision: row.revision,
        reason: "本次人工精简：原文保留，可按来源映射恢复",
      });
    for (let index = 0; index < plan.notes.length; index++) {
      const n = plan.notes[index],
        sourceRows = active.filter((r) => n.sources.includes(r.id));
      const saved = store.saveMemory(plan.characterId, {
        title: n.title,
        content: n.content,
        kind: "moment",
        anchor: !!n.anchor,
        importance: n.anchor ? 90 : 60,
        confidence: Math.min(...sourceRows.map((r) => r.confidence)),
        source: "人工精简旧笔记；完整来源见整理映射",
        eventKey: `review-v024-${index}`,
      });
      const scope = scopes.get(n.sources[0]);
      if (scope)
        db.prepare(
          "INSERT OR REPLACE INTO record_visibility VALUES(?,?,?)",
        ).run(
          saved.id,
          scope.visibility,
          scope.visibility === "shared" ? "" : scope.session_id,
        );
      mapping.push({
        id: saved.id,
        title: n.title,
        sources: n.sources,
        content: n.content,
        anchor: !!n.anchor,
      });
    }
    // 将旧笔记归入可恢复档案；不动日记文件。日记引用的旧路径留小型转跳笔记。
    const moves = [];
    for (const row of db
      .prepare("SELECT * FROM records WHERE kind<>'diary'")
      .all()) {
      const oldFile = store.noteFile(plan.characterId, row);
      if (
        fs.existsSync(oldFile) &&
        row.projection_hash &&
        digest(fs.readFileSync(oldFile).toString()) !== row.projection_hash
      )
        throw new Error("副本有外部改动，停止整理：" + row.id);
      const archived = !!db
        .prepare("SELECT 1 FROM record_archive WHERE record_id=?")
        .get(row.id);
      const next = archived
        ? `09-历史归档/${row.id}.md`
        : readableNotePath(row);
      const dest = path.join(notesRoot, relativePath(next));
      if (oldFile !== dest) {
        if (fs.existsSync(dest)) throw new Error("目标笔记重名");
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (fs.existsSync(oldFile)) fs.renameSync(oldFile, dest);
        db.prepare(
          "INSERT INTO note_paths VALUES(?,?) ON CONFLICT(record_id) DO UPDATE SET relative_path=excluded.relative_path",
        ).run(row.id, next);
        moves.push({
          id: row.id,
          from: path.relative(notesRoot, oldFile).replaceAll("\\", "/"),
          to: next,
        });
      }
    }
    const now = new Date().toISOString();
    for (const row of db
      .prepare("SELECT id FROM records WHERE kind<>'diary'")
      .all())
      db.prepare("INSERT INTO outbox(id,record_id,created) VALUES(?,?,?)").run(
        crypto.randomUUID(),
        row.id,
        now,
      );
    for (let pass = 0; pass < Math.ceil(moves.length / 100) + 3; pass++) {
      store.flushProjection(plan.characterId);
      if (
        !db.prepare("SELECT count(*) n FROM outbox WHERE status<>'done'").get()
          .n
      )
        break;
    }
    if (
      db.prepare("SELECT count(*) n FROM outbox WHERE status<>'done'").get().n
    )
      throw new Error("有笔记同步未完成，请保留副本排查");
    const compatibility = [];
    for (const move of moves.filter((m) => redirects.has(m.id))) {
      const file = path.join(notesRoot, move.from);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const link = store.noteLink(plan.characterId, move.id);
      fs.writeFileSync(
        file,
        `# 旧日记链接\n\n原笔记已归档，原文仍在：[[${link}]]\n`,
      );
      compatibility.push(move.from);
    }
    // 空旧目录删除，包含未登记文件的目录保留原件到档案。
    const registered = new Set(
      db
        .prepare("SELECT relative_path FROM note_paths")
        .all()
        .map((r) => path.resolve(notesRoot, r.relative_path)),
    );
    const compatSet = new Set(
      compatibility.map((p) => path.resolve(notesRoot, p)),
    );
    for (const file of walk(notesRoot))
      if (
        !registered.has(path.resolve(file)) &&
        !compatSet.has(path.resolve(file)) &&
        !diaryHashes.has(file) &&
        !path.relative(notesRoot, file).startsWith("09-历史归档")
      ) {
        const dest = path.join(
          notesRoot,
          "09-历史归档/未登记原文件",
          path.relative(notesRoot, file),
        );
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(file, dest);
      }
    const prune = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true }))
        if (e.isDirectory()) {
          const child = path.join(dir, e.name);
          prune(child);
          if (!fs.readdirSync(child).length) fs.rmdirSync(child);
        }
    };
    prune(notesRoot);
    const diaryAfter = db
      .prepare("SELECT * FROM records WHERE kind='diary' ORDER BY id")
      .all();
    if (digest(diaryBefore) !== digest(diaryAfter))
      throw new Error("日记数据库校验失败");
    for (const [file, hash] of diaryHashes)
      if (digest(fs.readFileSync(file).toString()) !== hash)
        throw new Error("日记原文件校验失败");
    const index = `# 记忆索引\n\n## 笔记\n\n${mapping.map((n) => `- [[${store.noteLink(plan.characterId, n.id)}|${n.title}]]`).join("\n")}\n\n## 日记\n\n日记原文与原目录保持，按日期阅读。\n\n旧笔记归入 09-历史归档，完整来源保存在整理映射中。\n`;
    fs.writeFileSync(path.join(notesRoot, "00-记忆索引.md"), index);
    const report = {
      characterId: plan.characterId,
      before: active.length,
      after: mapping.length,
      beforeChars: active.reduce((n, r) => n + r.content.length, 0),
      afterChars: mapping.reduce((n, r) => n + r.content.length, 0),
      diary: diaryAfter.length,
      diaryHash: digest(diaryAfter),
      diaryFilesUnchanged: diaryHashes.size,
      mapping,
      archive: plan.archive,
      moves,
      compatibility,
      productionModified: false,
    };
    fs.writeFileSync(
      path.join(target, "整理映射-private.json"),
      JSON.stringify(report, null, 2),
    );
    fs.writeFileSync(
      path.join(target, "精简笔记预览.md"),
      mapping.map((n) => `# ${n.title}\n\n${n.content}\n`).join("\n---\n\n"),
    );
    return {
      destination: target,
      before: report.before,
      after: report.after,
      beforeChars: report.beforeChars,
      afterChars: report.afterChars,
      diary: report.diary,
      diaryHash: report.diaryHash,
      diaryFilesUnchanged: report.diaryFilesUnchanged,
      compatibility,
    };
  } finally {
    store.close();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  const args = process.argv.slice(2),
    get = (name) => args[args.indexOf(name) + 1];
  if (
    !args.includes("--backup") ||
    !args.includes("--plan") ||
    !args.includes("--out")
  )
    throw new Error(
      "用法：--backup 只读备份目录 --plan 精简方案.json --out 新审核目录",
    );
  console.log(
    JSON.stringify(
      prepareMemoryReview({
        backupRoot: get("--backup"),
        planFile: get("--plan"),
        destination: get("--out"),
      }),
    ),
  );
}
