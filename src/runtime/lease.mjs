import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function isProcessRunning(
  pid,
  { kill = process.kill, platform = process.platform, query = spawnSync } = {},
) {
  if (!Number.isSafeInteger(pid) || pid < 1) return true;
  try {
    kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    if (platform !== "win32" || error.code !== "EPERM") return true;
    // Windows仍持有已结束的高权限进程句柄时，kill(pid,0)可能返回EPERM。
    // 用系统进程表确认，不将真实的权限不足直接当作进程已退出。
    const result = query(
      path.join(
        process.env.SystemRoot || "C:\\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `if(Get-Process -Id ${pid} -ErrorAction SilentlyContinue){[Console]::Write('RUNNING')}else{[Console]::Write('EXITED')}`,
      ],
      { windowsHide: true, encoding: "utf8", timeout: 5000, shell: false },
    );
    if (result.error || result.status !== 0 || !result.stdout?.trim())
      return true;
    return result.stdout.trim() !== "EXITED";
  }
}
export class RuntimeLease {
  constructor(root, name) {
    this.file = path.join(root, `${name}.lock`);
    this.owned = false;
  }
  acquire() {
    if (this.owned) return true;
    try {
      if (fs.existsSync(this.file)) {
        const owner = Number(fs.readFileSync(this.file, "utf8"));
        if (!Number.isSafeInteger(owner) || owner < 1) return false;
        if (isProcessRunning(owner)) return false;
        fs.unlinkSync(this.file);
      }
      fs.writeFileSync(this.file, String(process.pid), { flag: "wx" });
      this.owned = true;
      return true;
    } catch {
      return false;
    }
  }
  release() {
    if (!this.owned) return;
    this.owned = false;
    try {
      if (fs.readFileSync(this.file, "utf8") === String(process.pid))
        fs.unlinkSync(this.file);
    } catch {}
  }
}
