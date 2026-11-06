import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { auditFiles, releaseFiles } from "../scripts/release-audit.mjs";

test("源码发行清单包含新增文件并排除已删除的旧版源码", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-source-list-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  git("init", "--quiet");
  fs.writeFileSync(path.join(root, "obsolete.mjs"), "export const old = true;");
  fs.writeFileSync(path.join(root, "kept.mjs"), "export const kept = true;");
  git("add", ".");
  fs.unlinkSync(path.join(root, "obsolete.mjs"));
  fs.writeFileSync(path.join(root, "new.mjs"), "export const added = true;");
  assert.deepEqual(releaseFiles(root), ["kept.mjs", "new.mjs"]);
  assert.equal(auditFiles(root, releaseFiles(root)).passed, true);
});

test("发布检查允许运行时源码，但拒绝数据、真实格式密钥及个人路径，报告不暴露匹配值", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-release-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const key = "ghp_" + "A".repeat(36),
    personal = "C:" + "/Users/" + "synthetic/Desktop/private";
  const content = {
    "src/runtime/service.mjs": "export const code = true;",
    "runtime/session.json": "{}",
    "secret.json": JSON.stringify({ key, personal }),
    "credential.dpapi": "synthetic",
    ".env.example": "STARR_MEDIA_KEY=",
  };
  for (const [name, text] of Object.entries(content)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  assert.equal(
    auditFiles(root, ["src/runtime/service.mjs", ".env.example"]).passed,
    true,
  );
  const result = auditFiles(root, Object.keys(content));
  assert.equal(result.passed, false);
  assert.ok(
    result.findings.some((finding) => finding.file === "credential.dpapi"),
  );
  assert.ok(
    result.findings.some((finding) => finding.file === "runtime/session.json"),
  );
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.file === "secret.json" && finding.reason.includes("密钥"),
    ),
  );
  assert.ok(
    result.findings.some((finding) => finding.reason.includes("个人机器")),
  );
  assert.equal(JSON.stringify(result).includes(key), false);
  assert.equal(JSON.stringify(result).includes(personal), false);
});
