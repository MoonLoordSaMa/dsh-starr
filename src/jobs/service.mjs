import crypto from "node:crypto";
import { taskSessionId } from "../host/task-session.mjs";
import { RuntimeLease } from "../runtime/lease.mjs";
import { jobKinds } from "./config.mjs";
import { fail } from "../starrcore/store.mjs";

const formatters = new Map();
const local = (date, zone) => {
  if (!formatters.has(zone))
    formatters.set(
      zone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        weekday: "short",
      }),
    );
  return Object.fromEntries(
    formatters
      .get(zone)
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
};
export function dueSlot(kind, c, now = Date.now()) {
  if (!Object.hasOwn(jobKinds, kind)) return null;
  const lookback = c[`jobs.${kind}.catchUpHours`] * 60;
  const wantedMinute = Number(c[`jobs.${kind}.at`].split(":")[1]);
  for (let step = 0; step <= lookback;) {
    const p = local(new Date(now - step * 60000), c["agency.timezone"]);
    const distance = (Number(p.minute) - wantedMinute + 60) % 60;
    if (distance) {
      step += distance;
      continue;
    }
    step += 60;
    if (`${p.hour}:${p.minute}` !== c[`jobs.${kind}.at`]) continue;
    return `${p.year}-${p.month}-${p.day}@${p.hour}:${p.minute}`;
  }
  return null;
}
export class MemoryJobs {
  constructor(store, { driver, clock = Date.now } = {}) {
    this.store = store;
    this.driver = driver;
    this.clock = clock;
    this.running = new Map();
    this.closed = false;
    this.lease = new RuntimeLease(store.dataRoot, "memory-jobs");
    store.db.exec(
      `CREATE TABLE IF NOT EXISTS memory_jobs(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,kind TEXT NOT NULL,slot TEXT NOT NULL,status TEXT NOT NULL,session_id TEXT,result TEXT,error TEXT,created INTEGER NOT NULL,updated INTEGER NOT NULL);`,
    );
  }
  start(driver = this.driver) {
    this.driver = driver;
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 30000);
    this.timer.unref?.();
    this.tick();
  }
  status(characterId) {
    this.store.character(characterId);
    return {
      hostReady: !!this.driver,
      running: [...this.running.values()].filter(
        (entry) => entry.characterId === characterId,
      ).length,
      configurationError:
        Object.keys(jobKinds).some(
          (kind) =>
            !["backup", "projection"].includes(kind) &&
            this.store.character(characterId).config[`jobs.${kind}.enabled`],
        ) &&
        (!this.driver ||
          !this.store.character(characterId).config["jobs.provider"] ||
          !this.store.character(characterId).config["jobs.model"])
          ? "已开启日记任务，请先填写 DSH 日记模型连接与模型"
          : null,
      recent: this.store.db
        .prepare(
          "SELECT * FROM memory_jobs WHERE character_id=? ORDER BY created DESC LIMIT 30",
        )
        .all(characterId),
    };
  }
  tick() {
    if (this.closed || !this.store.installation() || !this.lease.acquire())
      return;
    for (const character of this.store.listCharacters()) {
      const c = this.store.character(character.id).config;
      for (const [id, entry] of this.running)
        if (
          entry.characterId === character.id &&
          !c[`jobs.${entry.kind}.enabled`]
        )
          entry.controller.abort();
      for (const kind of Object.keys(jobKinds)) {
        if (!c[`jobs.${kind}.enabled`] || this.running.size >= 2) continue;
        const slot = dueSlot(kind, c, this.clock());
        if (!slot) continue;
        const id = `${character.id}:${kind}:${slot}`;
        if (
          this.store.db.prepare("SELECT id FROM memory_jobs WHERE id=?").get(id)
        )
          continue;
        this.run(character.id, kind, slot).catch(() => {});
      }
    }
  }
  async run(characterId, kind, slot = `manual-${crypto.randomUUID()}`) {
    if (this.closed || !this.lease.acquire())
      throw fail("记忆任务已由另一个宿主管理", 409);
    if (!Object.hasOwn(jobKinds, kind)) throw fail("未知记忆任务");
    const c = this.store.character(characterId).config,
      id = `${characterId}:${kind}:${slot}`;
    if (this.running.size >= 2) throw fail("记忆任务正在运行，请稍后重试", 409);
    const sessionId = taskSessionId(characterId, `diary:${kind}`);
    const inserted = this.store.db
      .prepare(
        "INSERT OR IGNORE INTO memory_jobs VALUES(?,?,?,?,'running',?,NULL,NULL,?,?)",
      )
      .run(id, characterId, kind, slot, sessionId, this.clock(), this.clock());
    if (!inserted.changes)
      return this.store.db
        .prepare("SELECT * FROM memory_jobs WHERE id=?")
        .get(id);
    const controller = new AbortController(),
      entry = { characterId, kind, controller };
    this.running.set(id, entry);
    try {
      if (
        !["backup", "projection"].includes(kind) &&
        (!this.driver || !c["jobs.provider"] || !c["jobs.model"])
      )
        throw fail("请先配置 DSH 日记模型", 409);
      let result;
      if (kind === "backup") result = await this.store.backup(characterId);
      else if (kind === "projection") {
        this.store.flushProjection(characterId);
        const remaining = this.store.health(characterId).outbox;
        if (remaining.length)
          throw fail("仍有笔记冲突或失败，请在维护页核对", 409);
        result = { pending: 0 };
      } else {
        this.store.conversations.ensure({
          sessionId,
          characterId,
          platform: "web",
          type: "web",
          title: `${jobKinds[kind]} · ${slot.startsWith("manual-") ? new Date(this.clock()).toLocaleString("zh-CN", { timeZone: c["agency.timezone"], hour12: false }) : slot.replace("@", " ")}`,
        });
        const session = this.store.conversations.get(sessionId);
        this.store.conversations.patch(sessionId, {
          revision: session.revision,
          patch: { purpose: "management" },
        });
        result = await this.driver.run({
          characterId,
          sessionId,
          kind,
          slot,
          eventKey: `job:${id}`,
          provider: c["jobs.provider"],
          model: c["jobs.model"],
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(180000),
          ]),
        });
      }
      controller.signal.throwIfAborted();
      if (!this.closed)
        this.store.db
          .prepare(
            "UPDATE memory_jobs SET status='done',result=?,updated=? WHERE id=?",
          )
          .run(JSON.stringify(result), this.clock(), id);
    } catch (error) {
      if (!this.closed)
        this.store.db
          .prepare(
            "UPDATE memory_jobs SET status=?,error=?,updated=? WHERE id=?",
          )
          .run(
            controller.signal.aborted ? "interrupted" : "failed",
            error.code || error.message,
            this.clock(),
            id,
          );
      throw error;
    } finally {
      this.running.delete(id);
    }
    return this.store.db
      .prepare("SELECT * FROM memory_jobs WHERE id=?")
      .get(id);
  }
  recover() {
    if (!this.lease.acquire()) return;
    this.store.db
      .prepare(
        "UPDATE memory_jobs SET status='interrupted',error='宿主在任务完成前退出，请核对已写入的记忆后手动重试',updated=? WHERE status='running'",
      )
      .run(this.clock());
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    for (const [id, entry] of this.running) {
      this.store.db
        .prepare(
          "UPDATE memory_jobs SET status='interrupted',error='宿主已停止任务，请核对已保存记录后重新执行',updated=? WHERE id=? AND status='running'",
        )
        .run(this.clock(), id);
      entry.controller.abort();
    }
    this.lease.release();
  }
  close() {
    this.closed = true;
    this.stop();
  }
}
