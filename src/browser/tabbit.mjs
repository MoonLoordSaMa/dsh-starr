import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fail } from "../starrcore/store.mjs";
import { see } from "../media/compatible.mjs";

const field = (key, label, type, value, help) => [
  key,
  label,
  type,
  value,
  "browser",
  help,
];
export const browserFields = [
  field(
    "browser.enabled",
    "允许角色浏览网页",
    "boolean",
    false,
    "通过本机Tabbit读取允许站点，仅操作插件创建的页面。网页内容视为资料，不修改登录、文件或发布内容。",
  ),
  field(
    "browser.domains",
    "允许浏览的站点域名",
    "text",
    "github.com,bilibili.com,wikipedia.org",
    "逗号或换行分隔，包含其子域名；角色不能自行扩大范围。跳转后的地址也会核对。",
  ),
  field(
    "browser.launcherPath",
    "Tabbit稳定启动器路径（可留空）",
    "text",
    "",
    "默认使用本机Tabbit的LocalAgent/bin/tabbit-cli.exe或~/.local/bin/tabbit-cli；不能填写版本目录程序。",
  ),
  field(
    "browser.visual",
    "允许理解网页画面",
    "boolean",
    false,
    "将当前插件页面的截图送给已配置视觉模型；文本阅读和画面理解分别报告结果，不采集整个桌面。",
  ),
];
export function allowedURL(value, domains) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw fail("网页地址无效");
  }
  const hosts = String(domains || "")
    .split(/[,，\s]+/)
    .filter(Boolean)
    .map((v) => v.toLowerCase());
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !hosts.some(
      (host) =>
        /^[a-z0-9.-]+$/.test(host) &&
        (url.hostname === host || url.hostname.endsWith(`.${host}`)),
    )
  )
    throw fail("网页地址未获管理员授权", 403);
  return url.href;
}
export function cliJSON(program, args, input, { signal } = {}) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const child = spawn(program, args, {
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks = [];
    let size = 0,
      settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (error) {
        child.kill();
        reject(error);
      } else resolve(value);
    };
    const abort = () => finish(fail("网页读取已取消", 409));
    const timer = setTimeout(
      () => finish(fail("Tabbit响应超时，请检查原任务状态", 504)),
      65000,
    );
    signal?.addEventListener("abort", abort, { once: true });
    child.on("error", () =>
      finish(fail("Tabbit启动失败，请安装并检查稳定启动器路径", 409)),
    );
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > 3 * 1024 * 1024) return finish(fail("网页结果超过限制", 413));
      chunks.push(chunk);
    });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.on("close", () => {
      try {
        finish(null, JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        finish(fail("Tabbit未返回有效结构，不能视为已读取", 502));
      }
    });
    child.stdin.end(input || "", "utf8");
  });
}
export class TabbitBrowser {
  constructor(
    store,
    { invoke = cliJSON, understand = see, runtime = {} } = {},
  ) {
    this.store = store;
    this.invoke = invoke;
    this.understand = understand;
    this.runtime = runtime;
    this.active = new Map();
    this.closed = false;
  }
  config(characterId, visual = false) {
    const c = this.store.character(characterId).config;
    if (this.closed || !c["browser.enabled"])
      throw fail("管理员未开启网页浏览", 403);
    if (visual && !c["browser.visual"])
      throw fail("管理员未开启网页画面理解", 403);
    return c;
  }
  async read(
    characterId,
    { url, visual = false, prompt = "描述网页画面" },
    { sessionId, signal } = {},
  ) {
    const c = this.config(characterId, visual),
      address = allowedURL(url, c["browser.domains"]);
    if (this.active.has(characterId)) throw fail("该角色正在浏览网页", 409);
    const program =
      c["browser.launcherPath"] ||
      (process.platform === "win32"
        ? path.join(
            process.env.LOCALAPPDATA ||
              path.join(os.homedir(), "AppData", "Local"),
            "Tabbit",
            "LocalAgent",
            "bin",
            "tabbit-cli.exe",
          )
        : path.join(os.homedir(), ".local", "bin", "tabbit-cli"));
    if (program.includes("/../") || /[\\/]versions?[\\/]/i.test(program))
      throw fail("请使用Tabbit稳定启动器");
    const task = `斯塔浏览-${characterId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`,
      requestId = crypto.randomUUID();
    const controller = new AbortController();
    this.active.set(characterId, controller);
    signal = AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]);
    let cleanup,
      cleanupAttempted = false;
    const command = (args, source, options = { signal }) =>
      this.invoke(program, args, source, options);
    const releasePage = async () => {
      if (cleanupAttempted) return;
      cleanupAttempted = true;
      try {
        await command(
          ["nodejs", "--task", task, "--request-id", crypto.randomUUID()],
          "await page.close(); return {closed:true};",
          { signal: AbortSignal.timeout(15000) },
        );
        cleanup = await command(["finish", "--task", task], null, {
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        /* 清理故障不能替代真实阅读结果；不触碰用户标签。 */
      }
      this.lastCleanup = {
        task,
        confirmed: !!cleanup && cleanup.forcedCleanup !== true,
      };
    };
    try {
      const source = `const allowed = ${JSON.stringify(
        String(c["browser.domains"])
          .split(/[,，\s]+/)
          .filter(Boolean)
          .map((host) => host.toLowerCase()),
      )}; const valid = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port && allowed.some(h => u.hostname === h || u.hostname.endsWith('.' + h)); } catch { return false; } }; if(page.route) await page.route('**/*', route => route.request().isNavigationRequest() && !valid(route.request().url()) ? route.abort() : route.continue()); await page.goto(${JSON.stringify(address)}, {waitUntil:'domcontentloaded',timeout:30000}); if(!valid(page.url())) throw new Error('跳转目标未授权'); const data = await page.evaluate(() => ({title:document.title,url:location.href,text:(document.body?.innerText||'').slice(0,14000),links:[...document.querySelectorAll('a[href]')].slice(0,60).map(a=>({text:(a.innerText||'').slice(0,120),url:a.href}))})); return { ...data, screenshot: ${visual ? "await page.screenshot({fullPage:false})" : "null"} };`;
      let receipt = await command(
        [
          "nodejs",
          "--task",
          task,
          "--request-id",
          requestId,
          "--timeout-ms",
          "60000",
        ],
        source,
      );
      for (
        let i = 0;
        ["queued", "running"].includes(receipt.status) && i < 3;
        i++
      )
        receipt = await command([
          "receipt",
          "--task",
          task,
          "--request-id",
          requestId,
          "--wait-ms",
          "30000",
        ]);
      if (receipt.status !== "succeeded")
        throw fail("网页读取未完成，请核对Tabbit原任务；未伪造成功", 502);
      let data = receipt.result?.value;
      if (receipt.result?.resourceId) {
        let offset = 0,
          raw = "";
        for (let i = 0; i < 64; i++) {
          const chunk = await command([
            "resource",
            "--task",
            task,
            "--resource",
            receipt.result.resourceId,
            "--offset",
            String(offset),
            "--max-bytes",
            "32768",
          ]);
          raw += chunk.data || "";
          if (chunk.eof) {
            data = JSON.parse(raw);
            break;
          }
          if (!(chunk.nextOffset > offset) || raw.length > 2000000)
            throw fail("网页资源结果超限或分页异常", 502);
          offset = chunk.nextOffset;
        }
      }
      if (!data?.url || typeof data.text !== "string")
        throw fail("网页没有返回可核验正文", 502);
      const current = this.config(characterId, visual);
      allowedURL(data.url, current["browser.domains"]);
      if (
        visual &&
        [
          "vision.connection",
          "vision.host.provider",
          "vision.host.model",
          "vision.model",
          "vision.baseUrl",
          "media.baseUrl",
        ].some((key) => current[key] !== c[key])
      )
        throw fail("视觉配置在网页读取期间变化，请重新读取", 409);
      let vision;
      if (visual) {
        const file =
          data.screenshot?.result?.nextAction?.path ||
          data.screenshot?.nextAction?.path;
        if (
          file &&
          fs.statSync(file, { throwIfNoEntry: false })?.isFile() &&
          fs.statSync(file).size < 8388608
        ) {
          const image = fs.readFileSync(file);
          await releasePage();
          vision = await this.understand(
            c,
            {
              image: `data:image/png;base64,${image.toString("base64")}`,
              prompt: `${prompt}。仅描述当前网页截图，不推断完整视频或声音。`,
            },
            {
              characterId,
              sessionId,
              signal,
              hostVision: this.runtime.hostVision,
              secrets: this.runtime.workbench,
            },
          );
        } else
          vision = {
            status: "unavailable",
            detail: "Tabbit未提供可读取截图，已保留文本阅读结果",
          };
      }
      this.config(characterId, visual);
      return {
        title: data.title,
        url: data.url,
        text: data.text.slice(0, 14000),
        links: (data.links || [])
          .filter((l) => {
            try {
              allowedURL(l.url, c["browser.domains"]);
              return true;
            } catch {
              return false;
            }
          })
          .slice(0, 60),
        textVerified: true,
        visualVerified:
          typeof vision?.answer === "string" && !!vision.answer.trim(),
        vision,
        completeVideo: false,
        audioVerified: false,
      };
    } finally {
      await releasePage();
      this.active.delete(characterId);
    }
  }
  close() {
    this.closed = true;
    for (const controller of this.active.values()) controller.abort();
  }
}
