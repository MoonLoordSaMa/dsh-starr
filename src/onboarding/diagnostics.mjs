import net from "node:net";
import { fail } from "../starrcore/store.mjs";

export function localPort(value) {
  if (!Number.isInteger(value) || value < 1 || value > 65535)
    throw fail("端口应为 1–65535 的整数");
  return value;
}

export function portListening(port, timeout = 1500) {
  localPort(port);
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const done = (listening) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ port, listening });
    };
    socket.setTimeout(timeout, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

export async function checkSnowLuma({ httpPort = 3000, wsPort = 3001 } = {}) {
  const ports = await Promise.all([
    portListening(httpPort),
    portListening(wsPort),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    status: ports.every((port) => port.listening) ? "reachable" : "unreachable",
    ports,
    detail: ports.every((port) => port.listening)
      ? "两个端口均可连接；尚未验证 OneBot 协议、账号登录、消息收发与模型回复"
      : "端口未全部连通，请启动 SnowLuma，并核对 OneBot HTTP 与 WebSocket 配置",
    accountVerified: false,
    replyVerified: false,
  };
}
