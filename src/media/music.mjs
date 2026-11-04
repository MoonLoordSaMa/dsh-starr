import { fail } from "../starrcore/store.mjs";
import { RuntimeLease } from "../runtime/lease.mjs";
import {
  neteaseClient,
  downloadNeteaseMedia,
  neteaseSongUrl,
} from "./netease.mjs";
import { audioClip } from "./process.mjs";
import { chooseSegment, segmentRequest, chorusHint } from "./segments.mjs";

export class MusicCatalog {
  constructor(
    store,
    {
      bili,
      singing,
      netease = neteaseClient(),
      download = downloadNeteaseMedia,
      clip = audioClip,
    } = {},
  ) {
    this.store = store;
    this.bili = bili;
    this.singing = singing;
    this.netease = netease;
    this.download = download;
    this.clip = clip;
    this.active = new Set();
    this.abort = new AbortController();
  }
  check(characterId, platform, { bot = false, importing = false } = {}) {
    if (this.abort.signal.aborted) throw fail("音乐服务已停止", 409);
    const c = this.store.character(characterId).config;
    if (platform === "netease" && !c["sing.search.netease"])
      throw fail("网易云检索与取音源已停用，可在唱歌页开启", 403);
    if (bot && platform === "bili" && !c["bili.actions.allowBot"])
      throw fail("尚未授权角色读取B站公开资料，请在B站权限中开启", 403);
    if (bot && importing && !c["sing.source.allowBot"])
      throw fail(
        "已找到候选，但尚未允许角色保存网络音源；请在唱歌页开启“允许角色查找并保存网络音源”",
        403,
      );
    return c;
  }
  async search(
    characterId,
    { q = "", platform = "all", limit = 8, segment = "chorus" } = {},
    { bot = false, signal } = {},
  ) {
    this.store.character(characterId);
    segmentRequest(segment);
    if (
      typeof q !== "string" ||
      !q.trim() ||
      q.length > 100 ||
      !["all", "local", "bili", "netease"].includes(platform) ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 10
    )
      throw fail("请提供1–100字搜索词、有效平台与1–10条结果上限");
    signal = AbortSignal.any([this.abort.signal, ...(signal ? [signal] : [])]);
    signal.throwIfAborted();
    const platforms =
      platform === "all" ? ["local", "bili", "netease"] : [platform];
    const outcomes = await Promise.allSettled(
      platforms.map(async (p) => {
        this.check(characterId, p, { bot });
        if (p === "local")
          return this.singing
            .list(characterId)
            .songs.filter((s) =>
              q
                .trim()
                .toLowerCase()
                .split(/\s+/)
                .every((word) => s.title.toLowerCase().includes(word)),
            )
            .slice(0, limit)
            .map((s) => ({
              platform: "local",
              id: s.id,
              title: s.title,
              artists: [],
              url: s.source_url || "",
              originPlatform: s.platforms || "local",
              imported: true,
            }));
        if (p === "netease") return this.netease.search(q, { limit, signal });
        if (!this.bili)
          throw fail("B站宿主服务未连接；可改用网易云或本地曲库", 409);
        const preferredQuery =
          segment === "chorus" && !chorusHint(q) && q.trim().length <= 97
            ? `${q.trim()} 高潮`
            : q;
        let rows = await this.bili.operations.read(
          characterId,
          { kind: "search", q: preferredQuery },
          signal,
        );
        if (!rows.length && preferredQuery !== q)
          rows = await this.bili.operations.read(
            characterId,
            { kind: "search", q },
            signal,
          );
        return rows
          .sort(
            (a, b) => Number(chorusHint(b.title)) - Number(chorusHint(a.title)),
          )
          .slice(0, limit)
          .map((row) => ({
            platform: "bili",
            id: row.bvid,
            bvid: row.bvid,
            title: row.title,
            artists: [row.author].filter(Boolean),
            url: `https://www.bilibili.com/video/${row.bvid}`,
            description: row.description,
            segmentHint: chorusHint(row.title)
              ? "标题标注高潮或副歌，入库时优先该片段"
              : "未确认副歌位置，可指定片段起点",
          }));
      }),
    );
    signal.throwIfAborted();
    const sources = outcomes.map((result, i) => {
      // 读取期间撤权后不向角色返回此前取得的结果。
      try {
        this.check(characterId, platforms[i], { bot });
      } catch (e) {
        result = { status: "rejected", reason: e };
      }
      return result.status === "fulfilled"
        ? {
            platform: platforms[i],
            status: "ok",
            count: result.value.length,
            results: result.value,
          }
        : {
            platform: platforms[i],
            status: "unavailable",
            detail: String(result.reason?.message || "平台检索失败").slice(
              0,
              300,
            ),
            results: [],
          };
    });
    const c = this.store.character(characterId).config;
    return {
      q: q.trim(),
      segmentPreference: segment,
      sources,
      results: sources.flatMap((s) => s.results),
      workflow: {
        canImport: !bot || !!c["sing.source.allowBot"],
        canSing: !!c["sing.allowBot"],
        canSendQQ: !!c["chat.tools.singing"],
        hasReference: !!c["sing.referenceId"],
        mode: c["sing.mode"],
        maxSeconds: 45,
      },
      next: "优先使用本地音源id；网络候选先用starr_song_source传入platform和id入库，再把返回的sourceId交给starr_qq_sing。搜索命中不代表取得音频或完成翻唱",
    };
  }
  async source(
    characterId,
    { platform = "bili", id, bvid, segment = "chorus", startSeconds } = {},
    { bot = false, signal } = {},
  ) {
    segmentRequest(segment, startSeconds);
    if (!["bili", "netease"].includes(platform))
      throw fail("仅支持B站或网易云网络音源，本地音源可直接使用编号");
    this.check(characterId, platform, { bot, importing: true });
    if (this.active.has(characterId) || this.active.size >= 2)
      throw fail("音源正在入库，请稍后再试", 409);
    const lease = new RuntimeLease(
      this.store.dataRoot,
      `music-source-${characterId}`,
    );
    if (!lease.acquire()) throw fail("此角色已有音源入库任务", 409);
    this.active.add(characterId);
    signal = AbortSignal.any([this.abort.signal, ...(signal ? [signal] : [])]);
    try {
      signal.throwIfAborted();
      if (platform === "bili") {
        if (!this.bili) throw fail("B站宿主服务未连接", 409);
        const song = await this.bili.songSource(
          characterId,
          { bvid: bvid || id, segment, startSeconds },
          this.singing,
          signal,
          { bot },
        );
        return { ...song, sourceId: song.id, platform: "bili" };
      }
      const audio = await this.netease.audio(id, signal);
      let lyrics = "";
      if (
        segment === "chorus" &&
        startSeconds === undefined &&
        this.netease.lyrics
      ) {
        try {
          lyrics = await this.netease.lyrics(id, signal);
        } catch {
          signal.throwIfAborted();
        }
      }
      const selection = chooseSegment({
        segment,
        startSeconds,
        title: audio.title,
        lyrics,
        duration: audio.duration,
      });
      const bytes = await this.download(audio.url, { signal });
      const c = this.check(characterId, platform, { bot, importing: true });
      const clip = await this.clip(c, bytes, {
        seconds: 45,
        startSeconds: selection.startSeconds,
        signal,
      });
      signal.throwIfAborted();
      this.check(characterId, platform, { bot, importing: true });
      const song = this.singing.import(
        characterId,
        clip,
        `${[audio.title, ...(audio.artists || [])].filter(Boolean).join(" · ").slice(0, 120)} · 45秒内片段`,
      );
      this.singing.setOrigin(characterId, song.id, {
        platform: "netease",
        id: audio.id,
        url: neteaseSongUrl(audio.id),
      });
      this.singing.setSegment(characterId, song.id, selection);
      return {
        ...song,
        sourceId: song.id,
        platform: "netease",
        sourceUrl: neteaseSongUrl(audio.id),
        maxSeconds: 45,
        segment: selection,
      };
    } finally {
      this.active.delete(characterId);
      lease.release();
    }
  }
  close() {
    this.abort.abort();
  }
}
