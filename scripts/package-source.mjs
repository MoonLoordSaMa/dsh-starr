import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { releaseFiles, auditFiles } from "./release-audit.mjs";

const root = path.resolve(import.meta.dirname, ".."),
  args = process.argv.slice(2),
  out = args.indexOf("--out-dir");
const destination = path.resolve(
  out >= 0 ? args[out + 1] : path.join(root, "release"),
);
const files = releaseFiles(root),
  audit = auditFiles(root, files);
if (!audit.passed)
  throw new Error(`源码发布检查未通过：${JSON.stringify(audit.findings)}`);
const version = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
).version;
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "starr-source-"));
try {
  for (const relative of files) {
    const target = path.join(stage, "dsh-starr", relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, relative), target);
  }
  fs.mkdirSync(destination, { recursive: true });
  const archive = path.join(destination, `dsh-starr-${version}-source.zip`);
  const result = spawnSync(
    "tar",
    ["-a", "-cf", archive, "-C", stage, "dsh-starr"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error("源码归档失败");
  const sha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(archive))
    .digest("hex");
  fs.writeFileSync(
    path.join(destination, `dsh-starr-${version}-source.files.json`),
    JSON.stringify({ version, sha256, audit, files }, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      { archive, files: files.length, sha256, auditPassed: true },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
