import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fail } from "../starrcore/store.mjs";

// Windows 凭据只经标准输入传入当前用户的 DPAPI，不出现在命令行、日志或网页响应里。
async function protect(value, decrypt = false) {
  if (process.platform !== "win32")
    throw fail("当前系统请通过环境变量提供 OneBot 令牌", 409);
  const operation = decrypt ? "Unprotect" : "Protect";
  const script = `Add-Type -AssemblyName System.Security
$taskBytes=[Convert]::FromBase64String([Console]::In.ReadToEnd())
$taskResult=[Security.Cryptography.ProtectedData]::${operation}($taskBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Out.Write([Convert]::ToBase64String($taskResult))`;
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const timer = setTimeout(() => {
      child.kill();
      reject(fail("系统凭据服务超时，请重试", 503));
    }, 10000);
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.resume();
    child.once("error", () => {
      clearTimeout(timer);
      reject(fail("系统凭据服务不可用", 503));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || !output.trim())
        return reject(fail("无法读取系统加密凭据，请重新保存令牌", 409));
      resolve(Buffer.from(output.trim(), "base64"));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(Buffer.from(value).toString("base64"));
  });
}

export class QQSecrets {
  constructor(dataRoot, namespace = "qq-token") {
    if (!/^[a-zA-Z0-9-]+$/.test(namespace)) throw fail("凭据编号无效");
    this.file = path.join(dataRoot, `${namespace}.dpapi`);
  }
  status() {
    return {
      saved: fs.existsSync(this.file),
      storage: process.platform === "win32" ? "windows-dpapi" : "environment",
    };
  }
  async save(token) {
    if (
      typeof token !== "string" ||
      !token.trim() ||
      token.length > 4096 ||
      /[\r\n]/.test(token)
    )
      throw fail("OneBot 令牌格式无效");
    const encrypted = await protect(token.trim());
    const temporary = this.file + ".tmp";
    fs.writeFileSync(temporary, encrypted, { mode: 0o600 });
    fs.renameSync(temporary, this.file);
  }
  clear() {
    fs.rmSync(this.file, { force: true });
  }
  async read(envName = "SNOWLUMA_TOKEN") {
    if (envName && process.env[envName]) return process.env[envName];
    if (!fs.existsSync(this.file)) return "";
    return (await protect(fs.readFileSync(this.file), true)).toString("utf8");
  }
}
