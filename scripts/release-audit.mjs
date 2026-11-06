import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function releaseFiles(root) {
  const git = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  );
  if (git.status !== 0) throw new Error("无法读取Git待发布文件清单");
  return [...new Set(git.stdout.split("\0").filter(Boolean))]
    .filter((name) => {
      try {
        // Git 索引仍可能保留本轮已删除的旧源码；分发以当前工作区为准。
        fs.lstatSync(path.join(root, name));
        return true;
      } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
      }
    })
    .sort();
}

export function auditFiles(root, files) {
  const findings = [];
  const patterns = [
    [
      "疑似服务密钥",
      /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/,
    ],
    ["私钥正文", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    [
      "个人机器路径",
      /[A-Z]:[\\/]Users[\\/](?!Public(?:[\\/]|$)|Default(?:[\\/]|$))[A-Za-z0-9_.-]+[\\/]/i,
    ],
    ["疑似真实B站会话凭据", /SESSDATA\s*=\s*[A-Za-z0-9%]{24,}/],
  ];
  for (const name of files) {
    if (path.isAbsolute(name) || name.split(/[\\/]/).includes("..")) {
      findings.push({ file: name, reason: "文件超出仓库目录" });
      continue;
    }
    const filename = path.join(root, name),
      stat = fs.lstatSync(filename);
    if (stat.isSymbolicLink()) {
      findings.push({ file: name, reason: "源码清单包含目录联接或符号链接" });
      continue;
    }
    if (!stat.isFile()) {
      findings.push({ file: name, reason: "不是普通源码文件" });
      continue;
    }
    if (
      /^(?:node_modules|dist|runtime|memory|backups|private|release|data|artifacts|\.git|\.dsh)(?:\/|$)|\.(?:sqlite(?:-wal|-shm)?|db|dpapi|gguf|safetensors|onnx|pt|pth|pem|key|p12|zip|tgz|wav|mp3|flac|ogg)$|(?:^|\/)\.env(?!\.example$)/i.test(
        name,
      )
    )
      findings.push({
        file: name,
        reason: "运行数据、凭据、模型或生成物不应上传",
      });
    if (
      /\.(?:md|txt|json|mjs|cjs|js|ts|tsx|yml|yaml|css|html|py)$/.test(name)
    ) {
      const content = fs.readFileSync(filename, "utf8");
      for (const [reason, pattern] of patterns)
        if (pattern.test(content)) findings.push({ file: name, reason });
    }
  }
  return { checked: files.length, findings, passed: findings.length === 0 };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(import.meta.dirname, ".."),
    result = auditFiles(root, releaseFiles(root));
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
