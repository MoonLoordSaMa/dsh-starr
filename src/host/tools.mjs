import { fail } from "../starrcore/store.mjs";
import { Slang } from "../conversation/slang.mjs";
import { Singing } from "../media/singing.mjs";
import { MusicCatalog } from "../media/music.mjs";
import { mediaServices } from "../runtime/media-services.mjs";
import { MemoryMaintenance } from "../starrcore/maintenance.mjs";
import fs from "node:fs";

// 这是内部可信宿主契约，非臆造的 DSH SDK。正式适配器只在绑定会话后创建此上下文。
export function createTools(store, trustedContext) {
  if (!trustedContext?.characterId) throw fail("宿主没有绑定角色", 403);
  const characterId = trustedContext.characterId;
  store.character(characterId);
  const sessionId = trustedContext.sessionId;
  if (
    sessionId &&
    store.conversations.get(sessionId).character_id !== characterId
  )
    throw fail("会话与角色不匹配", 403);
  return {
    starr_song_search: (input) => {
      const runtime = mediaServices(store);
      const music =
        runtime.music ||
        new MusicCatalog(store, {
          bili: runtime.bili,
          singing: runtime.singing || new Singing(store),
        });
      return music.search(characterId, input, {
        bot: true,
        signal: trustedContext.signal,
      });
    },
    starr_bili_social: (input) => {
      if (!sessionId) throw fail("缺少可信角色会话", 403);
      const bili = mediaServices(store).bili;
      if (!bili) throw fail("B站宿主服务未就绪", 409);
      return bili.autonomy.execute(
        characterId,
        sessionId,
        input,
        trustedContext.signal,
      );
    },
    starr_song_source: (input) => {
      const runtime = mediaServices(store);
      if (!runtime.singing) throw fail("音源服务尚未就绪", 409);
      const music =
        runtime.music ||
        new MusicCatalog(store, {
          bili: runtime.bili,
          singing: runtime.singing,
        });
      return music.source(characterId, input, {
        bot: true,
        signal: trustedContext.signal,
      });
    },
    starr_see_now: ({ source = "screen", seconds = 3, prompt } = {}) => {
      const runtime = mediaServices(store);
      if (!runtime.vision) throw fail("视觉采集尚未接入宿主", 409);
      if (!["screen", "camera"].includes(source)) throw fail("画面来源无效");
      const c = store.character(characterId).config;
      return runtime.vision.inspect(characterId, {
        source: {
          kind: source,
          ...(source === "camera"
            ? { device: c["vision.camera.device"] || undefined }
            : {}),
        },
        seconds,
        prompt,
        signal: trustedContext.signal,
        secrets: runtime.workbench,
        sessionId,
      });
    },
    starr_bili_watch: async ({ bvid, seconds = 30, prompt }) => {
      if (!store.character(characterId).config["bili.actions.allowBot"])
        throw fail("管理员未授权B站读取", 403);
      const runtime = mediaServices(store);
      if (!runtime.bili || !runtime.vision)
        throw fail("B站视觉服务尚未就绪", 409);
      return runtime.bili.watch(
        characterId,
        { bvid, seconds, prompt, sessionId },
        runtime,
        trustedContext.signal,
      );
    },
    starr_memory_status: () => {
      if (!sessionId) throw fail("会话尚未登记", 403);
      return store.conversations.memoryStatus(sessionId, { check: true });
    },
    starr_bili_read: (input) => {
      if (!store.character(characterId).config["bili.actions.allowBot"])
        throw fail("管理员未授权角色读取 B站公开资料", 403);
      if (!["feed", "search", "profile", "video"].includes(input.kind))
        throw fail("角色工具仅开放公开资料，不读取私人历史或收藏", 403);
      const bili = mediaServices(store).bili;
      if (!bili) throw fail("B站宿主服务尚未就绪", 409);
      return bili.operations.read(characterId, input, trustedContext.signal);
    },
    starr_memory_archive: (input) => {
      if (
        !sessionId ||
        !store.character(characterId).config["permissions.botMemoryArchive"]
      )
        throw fail("管理员未授权角色归档本会话记忆", 403);
      return new MemoryMaintenance(store).archive(
        characterId,
        input,
        sessionId,
      );
    },
    starr_voice_list: () => {
      const c = store.character(characterId).config;
      if (c["tts.connection"] !== "breeze-local")
        return {
          voices: [String(c["tts.voice"] || "")].filter(Boolean),
          verified: false,
          detail: "兼容云服务没有统一音色枚举协议，当前仅显示已配置名称",
        };
      const dir = c["tts.local.voicesDir"],
        stat = dir ? fs.lstatSync(dir, { throwIfNoEntry: false }) : null;
      if (!stat?.isDirectory() || stat.isSymbolicLink())
        throw fail("本地音色目录不可用", 409);
      return {
        voices: fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((row) => row.isFile() && row.name.endsWith(".breeze"))
          .slice(0, 100)
          .map((row) => row.name.slice(0, -7)),
        verified: false,
        detail: "文件清单不代表已完成合成测试",
      };
    },
    starr_link_parse: ({ text }) => {
      if (typeof text !== "string" || text.length > 2000)
        throw fail("链接正文无效");
      const bvid = /(?:^|\/)(BV[A-Za-z0-9]{10})(?:[/?#\s]|$)/.exec(text)?.[1];
      if (bvid)
        return {
          type: "bili-video",
          id: bvid,
          url: `https://www.bilibili.com/video/${bvid}`,
          fetched: false,
        };
      const dynamic =
        /https:\/\/(?:t\.bilibili\.com|www\.bilibili\.com\/opus)\/(\d{1,30})(?:[/?#\s]|$)/.exec(
          text,
        )?.[1];
      if (dynamic)
        return {
          type: "bili-dynamic",
          id: dynamic,
          url: `https://t.bilibili.com/${dynamic}`,
          fetched: false,
        };
      throw fail("目前支持完整的 B站视频与动态链接，短链请展开后提供");
    },
    starr_song_list: ({ q = "" } = {}) => {
      const library = (mediaServices(store).singing || new Singing(store)).list(
        characterId,
      );
      return {
        ...library,
        songs: library.songs.filter((song) =>
          song.title.toLowerCase().includes(String(q).toLowerCase()),
        ),
      };
    },
    starr_sing: (input) => {
      if (!store.character(characterId).config["sing.allowBot"])
        throw fail("管理员未授权角色生成翻唱", 403);
      const runtime = mediaServices(store);
      if (!runtime.singing) throw fail("宿主唱歌服务尚未就绪", 409);
      return runtime.singing.convert(
        characterId,
        input,
        runtime.localMedia,
        trustedContext.signal,
      );
    },
    starr_slang_query: ({ q = "" }) => {
      if (!sessionId) throw fail("缺少可信会话", 403);
      return new Slang(store).query(sessionId, q);
    },
    starr_slang_submit: (input) => {
      if (!sessionId) throw fail("缺少可信会话", 403);
      return new Slang(store).submit(sessionId, input);
    },
    starr_memory_write: (input) => {
      const session = sessionId && store.conversations.get(sessionId);
      if (
        input.visibility &&
        !["conversation", "shared"].includes(input.visibility)
      )
        throw fail("记忆可见范围无效");
      if (
        input.visibility === "shared" &&
        (!session ||
          !store.character(characterId).config["memory.allowSharedWrites"])
      )
        throw fail("尚未授权角色创建共享记忆", 403);
      const result = store.saveMemory(
        characterId,
        {
          ...input,
          ...(session && input.eventKey
            ? {
                eventKey: `${trustedContext.sessionId}:${input.eventKey}`.slice(
                  0,
                  300,
                ),
              }
            : {}),
          source: trustedContext.sessionId
            ? `DSH 会话 ${trustedContext.sessionId}`
            : "宿主工具调用",
        },
        session
          ? { sessionId, visibility: input.visibility || "conversation" }
          : undefined,
      );
      return result;
    },
    starr_memory_search: (input) => {
      const rows = store.db
        .prepare("SELECT session_id FROM chat_sessions WHERE session_id=?")
        .get(trustedContext.sessionId || "")
        ? store.conversations.visibleMemories(trustedContext.sessionId, {
            ...input,
            mode: input?.sort === "recent" ? "recent" : "search",
            limit: store.character(characterId).config["memory.recallLimit"],
          })
        : store.listMemory(characterId, {
            ...input,
            limit: store.character(characterId).config["memory.recallLimit"],
          });
      // 搜索仅返回短摘录，避免长篇旧概览随工具结果反复进入后续会话。
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        kind: row.kind,
        created: row.created,
        revision: row.revision,
        importance: row.importance,
        anchor: row.anchor,
        visibility: row.visibility,
        score: row.score,
        content: row.content.slice(0, 600),
        contentChars: row.content.length,
        truncated: row.content.length > 600,
      }));
    },
    starr_memory_read: ({ id }) => {
      if (!trustedContext.sessionId) throw fail("会话尚未登记", 403);
      const row = store.conversations.visibleMemories(
        trustedContext.sessionId,
        { id, limit: 1 },
      )[0];
      if (!row) throw fail("当前会话无法读取这条记忆", 404);
      return row;
    },
    starr_chat_note: (input) => {
      if (!trustedContext.sessionId) throw fail("会话尚未登记", 403);
      return store.conversations.patch(
        trustedContext.sessionId,
        {
          revision: input.revision,
          patch: { summary: input.summary, pending: input.pending || "" },
        },
        "bot",
      );
    },
    starr_memory_link: (input) => {
      if (sessionId)
        for (const id of [input.source, input.target]) {
          if (
            !store.conversations.visibleMemories(sessionId, { id, limit: 1 })[0]
          )
            throw fail("当前会话无法关联不可见的记忆", 404);
        }
      return store.link(characterId, input);
    },
    starr_state_read: () => store.getState(characterId),
    starr_state_update: (input) => store.updateState(characterId, input),
    starr_experience_record: (input) =>
      store.recordExperience(characterId, {
        ...input,
        evidence: `${trustedContext.sessionId ? `DSH 会话 ${trustedContext.sessionId}` : "宿主工具调用"}：${input.evidence ?? ""}`,
      }),
    starr_intention_evaluate: () => store.intentions(characterId),
    starr_goal_create: (input) =>
      store.createGoal(characterId, input, { sessionId }),
    starr_config_read: () => {
      const c = store.character(characterId);
      return {
        revision: c.revision,
        config: Object.fromEntries(
          Object.entries(c.config).filter(
            ([key]) =>
              !/\.(secretEnv|baseUrl|bin|python|modelPath|voicesDir|serverScript|promptWav|repo|preModels)$/.test(
                key,
              ),
          ),
        ),
      };
    },
    starr_config_update: (input) =>
      store.configure(characterId, input.patch, {
        bot: true,
        revision: input.revision,
      }),
  };
}
