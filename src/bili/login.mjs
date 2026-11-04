import crypto from "node:crypto";
import { fail } from "../starrcore/store.mjs";

const passport = "https://passport.bilibili.com";
const cookieNames = new Set([
  "SESSDATA",
  "bili_jct",
  "DedeUserID",
  "DedeUserID__ckMd5",
  "sid",
]);

// 扫码密钥与待保存凭据只留在内存，网页只取得随机会话编号与官方登录地址。
export class BiliLogin {
  constructor({ save, verify, request = fetch, clock = Date.now } = {}) {
    this.save = save;
    this.verify = verify;
    this.request = request;
    this.clock = clock;
    this.sessions = new Map();
    this.creating = new Set();
    this.generations = new Map();
    this.closed = false;
  }
  async call(path, params = {}) {
    const url = new URL(path, passport);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    let response;
    try {
      response = await this.request(url, {
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          Referer: "https://www.bilibili.com/",
          "User-Agent": "Mozilla/5.0",
        },
      });
    } catch {
      throw fail("暂时无法连接 B站登录服务，请稍后重试", 503);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw fail(`B站登录服务返回 HTTP ${response.status}`, 502);
    }
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 65536) throw fail("B站登录响应超过限制", 502);
      chunks.push(chunk);
    }
    let result;
    try {
      result = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      throw fail("B站登录响应格式不正确", 502);
    }
    if (result.code !== 0 || !result.data)
      throw fail("B站暂未提供有效登录结果", 502);
    return {
      data: result.data,
      cookies: response.headers.getSetCookie?.() || [],
    };
  }
  prune() {
    for (const [id, entry] of this.sessions)
      if (entry.expiresAt < this.clock()) this.sessions.delete(id);
  }
  async create(characterId) {
    if (this.closed) throw fail("登录服务已关闭", 409);
    this.prune();
    if (this.creating.has(characterId)) throw fail("二维码正在生成", 409);
    if (this.sessions.size >= 20) throw fail("扫码会话过多，请稍后重试", 429);
    this.creating.add(characterId);
    this.cancel(characterId);
    const generation = this.generations.get(characterId);
    try {
      const { data } = await this.call("/x/passport-login/web/qrcode/generate");
      let url;
      try {
        url = new URL(data.url);
      } catch {
        throw fail("B站登录地址无效", 502);
      }
      if (
        url.protocol !== "https:" ||
        !["passport.bilibili.com", "account.bilibili.com"].includes(
          url.hostname,
        ) ||
        url.username ||
        url.password ||
        url.port ||
        !/^[a-zA-Z0-9_-]{8,200}$/.test(data.qrcode_key)
      )
        throw fail("B站未返回可信的扫码地址", 502);
      if (this.closed) throw fail("登录服务已关闭", 409);
      if (this.generations.get(characterId) !== generation)
        throw fail("扫码会话已取消", 409);
      const id = crypto.randomUUID(),
        expiresAt = this.clock() + 180000;
      this.sessions.set(id, {
        characterId,
        key: data.qrcode_key,
        expiresAt,
        nextPoll: 0,
        status: "waiting",
        busy: false,
      });
      return { id, url: url.href, expiresAt, status: "waiting" };
    } finally {
      this.creating.delete(characterId);
    }
  }
  cancel(characterId, id) {
    if (!id)
      this.generations.set(
        characterId,
        (this.generations.get(characterId) || 0) + 1,
      );
    for (const [key, entry] of this.sessions)
      if (entry.characterId === characterId && (!id || key === id))
        this.sessions.delete(key);
    return { status: "cancelled" };
  }
  async poll(characterId, id) {
    const entry = this.sessions.get(id);
    if (!entry || entry.characterId !== characterId)
      throw fail("扫码会话已失效，请重新生成", 404);
    if (entry.expiresAt <= this.clock()) {
      this.sessions.delete(id);
      return { status: "expired" };
    }
    if (entry.status === "saved")
      return { status: "saved", account: entry.account };
    if (entry.busy || this.clock() < entry.nextPoll)
      return { status: entry.status, retryAfterMs: 2500 };
    entry.busy = true;
    entry.nextPoll = this.clock() + 2500;
    try {
      const { data, cookies } = await this.call(
        "/x/passport-login/web/qrcode/poll",
        { qrcode_key: entry.key },
      );
      if (this.closed || this.sessions.get(id) !== entry)
        throw fail("扫码会话已取消", 409);
      if (data.code === 86038) {
        this.sessions.delete(id);
        return { status: "expired" };
      }
      if ([86101, 86090].includes(data.code)) {
        entry.status = data.code === 86090 ? "confirming" : "waiting";
        return { status: entry.status, retryAfterMs: 2500 };
      }
      if (data.code !== 0) throw fail("B站尚未确认此次登录，请重新扫码", 409);
      const values = new Map();
      for (const cookie of cookies) {
        const pair = cookie.split(";", 1)[0],
          separator = pair.indexOf("=");
        if (cookieNames.has(pair.slice(0, separator)))
          values.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
      // 部分服务版本把 Cookie 放在官方 crossDomain URL；只解析，不跳转执行。
      if (data.url) {
        let url;
        try {
          url = new URL(data.url);
        } catch {
          throw fail("B站登录结果地址无效", 502);
        }
        if (
          url.protocol !== "https:" ||
          !["passport.bilibili.com", "passport.biligame.com"].includes(
            url.hostname,
          ) ||
          url.username ||
          url.password
        )
          throw fail("B站登录结果来源无效", 502);
        for (const [name, value] of url.searchParams)
          if (cookieNames.has(name) && !values.has(name))
            values.set(name, encodeURIComponent(value));
      }
      const cookie = [...values]
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
      if (
        !values.get("SESSDATA") ||
        !values.get("bili_jct") ||
        /[\r\n]/.test(cookie)
      )
        throw fail("B站已确认扫码，但没有返回完整凭据，请重新生成二维码", 502);
      const account = await this.verify(cookie);
      if (this.closed || this.sessions.get(id) !== entry)
        throw fail("扫码会话已取消", 409);
      await this.save(characterId, cookie);
      delete entry.key;
      entry.status = "saved";
      entry.account = account;
      return {
        status: "saved",
        account,
        detail: "账号已核验并加密保存；尚未开启平台监听或发送消息",
      };
    } finally {
      entry.busy = false;
    }
  }
  close() {
    this.closed = true;
    this.sessions.clear();
  }
}
