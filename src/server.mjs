import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { StarrStore, fail } from "./starrcore/store.mjs";
import { fields } from "./starrcore/config.mjs";
import { speak, see, hear } from "./media/compatible.mjs";
import { Onboarding } from "./onboarding/service.mjs";
import { discoverLocalModels, discoveryDefaults } from "./media/discovery.mjs";
import { Singing } from "./media/singing.mjs";
import { MusicCatalog } from "./media/music.mjs";
import { UsageBudget } from "./conversation/budget.mjs";
import { MemoryMaintenance } from "./starrcore/maintenance.mjs";
import { createTools } from "./host/tools.mjs";
import { MediaWorkbench } from "./media/workbench.mjs";
import { VisionCapture } from "./media/vision.mjs";
import { Agency } from "./agency/service.mjs";
import { todayOverview } from "./agency/today.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  fs.readFileSync(path.join(repo, "package.json"), "utf8"),
);
const legacyCatalog = JSON.parse(
  fs.readFileSync(
    path.join(repo, "src/configuration/legacy-catalog.json"),
    "utf8",
  ),
);
async function body(req, binary = false) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024 * 1024) throw fail("请求超过 16MB 限制", 413);
    chunks.push(chunk);
  }
  const result = Buffer.concat(chunks);
  if (binary) return result;
  try {
    return JSON.parse(result.toString() || "{}");
  } catch {
    throw fail("请求正文不是有效 JSON");
  }
}
export function createServer({
  dataRoot = process.env.STARR_DATA_DIR ||
    path.join(os.homedir(), ".local", "share", "dsh-starr-preview"),
  port = Number(process.env.STARR_PORT || 17841),
  store: sharedStore,
  mountPath = "",
  hostOrigin,
  onboardingHost,
} = {}) {
  const store = sharedStore ?? new StarrStore(dataRoot);
  const onboarding = new Onboarding(store, onboardingHost);
  const singing = store.singing || new Singing(store);
  const ownsMusic = !onboardingHost?.music;
  const music =
    onboardingHost?.music ||
    new MusicCatalog(store, { singing, bili: onboardingHost?.bili });
  const usageBudget = new UsageBudget(store);
  const ownsAgency = !onboardingHost?.agency && !store.agency;
  const agency = onboardingHost?.agency || store.agency || new Agency(store);
  const memoryMaintenance = new MemoryMaintenance(store);
  const workbench =
    onboardingHost?.workbench ||
    new MediaWorkbench(store, { engines: onboardingHost?.localMedia });
  const vision = onboardingHost?.vision || new VisionCapture(store);
  const hostStatus = () => {
    const origin = hostOrigin?.();
    if (!origin)
      return {
        status: hostOrigin ? "unavailable" : "standalone",
        connected: false,
        detail: hostOrigin
          ? "DSH 网页服务暂未就绪，请重新检查"
          : "当前是独立控制台；请从 DSH 侧栏打开 starr 使用宿主会话服务",
      };
    return {
      status: "connected",
      connected: true,
      detail: "已通过 DSH 同源控制台接入；模型调用、QQ 与 B站登录需分别验证",
      ...(onboardingHost?.hostStatus?.() || {}),
    };
  };
  let discoveryBusy = false;
  const handle = async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    const send = (data, status = 200) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const host = req.headers.host;
      const actualPort = server.address()?.port ?? port;
      const allowedHosts = [
        `127.0.0.1:${actualPort}`,
        `localhost:${actualPort}`,
      ];
      const origin = hostOrigin?.();
      if (origin)
        allowedHosts.splice(0, allowedHosts.length, new URL(origin).host);
      if (!allowedHosts.includes(host)) throw fail("拒绝非本机请求地址", 403);
      if (
        req.headers.origin &&
        ![
          "http://127.0.0.1:17842",
          "http://localhost:17842",
          ...allowedHosts.map((h) => "http://" + h),
          ...(origin ? [origin, "dsh-app://app"] : []),
        ].includes(req.headers.origin)
      )
        throw fail("请求来源不受信任", 403);
      const u = new URL(req.url, "http://127.0.0.1"),
        method = req.method;
      if (mountPath && u.pathname === mountPath) {
        res.writeHead(302, { Location: mountPath + "/" + u.search });
        return res.end();
      }
      if (mountPath && !u.pathname.startsWith(mountPath + "/"))
        throw fail("接口不存在", 404);
      const p = u.pathname.slice(mountPath.length);
      if (p === "/api/bootstrap" && method === "GET")
        return send({
          version,
          stage: hostStatus().connected
            ? "DSH 插件控制台"
            : "独立控制台 · 尚未连接 DSH",
          host: hostStatus(),
          installation: store.installation(),
          characters: store.listCharacters(),
          onboarding: onboarding.status(),
          fields,
          recommended: {
            memoryRoot: path.join(store.dataRoot, "memory"),
            backupRoot: path.join(store.dataRoot, "backups"),
          },
        });
      if (p === "/api/setup" && method === "POST")
        return send(store.setup(await body(req)), 201);
      if (p === "/api/local-models" && method === "GET")
        return send({
          ...discoveryDefaults(
            u.searchParams.get("characterId")
              ? store.character(u.searchParams.get("characterId")).config
              : {},
          ),
          host: onboardingHost?.modelCatalog
            ? await onboardingHost.modelCatalog()
            : { providers: [], detail: "独立控制台未连接 DSH 模型服务" },
        });
      if (p === "/api/configuration/catalog" && method === "GET")
        return send(legacyCatalog);
      if (p === "/api/local-models/discover" && method === "POST") {
        if (discoveryBusy) throw fail("本地模型发现正在进行，请稍后重试", 409);
        discoveryBusy = true;
        try {
          return send(await discoverLocalModels(await body(req)));
        } finally {
          discoveryBusy = false;
        }
      }
      if (p === "/api/onboarding" && method === "GET")
        return send(onboarding.status());
      if (p === "/api/onboarding" && method === "PATCH")
        return send(onboarding.save(await body(req)));
      if (p === "/api/onboarding/snowluma" && method === "POST")
        return send(await onboarding.snow(await body(req)));
      if (p === "/api/onboarding/character" && method === "POST")
        return send(onboarding.create(await body(req)), 201);
      if (p === "/api/onboarding/memory" && method === "POST")
        return send(onboarding.inspectMemory());
      if (p === "/api/onboarding/preset" && method === "POST")
        return send(await onboarding.preset());
      if (p === "/api/onboarding/models" && method === "GET")
        return send(await onboarding.models());
      if (p === "/api/onboarding/model-test" && method === "POST")
        return send(await onboarding.testModel());
      if (p === "/api/onboarding/finish" && method === "POST") {
        const result = onboarding.finish(await body(req));
        if (onboardingHost?.qq) await onboardingHost.qq.applyOnboarding(result);
        return send(onboarding.status());
      }
      if (p.startsWith("/api/qq")) {
        const qq = onboardingHost?.qq;
        if (!qq)
          throw fail(
            "QQ 自动回复需要在 DSH 宿主内配置，独立预览不连接平台",
            409,
          );
        if (p === "/api/qq" && method === "GET") return send(qq.status());
        if (p === "/api/qq" && method === "PATCH")
          return send(await qq.configure(await body(req)));
        if (p === "/api/qq/check" && method === "POST")
          return send(await qq.check(await body(req)));
        if (p === "/api/qq/retry" && method === "POST")
          return send(qq.retryFailed());
        throw fail("QQ 接口不存在", 404);
      }
      if (p === "/api/characters" && method === "POST")
        return send(store.createCharacter(await body(req)), 201);
      const m = p.match(/^\/api\/characters\/([^/]+)(?:\/(.*))?$/);
      if (m) {
        const characterId = m[1],
          action = m[2] ?? "";
        store.character(characterId);
        if (!action && method === "GET")
          return send(store.character(characterId));
        if (!action && method === "PATCH")
          return send(store.updateCharacter(characterId, await body(req)));
        if (action === "overview" && method === "GET")
          return send(store.overview(characterId));
        if (action === "bridge" && method === "GET")
          return send(
            onboardingHost?.bridge?.status(characterId) || {
              hostReady: false,
              recent: [],
            },
          );
        if (action === "bridge/check" && method === "POST") {
          if (!onboardingHost?.bridge) throw fail("星桥需要 DSH 宿主运行", 409);
          return send(await onboardingHost.bridge.diagnose(characterId));
        }
        if (action === "jobs" && method === "GET")
          return send(
            onboardingHost?.jobs?.status(characterId) || {
              hostReady: false,
              running: 0,
              recent: [],
            },
          );
        if (action === "jobs/run" && method === "POST") {
          if (!onboardingHost?.jobs)
            throw fail("请在 DSH 宿主内执行记忆任务", 409);
          const input = await body(req);
          return send(
            await onboardingHost.jobs.run(characterId, input.kind),
            201,
          );
        }
        if (action === "config" && method === "PATCH") {
          const b = await body(req);
          const updated = store.configure(characterId, b.patch, {
            revision: b.revision,
          });
          if (Object.keys(b.patch).some((key) => key.startsWith("bili.")))
            onboardingHost?.bili?.invalidate(characterId);
          return send(updated);
        }
        if (action === "bili" && method === "GET")
          return send(
            onboardingHost?.bili?.status(characterId) || {
              hostReady: false,
              secret: { saved: false },
              runtime: { status: "unavailable" },
              counts: {},
              recent: [],
            },
          );
        if (action === "bili/login" && method === "POST") {
          if (!onboardingHost?.bili)
            throw fail("请从 DSH 内打开控制台完成扫码", 409);
          return send(await onboardingHost.bili.login.create(characterId), 201);
        }
        if (action.startsWith("bili/login/")) {
          if (!onboardingHost?.bili)
            throw fail("请从 DSH 内打开控制台完成扫码", 409);
          const loginId = action.slice("bili/login/".length);
          if (method === "DELETE")
            return send(onboardingHost.bili.login.cancel(characterId, loginId));
          if (method === "POST")
            return send(
              await onboardingHost.bili.login.poll(characterId, loginId),
            );
          throw fail("扫码接口不存在", 404);
        }
        if (action.startsWith("bili/operations")) {
          const operations = onboardingHost?.bili?.operations;
          if (!operations) throw fail("请在 DSH 中打开平台操作", 409);
          if (action === "bili/operations" && method === "GET")
            return send(operations.status(characterId));
          if (action === "bili/operations/draft" && method === "POST")
            return send(operations.draft(characterId, await body(req)));
          if (action === "bili/operations/read" && method === "POST")
            return send(await operations.read(characterId, await body(req)));
          if (action === "bili/operations/preview" && method === "POST")
            return send(await operations.preview(characterId, await body(req)));
          if (action === "bili/operations/execute" && method === "POST")
            return send(await operations.execute(characterId, await body(req)));
          throw fail("平台操作接口不存在", 404);
        }
        if (action === "bili/check" && method === "POST") {
          if (!onboardingHost?.bili)
            throw fail("请在 DSH 宿主内验证 B站连接", 409);
          return send(await onboardingHost.bili.check(characterId));
        }
        if (action === "bili/credential" && method === "POST") {
          if (!onboardingHost?.bili)
            throw fail("请在 DSH 宿主内配置 B站凭据", 409);
          return send(
            await onboardingHost.bili.credential(characterId, await body(req)),
          );
        }
        if (action === "chats" && method === "GET")
          return send(store.conversations.list(characterId));
        if (action === "usage" && method === "GET")
          return send(usageBudget.status(characterId));
        if (action.startsWith("chats/")) {
          const parts = action.split("/"),
            session = store.conversations.get(decodeURIComponent(parts[1]));
          if (session.character_id !== characterId)
            throw fail("会话不存在", 404);
          if (parts[2] === "context" && method === "GET")
            return send(
              store.conversations.context(session.session_id, {
                q: u.searchParams.get("q") ?? undefined,
              }),
            );
          if (parts.length === 2 && method === "GET") return send(session);
          if (parts.length === 2 && method === "PATCH")
            return send(
              store.conversations.patch(session.session_id, await body(req)),
            );
          throw fail("会话接口不存在", 404);
        }
        if (action === "memory-share-all" && method === "POST")
          return send(store.shareAllMemories(characterId, await body(req)));
        if (action.startsWith("memory-scope/") && method === "PATCH") {
          return send(
            store.setMemoryVisibility(
              characterId,
              action.slice(13),
              await body(req),
            ),
          );
        }
        if (action === "memory-workshop" && method === "GET")
          return send(memoryMaintenance.status(characterId));
        if (action === "memory-workshop/archive" && method === "POST")
          return send(memoryMaintenance.archive(characterId, await body(req)));
        if (action === "memory-workshop/reindex" && method === "POST")
          return send(memoryMaintenance.reindex(characterId));
        if (action === "memory-workshop/topics" && method === "GET")
          return send(memoryMaintenance.topics(characterId));
        if (action === "memory-workshop/sync" && method === "POST")
          return send(memoryMaintenance.resync(characterId));
        if (action === "memory-workshop/conflicts" && method === "GET")
          return send(memoryMaintenance.conflicts(characterId));
        if (action === "memory-workshop/import" && method === "POST")
          return send(
            memoryMaintenance.importExternal(characterId, await body(req)),
          );
        if (action === "memories" && method === "GET")
          return send(
            store.listMemory(characterId, Object.fromEntries(u.searchParams)),
          );
        if (action === "memories" && method === "POST")
          return send(store.saveMemory(characterId, await body(req)), 201);
        if (action === "graph" && method === "GET")
          return send(store.graph(characterId));
        if (action === "links" && method === "POST")
          return send(store.link(characterId, await body(req)), 201);
        if (action === "state" && method === "GET")
          return send(store.getState(characterId));
        if (action === "state" && method === "PATCH")
          return send(store.updateState(characterId, await body(req)));
        if (action === "experiences" && method === "POST")
          return send(
            store.recordExperience(characterId, await body(req)),
            201,
          );
        if (action === "intentions" && method === "GET")
          return send(store.intentions(characterId));
        if (action === "today" && method === "GET")
          return send({
            ...todayOverview(store, characterId),
            agency: agency.status(characterId),
          });
        if (action === "agency/preview" && method === "GET")
          return send(agency.plan(characterId));
        if (action === "agency/pause" && method === "POST") {
          const result = agency.pause(characterId);
          return send(result);
        }
        if (action === "agency/reset" && method === "POST")
          return send(agency.reset(characterId));
        if (action === "state/history" && method === "GET")
          return send(store.stateHistory(characterId));
        if (action === "goals" && method === "GET")
          return send(store.goals(characterId));
        if (action === "goals" && method === "POST")
          return send(store.createGoal(characterId, await body(req)), 201);
        if (action.startsWith("goals/") && method === "PATCH")
          return send(
            store.updateGoal(
              characterId,
              action.slice(6),
              (await body(req)).status,
            ),
          );
        if (action === "health" && method === "GET")
          return send({ ...store.health(characterId), host: hostStatus() });
        if (action === "expressions" && method === "GET")
          return send(store.expressions(characterId));
        if (action === "expressions" && method === "POST")
          return send(
            store.addExpression(
              characterId,
              await body(req, true),
              decodeURIComponent(req.headers["x-starr-name"] || "新表情"),
            ),
            201,
          );
        if (action.startsWith("expressions/") && method === "PATCH")
          return send(
            store.updateExpression(
              characterId,
              action.split("/")[1],
              await body(req),
            ),
          );
        if (/^expressions\/[^/]+$/.test(action) && method === "DELETE")
          return send(
            store.removeExpression(characterId, action.split("/")[1]),
          );
        if (action.startsWith("expressions/") && method === "GET") {
          const item = store.expressionFile(characterId, action.split("/")[1]);
          res.writeHead(200, { "Content-Type": item.mime });
          return fs.createReadStream(item.file).pipe(res);
        }
        if (action === "projection/retry" && method === "POST") {
          store.flushProjection(characterId);
          return send(store.health(characterId));
        }
        if (action === "backup" && method === "POST")
          return send(await store.backup(characterId), 201);
        if (action === "media/speak" && method === "POST") {
          const input = await body(req);
          const data = await speak(
            store.character(characterId).config,
            input.text,
            {
              engines: onboardingHost?.localMedia,
              characterId,
              secrets: workbench,
              emotion: input.emotion,
            },
          );
          res.writeHead(200, {
            "Content-Type": data.mediaType || "audio/mpeg",
            "Content-Length": data.length,
          });
          return res.end(data);
        }
        if (action === "media/workbench" && method === "GET")
          return send(workbench.status(characterId));
        if (action === "media/credential" && method === "POST") {
          const { kind, key, clear } = await body(req),
            secret = workbench.secret(characterId, kind);
          if (clear) secret.clear();
          else await secret.save(key);
          return send(secret.status());
        }
        if (action === "media/asr/prepare" && method === "POST")
          return send(await workbench.prepareAsr(characterId));
        if (action === "media/voices" && method === "POST")
          return send(
            await workbench.registerVoice(characterId, await body(req)),
          );
        if (action === "media/capture" && method === "POST") {
          const input = await body(req);
          if (!["screen", "camera"].includes(input.source))
            throw fail("画面来源无效");
          return send(
            await vision.inspect(characterId, {
              source: {
                kind: input.source,
                ...(input.source === "camera"
                  ? {
                      device:
                        store.character(characterId).config[
                          "vision.camera.device"
                        ] || undefined,
                    }
                  : {}),
              },
              seconds: input.seconds || 3,
              prompt: input.prompt,
              secrets: workbench,
            }),
          );
        }
        if (action === "media/bili-watch" && method === "POST") {
          if (!onboardingHost?.bili) throw fail("B站服务尚未接入", 409);
          return send(
            await onboardingHost.bili.watch(characterId, await body(req), {
              vision,
              workbench,
            }),
          );
        }
        if (action === "media/local" && method === "GET")
          return send(onboardingHost?.localMedia?.status(characterId) || []);
        if (action === "media/local/stop" && method === "POST") {
          if (!onboardingHost?.localMedia)
            throw fail("请在 DSH 宿主内管理本地模型进程", 409);
          return send(
            onboardingHost.localMedia.stop(characterId, (await body(req)).kind),
          );
        }
        if (action === "media/songs" && method === "GET")
          return send(singing.list(characterId));
        if (action === "media/voices" && method === "GET")
          return send(createTools(store, { characterId }).starr_voice_list());
        if (action === "feedback" && method === "GET")
          return send(
            store.db
              .prepare(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='qq_social_log'",
              )
              .get()
              ? store.db
                  .prepare(
                    "SELECT id,session_id,data,created FROM qq_social_log WHERE character_id=? AND kind='feedback' ORDER BY created DESC LIMIT 100",
                  )
                  .all(characterId)
              : [],
          );
        if (action === "media/songs/cache" && method === "DELETE")
          return send(singing.clearCache(characterId));
        if (action === "media/songs/search" && method === "POST")
          return send(await music.search(characterId, await body(req)));
        if (action === "media/songs/source" && method === "POST")
          return send(await music.source(characterId, await body(req)), 201);
        if (action.startsWith("media/songs/source/") && method === "DELETE")
          return send(
            singing.remove(characterId, action.split("/")[3], await body(req)),
          );
        if (
          /^media\/songs\/renders\/[^/]+$/.test(action) &&
          method === "DELETE"
        )
          return send(singing.removeRender(characterId, action.split("/")[3]));
        if (action === "media/songs" && method === "POST")
          return send(
            singing.import(
              characterId,
              await body(req, true),
              decodeURIComponent(req.headers["x-starr-name"] || "新音频"),
            ),
            201,
          );
        if (action === "media/songs/convert" && method === "POST")
          return send(
            await singing.convert(
              characterId,
              await body(req),
              onboardingHost?.localMedia,
            ),
          );
        if (action.startsWith("media/songs/renders/") && method === "GET") {
          const audio = singing.file(characterId, action.split("/")[3], true);
          res.writeHead(200, { "Content-Type": audio.mime });
          return fs.createReadStream(audio.file).pipe(res);
        }
        if (action === "media/see" && method === "POST")
          return send(
            await see(store.character(characterId).config, await body(req), {
              secrets: workbench,
              characterId,
              hostVision: onboardingHost?.hostVision,
            }),
          );
        if (action === "media/hear" && method === "POST")
          return send(
            await hear(
              store.character(characterId).config,
              await body(req, true),
              req.headers["content-type"]?.split(";")[0],
              { secrets: workbench, characterId },
            ),
          );
        throw fail("接口不存在", 404);
      }
      if (p.startsWith("/api/")) throw fail("接口不存在", 404);
      if (method !== "GET") throw fail("不支持的操作", 405);
      const dist = path.join(repo, "dist"),
        relative = decodeURIComponent(p).replace(/^\/+/, ""),
        requested = path.resolve(dist, relative);
      if (
        path.relative(dist, requested).startsWith("..") ||
        path.isAbsolute(path.relative(dist, requested))
      )
        throw fail("路径无效", 400);
      const file =
        fs.existsSync(requested) && fs.statSync(requested).isFile()
          ? requested
          : path.join(dist, "index.html");
      if (!fs.existsSync(file))
        return send(
          { error: "尚未构建界面，请运行 pnpm build 或使用开发预览端口 17842" },
          503,
        );
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors " +
          (hostOrigin ? "'self' dsh-app://app" : "'none'") +
          "; base-uri 'none'",
      );
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
          }[path.extname(file)] ?? "application/octet-stream",
      });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      send(
        {
          error:
            e.name === "TimeoutError"
              ? "模型服务超时，请重试"
              : e.status
                ? e.message
                : "操作失败，请检查目录权限或服务连接",
          code: e.status ?? 500,
        },
        e.status ?? 500,
      );
    }
  };
  const server = http.createServer(handle);
  server.on("close", () => {
    if (ownsAgency) agency.close();
    if (!store.singing) singing.close();
    if (ownsMusic) music.close();
    if (!onboardingHost?.vision) vision.close();
    if (!onboardingHost?.workbench) workbench.close();
    if (!sharedStore) store.close();
  });
  return {
    server,
    store,
    handle,
    listen: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => resolve(server.address()));
      }),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const app = createServer();
  const address = await app.listen();
  console.log(`starr 独立预览：http://127.0.0.1:${address.port}/`);
  console.log(`运行数据：${app.store.dataRoot}`);
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => app.server.close());
}
