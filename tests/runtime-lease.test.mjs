import test from "node:test";
import assert from "node:assert/strict";
import { isProcessRunning } from "../src/runtime/lease.mjs";

test("Windows旧权限进程句柄不会阻挡运行锁，真实活进程与未知状态仍保持保护", () => {
  const kill = () => {
    throw Object.assign(new Error("denied"), { code: "EPERM" });
  };
  const options = { kill, platform: "win32" };
  assert.equal(
    isProcessRunning(123, {
      ...options,
      query: () => ({
        status: 0,
        stdout: "EXITED",
      }),
    }),
    false,
  );
  assert.equal(
    isProcessRunning(123, {
      ...options,
      query: () => ({
        status: 0,
        stdout: "RUNNING",
      }),
    }),
    true,
  );
  assert.equal(
    isProcessRunning(123, {
      ...options,
      query: () => ({ status: 1, stdout: "" }),
    }),
    true,
  );
  assert.equal(
    isProcessRunning(123, {
      ...options,
      query: () => ({ status: 0, stdout: "" }),
    }),
    true,
  );
  assert.equal(
    isProcessRunning(123, {
      kill: () => {
        throw Object.assign(Error(), { code: "ESRCH" });
      },
    }),
    false,
  );
  assert.equal(isProcessRunning(process.pid), true);
  assert.equal(
    isProcessRunning(123, {
      ...options,
      query: () => ({ status: 0, stdout: "unrecognized-response" }),
    }),
    true,
  );
});
