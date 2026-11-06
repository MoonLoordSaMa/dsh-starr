import { setTimeout as pause } from "node:timers/promises";

// 等待的是本机收件箱；没有模型轮询，也不读取其他会话。
export async function waitForMessages({
  milliseconds,
  signal,
  read,
  clock = Date.now,
  sleep = pause,
}) {
  const deadline = clock() + milliseconds;
  while (true) {
    signal.throwIfAborted();
    const messages = read();
    if (messages.length) return messages;
    const remaining = deadline - clock();
    if (remaining <= 0) return [];
    await sleep(Math.min(250, remaining), undefined, { signal });
  }
}
