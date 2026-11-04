import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";
import { fail } from "../starrcore/store.mjs";
import { RuntimeLease } from "../runtime/lease.mjs";
import { localModels } from "./local-models.mjs";

const f = (key, label, type, value, page, help, extra = {}) => [
  key,
  label,
  type,
  value,
  page,
  help,
  extra,
];
export const localMediaFields = [
  ...["tts", "sing"].flatMap((kind) => [
    f(
      `${kind}.local.port`,
      "本地服务端口",
      "number",
      kind === "tts" ? 8100 : 8200,
      `${kind}-local`,
      "只绑定 127.0.0.1；端口已被其他进程占用时不会终止该进程。",
      { min: 1024, max: 65535, integer: true },
    ),
    f(
      `${kind}.local.idleSeconds`,
      "闲置后卸载（秒）",
      "number",
      300,
      `${kind}-local`,
      "所有本地模型统一在闲置5分钟后卸载，此兼容字段固定为300秒；只停止插件托管的进程。",
      { min: 300, max: 300, integer: true },
    ),
    f(
      `${kind}.local.startTimeoutSeconds`,
      "启动等待上限（秒）",
      "number",
      120,
      `${kind}-local`,
      "等待端口监听；端口就绪仍需要实际生成来确认模型能力。",
      { min: 5, max: 600, integer: true },
    ),
    f(
      `${kind}.local.modelPath`,
      "本地模型文件",
      "text",
      "",
      `${kind}-local`,
      "管理员选择已安装的绝对路径；插件不会自动下载权重或执行模型文件。",
    ),
  ]),
  f(
    "tts.local.bin",
    "Breeze 服务程序",
    "text",
    "",
    "tts-local",
    "breeze-server 可执行程序的绝对路径；通过参数数组启动，不经过终端。",
  ),
  f(
    "tts.local.voicesDir",
    "Breeze 音色目录",
    "text",
    "",
    "tts-local",
    "目录内放置 .breeze 音色文件；音色标识仍在说话配置中选择。",
  ),
  f(
    "tts.local.gpuIndex",
    "GPU 序号",
    "number",
    0,
    "tts-local",
    "传给 GGML_VULKAN_DEVICE；更改后需要停止再重新生成。",
    { min: 0, max: 15, integer: true },
  ),
  f(
    "sing.local.python",
    "SoulX Python 程序",
    "text",
    "",
    "sing-local",
    "安装好依赖的 Python 可执行程序绝对路径。",
  ),
  f(
    "sing.local.serverScript",
    "SoulX 服务脚本",
    "text",
    "",
    "sing-local",
    "支持 /convert 接口的本地 Python 服务脚本路径。",
  ),
  f(
    "sing.local.repo",
    "SoulX 源码目录",
    "text",
    "",
    "sing-local",
    "传入服务的 --repo；只由管理员设置。",
  ),
  f(
    "sing.local.preModels",
    "预处理模型目录",
    "text",
    "",
    "sing-local",
    "传入服务的 --premodels，需先安装依赖模型。",
  ),
  f(
    "sing.local.device",
    "推理设备",
    "select",
    "cuda",
    "sing-local",
    "选择本机模型环境实际支持的设备。",
    { options: ["cuda", "cpu", "mps"] },
  ),
  f(
    "sing.local.fp16",
    "半精度推理",
    "boolean",
    true,
    "sing-local",
    "传入 --fp16；需要硬件与模型支持。",
  ),
];
function checkedPath(value, directory = false) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    value.startsWith("\\\\")
  )
    throw fail("本地引擎需要本机绝对路径");
  const stat = fs.statSync(value, { throwIfNoEntry: false });
  if (!stat || (directory ? !stat.isDirectory() : !stat.isFile()))
    throw fail(
      `本地引擎所需${directory ? "目录" : "文件"}不存在：${value}`,
      409,
    );
  return fs.realpathSync(value);
}
export const portOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(500, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
export class LocalMedia {
  constructor(store, { launch = spawn, probe = portOpen } = {}) {
    this.store = store;
    this.launch = launch;
    this.probe = probe;
    this.entries = new Map();
    this.stopping = new Map();
    this.gate = localModels(store);
    this.closed = false;
  }
  status(characterId) {
    return ["tts", "sing"].map((kind) => {
      const entry = this.entries.get(`${characterId}:${kind}`);
      return {
        kind,
        status:
          entry?.child?.exitCode === null
            ? entry.starting
              ? "starting"
              : "listening"
            : "stopped",
        pid: entry?.child?.pid || null,
        busy: entry?.busy || 0,
        idleUnloadSeconds: 300,
        note: "监听状态不代表已通过生成测试",
      };
    });
  }
  withEngine(characterId, kind, operation) {
    return this.gate.run(
      `${characterId}:${kind}`,
      {
        retained: true,
        stop: () => this.stopKey(`${characterId}:${kind}`),
      },
      () => this.withEngineInternal(characterId, kind, operation),
    );
  }
  async withEngineInternal(characterId, kind, operation) {
    if (this.closed) throw fail("本地媒体管理已停止", 409);
    if (!["tts", "sing"].includes(kind)) throw fail("未知本地引擎");
    const key = `${characterId}:${kind}`,
      c = this.store.character(characterId).config;
    let entry = this.entries.get(key);
    if (!entry) {
      const port = c[`${kind}.local.port`];
      for (const candidate of this.entries.values())
        if (candidate.port === port)
          throw fail("该本地引擎端口正在由另一个角色使用", 409);
      entry = {
        characterId,
        kind,
        port,
        busy: 0,
        lastUsed: Date.now(),
        starting: true,
        controller: new AbortController(),
        lease: new RuntimeLease(
          this.store.dataRoot,
          `local-media-port-${port}`,
        ),
      };
      if (!entry.lease.acquire()) throw fail("该模型端口由另一个宿主管理", 409);
      this.entries.set(key, entry);
      entry.ready = (async () => {
        if (await this.probe(port))
          throw fail(
            "本地端口已被占用，请停止原服务或选择其他端口后由插件托管",
            409,
          );
        entry.controller.signal.throwIfAborted();
        const model = checkedPath(c[`${kind}.local.modelPath`]);
        let executable,
          args,
          env = { ...process.env };
        if (kind === "tts") {
          executable = checkedPath(c["tts.local.bin"]);
          args = [
            model,
            "--port",
            String(port),
            "--voices-dir",
            checkedPath(c["tts.local.voicesDir"], true),
          ];
          env.GGML_VULKAN_DEVICE = String(c["tts.local.gpuIndex"]);
        } else {
          executable = checkedPath(c["sing.local.python"]);
          const script = checkedPath(c["sing.local.serverScript"]),
            tmp = path.join(this.store.dataRoot, "media-tmp", characterId);
          fs.mkdirSync(tmp, { recursive: true });
          args = [
            script,
            "--port",
            String(port),
            "--device",
            c["sing.local.device"],
            "--model",
            model,
            "--repo",
            checkedPath(c["sing.local.repo"], true),
            "--tmp",
            tmp,
            "--premodels",
            checkedPath(c["sing.local.preModels"], true),
            ...(c["sing.local.fp16"] ? ["--fp16"] : []),
          ];
          env = { ...env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" };
        }
        entry.child = this.launch(executable, args, {
          windowsHide: true,
          shell: false,
          cwd: path.dirname(executable),
          stdio: ["ignore", "ignore", "ignore"],
          env,
        });
        entry.child.once("error", () => {
          entry.spawnError = true;
        });
        entry.child.once("exit", () => {
          this.stopKey(key, entry);
          this.gate.stop(key).catch(() => {});
        });
        const deadline =
          Date.now() + c[`${kind}.local.startTimeoutSeconds`] * 1000;
        while (Date.now() < deadline) {
          entry.controller.signal.throwIfAborted();
          if (entry.spawnError || entry.child.exitCode !== null)
            throw fail("本地模型进程提前退出，请检查依赖与模型路径", 502);
          if (await this.probe(port)) {
            entry.starting = false;
            return;
          }
          await pause(300, undefined, { signal: entry.controller.signal });
        }
        throw fail("本地模型启动超时", 504);
      })().catch(async (error) => {
        await this.stopKey(key, entry);
        throw error;
      });
    }
    entry.busy++;
    try {
      await entry.ready;
      entry.controller.signal.throwIfAborted();
      return await operation(
        `http://127.0.0.1:${entry.port}`,
        entry.controller.signal,
      );
    } finally {
      entry.busy--;
      entry.lastUsed = Date.now();
    }
  }
  stopKey(key, expected) {
    const entry = this.entries.get(key);
    if (!entry || (expected && expected !== entry))
      return this.stopping.get(key) || Promise.resolve();
    if (this.stopping.has(key)) return this.stopping.get(key);
    entry.controller.abort();
    const child = entry.child;
    const release = () => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      entry.lease.release();
    };
    if (child?.exitCode === null && !child.signalCode && !entry.spawnError) {
      const stopping = new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(fail("本地模型仍未退出，禁止加载下一个模型", 409)),
          10000,
        );
        child.once("exit", () => {
          clearTimeout(timer);
          release();
          resolve();
        });
        child.kill();
        // 测试替身与同步结束的进程也遵守相同的退出确认。
        if (child.exitCode !== null || child.signalCode) {
          clearTimeout(timer);
          release();
          resolve();
        }
      });
      this.stopping.set(key, stopping);
      stopping
        .finally(() => {
          if (this.stopping.get(key) === stopping) this.stopping.delete(key);
        })
        .catch(() => {});
      return stopping;
    }
    release();
    return Promise.resolve();
  }
  async stop(characterId, kind) {
    this.store.character(characterId);
    if (!["tts", "sing"].includes(kind)) throw fail("未知本地引擎");
    await this.gate.stop(`${characterId}:${kind}`);
    return this.status(characterId);
  }
  close() {
    this.closed = true;
    this.gate.close();
  }
}
