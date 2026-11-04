import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { discoverLocalModels } from "../src/media/discovery.mjs";
import { fields } from "../src/starrcore/config.mjs";

test("本地发现区分 Ollama 与兼容目录；读取清单不调用推理、启动或写配置", async (t) => {
  const paths = [];
  const server = http.createServer((req, res) => {
    paths.push(req.url);
    res
      .writeHead(200, { "Content-Type": "application/json" })
      .end(
        JSON.stringify(
          req.url === "/api/tags" ? { models: [{ name: "local-test" }] } : {},
        ),
      );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const result = await discoverLocalModels({ ports: [server.address().port] });
  assert.equal(result.endpoints[0].provider, "ollama");
  assert.equal(result.endpoints[0].models[0].id, "local-test");
  assert.deepEqual(paths, ["/api/tags"]);
  assert.equal(result.endpoints[0].status, "catalog");
});

test("错误、鉴权失败、重定向和过大清单均不报告能力可用", async (t) => {
  let mode = "bad";
  const server = http.createServer((req, res) => {
    if (mode === "redirect")
      return res.writeHead(302, { Location: "http://example.invalid/" }).end();
    if (mode === "auth") return res.writeHead(401).end();
    res
      .writeHead(200, { "Content-Type": "application/json" })
      .end(
        mode === "bad"
          ? JSON.stringify({ data: "not-an-array" })
          : " ".repeat(600 * 1024),
      );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  for (const value of ["bad", "redirect", "auth", "oversize"]) {
    mode = value;
    const result = await discoverLocalModels({
      ports: [server.address().port],
    });
    assert.equal(result.endpoints[0].status, "unverified");
  }
});

test("模型目录扫描只读且跳过联接，缺失目录单列；路径与数量受限", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "starr-discovery-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, "models"),
    external = path.join(root, "outside");
  fs.mkdirSync(target);
  fs.mkdirSync(external);
  const content = Buffer.from("synthetic-not-a-model");
  fs.writeFileSync(path.join(target, "test.gguf"), content);
  fs.writeFileSync(path.join(external, "hidden.pt"), content);
  fs.symlinkSync(
    external,
    path.join(target, "linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  const result = await discoverLocalModels({
    ports: [],
    directories: [target, path.join(root, "absent")],
  });
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].status, "file");
  assert.equal(result.directories[1].status, "missing");
  assert.deepEqual(fs.readFileSync(path.join(target, "test.gguf")), content);
  await assert.rejects(() => discoverLocalModels({ ports: [0] }), {
    status: 400,
  });
  await assert.rejects(
    () =>
      discoverLocalModels({ ports: [], directories: [path.parse(root).root] }),
    { status: 400 },
  );
  await assert.rejects(
    () => discoverLocalModels({ ports: [], directories: ["relative"] }),
    { status: 400 },
  );
});

test("旧版清单完整保留411注册字段、243声明和140能力；有效映射都有真实定义", () => {
  const catalog = JSON.parse(
    fs.readFileSync(
      new URL("../src/configuration/legacy-catalog.json", import.meta.url),
    ),
  );
  assert.equal(catalog.entries.length, 411);
  assert.equal(catalog.supplemental.length, 243);
  assert.equal(catalog.capabilities.length, 140);
  assert.equal(new Set(catalog.entries.map((e) => e.id)).size, 411);
  const qqKeys = new Set([
    "enabled",
    "provider",
    "model",
    "privateUsers",
    "groups",
    "mergeMs",
    "token",
    "httpPort",
    "wsPort",
    "requireMention",
  ]);
  for (const entry of catalog.entries.filter((e) => e.target))
    assert.ok(
      entry.target.page === "qq"
        ? qqKeys.has(entry.target.key)
        : fields.some((f) => f.key === entry.target.key),
      entry.key,
    );
  assert.ok(
    catalog.entries.every(
      (e) => !Object.hasOwn(e, "value") && !Object.hasOwn(e, "default"),
    ),
  );
});
