import fs from "node:fs";
import path from "node:path";

// 使用 DSH 原生文件工具，不另造写文件接口，也不绕过宿主的文件权限。
export const nativeFileTools = new Set([
  "read",
  "read_image",
  "write",
  "edit",
  "glob",
  "grep",
]);
export const fileFields = [
  [
    "files.workspaceRoot",
    "角色文件工作区",
    "path",
    "",
    "chat-context",
    "DSH 原生读写的默认目录。留空时在数据目录的 workspaces 下按角色独立保存，与数据库分开。可为新会话选择已有工作区；已有会话的目录授权仍由 DSH 管理。角色不能修改此配置。",
  ],
];

export function fileWorkspace(store, characterId, { create = false } = {}) {
  const configured = store.character(characterId).config["files.workspaceRoot"];
  if (configured && !path.isAbsolute(configured))
    throw new Error("角色文件工作区必须为绝对路径");
  const root =
    configured || path.join(store.dataRoot, "workspaces", characterId);
  if (create) fs.mkdirSync(root, { recursive: true });
  return root;
}

// 只迁移旧版误用运行库的目录；不覆盖用户在 DSH 中选择的项目目录。
export async function migrateFileWorkspace(
  ctx,
  store,
  characterId,
  agent,
  signal,
) {
  // QQ 驱动只注入 agents/agentPresets；直接读未注入的服务属性会被宿主拒绝。
  // 目录迁移是可选能力，缺少服务时仍可正常回复。
  const directories =
    typeof ctx.get === "function"
      ? ctx.get("workingDirectory")
      : ctx.workingDirectory;
  if (!directories?.get || !directories?.set || !agent?.session) return;
  const current = directories.get(agent.session);
  const normalized = (value) =>
    process.platform === "win32"
      ? path.resolve(value).toLowerCase()
      : path.resolve(value);
  if (!current || normalized(current) !== normalized(store.dataRoot)) return;
  await directories.set(
    agent,
    fileWorkspace(store, characterId, { create: true }),
    signal,
  );
}
