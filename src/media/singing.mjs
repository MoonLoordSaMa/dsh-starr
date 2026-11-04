import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fail, hash } from "../starrcore/store.mjs";
import { RuntimeLease } from "../runtime/lease.mjs";
import { recycleAsset } from "../runtime/recycle.mjs";
import { audioClip } from "./process.mjs";
import { requireManagedModelConnection } from "./local-models.mjs";
const f = (key, label, type, value, help, extra = {}) => [
  key,
  label,
  type,
  value,
  "sing",
  help,
  extra,
];
export const singingFields = [
  f(
    "sing.search.netease",
    "曲库检索包含网易云",
    "boolean",
    true,
    "QQ与网页音乐检索可查询网易云公开曲目，无需额外API服务；保存音源另需入库授权。仅使用平台实际返回的可播放音频，不处理受限或试听资源。",
  ),
  f(
    "sing.source.allowBot",
    "允许角色查找并保存网络音源",
    "boolean",
    false,
    "允许QQ等角色会话将B站或网易云可播放音频裁剪为45秒内片段并保存当前角色曲库。B站另需公开资料读取授权，网易云需开启检索；不等于授权翻唱或平台发送。",
  ),
  f(
    "sing.allowBot",
    "允许角色生成翻唱",
    "boolean",
    false,
    "只允许使用当前角色已导入的音频编号；模型不能指定任意本地文件。",
  ),
  f(
    "sing.mode",
    "唱歌连接方式",
    "select",
    "disabled",
    "本地托管模式启动管理员指定的SoulX，与听写和说话互斥，闲置5分钟卸载。远程节点须实际运行在其他机器并实现字节上传协议，不能使用聊天或TTS接口。",
    { options: ["disabled", "soulx-managed", "soulx-bytes"] },
  ),
  f(
    "sing.baseUrl",
    "远程节点地址",
    "url",
    "",
    "仅字节节点模式使用，例如 https://节点/v1；不会向远端发送本地文件路径。",
  ),
  f(
    "sing.secretEnv",
    "节点凭据环境变量名",
    "text",
    "",
    "密钥只从启动环境读取，不写入库。",
  ),
  f(
    "sing.timeoutSeconds",
    "转换超时（秒）",
    "number",
    300,
    "超时后保留失败记录，不声称已转换成功。",
    { min: 10, max: 1800, integer: true },
  ),
  f(
    "sing.referenceId",
    "默认参考音色编号",
    "text",
    "",
    "先向曲库导入参考音频，再填写它的编号；文件只属于当前角色。",
  ),
  f(
    "sing.pitchShift",
    "默认移调（半音）",
    "number",
    0,
    "手动调整音高；自动移调开启时由 SoulX 决定。",
    { min: -24, max: 24, integer: true },
  ),
  f(
    "sing.autoShift",
    "自动匹配音高",
    "boolean",
    true,
    "传给 SoulX 的 autoShift。",
  ),
  f(
    "sing.vocalSeparation",
    "自动分离人声",
    "boolean",
    true,
    "传给 SoulX 的 vocalSep；需要节点安装人声分离模型。",
  ),
  f(
    "sing.steps",
    "推理步数",
    "number",
    32,
    "更高通常更慢；以模型实际支持范围为准。",
    { min: 1, max: 100, integer: true },
  ),
  f("sing.guidance", "引导强度", "number", 3, "传给 SoulX 的 cfg 参数。", {
    min: 0,
    max: 20,
  }),
  f(
    "sing.cache",
    "复用同配置成品",
    "boolean",
    true,
    "仅音源、音色、模型与转换参数完全一致时复用；模型文件变化会重新计算。",
  ),
];
export class Singing {
  constructor(
    store,
    { clip = audioClip, connectionPolicy = requireManagedModelConnection } = {},
  ) {
    this.store = store;
    this.clip = clip;
    this.connectionPolicy = connectionPolicy;
    this.active = new Set();
    this.initialized = new Set();
    this.abort = new AbortController();
    this.closed = false;
  }
  db(characterId) {
    const db = this.store.memory(characterId);
    db.exec(`CREATE TABLE IF NOT EXISTS songs(id TEXT PRIMARY KEY,title TEXT NOT NULL,mime TEXT NOT NULL,hash TEXT NOT NULL UNIQUE,bytes INTEGER NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS song_renders(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,reference_id TEXT NOT NULL,fingerprint TEXT NOT NULL,status TEXT NOT NULL,error TEXT,bytes INTEGER,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS song_origins(song_id TEXT NOT NULL,platform TEXT NOT NULL,source_id TEXT NOT NULL,source_url TEXT NOT NULL,PRIMARY KEY(song_id,platform,source_id));
 CREATE TABLE IF NOT EXISTS song_segments(song_id TEXT PRIMARY KEY,data TEXT NOT NULL);`);
    return db;
  }
  root(characterId) {
    this.store.character(characterId);
    return path.join(
      this.store.attachmentsRoot(characterId),
      this.store.installation().vaultLayout?.format === 2 ? "曲库" : "songs",
    );
  }
  list(characterId) {
    return {
      songs: this.db(characterId)
        .prepare(
          "SELECT s.*,(SELECT group_concat(platform,',') FROM song_origins o WHERE o.song_id=s.id) AS platforms,(SELECT source_url FROM song_origins o WHERE o.song_id=s.id ORDER BY platform LIMIT 1) AS source_url,(SELECT data FROM song_segments m WHERE m.song_id=s.id) AS segment FROM songs s ORDER BY s.created DESC",
        )
        .all()
        .map((row) => {
          try {
            return {
              ...row,
              segment: row.segment ? JSON.parse(row.segment) : null,
            };
          } catch {
            return { ...row, segment: null };
          }
        }),
      renders: this.db(characterId)
        .prepare(
          "SELECT * FROM song_renders WHERE status!='deleted' ORDER BY created DESC LIMIT 30",
        )
        .all(),
      busy: this.active.has(characterId),
    };
  }
  setOrigin(characterId, songId, { platform, id, url }) {
    const db = this.db(characterId);
    if (
      !["bili", "netease"].includes(platform) ||
      typeof id !== "string" ||
      id.length > 100 ||
      typeof url !== "string" ||
      url.length > 500
    )
      throw fail("音源来源无效");
    if (!db.prepare("SELECT id FROM songs WHERE id=?").get(songId))
      throw fail("当前角色曲库没有此音源", 404);
    db.prepare("INSERT OR IGNORE INTO song_origins VALUES(?,?,?,?)").run(
      songId,
      platform,
      id,
      url,
    );
  }
  setSegment(characterId, songId, segment) {
    const db = this.db(characterId);
    if (!db.prepare("SELECT id FROM songs WHERE id=?").get(songId))
      throw fail("当前角色曲库没有此音源", 404);
    if (
      !segment ||
      !Number.isFinite(segment.startSeconds) ||
      segment.startSeconds < 0 ||
      segment.startSeconds > 14400 ||
      ![
        "manual",
        "opening",
        "title-hint",
        "lyrics-repeat",
        "fallback",
      ].includes(segment.method) ||
      typeof segment.detail !== "string" ||
      segment.detail.length > 500
    )
      throw fail("片段定位信息无效");
    db.prepare("INSERT OR REPLACE INTO song_segments VALUES(?,?)").run(
      songId,
      JSON.stringify(segment),
    );
  }
  clearCache(characterId) {
    if (this.active.has(characterId))
      throw fail("转换进行中，请完成后再清理", 409);
    const db = this.db(characterId),
      rows = db
        .prepare("SELECT id FROM song_renders WHERE status='done'")
        .all();
    let removed = 0;
    for (const row of rows) {
      const file = path.join(this.root(characterId), row.id),
        stat = fs.lstatSync(file, { throwIfNoEntry: false });
      if (stat && (!stat.isFile() || stat.isSymbolicLink()))
        throw fail("成品不是普通文件，停止清理", 409);
      if (stat) {
        fs.unlinkSync(file);
        removed++;
      }
      db.prepare(
        "UPDATE song_renders SET status='cache-cleared',error='用户清理了生成成品；音源与参考音色仍保留' WHERE id=?",
      ).run(row.id);
    }
    return { status: "cleared", removed, originalsPreserved: true };
  }
  remove(characterId, id, { clearDefault = false, revision } = {}) {
    if (this.active.has(characterId))
      throw fail("转换进行中，请稍后移除音源", 409);
    const character = this.store.character(characterId),
      isDefault = character.config["sing.referenceId"] === id;
    if (typeof clearDefault !== "boolean") throw fail("解除默认引用选项无效");
    if (isDefault && !clearDefault)
      throw fail("这是默认参考音色，请先更换默认音色", 409);
    if (isDefault && revision !== character.revision)
      throw fail("参考音色配置已更新，请刷新后重新确认删除", 409);
    const db = this.db(characterId),
      row = db.prepare("SELECT * FROM songs WHERE id=?").get(id);
    if (!row) throw fail("当前角色没有这首音频", 404);
    const origins = db
      .prepare("SELECT * FROM song_origins WHERE song_id=?")
      .all(id);
    const result = recycleAsset(
      this.root(characterId),
      {
        ...row,
        origins,
        segment:
          db.prepare("SELECT data FROM song_segments WHERE song_id=?").get(id)
            ?.data || null,
      },
      () => {
        let released;
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("DELETE FROM song_origins WHERE song_id=?").run(id);
          db.prepare("DELETE FROM song_segments WHERE song_id=?").run(id);
          db.prepare("DELETE FROM songs WHERE id=?").run(id);
          if (isDefault)
            released = this.store.configure(
              characterId,
              { "sing.referenceId": "" },
              { revision },
            );
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          if (released) {
            const current = this.store.character(characterId);
            if (
              current.revision === released.revision &&
              !current.config["sing.referenceId"]
            )
              this.store.configure(
                characterId,
                { "sing.referenceId": id },
                { revision: current.revision },
              );
          }
          throw error;
        }
      },
    );
    return {
      ...result,
      defaultCleared: isDefault,
      detail: "音源与元数据保留在本角色曲库 .trash 目录；转换记录不删除",
    };
  }
  removeRender(characterId, id) {
    if (this.active.has(characterId))
      throw fail("转换进行中，请完成后再删除成品", 409);
    const db = this.db(characterId),
      row = db
        .prepare("SELECT * FROM song_renders WHERE id=? AND status!='deleted'")
        .get(id);
    if (!row) throw fail("当前角色没有这条翻唱记录", 404);
    if (row.status === "converting")
      throw fail("成品仍在生成，请稍后删除", 409);
    return recycleAsset(this.root(characterId), row, () => {
      db.prepare(
        "UPDATE song_renders SET status='deleted',error='用户删除了此成品' WHERE id=?",
      ).run(id);
    });
  }
  import(characterId, bytes, title) {
    if (!bytes.length || bytes.length > 15 * 1024 * 1024)
      throw fail("音频应为 1B–15MB");
    const mime =
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WAVE"
        ? "audio/wav"
        : bytes.subarray(0, 3).toString() === "ID3" ||
            (bytes[0] === 255 && (bytes[1] & 224) === 224)
          ? "audio/mpeg"
          : bytes.subarray(0, 4).toString() === "fLaC"
            ? "audio/flac"
            : bytes.subarray(0, 4).toString() === "OggS"
              ? "audio/ogg"
              : null;
    if (!mime) throw fail("请使用实际 WAV、MP3、FLAC 或 Ogg 音频");
    if (typeof title !== "string" || !title.trim() || title.length > 150)
      throw fail("曲名应为 1–150 字符");
    const db = this.db(characterId),
      fingerprint = hash(bytes),
      old = db.prepare("SELECT * FROM songs WHERE hash=?").get(fingerprint);
    if (old) return { ...old, duplicate: true };
    const id = crypto.randomUUID(),
      root = this.root(characterId);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, id), bytes, { flag: "wx" });
    db.prepare("INSERT INTO songs VALUES(?,?,?,?,?,?)").run(
      id,
      title.trim(),
      mime,
      fingerprint,
      bytes.length,
      new Date().toISOString(),
    );
    return db.prepare("SELECT * FROM songs WHERE id=?").get(id);
  }
  file(characterId, id, render = false) {
    const db = this.db(characterId),
      row = db
        .prepare(
          render
            ? "SELECT * FROM song_renders WHERE id=? AND status='done'"
            : "SELECT * FROM songs WHERE id=?",
        )
        .get(id);
    if (!row) throw fail("当前角色没有这首音频", 404);
    const file = path.join(this.root(characterId), row.id);
    if (!fs.existsSync(file)) throw fail("音频文件缺失，曲库记录仍已保留", 410);
    return { file, mime: render ? "audio/wav" : row.mime, row };
  }
  async convert(characterId, { sourceId, referenceId }, engines, callerSignal) {
    callerSignal?.throwIfAborted();
    const c = this.store.character(characterId).config;
    if (c["sing.mode"] === "disabled") throw fail("请先选择唱歌连接方式", 409);
    if (this.closed) throw fail("唱歌服务已关闭", 409);
    if (this.active.has(characterId) || this.active.size >= 2)
      throw fail("唱歌节点正在转换，请稍后再试", 409);
    const source = this.file(characterId, sourceId),
      reference = this.file(characterId, referenceId || c["sing.referenceId"]);
    const model = c["sing.local.modelPath"],
      stat = model ? fs.statSync(model, { throwIfNoEntry: false }) : null;
    const params = {
      pitchShift: c["sing.pitchShift"],
      autoShift: c["sing.autoShift"],
      vocalSep: c["sing.vocalSeparation"],
      nSteps: c["sing.steps"],
      cfg: c["sing.guidance"],
    };
    const fingerprint = hash(
        JSON.stringify({
          source: source.row.hash,
          reference: reference.row.hash,
          params,
          mode: c["sing.mode"],
          base: c["sing.baseUrl"],
          model,
          mtime: stat?.mtimeMs,
          size: stat?.size,
          maxSeconds: 45,
        }),
      ),
      db = this.db(characterId);
    if (c["sing.cache"]) {
      const cache = db
        .prepare(
          "SELECT * FROM song_renders WHERE fingerprint=? AND status='done' ORDER BY created DESC LIMIT 1",
        )
        .get(fingerprint);
      if (cache && fs.existsSync(path.join(this.root(characterId), cache.id)))
        return { ...cache, cached: true };
    }
    const lease = new RuntimeLease(this.store.dataRoot, `sing-${characterId}`);
    if (!lease.acquire()) throw fail("此角色的唱歌转换已由另一个宿主处理", 409);
    db.prepare(
      "UPDATE song_renders SET status='interrupted',error='上次转换未完成，请重新执行' WHERE status='converting'",
    ).run();
    const id = crypto.randomUUID();
    db.prepare(
      "INSERT INTO song_renders VALUES(?,?,?,?,'converting',NULL,NULL,?)",
    ).run(
      id,
      source.row.id,
      reference.row.id,
      fingerprint,
      new Date().toISOString(),
    );
    this.active.add(characterId);
    const clipFile = path.join(this.root(characterId), `${id}.source.wav`);
    const referenceFile = path.join(
      this.root(characterId),
      `${id}.reference.wav`,
    );
    try {
      const clippingSignal = AbortSignal.any([
        this.abort.signal,
        ...(callerSignal ? [callerSignal] : []),
      ]);
      fs.writeFileSync(
        clipFile,
        await this.clip(c, fs.readFileSync(source.file), {
          seconds: 45,
          signal: clippingSignal,
        }),
      );
      fs.writeFileSync(
        referenceFile,
        await this.clip(c, fs.readFileSync(reference.file), {
          seconds: 30,
          signal: clippingSignal,
        }),
      );
      const request = async (base, signal, remote = false) => {
        const env = c["sing.secretEnv"],
          key = remote && env ? process.env[env] : "";
        if (remote && env && !key)
          throw fail("远程唱歌凭据环境变量未配置", 409);
        const response = await fetch(
          `${base}${remote ? "/svc/convert" : "/convert"}`,
          {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.any([
              this.abort.signal,
              ...(callerSignal ? [callerSignal] : []),
              ...(signal ? [signal] : []),
              AbortSignal.timeout(c["sing.timeoutSeconds"] * 1000),
            ]),
            headers: {
              "Content-Type": "application/json",
              ...(key ? { Authorization: `Bearer ${key}` } : {}),
            },
            body: JSON.stringify(
              remote
                ? {
                    ...params,
                    source: {
                      base64: fs.readFileSync(clipFile).toString("base64"),
                      mime: "audio/wav",
                    },
                    reference: {
                      base64: fs.readFileSync(referenceFile).toString("base64"),
                      mime: "audio/wav",
                    },
                  }
                : { ...params, prompt: referenceFile, target: clipFile },
            ),
          },
        );
        if (!response.ok) {
          await response.body?.cancel();
          throw fail(`唱歌节点返回 HTTP ${response.status}`, 502);
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of response.body) {
          size += chunk.length;
          if (size > 30 * 1024 * 1024) throw fail("唱歌结果超过大小限制", 502);
          chunks.push(chunk);
        }
        let result;
        try {
          result = JSON.parse(Buffer.concat(chunks));
        } catch {
          throw fail("唱歌节点没有返回约定的协议", 502);
        }
        if (
          result?.ok !== true ||
          typeof result.wav !== "string" ||
          !/^[A-Za-z0-9+/=]+$/.test(result.wav)
        )
          throw fail("唱歌节点没有返回有效音频", 502);
        const bytes = Buffer.from(result.wav, "base64");
        if (
          bytes.length < 12 ||
          bytes.length > 20 * 1024 * 1024 ||
          bytes.subarray(0, 4).toString() !== "RIFF" ||
          bytes.subarray(8, 12).toString() !== "WAVE"
        )
          throw fail("唱歌节点返回的不是有效 WAV 文件", 502);
        return bytes;
      };
      let bytes;
      if (c["sing.mode"] === "soulx-managed") {
        if (!engines) throw fail("本地引擎管理未接入", 409);
        bytes = await engines.withEngine(characterId, "sing", request);
      } else if (c["sing.mode"] === "soulx-existing") {
        await this.connectionPolicy(`http://127.0.0.1:${c["sing.local.port"]}`);
        bytes = await request(`http://127.0.0.1:${c["sing.local.port"]}`);
      } else {
        if (!c["sing.baseUrl"]) throw fail("请填写远程唱歌节点地址", 409);
        await this.connectionPolicy(c["sing.baseUrl"]);
        bytes = await request(
          c["sing.baseUrl"].replace(/\/+$/, ""),
          undefined,
          true,
        );
      }
      this.abort.signal.throwIfAborted();
      bytes = await this.clip(c, bytes, {
        seconds: 45,
        signal: clippingSignal,
      });
      callerSignal?.throwIfAborted();
      fs.writeFileSync(path.join(this.root(characterId), id), bytes, {
        flag: "wx",
      });
      db.prepare(
        "UPDATE song_renders SET status='done',bytes=? WHERE id=?",
      ).run(bytes.length, id);
      return db.prepare("SELECT * FROM song_renders WHERE id=?").get(id);
    } catch (error) {
      if (!this.closed)
        db.prepare(
          "UPDATE song_renders SET status='failed',error=? WHERE id=?",
        ).run(error.message, id);
      throw error;
    } finally {
      try {
        fs.rmSync(clipFile, { force: true });
        fs.rmSync(referenceFile, { force: true });
      } finally {
        this.active.delete(characterId);
        lease.release();
      }
    }
  }
  close() {
    this.closed = true;
    this.abort.abort();
  }
}
