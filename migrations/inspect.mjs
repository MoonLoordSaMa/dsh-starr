import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

export function inspectBackup(input) {
  const root = fs.realpathSync(path.resolve(input)),
    manifestFile = path.join(root, "complete-manifest.json");
  if (!fs.existsSync(manifestFile))
    throw new Error(
      "没有找到 complete-manifest.json；当前仅支持已交付的完整备份格式",
    );
  const manifest = JSON.parse(
    fs.readFileSync(manifestFile, "utf8").replace(/^\uFEFF/, ""),
  );
  if (manifest.format !== "starr-complete-memory-backup/v1")
    throw new Error("未识别的备份格式");
  const report = {
    format: "starr-migration-preflight/1",
    source: root,
    checkedAt: new Date().toISOString(),
    readOnly: true,
    entries: 0,
    verified: 0,
    missing: [],
    mismatch: [],
    databases: [],
    groups: {},
    warnings: [
      "本报告不导入正文，不自动合并角色，不把重叠来源数量相加。",
      "DSH 会话仅作为原始档案保留，未声称兼容新宿主会话格式。",
      "导入前还需确认旧 ID、角色归属、可见范围与附件映射。",
    ],
  };
  for (const entry of [...manifest.entries, ...(manifest.exports ?? [])]) {
    if (!entry.path || !entry.sha256) continue;
    const p = path.resolve(root, entry.path),
      relative = path.relative(root, p);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("备份清单包含越界路径");
    report.entries++;
    report.groups[entry.group ?? "exports"] =
      (report.groups[entry.group ?? "exports"] ?? 0) + 1;
    if (!fs.existsSync(p)) {
      report.missing.push(entry.path);
      continue;
    }
    if (fs.realpathSync(p) !== p)
      throw new Error("备份包含符号链接或目录联接，拒绝跟随");
    const digest = crypto
      .createHash("sha256")
      .update(fs.readFileSync(p))
      .digest("hex");
    if (digest !== entry.sha256) {
      report.mismatch.push(entry.path);
      continue;
    }
    report.verified++;
  }
  for (const source of manifest.databases ?? []) {
    const file = path.resolve(root, source.path);
    if (!fs.existsSync(file)) continue;
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("数据库路径越界");
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      const tables = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
          )
          .all(),
        counts = {};
      for (const { name } of tables)
        if (
          [
            "records",
            "chunks",
            "links",
            "diaries",
            "summaries",
            "banks",
            "docs",
            "vecs",
          ].includes(name)
        )
          counts[name] = db
            .prepare(`SELECT count(*) count FROM "${name}"`)
            .get().count;
      report.databases.push({
        path: source.path,
        integrity: db.prepare("PRAGMA integrity_check").get().integrity_check,
        tables: counts,
      });
    } finally {
      db.close();
    }
  }
  report.ok =
    !report.missing.length &&
    !report.mismatch.length &&
    report.databases.every((d) => d.integrity === "ok");
  return report;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [input, output] = process.argv.slice(2).filter((v) => v !== "--");
  if (!input) {
    console.error("用法：pnpm migrate:inspect -- <完整备份目录> [报告路径]");
    process.exitCode = 1;
  } else {
    try {
      const result = inspectBackup(input);
      if (output) {
        const destination = path.resolve(output);
        if (
          path.relative(fs.realpathSync(input), destination) === "" ||
          !path.relative(fs.realpathSync(input), destination).startsWith("..")
        )
          throw new Error("预检报告必须写在备份目录之外");
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, JSON.stringify(result, null, 2), {
          flag: "wx",
        });
      }
      console.log(
        JSON.stringify(
          {
            ok: result.ok,
            entries: result.entries,
            verified: result.verified,
            missing: result.missing.length,
            mismatch: result.mismatch.length,
            databases: result.databases,
            report: output ?? "未写文件",
          },
          null,
          2,
        ),
      );
      if (!result.ok) process.exitCode = 1;
    } catch (e) {
      console.error(e.message);
      process.exitCode = 1;
    }
  }
}
