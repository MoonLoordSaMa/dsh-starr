import fs from "node:fs";
import path from "node:path";

const conflict = (message) =>
  Object.assign(new Error(message), { status: 409 });

// 仅在当前角色资源目录内移动普通文件；先保留元数据，数据库失败时还原文件。
export function recycleAsset(root, row, mutate) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(row.id || ""))
    throw conflict("资源编号无效");
  root = path.resolve(root);
  let ancestor = root;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  if (fs.realpathSync(ancestor).toLowerCase() !== ancestor.toLowerCase())
    throw conflict("资源目录包含联接，停止删除");
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, row.id),
    stat = fs.lstatSync(file, { throwIfNoEntry: false });
  if (stat && (!stat.isFile() || stat.isSymbolicLink()))
    throw conflict("资源不是普通文件，停止删除");
  const trash = path.join(root, ".trash");
  fs.mkdirSync(trash, { recursive: true });
  const trashStat = fs.lstatSync(trash);
  if (!trashStat.isDirectory() || trashStat.isSymbolicLink())
    throw conflict("回收目录不可用");
  const recycled = path.join(trash, row.id),
    metadata = path.join(trash, `${row.id}.json`);
  if (fs.lstatSync(recycled, { throwIfNoEntry: false }))
    throw conflict("回收文件已存在，停止删除");
  fs.writeFileSync(
    metadata,
    JSON.stringify({
      ...row,
      _recycle: { deletedAt: new Date().toISOString(), missingOriginal: !stat },
    }),
    { flag: "wx" },
  );
  let moved = false;
  try {
    if (stat) {
      fs.renameSync(file, recycled);
      moved = true;
    }
    mutate();
  } catch (error) {
    try {
      if (moved) fs.renameSync(recycled, file);
      fs.unlinkSync(metadata);
    } catch {
      // 无法还原时保留回收文件与元数据，不能二次清理导致资料丢失。
    }
    throw error;
  }
  return {
    status: "removed",
    recoverable: Boolean(stat),
    missingOriginal: !stat,
  };
}
