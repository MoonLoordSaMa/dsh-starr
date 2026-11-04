import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2),
  outIndex = args.indexOf("--out-dir");
const destination = path.resolve(
  outIndex >= 0 ? args[outIndex + 1] : path.join(repo, "release"),
);
const run = (script, parameters = []) => {
  const result = spawnSync(process.execPath, [script, ...parameters], {
    cwd: repo,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`构建检查失败：${script}`);
};
run("scripts/build-runtime.mjs");
run("node_modules/typescript/bin/tsc", ["--noEmit"]);
run("node_modules/vite/bin/vite.js", ["build"]);
const manifest = JSON.parse(
  fs.readFileSync(path.join(repo, "package.json"), "utf8"),
);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "starr-package-"));
const stage = path.join(temp, "package");
fs.mkdirSync(stage);
fs.mkdirSync(destination, { recursive: true });
try {
  for (const entry of manifest.files)
    fs.cpSync(path.join(repo, entry), path.join(stage, entry), {
      recursive: true,
      filter: (source) => !source.endsWith(".ts") && !source.endsWith(".map"),
    });
  // 后端仅使用Node内置模块；前端依赖已构建进dist，不让新用户再拉取整套开发工具。
  const {
    dependencies,
    devDependencies,
    scripts,
    private: _private,
    ...distributed
  } = manifest;
  fs.writeFileSync(
    path.join(stage, "package.json"),
    JSON.stringify(distributed, null, 2) + "\n",
  );
  const files = [];
  const walk = (dir, prefix = "package") => {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const file = path.join(dir, entry.name),
        name = `${prefix}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`分发中不允许联接：${name}`);
      if (entry.isDirectory()) walk(file, name);
      else if (entry.isFile())
        files.push({ file, name, bytes: fs.readFileSync(file) });
    }
  };
  walk(stage);
  for (const item of files.filter((item) => /\.(mjs|js)$/.test(item.name))) {
    if (
      /\b(?:from\s*|import\s*\()\s*["'][^"']+\.ts["']/.test(
        item.bytes.toString(),
      )
    )
      throw new Error(`仍有运行时TypeScript依赖：${item.name}`);
  }
  // 原生ustar写入，固定元信息和排序，重复构建能得到相同压缩包。
  const octal = (buffer, offset, length, value) =>
    buffer.write(
      value.toString(8).padStart(length - 1, "0") + "\0",
      offset,
      length,
      "ascii",
    );
  const archive = [];
  for (const item of files) {
    const header = Buffer.alloc(512);
    if (Buffer.byteLength(item.name) > 100) {
      const split = item.name.lastIndexOf("/"),
        prefix = item.name.slice(0, split),
        name = item.name.slice(split + 1);
      if (Buffer.byteLength(prefix) > 155 || Buffer.byteLength(name) > 100)
        throw new Error("归档路径过长");
      header.write(name, 0, 100);
      header.write(prefix, 345, 155);
    } else header.write(item.name, 0, 100);
    octal(header, 100, 8, 0o644);
    octal(header, 108, 8, 0);
    octal(header, 116, 8, 0);
    octal(header, 124, 12, item.bytes.length);
    octal(header, 136, 12, 946684800);
    header.fill(32, 148, 156);
    header.write("0", 156, 1);
    header.write("ustar\0", 257, 6);
    header.write("00", 263, 2);
    const sum = header.reduce((n, v) => n + v, 0);
    header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
    archive.push(
      header,
      item.bytes,
      Buffer.alloc((512 - (item.bytes.length % 512)) % 512),
    );
  }
  archive.push(Buffer.alloc(1024));
  const stem = `${manifest.name}-${manifest.version}`,
    tgz = path.join(destination, `${stem}.tgz`),
    zip = path.join(destination, `${stem}.zip`);
  fs.writeFileSync(tgz, zlib.gzipSync(Buffer.concat(archive), { level: 9 }));
  const tar = spawnSync("tar", ["-a", "-cf", zip, "-C", temp, "package"], {
    stdio: "inherit",
  });
  if (tar.status !== 0) throw new Error("ZIP归档失败；tgz已经生成，可直接安装");
  const checksums =
    [tgz, zip]
      .map(
        (file) =>
          `${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}  ${path.basename(file)}`,
      )
      .join("\n") + "\n";
  fs.writeFileSync(path.join(destination, `${stem}.sha256`), checksums);
  fs.writeFileSync(
    path.join(destination, `${stem}.files.json`),
    JSON.stringify(
      {
        version: manifest.version,
        files: files.map((item) => ({
          name: item.name,
          bytes: item.bytes.length,
          sha256: crypto.createHash("sha256").update(item.bytes).digest("hex"),
        })),
      },
      null,
      2,
    ),
  );
  console.log(
    `已生成可安装压缩包：${tgz}\nZIP用于解压归档：${zip}\n运行时文件：${files.length} 个；不包含个人数据与开发依赖`,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
