import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  LocalModels,
  LOCAL_IDLE_MS,
  requireManagedModelConnection,
} from "../src/media/local-models.mjs";
import { runProcess } from "../src/media/process.mjs";

function fixture(t, options) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-model-gate-"));
  const gate = new LocalModels(root, options);
  t.after(() => {
    gate.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, gate };
}
test("不同本地模型和不同角色不能同时推理，同一模型可复用", async (t) => {
  const { gate } = fixture(t);
  let finish;
  const pending = gate.run(
    "role-a:tts",
    { retained: true },
    () => new Promise((r) => (finish = r)),
  );
  await assert.rejects(
    () => gate.run("role-b:asr", {}, () => {}),
    /本地模型正在使用/,
  );
  await gate.run("role-a:tts", { retained: true }, () => {});
  finish();
  await pending;
});
test("切换前必须等旧进程退出确认，期间禁止第三个模型抢占", async (t) => {
  const { gate } = fixture(t),
    events = [];
  let stopped;
  await gate.run(
    "tts",
    {
      retained: true,
      stop: () =>
        new Promise((r) => {
          stopped = r;
          events.push("stop-requested");
        }),
    },
    () => events.push("tts"),
  );
  const next = gate.run("asr", {}, () => events.push("asr"));
  assert.deepEqual(events, ["tts", "stop-requested"]);
  await assert.rejects(() => gate.run("sing", {}, () => {}), /正在卸载/);
  stopped();
  await next;
  assert.deepEqual(events, ["tts", "stop-requested", "asr"]);
});
test("闲置恰好5分钟下线，推理中不计闲置，新调用会重置计时", async (t) => {
  let now = 0,
    task,
    ms,
    stopped = 0;
  const { gate } = fixture(t, {
    clock: () => now,
    schedule: (f, delay) => {
      task = f;
      ms = delay;
      return 1;
    },
    cancel: () => {
      task = null;
    },
  });
  await gate.run(
    "tts",
    {
      retained: true,
      stop: () => {
        stopped++;
      },
    },
    () => {},
  );
  assert.equal(ms, LOCAL_IDLE_MS);
  assert.equal(ms, 300000);
  now = 299999;
  assert.equal(gate.status().current.idleSeconds, 299);
  let finish;
  const second = gate.run(
    "tts",
    { retained: true },
    () => new Promise((r) => (finish = r)),
  );
  assert.equal(task, null);
  now = 500000;
  finish();
  await second;
  assert.equal(gate.status().current.idleSeconds, 0);
  now += 300000;
  task();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(stopped, 1);
  assert.equal(gate.status().current, null);
});
test("听写按次退出后立即释放，本地模型租约跨管理器生效", async (t) => {
  const { gate, root } = fixture(t),
    other = new LocalModels(root);
  t.after(() => other.close());
  let finish;
  const asr = gate.run("asr", {}, () => new Promise((r) => (finish = r)));
  await assert.rejects(() => other.run("tts", {}, () => {}), /另一个宿主/);
  finish();
  await asr;
  await other.run("tts", {}, () => {});
  assert.equal(gate.status().current, null);
});

test("本机兼容地址与解析到本机的别名被拒绝，远程服务保留且解析有时限", async () => {
  for (const url of [
    "http://localhost:8100",
    "http://127.0.0.2",
    "http://[::1]",
    "http://0.0.0.0",
  ])
    await assert.rejects(() => requireManagedModelConnection(url), /插件托管/);
  await assert.rejects(
    () =>
      requireManagedModelConnection("https://synthetic.invalid", {
        lookup: async () => [{ address: "127.0.0.1" }],
      }),
    /插件托管/,
  );
  await requireManagedModelConnection("https://203.0.113.45/v1");
  await requireManagedModelConnection("http://192.0.2.22:8100/v1");
  await assert.rejects(
    () =>
      requireManagedModelConnection("https://synthetic.invalid", {
        lookup: () => new Promise(() => {}),
        timeoutMs: 10,
      }),
    /解析超时/,
  );
});

test("失败和取消等到真实子进程关闭才释放许可", async (t) => {
  const { gate } = fixture(t);
  await assert.rejects(
    () =>
      gate.run("failed", {}, () => {
        throw Error("synthetic-failure");
      }),
    /synthetic-failure/,
  );
  const controller = new AbortController();
  const pending = gate.run("asr", {}, () =>
    runProcess(process.execPath, ["-e", "setInterval(()=>{},1000)"], {
      signal: controller.signal,
    }),
  );
  await assert.rejects(() => gate.run("tts", {}, () => {}), /本地模型正在使用/);
  controller.abort(new Error("synthetic-cancel"));
  await assert.rejects(() => pending, /synthetic-cancel/);
  await gate.run("tts", {}, () => {});
  assert.equal(gate.status().current, null);
});
