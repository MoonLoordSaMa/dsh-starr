import path from "node:path";
import os from "node:os";
import {
  stateDimensions,
  experienceDefinitions,
  driveDefinitions,
} from "../starrcore/organism.mjs";
import { StarrStore, fail } from "../starrcore/store.mjs";
import { createServer } from "../server.mjs";
import { installPreset } from "./preset.mjs";
import { modelDiagnostics } from "./model-check.mjs";
import { installBoundSessions } from "./bound-sessions.mjs";
import { QQService } from "../qq/service.mjs";
import { createQQDriver } from "./qq-driver.mjs";
import { MemoryJobs } from "../jobs/service.mjs";
import { createJobDriver } from "./job-driver.mjs";
import { BiliService } from "../bili/service.mjs";
import { LocalMedia } from "../media/local.mjs";
import { Singing } from "../media/singing.mjs";
import { MusicCatalog } from "../media/music.mjs";
import { createActivityDriver } from "./activity-driver.mjs";
import { fields } from "../starrcore/config.mjs";
import { mountMediaServices } from "../runtime/media-services.mjs";
import { PlatformBridge } from "../bridge/service.mjs";
import { VisionCapture } from "../media/vision.mjs";
import { MediaWorkbench } from "../media/workbench.mjs";
import { createHostVision } from "./vision.mjs";
import { Agency } from "../agency/service.mjs";
import { createAgencyDriver } from "./agency-driver.mjs";

export const name = "starrcore";
export const inject = ["tools"];
const string = (description, required = false) => ({
  type: "string",
  description,
  ...(required ? { required: true } : {}),
});
const number = (description, required = false) => ({
  type: "number",
  description,
  ...(required ? { required: true } : {}),
});
export const toolSpecifications = [
  {
    name: "starr_song_search",
    description:
      "按歌名、歌手或风格统一搜索本角色曲库、B站、网易云。QQ点歌先调用此工具；联网结果尚未入库，需用starr_song_source，再把sourceId交给starr_qq_sing。各平台失败分别说明，不把搜索结果当作已经听过。",
    parameters: {
      q: string("歌名、歌手或音乐需求", true),
      platform: {
        ...string("默认all合并检索"),
        enum: ["all", "local", "bili", "netease"],
      },
      limit: number("每平台结果上限1–10，默认8"),
      segment: {
        ...string("默认chorus优先高潮/副歌，opening普通检索"),
        enum: ["chorus", "opening"],
      },
    },
  },
  {
    name: "starr_bili_social",
    description:
      "按管理员分别授权，在B站评论视频、向已联系的白名单对象私信或发布文字动态；回执不明不重发，不能自行扩大授权。",
    parameters: {
      kind: { ...string("操作种类", true), enum: ["comment", "dm", "dynamic"] },
      text: string("正文", true),
      bvid: string("评论的视频BV号"),
      target: string("已联系的私信用户mid"),
    },
  },
  {
    name: "starr_song_source",
    description:
      "将starr_song_search的B站或网易云候选音频裁为45秒内片段并保存本角色曲库目录，返回sourceId供SVC与starr_qq_sing使用。无需模型处理本地路径。受版权、付费、地区或试听限制时明确失败。",
    parameters: {
      platform: {
        ...string("平台，默认bili，兼容旧bvid用法"),
        enum: ["bili", "netease"],
      },
      id: string("搜索结果里的歌曲id或BV号"),
      bvid: string("兼容旧版B站BV号"),
      segment: {
        ...string("默认chorus优先高潮/副歌；opening从开头截取"),
        enum: ["chorus", "opening"],
      },
      startSeconds: number("可选明确片段起点（秒），0–14400；优先于自动定位"),
    },
  },
  {
    name: "starr_see_now",
    description:
      "读取管理员已授权的屏幕或摄像头短片段，结合视觉模型分析关键帧；不是持续监视，也不能推断未采集的画面或声音。",
    parameters: {
      source: { ...string("来源"), enum: ["screen", "camera"] },
      seconds: number("采集秒数1–12，默认3"),
      prompt: string("想观察的问题"),
    },
  },
  {
    name: "starr_bili_watch",
    description:
      "经授权分析B站视频前45秒内的真实关键帧，返回采样时间与视觉模型回答；不把标题、简介、字幕当作实际画面。",
    parameters: {
      bvid: string("BV号", true),
      prompt: string("画面问题"),
      seconds: number("最多45秒"),
    },
  },
  {
    name: "starr_memory_status",
    description:
      "检查当前角色记忆服务与本会话可见记录数量，区分没有授权、没有命中与数据库故障；不泄露其他会话正文或本地路径。",
    parameters: {},
  },
  {
    name: "starr_bili_read",
    description:
      "经管理员授权读取当前角色 B站公开资料；搜索、公开视频、用户资料与自己的公开动态，不读取私人历史收藏。",
    parameters: {
      kind: {
        ...string("资料种类", true),
        enum: ["feed", "search", "profile", "video"],
      },
      q: string("搜索关键词"),
      id: string("BV号或用户编号"),
    },
  },
  {
    name: "starr_memory_archive",
    description:
      "在管理员授权后归档本会话可见记忆，原文可恢复；不能清空全库或触及其他对象。",
    parameters: {
      id: string("记忆编号", true),
      revision: number("记忆修订号", true),
      reason: string("归档理由", true),
    },
  },
  {
    name: "starr_voice_list",
    description:
      "查看当前角色已配置音色；本地目录仅列清单，云端不虚构可用音色。",
    parameters: {},
  },
  {
    name: "starr_link_parse",
    description: "解析完整 B站视频和动态链接为规范地址，不执行外部链接内容。",
    parameters: { text: string("链接或BV号", true) },
  },
  {
    name: "starr_song_list",
    description:
      "只查看当前角色已导入音源、参考音色及翻唱记录；联网找歌使用starr_song_search，不能读取其他角色曲库。",
    parameters: { q: string("可选曲名关键词") },
  },
  {
    name: "starr_sing",
    description:
      "在管理员允许后使用当前角色曲库编号生成翻唱，返回成品编号；不会自行发送平台消息。",
    parameters: {
      sourceId: string("曲库音源编号", true),
      referenceId: string("可选参考音色编号"),
    },
  },
  {
    name: "starr_slang_query",
    description: "查询当前对话已学习的词语、解释与证据；不读取其他对象的用语。",
    parameters: { q: string("要查的用语或当前话题") },
  },
  {
    name: "starr_slang_submit",
    description:
      "根据当前 QQ 或 B站实际收到的多条消息记录用语解释；证据编号必须真实存在且出现该词。",
    parameters: {
      term: string("词语", true),
      definition: string("根据上下文形成的解释", true),
      confidence: number("理解置信度 0–100", true),
      evidence: {
        type: "array",
        items: { type: "string" },
        required: true,
        description: "当前会话实际收到的不同消息编号",
      },
    },
  },
  {
    name: "starr_memory_write",
    description:
      "立即保存当前角色的记忆、日记或概览。事件标识重复时幂等，不可伪造来源。",
    parameters: {
      title: string("标题", true),
      content: string("正文", true),
      kind: {
        ...string("类型"),
        enum: [
          "moment",
          "person",
          "promise",
          "interest",
          "diary",
          "summary",
          "self",
        ],
      },
      importance: number("重要度 0–100"),
      confidence: number("事实置信度 0–100"),
      anchor: { type: "boolean", description: "是否长期锚点" },
      eventKey: string("稳定来源事件标识，重试使用相同值"),
      visibility: {
        type: "string",
        enum: ["conversation", "shared"],
        description:
          "默认本会话；只有管理员已授权且适合共享的内容才标为 shared。",
      },
    },
  },
  {
    name: "starr_memory_search",
    description:
      "只检索当前可信会话可见记忆，返回编号与最多600字符摘录；truncated 表示正文未完整返回，需要时用 starr_memory_read 读全文。旧记录不受自动注入阈值限制。空关键词可查看记录，sort=recent 查询最近；无结果可换短关键词或检查 starr_memory_status。",
    parameters: {
      q: string("查询词，用空格分隔多个词"),
      kind: string("可选类型"),
      sort: { ...string("可选排序"), enum: ["relevance", "recent"] },
    },
  },
  {
    name: "starr_memory_read",
    description:
      "按编号读取当前会话可见记忆的完整正文，不能读取另一对话的私密记忆。",
    parameters: { id: string("记忆编号", true) },
  },
  {
    name: "starr_chat_note",
    description:
      "整理本会话接续摘要和未完事项，不发送平台消息，不复制聊天全文。revision 来自上下文中的会话接续，或第一次为 1。",
    parameters: {
      revision: number("会话修订号", true),
      summary: string("本会话真实发生的简短总结", true),
      pending: string("未完事项，没有则留空"),
    },
  },
  {
    name: "starr_memory_link",
    description: "为当前角色已有的两条记忆建立明确双链，星图与笔记共用。",
    parameters: {
      source: string("来源记忆编号", true),
      target: string("目标记忆编号", true),
      kind: { type: "string", enum: ["explicit", "semantic", "sequence"] },
      weight: number("关系强度 0–1"),
    },
  },
  {
    name: "starr_state_read",
    description: "读取当前角色的模拟心理与身体状态以及修订号。",
    parameters: {},
  },
  {
    name: "starr_state_update",
    description:
      "提交有理由和来源的状态变化，需携带当前修订号。哈希只用于去重，不识别情绪。",
    parameters: {
      revision: number("读取到的修订号", true),
      values: {
        type: "object",
        required: true,
        additionalProperties: false,
        properties: Object.fromEntries(
          stateDimensions
            .map((d) => [
              d.key,
              {
                type: "number",
                minimum: 0,
                maximum: 100,
                description: `${d.name}：${d.help}`,
              },
            ])
            .concat([
              ["emotion", { type: "string", description: "情绪名称" }],
              ["evidence", { type: "string", description: "来源与变化理由" }],
            ]),
        ),
      },
      eventKey: string("来源事件标识"),
    },
  },
  {
    name: "starr_experience_record",
    description:
      "记录刚发生的真实经历，驱动身体、心理、混合情绪与需求变化。重试复用事件标识；没有发生的吃饭、休息等不得捏造。",
    parameters: {
      revision: number("当前状态修订号", true),
      kind: {
        ...string("经历类型", true),
        enum: Object.keys(experienceDefinitions),
      },
      intensity: { ...number("强度 0–100"), minimum: 0, maximum: 100 },
      evidence: string("发生了什么及判断依据", true),
      eventKey: string("稳定事件标识", true),
    },
  },
  {
    name: "starr_intention_evaluate",
    description:
      "评估身体、心理和欲望形成的行动倾向，返回理由、资源限制、作息与冷却。只提出候选，不执行或发送消息；无急切需求时允许安静。",
    parameters: {},
  },
  {
    name: "starr_goal_create",
    description: "记录当前角色想做的事与理由；创建目的本身不发送平台消息。",
    parameters: {
      title: string("目的", true),
      reason: string("依据与理由", true),
      drive: {
        ...string("可选驱动力，关联身体与心理需求"),
        enum: driveDefinitions.map((d) => d.id),
      },
      due: {
        oneOf: [{ type: "string" }, { type: "null" }],
        description: "可选 ISO 到期时间",
      },
    },
  },
  {
    name: "starr_config_read",
    description: "读取当前角色的日常配置与修订号，不返回凭据或连接地址。",
    parameters: {},
  },
  {
    name: "starr_config_update",
    description:
      "在用户预先授权后小幅调整白名单习惯，不能改权限、路径、凭据或执行程序。",
    parameters: {
      revision: number("当前角色配置修订号", true),
      patch: {
        type: "object",
        required: true,
        additionalProperties: false,
        properties: Object.fromEntries(
          fields
            .filter((field) => field.bot)
            .map((field) => [
              field.key,
              {
                type:
                  field.type === "number"
                    ? field.integer
                      ? "integer"
                      : "number"
                    : field.type === "boolean"
                      ? "boolean"
                      : "string",
                ...(field.min !== undefined
                  ? { minimum: field.min, maximum: field.max }
                  : {}),
                description: field.help,
              },
            ]),
        ),
      },
    },
  },
];
function schema(spec) {
  const properties = {};
  const required = [];
  for (const [key, value] of Object.entries(spec)) {
    const { required: r, ...definition } = value;
    properties[key] = definition;
    if (r) required.push(key);
  }
  return {
    type: "object",
    properties,
    additionalProperties: false,
    ...(required.length ? { required } : {}),
  };
}

// 契约取自本机 DSH 0.2.1-rc.5 ctx.tools.register 与 exec.agent.id。
export function apply(ctx, config = {}) {
  if (!ctx?.tools?.register || !ctx?.on)
    throw fail("DSH 工具服务或生命周期接口缺失", 409);
  const bindings = config.sessionBindings ?? {};
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings))
    throw fail("sessionBindings 必须为受信任会话到角色编号的映射");
  for (const [sessionId, characterId] of Object.entries(bindings))
    if (!sessionId || typeof characterId !== "string")
      throw fail("会话绑定无效");
  const store = new StarrStore(
    config.dataRoot
      ? path.resolve(config.dataRoot)
      : path.join(
          process.env.DSH_HOME || path.join(os.homedir(), ".dsh"),
          "starr",
          "runtime",
        ),
  );
  const preset = installPreset(ctx, store.dataRoot);
  const modelCheck = modelDiagnostics(ctx);
  const qq = new QQService(store);
  const hostVision = createHostVision(ctx, store, {
    characterSelection: (id) => {
      const q = qq.settings().config;
      if (q.characterId === id && q.provider && q.model) return q;
      const c = store.character(id).config;
      return c["bili.provider"] && c["bili.model"]
        ? { provider: c["bili.provider"], model: c["bili.model"] }
        : null;
    },
  });
  const jobs = new MemoryJobs(store);
  const agency = new Agency(store, { qq });
  const bili = new BiliService(store);
  const bridge = new PlatformBridge(store, { qq, bili });
  const localMedia = new LocalMedia(store);
  store.localMedia = localMedia;
  store.singing = new Singing(store);
  const music = new MusicCatalog(store, { bili, singing: store.singing });
  const vision = new VisionCapture(store, { hostVision });
  const workbench = new MediaWorkbench(store, { engines: localMedia });
  store.workbench = workbench;
  store.vision = vision;
  const unmountMedia = mountMediaServices(store, {
    bili,
    singing: store.singing,
    localMedia,
    vision,
    workbench,
    hostVision,
    music,
  });
  let boundSessions;
  let disposed = false;
  const disposers = [];
  const close = () => {
    if (disposed) return;
    disposed = true;
    unmountMedia();
    music.close();
    boundSessions?.close();
    agency.close();
    qq.close();
    jobs.close();
    bili.close();
    bridge.close();
    localMedia.close();
    vision.close();
    hostVision.close();
    workbench.close();
    store.singing.close();
    preset.close();
    for (const dispose of disposers.reverse())
      if (typeof dispose === "function") dispose();
    store.close();
  };
  try {
    ctx.inject?.(["agents", "agentPresets"], (child) => {
      if (!child.agents?.create || !child.agentPresets?.mount) return;
      child.effect(() => {
        const driver = createQQDriver(child, store);
        const jobDriver = createJobDriver(child, store);
        const agencyDriver = createAgencyDriver(child, store);
        agency.start(agencyDriver);
        qq.attachDriver(driver);
        jobs.recover();
        jobs.start(jobDriver);
        const biliDriver = createQQDriver(child, store, { platform: "bili" });
        const activityDriver = createActivityDriver(child, store);
        bili.activityDriver = activityDriver;
        bili.start(biliDriver);
        bridge.start();
        return () => {
          bridge.stop();
          agency.stop();
          agencyDriver.close();
          qq.stop();
          driver.close();
          jobs.stop();
          jobDriver.close();
          bili.stop();
          biliDriver.close();
          activityDriver.close();
        };
      });
    });
    // 按宿主原生方式按需接入网页服务；无网页的宿主仍可使用记忆工具。
    ctx.inject?.(["webServer", "connection"], (webCtx) => {
      webCtx.effect(() => {
        if (disposed) return;
        const webui = createServer({
          store,
          mountPath: "/starr",
          hostOrigin: () => webCtx.webServer.getOrigin(),
          onboardingHost: {
            music,
            ...preset,
            hostStatus: () => ({
              status: disposed ? "unavailable" : "connected",
              connected: !disposed,
              detail: disposed
                ? "插件正在卸载"
                : "DSH 网页路由与工具服务已挂载；平台登录和模型回复仍按各自检查结果判断",
              services: {
                tools: typeof ctx.tools?.register === "function",
                preset: preset.presetStatus().status,
                qqDriver: Boolean(qq.driver),
                memoryJobsDriver: Boolean(jobs.driver),
                biliDriver: Boolean(bili.driver),
              },
            }),
            modelCatalog: () => modelCheck.catalog(),
            checkModel: (selection) => modelCheck.test(selection),
            qq,
            jobs,
            agency,
            bili,
            bridge,
            localMedia,
            workbench,
            vision,
            hostVision,
          },
        });
        const unregister = webCtx.webServer.register({
          kind: "prefix",
          path: "/starr",
          handler: (req, res) => {
            const rejection = webCtx.connection.requestRejection(req);
            if (rejection) {
              res.writeHead(rejection, {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
              });
              res.end(JSON.stringify({ error: "请先登录 DSH 后再打开 starr" }));
              return;
            }
            return webui.handle(req, res);
          },
        });
        let active = true;
        const remove = () => {
          if (!active) return;
          active = false;
          unregister();
        };
        disposers.push(remove);
        return remove;
      });
    });
    boundSessions = installBoundSessions(
      ctx,
      store,
      bindings,
      toolSpecifications.map((spec) => ({
        name: spec.name,
        description: spec.description,
        parameters: schema(spec.parameters),
        output: {
          schema: {},
          render: (_args, value) => [
            { type: "text", text: JSON.stringify(value) },
          ],
        },
      })),
    );
    ctx.on("dispose", close);
  } catch (e) {
    close();
    throw e;
  }
  return close;
}
