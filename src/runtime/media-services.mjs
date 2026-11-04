import path from "node:path";
import { fail } from "../starrcore/store.mjs";

// 预设与主插件各有数据库连接，但必须共用同一组受管模型进程。
const services = new Map();
const key = (root) => {
  const resolved = path.resolve(root);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};
export function mountMediaServices(store, value) {
  const id = key(store.dataRoot);
  if (services.has(id)) throw fail("此数据目录的媒体服务已经启动", 409);
  services.set(id, value);
  return () => {
    if (services.get(id) === value) services.delete(id);
  };
}
export function mediaServices(store) {
  return (
    services.get(key(store.dataRoot)) || {
      singing: store.singing,
      localMedia: store.localMedia,
      workbench: store.workbench,
      vision: store.vision,
      hostVision: store.hostVision,
    }
  );
}
