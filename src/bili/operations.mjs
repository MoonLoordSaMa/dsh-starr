import crypto from "node:crypto";
import { fail, hash } from "../starrcore/store.mjs";
const f = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  "bili-actions",
  help,
  extra,
];
export const operationFields = [
  f(
    "bili.actions.enabled",
    "允许管理 B站公开内容",
    "boolean",
    false,
    "开启后可在本页创建草稿、发布图文、编辑或删除当前账号自己的动态。每次写入仍需预览确认。",
  ),
  f(
    "bili.actions.dailyMax",
    "手动平台操作近24小时额度",
    "number",
    10,
    "发布、编辑、删除与点赞都记录尝试；不因回执不明自动重试。",
    { min: 1, max: 100, integer: true },
  ),
  f(
    "bili.actions.allowBot",
    "允许角色使用公开资料阅读工具",
    "boolean",
    false,
    "只读取 B站搜索、账号公开信息、公开视频与动态；私人历史和收藏保留在管理员页面，不自动授予发布或删除权限。",
  ),
];
export class BiliOperations {
  constructor(service) {
    this.service = service;
    this.store = service.store;
    this.busy = new Set();
    this.tokens = new Map();
    this.store.db.exec(
      "CREATE TABLE IF NOT EXISTS bili_operation_log(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,error TEXT,created INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS bili_drafts(id TEXT PRIMARY KEY,character_id TEXT NOT NULL,text TEXT NOT NULL,revision INTEGER NOT NULL,created INTEGER NOT NULL);",
    );
  }
  recover() {
    this.store.db.exec(
      "UPDATE bili_operation_log SET status='uncertain',error='宿主退出前尚未取得回执，请人工核对' WHERE status='sending'",
    );
  }
  close() {
    this.tokens.clear();
  }
  status(characterId) {
    this.store.character(characterId);
    return {
      drafts: this.store.db
        .prepare(
          "SELECT * FROM bili_drafts WHERE character_id=? ORDER BY created DESC LIMIT 30",
        )
        .all(characterId),
      recent: this.store.db
        .prepare(
          "SELECT * FROM bili_operation_log WHERE character_id=? ORDER BY created DESC LIMIT 30",
        )
        .all(characterId),
    };
  }
  draft(characterId, { id, text, revision }) {
    this.store.character(characterId);
    if (typeof text !== "string" || !text.trim() || text.length > 2000)
      throw fail("草稿应为1–2000字");
    const db = this.store.db;
    if (id) {
      const row = db
        .prepare("SELECT * FROM bili_drafts WHERE id=? AND character_id=?")
        .get(id, characterId);
      if (!row) throw fail("草稿不存在", 404);
      if (row.revision !== revision) throw fail("草稿已变化", 409);
      db.prepare(
        "UPDATE bili_drafts SET text=?,revision=revision+1 WHERE id=?",
      ).run(text, id);
    } else {
      id = crypto.randomUUID();
      db.prepare("INSERT INTO bili_drafts VALUES(?,?,?,1,?)").run(
        id,
        characterId,
        text,
        Date.now(),
      );
    }
    return db.prepare("SELECT * FROM bili_drafts WHERE id=?").get(id);
  }
  async read(characterId, { kind, q = "", id = "" }, signal) {
    const { client, account } = await this.service.connect(characterId, signal);
    if (kind === "feed") return client.feed(account.selfId, signal);
    if (kind === "history") return client.watchHistory(signal);
    if (kind === "favorites") return client.favorites(account.selfId, signal);
    if (kind === "search") return client.search(q, signal);
    if (kind === "profile") return client.profile(id || account.selfId, signal);
    if (kind === "video") return client.video(id, signal);
    throw fail("不支持的资料类型");
  }
  async preview(characterId, input) {
    const c = this.store.character(characterId).config;
    if (!c["bili.actions.enabled"]) throw fail("请先授权公开内容管理", 403);
    if (!["publish", "edit", "delete", "like"].includes(input.kind))
      throw fail("不支持的平台操作");
    if (typeof input.text !== "string" || input.text.length > 2000)
      throw fail("正文格式不正确");
    if (["publish", "edit"].includes(input.kind) && !input.text.trim())
      throw fail("请填写正文");
    if (input.kind !== "publish" && !/^\d{1,30}$/.test(input.id || ""))
      throw fail("动态编号格式无效");
    const { client, account } = await this.service.connect(characterId);
    const original =
      input.kind === "publish" ? null : await client.dynamic(input.id);
    if (original && input.kind !== "like" && original.author !== account.selfId)
      throw fail("只能修改或删除当前登录账号自己的动态", 403);
    let image = null;
    if (input.image) {
      if (
        input.kind !== "publish" ||
        typeof input.image !== "string" ||
        input.image.length > 12 * 1024 * 1024
      )
        throw fail("仅新动态支持上传一张本地图片");
      const match =
        /^data:(image\/(?:png|jpeg));base64,([a-zA-Z0-9+/=]+)$/.exec(
          input.image,
        );
      if (!match) throw fail("请选择PNG或JPEG图片");
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > 8 * 1024 * 1024 || bytes.length < 24)
        throw fail("图片大小无效");
      if (
        match[1] === "image/png"
          ? bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
          : bytes.subarray(0, 3).toString("hex") !== "ffd8ff"
      )
        throw fail("图片内容与类型不一致");
      image = { mime: match[1], bytes };
    }
    for (const [key, value] of this.tokens)
      if (value.expiresAt < Date.now()) this.tokens.delete(key);
    if (this.tokens.size >= 20) throw fail("待确认操作过多，请稍后再试", 429);
    const token = crypto.randomUUID(),
      fingerprint = original ? hash(JSON.stringify(original)) : null;
    this.tokens.set(token, {
      characterId,
      kind: input.kind,
      id: input.id || "",
      text: input.text.trim(),
      image,
      account: account.selfId,
      fingerprint,
      expiresAt: Date.now() + 120000,
    });
    return {
      token,
      expiresAt: Date.now() + 120000,
      account,
      kind: input.kind,
      id: input.id || "",
      text: input.text.trim(),
      original,
      image: image ? { bytes: image.bytes.length, mime: image.mime } : null,
      detail: "本次仅预览，没有上传图片或写入平台。确认后将真实执行一次",
    };
  }
  async execute(characterId, { token }) {
    const entry = this.tokens.get(token);
    if (
      !entry ||
      entry.characterId !== characterId ||
      entry.expiresAt < Date.now()
    )
      throw fail("确认已过期，请重新预览", 409);
    if (this.busy.has(characterId)) throw fail("该角色有操作正在执行", 409);
    this.tokens.delete(token);
    this.busy.add(characterId);
    const id = crypto.randomUUID(),
      db = this.store.db;
    let started = false;
    try {
      const c = this.store.character(characterId).config;
      if (!c["bili.actions.enabled"] || this.service.closed)
        throw fail("管理员已撤销操作授权", 403);
      if (
        db
          .prepare(
            "SELECT count(*) AS n FROM bili_operation_log WHERE character_id=? AND created>?",
          )
          .get(characterId, Date.now() - 86400000).n >=
        c["bili.actions.dailyMax"]
      )
        throw fail("平台操作额度已用尽", 429);
      const { client, account } = await this.service.connect(characterId);
      if (account.selfId !== entry.account)
        throw fail("登录账号已经变化，请重新预览", 409);
      if (
        entry.fingerprint &&
        hash(JSON.stringify(await client.dynamic(entry.id))) !==
          entry.fingerprint
      )
        throw fail("动态内容已变化，请重新预览", 409);
      if (
        !this.store.character(characterId).config["bili.actions.enabled"] ||
        this.service.closed
      )
        throw fail("操作授权已撤销", 403);
      db.prepare(
        "INSERT INTO bili_operation_log VALUES(?,?,?,'sending',?,NULL,?)",
      ).run(
        id,
        characterId,
        entry.kind,
        JSON.stringify({
          id: entry.id,
          text: entry.text,
          image: !!entry.image,
        }),
        Date.now(),
      );
      started = true;
      let result;
      if (entry.kind === "publish") {
        const pics = entry.image
          ? [await client.uploadImage(entry.image.bytes, entry.image.mime)]
          : [];
        if (!this.store.character(characterId).config["bili.actions.enabled"])
          throw fail("操作授权已撤销，已上传图片未发布", 403);
        result = pics.length
          ? await client.writeDynamic({ text: entry.text, pics })
          : await client.publish(entry.text);
      } else if (entry.kind === "edit")
        result = await client.writeDynamic({
          id: entry.id,
          text: entry.text,
          pics: (await client.dynamic(entry.id)).pics,
        });
      else if (entry.kind === "delete")
        result = await client.deleteDynamic(entry.id);
      else result = await client.likeDynamic(entry.id);
      if (this.service.closed)
        throw Object.assign(fail("服务停止，操作结果待核对", 409), {
          uncertain: true,
        });
      db.prepare(
        "UPDATE bili_operation_log SET status=?,data=? WHERE id=?",
      ).run(result.status, JSON.stringify(result), id);
      return result;
    } catch (e) {
      if (started && !this.service.closed)
        db.prepare(
          "UPDATE bili_operation_log SET status=?,error=? WHERE id=?",
        ).run(e.uncertain ? "uncertain" : "failed", e.message, id);
      throw e;
    } finally {
      this.busy.delete(characterId);
    }
  }
}
