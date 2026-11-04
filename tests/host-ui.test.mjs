import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import vm from "node:vm";
import { apply } from "../src/host/plugin.mjs";
import { createServer } from "../src/server.mjs";

test("DSH 同源控制台共享工具数据、拒绝跨站写入并随插件卸载移除", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-ui-"));
  const routes = new Map();
  const tools = new Map();
  const globalTools = new Map();
  const agent = {
    id: "trusted",
    ctx: {
      tools: {
        register(spec) {
          tools.set(spec.name, spec);
          return () => tools.delete(spec.name);
        },
      },
    },
  };
  const events = new Map();
  const server = http.createServer((req, res) => {
    const route = routes.get("/starr");
    if (route) return route.handler(req, res);
    res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const fetch = (url, options = {}) =>
    globalThis.fetch(url, {
      ...options,
      headers: { Cookie: "test-session", ...options.headers },
    });
  const bindings = {};
  const close = apply(
    {
      on(name, listener) {
        events.set(name, listener);
        return () => events.delete(name);
      },
      tools: {
        register(spec) {
          globalTools.set(spec.name, spec);
          return () => globalTools.delete(spec.name);
        },
      },
      inject(_dependencies, callback) {
        if (_dependencies.includes("agents")) {
          callback({
            agents: { list: () => [], get: () => agent },
            on(name, listener) {
              events.set(name, listener);
              return () => events.delete(name);
            },
            effect: (effect) => effect(),
          });
          return;
        }
        callback({
          effect: (effect) => effect(),
          connection: {
            requestRejection: (req) =>
              req.headers.cookie === "test-session" ? undefined : 401,
          },
          webServer: {
            getOrigin: () => origin,
            register(route) {
              routes.set(route.path, route);
              return () => routes.delete(route.path);
            },
          },
        });
      },
    },
    { dataRoot: path.join(root, "runtime"), sessionBindings: bindings },
  );
  t.after(async () => {
    close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal(
    (await globalThis.fetch(origin + "/starr/api/bootstrap")).status,
    401,
  );
  assert.equal(
    (await fetch(origin + "/starr", { redirect: "manual" })).headers.get(
      "location",
    ),
    "/starr/",
  );
  const setup = await fetch(origin + "/starr/api/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      name: "独立验收角色",
      memoryRoot: path.join(root, "memory"),
      backupRoot: path.join(root, "backup"),
    }),
  });
  assert.equal(setup.status, 201);
  const bootstrap = await (await fetch(origin + "/starr/api/bootstrap")).json();
  const id = bootstrap.characters[0].id;
  bindings["trusted"] = id;
  events.get("agent/created")({ agent });
  assert.equal(globalTools.size, 0);
  assert.equal(bootstrap.stage, "DSH 插件控制台");
  assert.equal(bootstrap.host.connected, true);
  await tools
    .get("starr_memory_write")
    .execute(
      { title: "侧栏与聊天共用", content: "同一角色的真实记忆" },
      { agent: { id: "trusted" } },
    );
  const memories = await (
    await fetch(origin + `/starr/api/characters/${id}/memories`)
  ).json();
  assert.equal(memories[0].title, "侧栏与聊天共用");
  const denied = await fetch(origin + "/starr/api/characters", {
    method: "POST",
    headers: { Origin: "https://evil.invalid" },
    body: "{}",
  });
  assert.equal(denied.status, 403);
  assert.equal((await fetch(origin + "/api/bootstrap")).status, 404);
  const html = await fetch(origin + "/starr/");
  assert.equal(html.status, 200);
  assert.match(
    html.headers.get("content-security-policy"),
    /frame-ancestors 'self' dsh-app:\/\/app/,
  );
  const content = await html.text();
  const asset = content.match(/src="(\.\/assets\/[^\"]+\.js)"/)[1];
  const script = await fetch(new URL(asset, origin + "/starr/"));
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /javascript/);
  close();
  close();
  assert.equal(routes.size, 0);
  assert.equal(tools.size, 0);
  assert.equal((await fetch(origin + "/starr/api/bootstrap")).status, 404);
});

test("独立控制台继续禁止嵌入", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-standalone-"));
  const app = createServer({ dataRoot: root, port: 0 });
  const address = await app.listen();
  t.after(async () => {
    app.server.closeAllConnections();
    await new Promise((resolve) => app.server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const html = await fetch(`http://127.0.0.1:${address.port}/`);
  assert.match(
    html.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
});

test("原生客户端声明可加载，侧栏与主面板使用同一编号且启停不重复", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url)),
  );
  let registration;
  vm.runInNewContext(
    fs.readFileSync(new URL("../src/host/client.js", import.meta.url), "utf8"),
    {
      window: { __ModuleLoader__: { load: (value) => (registration = value) } },
    },
  );
  assert.equal(registration.id, manifest.name);
  assert.equal(manifest.dsh.client.platform, "web");
  const client = registration.factory(() => ({ createElement() {} }));
  const entries = new Map();
  const cleanup = [];
  const ctx = {
    slots: {
      inject(_name, register) {
        cleanup.push(register());
      },
      register(options, component) {
        const key = `${options.name}:${options.key ?? options.id}`;
        assert.equal(entries.has(key), false);
        entries.set(key, { options, component });
        return () => entries.delete(key);
      },
    },
  };
  for (let run = 0; run < 2; run++) {
    client.apply(ctx);
    assert.equal(
      entries.get("sidebar.panellist:starr").options.label(),
      "starr",
    );
    assert.equal(entries.get("sidebar.panellist:starr").options.order, 20);
    assert.equal(typeof entries.get("main:starr").component, "function");
    for (const dispose of cleanup.splice(0)) dispose();
    assert.equal(entries.size, 0);
  }
});
