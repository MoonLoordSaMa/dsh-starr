import { fail } from "../starrcore/store.mjs";
import { localPort } from "../onboarding/diagnostics.mjs";

export async function onebotAction(
  { httpPort = 3000, token = "", signal },
  action,
  params = {},
) {
  localPort(httpPort);
  const writes = !/^(get_|can_|nc_get_)/.test(action);
  const needsMessageId = [
    "send_msg",
    "send_private_msg",
    "send_group_msg",
    "send_group_forward_msg",
    "send_private_forward_msg",
  ].includes(action);
  let response;
  try {
    response = await fetch(`http://127.0.0.1:${httpPort}/${action}`, {
      method: "POST",
      redirect: "error",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
        : AbortSignal.timeout(12000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });
  } catch {
    throw Object.assign(
      fail("OneBot 请求未取得回执，请检查 SnowLuma 连接", 503),
      {
        code: "ONEBOT_TRANSPORT",
        uncertain: writes,
      },
    );
  }
  if (response.status === 401 || response.status === 403)
    throw Object.assign(
      fail("OneBot 访问令牌不匹配，请在 QQ 连接设置中重新保存", 401),
      { code: "ONEBOT_AUTH" },
    );
  if (!response.ok)
    throw Object.assign(
      fail(`OneBot HTTP 请求失败（${response.status}）`, 502),
      { code: "ONEBOT_HTTP", uncertain: writes },
    );
  let data;
  try {
    data = await response.json();
  } catch {
    throw Object.assign(fail("OneBot 返回的不是有效协议响应", 502), {
      code: "ONEBOT_PROTOCOL",
      uncertain: writes,
    });
  }
  if (data.status !== "ok" || data.retcode !== 0)
    throw Object.assign(
      fail("OneBot 拒绝了操作，请检查账号登录和平台权限", 502),
      { code: "ONEBOT_REJECTED" },
    );
  if (
    needsMessageId &&
    (data.data?.message_id === undefined || data.data.message_id === null)
  )
    throw Object.assign(fail("OneBot 未返回消息编号，发送结果待核对", 502), {
      code: "SEND_UNCERTAIN",
      uncertain: true,
    });
  return data.data;
}

export async function checkOnebot(options) {
  const [state, account] = await Promise.all([
    onebotAction(options, "get_status"),
    onebotAction(options, "get_login_info"),
  ]);
  if (state?.online !== true || !account?.user_id)
    throw Object.assign(fail("SnowLuma 可连接，但 QQ 账号尚未在线", 409), {
      code: "QQ_OFFLINE",
    });
  return {
    selfId: String(account.user_id),
    nickname: String(account.nickname ?? ""),
    online: true,
  };
}

export async function checkOnebotSocket({ wsPort, token = "" }) {
  localPort(wsPort);
  const url = new URL(`ws://127.0.0.1:${wsPort}/`);
  if (token) url.searchParams.set("access_token", token);
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let settled = false;
    const done = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      error ? reject(error) : resolve(true);
    };
    const timer = setTimeout(
      () =>
        done(
          Object.assign(
            fail("OneBot WebSocket 握手超时，请检查正向服务", 503),
            { code: "WS_TIMEOUT" },
          ),
        ),
      5000,
    );
    socket.addEventListener("open", () => done());
    socket.addEventListener("error", () =>
      done(
        Object.assign(
          fail("OneBot WebSocket 连接失败，请检查端口与令牌", 503),
          { code: "WS_CONNECTION" },
        ),
      ),
    );
    socket.addEventListener("close", () => {
      if (!settled)
        done(
          Object.assign(fail("OneBot WebSocket 握手被拒绝", 503), {
            code: "WS_CONNECTION",
          }),
        );
    });
  });
}

export class OneBotConnection {
  constructor(options, { onEvent, onState }) {
    this.options = options;
    this.onEvent = onEvent;
    this.onState = onState;
    this.closed = false;
    this.attempt = 0;
  }
  async connect() {
    if (this.closed) return;
    const options = this.options;
    try {
      const account = await checkOnebot(options);
      if (this.closed) return;
      localPort(options.wsPort);
      const url = new URL(`ws://127.0.0.1:${options.wsPort}/`);
      if (options.token) url.searchParams.set("access_token", options.token);
      const socket = (this.socket = new WebSocket(url));
      const deadline = setTimeout(() => {
        socket.close();
        this.reconnect("WS_TIMEOUT");
      }, 10000);
      socket.addEventListener("open", () => {
        clearTimeout(deadline);
        if (this.closed || this.socket !== socket) return socket.close();
        this.attempt = 0;
        this.onState({ status: "connected", account, code: null });
      });
      socket.addEventListener("message", (event) => {
        if (this.closed || this.socket !== socket) return;
        try {
          const raw = typeof event.data === "string" ? event.data : "";
          if (raw.length > 1024 * 1024) return;
          const message = JSON.parse(raw);
          if (
            message.post_type === "message" ||
            (message.post_type === "notice" &&
              message.notice_type === "notify" &&
              message.sub_type === "poke")
          )
            this.onEvent(message);
        } catch {
          /* 非消息帧和无效协议帧不能中断连接。 */
        }
      });
      socket.addEventListener("error", () => {
        clearTimeout(deadline);
        if (this.socket === socket) {
          socket.close();
          this.reconnect("WS_CONNECTION");
        }
      });
      socket.addEventListener("close", () => {
        clearTimeout(deadline);
        if (this.socket === socket) this.reconnect("WS_DISCONNECTED");
      });
    } catch (error) {
      this.reconnect(error.code || "ONEBOT_TRANSPORT");
    }
  }
  reconnect(code) {
    if (this.closed || this.timer) return;
    this.onState({ status: "reconnecting", code });
    this.timer = setTimeout(
      () => {
        this.timer = null;
        this.connect();
      },
      Math.min(30000, 1000 * 2 ** Math.min(this.attempt++, 5)),
    );
    this.timer.unref?.();
  }
  close() {
    this.closed = true;
    clearTimeout(this.timer);
    this.socket?.close();
  }
}
