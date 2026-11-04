import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import dns from "node:dns/promises";
import net from "node:net";
import { RuntimeLease } from "../runtime/lease.mjs";
import { fail } from "../starrcore/store.mjs";

export const LOCAL_IDLE_MS = 5 * 60 * 1000;
const instances = new Map();
export function localModels(store) {
  const resolved = path.resolve(store.dataRoot);
  const root = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  let gate = instances.get(root);
  if (!gate || gate.closed) {
    const leaseRoot =
      store.localModelLeaseRoot ||
      path.join(os.tmpdir(), "dsh-starr-local-models");
    fs.mkdirSync(leaseRoot, { recursive: true });
    gate = new LocalModels(leaseRoot);
    instances.set(root, gate);
  }
  return gate;
}

export async function requireManagedModelConnection(
  value,
  { lookup = dns.lookup, timeoutMs = 5000 } = {},
) {
  const host = new URL(value).hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  const local = new Set(
    Object.values(os.networkInterfaces())
      .flat()
      .filter(Boolean)
      .map((row) => row.address),
  );
  const loopback = (address) =>
    address === "::1" ||
    /^127\./.test(address) ||
    /^::ffff:127\./.test(address);
  const deny = () => {
    throw fail(
      "此本地兼容服务无法保证互斥与5分钟卸载，请改用插件托管的本地模型；云端服务可继续使用兼容连接",
      409,
    );
  };
  if (
    host === "localhost" ||
    host === "[::1]" ||
    host === "::1" ||
    /^127\./.test(host) ||
    host === "0.0.0.0" ||
    host === os.hostname().toLowerCase() ||
    local.has(host) ||
    loopback(host)
  )
    deny();
  let timer;
  try {
    const addresses = net.isIP(host)
      ? [{ address: host }]
      : await Promise.race([
          lookup(host, { all: true }),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(fail("模型地址解析超时，请检查服务地址或网络", 504)),
              timeoutMs,
            );
          }),
        ]);
    if (
      addresses.some(({ address }) => local.has(address) || loopback(address))
    )
      deny();
  } finally {
    clearTimeout(timer);
  }
}

export class LocalModels {
  constructor(
    root,
    { clock = Date.now, schedule = setTimeout, cancel = clearTimeout } = {},
  ) {
    this.lease = new RuntimeLease(root, "local-model-exclusive");
    this.clock = clock;
    this.schedule = schedule;
    this.cancel = cancel;
    this.current = null;
    this.switching = false;
    this.closed = false;
  }
  status() {
    const entry = this.current;
    return {
      idleSeconds: 300,
      exclusive: true,
      switching: this.switching,
      current: entry
        ? {
            key: entry.key,
            busy: entry.users,
            idleSeconds: Math.max(
              0,
              Math.floor((this.clock() - entry.lastUsed) / 1000),
            ),
          }
        : null,
    };
  }
  run(key, { stop = () => {}, retained = false } = {}, operation) {
    if (this.closed) return Promise.reject(fail("本地模型管理已停止", 409));
    if (this.switching)
      return Promise.reject(fail("正在卸载上一个本地模型，请稍后再试", 409));
    const old = this.current;
    if (old?.unloading)
      return Promise.reject(fail("本地模型尚未完全退出，请稍后再试", 409));
    if (old && old.key !== key) {
      if (old.users)
        return Promise.reject(
          fail(
            `本地模型正在使用：${old.key}；本轮完成前不能调用其他本地模型`,
            409,
          ),
        );
      this.switching = true;
      return this.unload(old).then(
        () => {
          this.switching = false;
          if (this.closed && !this.current) this.lease.release();
          return this.run(key, { stop, retained }, operation);
        },
        (error) => {
          this.switching = false;
          throw error;
        },
      );
    }
    if (!this.lease.acquire())
      return Promise.reject(
        fail("另一个宿主正在管理本地模型，不能同时加载", 409),
      );
    const entry = old || {
      key,
      stop,
      retained,
      users: 0,
      lastUsed: this.clock(),
      timer: null,
    };
    this.current = entry;
    this.cancel(entry.timer);
    entry.users++;
    let result;
    try {
      result = operation();
    } catch (error) {
      result = Promise.reject(error);
    }
    return Promise.resolve(result).finally(async () => {
      entry.users--;
      entry.lastUsed = this.clock();
      if (this.current !== entry || entry.users) return;
      if (!entry.retained || this.closed) await this.unload(entry);
      else {
        entry.timer = this.schedule(() => {
          if (this.current === entry && !entry.users)
            this.unload(entry).catch(() => {});
        }, LOCAL_IDLE_MS);
        entry.timer?.unref?.();
      }
    });
  }
  async unload(entry) {
    if (entry.unloading) return entry.unloading;
    this.cancel(entry.timer);
    entry.unloading = (async () => {
      await entry.stop();
      if (this.current === entry) this.current = null;
      if (!this.current && !this.switching) this.lease.release();
    })();
    try {
      await entry.unloading;
    } catch (error) {
      entry.unloading = null;
      throw error;
    }
  }
  stop(key) {
    if (this.current?.key === key) return this.unload(this.current);
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    if (this.current && (!this.current.users || this.current.retained))
      this.unload(this.current).catch(() => {});
    else if (!this.current) this.lease.release();
  }
}
