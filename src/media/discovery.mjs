import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const fail = (message) => Object.assign(new Error(message), { status: 400 });
const extensions = new Set([
  ".gguf",
  ".safetensors",
  ".onnx",
  ".pt",
  ".pth",
  ".breeze",
  ".bin",
]);
export const discoveryDefaults = (config = {}) => ({
  ports: [11434, 1234, 8000, 8100, 8200],
  directories: [
    path.join(os.homedir(), ".cache", "huggingface", "hub"),
    path.join(os.homedir(), ".lmstudio", "models"),
    ...new Set(
      ["tts.local.modelPath", "sing.local.modelPath"]
        .map((key) => config[key])
        .filter((p) => typeof p === "string" && path.isAbsolute(p))
        .map((p) => path.dirname(path.dirname(p))),
    ),
  ],
});
async function json(url) {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(1800),
  });
  if (!response.ok) return null;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("json")) return null;
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 512 * 1024) throw fail("模型清单超过读取上限");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export async function discoverLocalModels(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw fail("发现参数必须是对象");
  const { ports = discoveryDefaults().ports, directories = [] } = input;
  if (
    !Array.isArray(ports) ||
    ports.length > 12 ||
    ports.some((port) => !Number.isInteger(port) || port < 1 || port > 65535)
  )
    throw fail("最多检查 12 个有效本机端口");
  if (
    !Array.isArray(directories) ||
    directories.length > 8 ||
    directories.some(
      (dir) =>
        typeof dir !== "string" ||
        !path.isAbsolute(dir) ||
        dir.length > 1000 ||
        path.parse(dir).root === path.resolve(dir) ||
        dir.startsWith("\\\\"),
    )
  )
    throw fail("最多选择 8 个本机模型目录，不能选择整个磁盘或网络共享");
  const endpoints = await Promise.all(
    [...new Set(ports)].map(async (port) => {
      const base = `http://127.0.0.1:${port}`;
      for (const [suffix, provider] of [
        ["/api/tags", "ollama"],
        ["/v1/models", "openai-compatible"],
      ]) {
        try {
          const result = await json(base + suffix);
          const list = provider === "ollama" ? result?.models : result?.data;
          if (!Array.isArray(list)) continue;
          return {
            port,
            provider,
            status: "catalog",
            baseUrl: base + "/v1",
            models: list
              .slice(0, 100)
              .filter((item) => item && typeof item === "object")
              .map((item) => ({
                id: String(item.id || item.name || item.model || "").slice(
                  0,
                  200,
                ),
              }))
              .filter((item) => item.id),
            note: "模型目录接口已响应；具体聊天、说话、听写或视觉能力尚未实际调用",
          };
        } catch {
          /* 单个离线端点不能中断其他发现。 */
        }
      }
      return {
        port,
        status: "unverified",
        models: [],
        note: "未取得支持的模型清单；不代表该端口一定没有服务",
      };
    }),
  );
  const files = [],
    reports = [];
  for (const directory of [...new Set(directories)]) {
    let examined = 0,
      truncated = false;
    const start = Date.now();
    const walk = async (dir, depth) => {
      if (
        examined >= 2500 ||
        files.length >= 300 ||
        Date.now() - start > 4000
      ) {
        truncated = true;
        return;
      }
      const children = await fs.readdir(dir, { withFileTypes: true });
      for (const item of children) {
        if (
          ++examined > 2500 ||
          files.length >= 300 ||
          Date.now() - start > 4000
        ) {
          truncated = true;
          break;
        }
        if (item.isSymbolicLink()) continue;
        const file = path.join(dir, item.name);
        if (item.isDirectory() && depth < 4)
          await walk(file, depth + 1).catch(() => {});
        else if (
          item.isFile() &&
          extensions.has(path.extname(item.name).toLowerCase())
        ) {
          const stat = await fs.stat(file);
          files.push({
            path: file,
            name: item.name,
            bytes: stat.size,
            kind: /whisper|asr/i.test(file)
              ? "asr"
              : /soulx|svc|rvc/i.test(file)
                ? "svc"
                : /breeze|tts|voices/i.test(file)
                  ? "tts"
                  : "unknown",
            status: "file",
            note: "只发现文件，未加载模型；类型为路径提示，需要确认兼容引擎",
          });
        }
      }
    };
    try {
      const real = await fs.realpath(directory);
      if (
        path.resolve(real).toLowerCase() !==
        path.resolve(directory).toLowerCase()
      )
        throw fail("请填写真实目录，发现过程不跟随联接");
      await walk(real, 0);
      reports.push({ directory, status: "scanned", examined, truncated });
    } catch (error) {
      reports.push({
        directory,
        status: error.code === "ENOENT" ? "missing" : "unavailable",
        examined,
        truncated,
      });
    }
  }
  const profiles = [];
  const exists = async (p, directory = false) => {
    const stat = await fs.stat(p).catch(() => null);
    return !!stat && (directory ? stat.isDirectory() : stat.isFile());
  };
  for (const file of files) {
    if (
      file.kind === "tts" &&
      /\.gguf$/i.test(file.name) &&
      /breeze/i.test(file.name)
    ) {
      const home = path.dirname(path.dirname(file.path)),
        app = path.join(home, "app");
      const children = await fs
        .readdir(app, { withFileTypes: true })
        .catch(() => []);
      const choices = [
        path.join(home, "breeze-server.exe"),
        path.join(app, "breeze-server.exe"),
        ...children
          .filter((e) => e.isDirectory() && !e.isSymbolicLink())
          .map((e) => path.join(app, e.name, "breeze-server.exe")),
      ];
      const available = await Promise.all(choices.map((p) => exists(p))),
        bin = choices.find((_, i) => available[i]);
      if (bin && (await exists(path.join(home, "voices"), true))) {
        const voices = (
          await fs.readdir(path.join(home, "voices"), { withFileTypes: true })
        )
          .filter((entry) => entry.isFile() && /\.breeze$/i.test(entry.name))
          .map((entry) => entry.name.slice(0, -7))
          .slice(0, 100);
        profiles.push({
          kind: "tts",
          label: `本地Breeze · ${file.name}`,
          verified: false,
          voices,
          next: voices.length
            ? "选择一个音色，再用实际文字试说；文件存在不代表推理通过"
            : "未发现音色；请先导入参考录音建立音色，再试说",
          patch: {
            "tts.connection": "breeze-local",
            "tts.local.bin": bin,
            "tts.local.modelPath": file.path,
            "tts.local.voicesDir": path.join(home, "voices"),
            "tts.model": "breeze",
            "tts.responseFormat": "wav",
          },
        });
      }
    }
    if (file.kind === "svc" && /model-svc\.pt$/i.test(file.name)) {
      const home = path.dirname(path.dirname(file.path)),
        children = await fs
          .readdir(path.join(home, "_src"), { withFileTypes: true })
          .catch(() => []);
      const repo = children
        .filter((e) => e.isDirectory() && !e.isSymbolicLink())
        .map((e) => path.join(home, "_src", e.name))
        .find((p) => /soulx/i.test(p));
      const python = path.join(
          home,
          "venv",
          process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
        ),
        script = path.join(home, "soulx_server.py");
      if (repo && (await exists(python)) && (await exists(script)))
        profiles.push({
          kind: "sing",
          label: `本地SoulX · ${file.name}`,
          verified: false,
          next: "下一步导入音源与参考音色，再生成一段45秒内的翻唱验证",
          patch: {
            "sing.mode": "soulx-managed",
            "sing.local.modelPath": file.path,
            "sing.local.python": python,
            "sing.local.serverScript": script,
            "sing.local.repo": repo,
            "sing.local.preModels": path.join(repo, "pretrained_models"),
          },
        });
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    endpoints,
    files,
    profiles,
    directories: reports,
    note: "只读发现，不执行 shell、不安装依赖、不加载模型或改写 DSH 配置。文件存在与能力可用分开验证。",
  };
}
