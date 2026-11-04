import { fail, hash } from "../starrcore/store.mjs";
import { QQSecrets } from "../qq/secrets.mjs";
import { RuntimeLease } from "../runtime/lease.mjs";
import { ChatPolicy } from "../conversation/policy.mjs";
import { biliClient } from "./api.mjs";
import { BiliActivities } from "./activities.mjs";
import { BiliLogin } from "./login.mjs";
import { BiliOperations } from "./operations.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { downloadBiliMedia } from "./media.mjs";
import { audioClip } from "../media/process.mjs";
import { chooseSegment } from "../media/segments.mjs";
import { BiliAutonomy } from "./autonomy.mjs";
const split = (value) =>
  String(value || "")
    .split(/[,，\s]+/)
    .filter(Boolean);
export class BiliService {
  constructor(
    store,
    {
      driver,
      client = biliClient,
      secrets = (id) => new QQSecrets(store.dataRoot, `bili-${id}`),
      clock = Date.now,
    } = {},
  ) {
    this.store = store;
    this.driver = driver;
    this.client = client;
    this.secrets = secrets;
    this.clock = clock;
    this.policy = new ChatPolicy(store);
    this.lease = new RuntimeLease(store.dataRoot, "bili-runtime");
    this.states = new Map();
    this.workers = new Map();
    this.closed = false;
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS bili_inbox(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,account TEXT NOT NULL,session_id TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,error TEXT,created INTEGER NOT NULL,next_at INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS bili_sends(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,session_id TEXT NOT NULL,user_id TEXT NOT NULL,thread TEXT NOT NULL,status TEXT NOT NULL,message_id TEXT,created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS bili_runtime(character_id TEXT PRIMARY KEY,started INTEGER NOT NULL,cooldown_until INTEGER NOT NULL DEFAULT 0);`);
    if (
      !store.db
        .prepare("PRAGMA table_info(bili_inbox)")
        .all()
        .some((column) => column.name === "started")
    )
      store.db.exec(
        "ALTER TABLE bili_inbox ADD COLUMN started INTEGER NOT NULL DEFAULT 0",
      );
    this.activities = new BiliActivities(this);
    this.operations = new BiliOperations(this);
    this.autonomy = new BiliAutonomy(this);
    this.login = new BiliLogin({
      save: (id, cookie) => this.credential(id, { cookie }),
      verify: (cookie) => this.client(cookie).me(),
      clock,
    });
  }
  status(characterId) {
    this.store.character(characterId);
    return {
      secret: this.secrets(characterId).status(),
      hostReady: !!this.driver,
      loginReady: !this.closed,
      runtime: this.states.get(characterId) || { status: "stopped" },
      counts: Object.fromEntries(
        this.store.db
          .prepare(
            "SELECT status,count(*) AS n FROM bili_inbox WHERE character_id=? GROUP BY status",
          )
          .all(characterId)
          .map((r) => [r.status, r.n]),
      ),
      recent: this.store.db
        .prepare(
          "SELECT id,status,error,created FROM bili_inbox WHERE character_id=? ORDER BY created DESC LIMIT 12",
        )
        .all(characterId),
      activities: this.activities.list(characterId),
    };
  }
  async credential(characterId, { cookie, clear = false }) {
    this.store.character(characterId);
    this.invalidate(characterId);
    if (cookie && clear) throw fail("不能同时保存与清除凭据");
    if (cookie) {
      biliClient(cookie);
      await this.secrets(characterId).save(cookie);
    }
    if (clear) this.secrets(characterId).clear();
    return this.status(characterId);
  }
  async connect(characterId, signal) {
    const c = this.store.character(characterId).config,
      cookie = await this.secrets(characterId).read(c["bili.secretEnv"]);
    const client = this.client(cookie),
      account = await client.me(signal);
    return { client, account, c };
  }
  async watch(
    characterId,
    { bvid, seconds = 30, prompt, sessionId },
    runtime,
    signal,
  ) {
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 45)
      throw fail("本轮视频片段应为1–45秒");
    const { client } = await this.connect(characterId, signal);
    const video = await client.media(bvid, signal);
    const bytes = await downloadBiliMedia(video.videoUrl, { signal });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "starr-video-"));
    try {
      const file = path.join(tmp, "video.mp4");
      fs.writeFileSync(file, bytes);
      const result = await runtime.vision.inspect(characterId, {
        source: { kind: "file", path: file },
        seconds,
        prompt,
        signal,
        secrets: runtime.workbench,
        sessionId,
      });
      const { image, ...receipt } = result;
      return {
        ...receipt,
        bvid,
        title: video.title,
        source: "bili-video",
        duration: video.duration,
      };
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  async songSource(
    characterId,
    { bvid, segment = "chorus", startSeconds },
    singing,
    signal,
    { bot = true } = {},
  ) {
    const c = this.store.character(characterId).config;
    if (bot && (!c["sing.source.allowBot"] || !c["bili.actions.allowBot"]))
      throw fail(
        "保存B站音源需要“允许角色读取B站公开资料”和唱歌页“允许角色查找并保存网络音源”同时开启",
        403,
      );
    const { client } = await this.connect(characterId, signal),
      video = await client.media(bvid, signal);
    const bytes = await downloadBiliMedia(video.audioUrl, {
      signal,
      maxBytes: 32 * 1024 * 1024,
    });
    const selection = chooseSegment({
      segment,
      startSeconds,
      title: video.title,
      duration: video.duration,
    });
    const clip = await audioClip(c, bytes, {
      signal,
      startSeconds: selection.startSeconds,
    });
    signal?.throwIfAborted();
    const latest = this.store.character(characterId).config;
    if (
      bot &&
      (!latest["sing.source.allowBot"] || !latest["bili.actions.allowBot"])
    )
      throw fail("音源入库权限已撤销", 403);
    const song = singing.import(
      characterId,
      clip,
      `${video.title.slice(0, 120)} · 45秒内片段`,
    );
    singing.setOrigin(characterId, song.id, {
      platform: "bili",
      id: bvid,
      url: `https://www.bilibili.com/video/${bvid}`,
    });
    singing.setSegment(characterId, song.id, selection);
    return {
      ...song,
      bvid,
      maxSeconds: 45,
      segment: selection,
    };
  }
  async check(characterId) {
    try {
      const { account } = await this.connect(characterId);
      return {
        status: "verified",
        account,
        detail: "登录账号已验证；收件、回复和平台权限需分别确认",
        checkedAt: new Date(this.clock()).toISOString(),
        replyVerified: false,
      };
    } catch (error) {
      return {
        status: "failed",
        code: error.code || "BILI_CONNECTION",
        detail: error.message,
        replyVerified: false,
      };
    }
  }
  start(driver = this.driver) {
    this.driver = driver;
    this.closed = false;
    if (!this.lease.acquire()) return;
    if (!this.recovered) {
      this.store.db.exec(
        "UPDATE bili_autonomy_log SET status='uncertain' WHERE status='sending'",
      );
      this.operations.recover();
      this.store.db.exec(
        "UPDATE bili_inbox SET status='pending' WHERE status='processing'; UPDATE bili_sends SET status='uncertain' WHERE status='sending'; UPDATE bili_inbox SET status='uncertain',error='PREVIOUS_SEND' WHERE status='pending' AND id IN (SELECT id FROM bili_sends); UPDATE bili_activities SET status='interrupted' WHERE status='running'; UPDATE bili_activities SET status='uncertain' WHERE status='sending'; UPDATE bili_shares SET status='uncertain' WHERE status='sending';",
      );
      this.recovered = true;
    }
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 1000);
    this.timer.unref?.();
    this.tick();
  }
  invalidate(characterId) {
    this.workers.get(characterId)?.controller.abort();
    const state = this.states.get(characterId);
    if (state) this.states.set(characterId, { ...state, nextPoll: 0 });
  }
  tick() {
    if (
      this.closed ||
      !this.driver ||
      !this.lease.owned ||
      !this.store.installation()
    )
      return;
    for (const character of this.store.listCharacters()) {
      const c = this.store.character(character.id).config;
      if (!c["bili.enabled"]) {
        this.invalidate(character.id);
        this.states.set(character.id, { status: "stopped" });
        continue;
      }
      if (
        this.workers.size >= 2 ||
        this.workers.has(character.id) ||
        (this.states.get(character.id)?.nextPoll || 0) > this.clock()
      )
        continue;
      const controller = new AbortController();
      const promise = this.poll(character.id, controller.signal)
        .catch((error) => {
          if (!this.closed && !controller.signal.aborted) {
            const nextPoll =
              this.clock() +
              (error.risk
                ? c["bili.riskCooldownMinutes"] * 60000
                : c["bili.pollSeconds"] * 1000);
            if (error.risk)
              this.store.db
                .prepare(
                  "INSERT INTO bili_runtime VALUES(?,?,?) ON CONFLICT(character_id) DO UPDATE SET cooldown_until=excluded.cooldown_until",
                )
                .run(character.id, this.clock(), nextPoll);
            this.states.set(character.id, {
              status: "failed",
              code: error.code || "BILI_CONNECTION",
              nextPoll,
            });
          }
        })
        .finally(() => this.workers.delete(character.id));
      this.workers.set(character.id, { controller, promise });
    }
  }
  async poll(characterId, signal) {
    const runtime = this.store.db
      .prepare("SELECT * FROM bili_runtime WHERE character_id=?")
      .get(characterId);
    if (runtime?.cooldown_until > this.clock()) {
      this.states.set(characterId, {
        status: "cooldown",
        nextPoll: runtime.cooldown_until,
      });
      return;
    }
    const { client, account, c } = await this.connect(characterId, signal);
    signal.throwIfAborted();
    this.store.db
      .prepare("INSERT OR IGNORE INTO bili_runtime VALUES(?,?,0)")
      .run(characterId, this.clock());
    const sources = [];
    const channelErrors = [];
    const read = async (channel, request) => {
      try {
        sources.push(...(await request()));
      } catch (error) {
        signal.throwIfAborted();
        if (error.risk || /AUTH|LOGIN|COOKIE/.test(error.code || ""))
          throw error;
        channelErrors.push({
          channel,
          code: error.code || "BILI_RECEIVE",
          detail: error.message,
        });
      }
    };
    if (c["bili.dm.enabled"])
      for (const target of split(c["bili.allowedUsers"]).slice(0, 20))
        await read(`私信 ${target}`, () =>
          client.dmHistory(account.selfId, target, signal),
        );
    if (c["bili.comment.enabled"])
      await read("评论", () => client.commentFeed(signal));
    if (c["bili.live.enabled"])
      for (const room of split(c["bili.live.rooms"]).slice(0, 5))
        await read(`直播 ${room}`, () => client.liveHistory(room, signal));
    signal.throwIfAborted();
    for (const message of sources)
      this.receive(characterId, account.selfId, message);
    const rows = this.store.db
      .prepare(
        "SELECT * FROM bili_inbox WHERE character_id=? AND account=? AND status='pending' AND next_at<=? ORDER BY created LIMIT 5",
      )
      .all(characterId, account.selfId, this.clock());
    for (const row of rows) {
      signal.throwIfAborted();
      await this.process(row, client, signal);
    }
    await this.activities.tick(characterId, client, account, signal);
    signal.throwIfAborted();
    this.states.set(characterId, {
      status: channelErrors.length ? "degraded" : "listening",
      channelErrors,
      account,
      nextPoll: this.clock() + c["bili.pollSeconds"] * 1000,
      lastPollAt: new Date(this.clock()).toISOString(),
    });
  }
  receive(characterId, account, message) {
    const c = this.store.character(characterId).config;
    const runtime = this.store.db
      .prepare("SELECT * FROM bili_runtime WHERE character_id=?")
      .get(characterId);
    const start = runtime?.started || this.clock();
    if (
      !c["bili.enabled"] ||
      !this.allowed(c, message) ||
      String(message.userId) === account ||
      !message.messageId ||
      !message.text ||
      message.text.length > 12000 ||
      !Number.isFinite(message.time) ||
      message.time * 1000 < start - c["bili.catchUpMinutes"] * 60000
    )
      return;
    const id = hash(
        `${characterId}:${account}:${message.type}:${message.target}:${message.messageId}`,
      ),
      sessionId = `session-starr-bili-${hash(`${characterId}:${account}:${message.type}:${message.target}`).slice(0, 32)}`;
    this.store.conversations.ensure({
      sessionId,
      characterId,
      platform: "bili",
      type: message.type,
      account,
      target: message.target,
    });
    if (this.store.db.prepare("SELECT id FROM bili_inbox WHERE id=?").get(id))
      return;
    const decision = this.policy.incoming(message, characterId, sessionId);
    if (!decision.accept) return;
    this.store.db
      .prepare(
        "INSERT OR IGNORE INTO bili_inbox(id,character_id,account,session_id,payload,status,error,created) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        characterId,
        account,
        sessionId,
        JSON.stringify(message),
        decision.wake ? "pending" : "observed",
        decision.reason || null,
        this.clock(),
      );
  }
  allowed(c, message) {
    return (
      split(c["bili.allowedUsers"]).includes(String(message.userId)) &&
      ["dm", "comment", "live"].includes(message.type) &&
      c[`bili.${message.type}.enabled`] &&
      (message.type !== "live" ||
        split(c["bili.live.rooms"]).includes(message.target))
    );
  }
  limit(characterId, session, message, c) {
    const rows = this.store.db
      .prepare(
        "SELECT * FROM bili_sends WHERE character_id=? AND created>? ORDER BY created DESC",
      )
      .all(characterId, this.clock() - 86400000);
    let nextAt = 0;
    if (rows.length >= c["bili.dailyReplies"])
      nextAt = rows[c["bili.dailyReplies"] - 1].created + 86400000;
    if (rows.length)
      nextAt = Math.max(
        nextAt,
        rows[0].created + c["bili.globalGapSeconds"] * 1000,
      );
    const person = rows.find((r) => r.user_id === message.userId);
    if (person)
      nextAt = Math.max(
        nextAt,
        person.created + c["bili.personGapMinutes"] * 60000,
      );
    if (message.type === "comment") {
      const thread = rows.find((r) => r.thread === message.target);
      if (thread)
        nextAt = Math.max(
          nextAt,
          thread.created + c["bili.threadGapMinutes"] * 60000,
        );
    }
    const behavior = this.policy.runtime(session.session_id);
    if (behavior?.wake_after) nextAt = Math.max(nextAt, behavior.wake_after);
    return nextAt > this.clock() ? nextAt : 0;
  }
  async process(row, client, signal) {
    signal = AbortSignal.any([signal, AbortSignal.timeout(120000)]);
    const db = this.store.db,
      characterId = row.character_id,
      message = JSON.parse(row.payload),
      session = this.store.conversations.get(row.session_id),
      c = this.store.character(characterId).config;
    if (session.paused || !c["bili.enabled"] || !this.allowed(c, message))
      return;
    if (db.prepare("SELECT id FROM bili_sends WHERE id=?").get(row.id)) {
      db.prepare(
        "UPDATE bili_inbox SET status='uncertain',error='PREVIOUS_SEND' WHERE id=?",
      ).run(row.id);
      return;
    }
    const next = this.limit(characterId, session, message, c);
    if (next) {
      db.prepare(
        "UPDATE bili_inbox SET next_at=?,error='COOLDOWN' WHERE id=?",
      ).run(next, row.id);
      return;
    }
    db.prepare(
      "UPDATE bili_inbox SET status='processing',attempts=attempts+1 WHERE id=?",
    ).run(row.id);
    let settled = false,
      sending = false,
      sendError;
    const finish = (reason) => {
      signal.throwIfAborted();
      if (settled || sending) throw fail("本批已经完成", 409);
      if (typeof reason !== "string" || !reason.trim() || reason.length > 500)
        throw fail("请填写简短理由");
      db.prepare("UPDATE bili_inbox SET status='done',error=? WHERE id=?").run(
        reason,
        row.id,
      );
      settled = true;
      return { status: "silent" };
    };
    try {
      await this.driver.run({
        thread: {
          key: session.session_id,
          sessionId: session.session_id,
          characterId,
          type: session.type,
          target: session.target,
          account: row.account,
          started: !!row.started,
        },
        settings: { provider: c["bili.provider"], model: c["bili.model"] },
        input: { batchId: row.id, watermark: row.id, messages: [message] },
        signal,
        prepared: () => {
          if (!this.closed)
            this.store.db
              .prepare("UPDATE bili_inbox SET started=1 WHERE session_id=?")
              .run(session.session_id);
        },
        reply: async (text) => {
          signal.throwIfAborted();
          if (settled || sending) throw fail("本批已经回复或正在外发", 409);
          const current = this.store.character(characterId).config;
          if (
            !current["bili.enabled"] ||
            !this.allowed(current, message) ||
            this.store.conversations.get(session.session_id).paused
          )
            throw fail("管理员已暂停该会话或撤销互动对象", 403);
          const max =
            message.type === "live"
              ? current["bili.live.maxChars"]
              : current["bili.maxReplyChars"];
          if (
            typeof text !== "string" ||
            !text.trim() ||
            Array.from(text).length > max
          )
            throw fail(`该通道回复应为 1–${max} 字符`);
          const cooldown = this.limit(characterId, session, message, current);
          if (cooldown) throw fail("本轮外发额度或冷却尚未释放", 429);
          sending = true;
          db.prepare(
            "INSERT INTO bili_sends VALUES(?,?,?,?,?,'sending',NULL,?)",
          ).run(
            row.id,
            characterId,
            session.session_id,
            message.userId,
            message.target,
            this.clock(),
          );
          try {
            const result = await client.send(
              row.account,
              message,
              text.trim(),
              signal,
            );
            signal.throwIfAborted();
            if (!["sent", "accepted"].includes(result?.status))
              throw Object.assign(fail("没有取得 B站协议确认", 502), {
                uncertain: true,
              });
            db.prepare(
              "UPDATE bili_sends SET status=?,message_id=? WHERE id=?",
            ).run(result.status, result.messageId, row.id);
            db.prepare(
              "UPDATE bili_inbox SET status='done',error=NULL WHERE id=?",
            ).run(row.id);
            settled = true;
            return result;
          } catch (error) {
            sendError = error;
            if (!this.closed)
              db.prepare("UPDATE bili_sends SET status=? WHERE id=?").run(
                error.uncertain || signal.aborted ? "uncertain" : "failed",
                row.id,
              );
            throw error;
          }
        },
        silence: finish,
        history: ({ limit = 30, messageId } = {}) => {
          signal.throwIfAborted();
          const current = this.store.character(characterId).config;
          if (!current["chat.tools.history"])
            throw fail("管理员已关闭历史读取", 403);
          if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > current["chat.context.recentMessages"]
          )
            throw fail("历史条数超出范围");
          return db
            .prepare(
              `SELECT payload FROM bili_inbox WHERE session_id=? ${messageId ? "AND json_extract(payload,'$.messageId')=?" : ""} ORDER BY created DESC LIMIT ?`,
            )
            .all(session.session_id, ...(messageId ? [messageId] : []), limit)
            .reverse()
            .map((r) => JSON.parse(r.payload));
        },
        wait: (input) => {
          if (settled || sending) throw fail("本批已完成", 409);
          const result = this.policy.wait(
            session.session_id,
            input.milliseconds,
            input.reason,
          );
          finish(input.reason);
          return result;
        },
        closeConversation: (input) => {
          if (settled || sending) throw fail("本批已完成", 409);
          const result = this.policy.close(
            session.session_id,
            input,
            /[?？]/.test(message.text),
          );
          finish("本段已自然收尾");
          return result;
        },
      });
      if (sendError) throw sendError;
      if (!settled)
        throw Object.assign(fail("模型没有调用平台回复或安静工具", 502), {
          code: "NO_PLATFORM_REPLY",
        });
    } catch (error) {
      if (this.closed) return;
      const send = db
        .prepare("SELECT status FROM bili_sends WHERE id=?")
        .get(row.id);
      if (["sent", "accepted"].includes(send?.status)) return;
      db.prepare(
        "UPDATE bili_inbox SET status=?,error=?,next_at=? WHERE id=?",
      ).run(
        send
          ? send.status === "uncertain"
            ? "uncertain"
            : "failed"
          : row.attempts >= 2
            ? "failed"
            : "pending",
        error.code || error.message,
        this.clock() + 60000,
        row.id,
      );
      if (error.risk) {
        db.prepare(
          "UPDATE bili_runtime SET cooldown_until=? WHERE character_id=?",
        ).run(
          this.clock() + c["bili.riskCooldownMinutes"] * 60000,
          characterId,
        );
        throw error;
      }
      signal.throwIfAborted();
    }
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    for (const worker of this.workers.values()) worker.controller.abort();
    if (this.lease.owned || this.workers.size)
      this.store.db.exec(
        "UPDATE bili_sends SET status='uncertain' WHERE status='sending'; UPDATE bili_inbox SET status='pending' WHERE status='processing'; UPDATE bili_inbox SET status='uncertain',error='INTERRUPTED_SEND' WHERE id IN (SELECT id FROM bili_sends WHERE status='uncertain') AND status<>'done'; UPDATE bili_activities SET status='interrupted' WHERE status='running'; UPDATE bili_activities SET status='uncertain' WHERE status='sending'; UPDATE bili_shares SET status='uncertain' WHERE status='sending';",
      );
    this.lease.release();
  }
  close() {
    this.closed = true;
    this.operations.close();
    this.login.close();
    this.stop();
    this.driver?.close();
  }
}
