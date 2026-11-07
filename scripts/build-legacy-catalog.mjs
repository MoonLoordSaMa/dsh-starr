import fs from "node:fs";
import path from "node:path";
import { fields } from "../src/starrcore/config.mjs";
import {
  fieldMappings,
  biliMappings,
  mappingNote,
  capabilityTargets,
  retiredCapabilities,
} from "./legacy-mappings.mjs";
const [inventoryFile, migrationFile] = process.argv.slice(2);
if (!inventoryFile || !migrationFile)
  throw new Error(
    "用法：node scripts/build-legacy-catalog.mjs <旧版盘点JSON> <迁移决策JSON>",
  );
const inventory = JSON.parse(fs.readFileSync(inventoryFile, "utf8")),
  migration = JSON.parse(fs.readFileSync(migrationFile, "utf8"));
const mappings = {
  "role.maxInjectChars": ["context.personaChars", "chat-context"],
  "socialV2.context.wakeMaxChars": ["context.maxChars", "chat-context"],
  "socialV2.closure.maxSummaryChars": ["context.summaryChars", "chat-context"],
  "socialV2.enabled": ["enabled", "qq"],
  "dsh.provider": ["provider", "qq"],
  "dsh.model": ["model", "qq"],
  "allow.private": ["privateUsers", "qq"],
  "allow.groups": ["groups", "qq"],
  "socialV2.wake.batchWindowMs": ["mergeMs", "qq"],
  "snowluma.accessToken": ["token", "qq"],
  "snowluma.httpUrl": ["httpPort", "qq"],
  "snowluma.wsUrl": ["wsPort", "qq"],
  "qq.wsUrl": ["wsPort", "qq"],
  "qq.accessToken": ["token", "qq"],
  "qq.rules.allow.groups": ["groups", "qq"],
  "qq.rules.allow.privates": ["privateUsers", "qq"],
  "qq.rules.group.requireAt": ["requireMention", "qq"],
  botSelfConfig: ["permissions.botConfig", "permissions"],
  "media.cloud.baseUrl": ["media.baseUrl", "media"],
  "media.tts.model": ["tts.model", "tts"],
  "media.tts.voice": ["tts.voice", "tts"],
  "media.asr.model": ["asr.model", "asr"],
  "media.asr.language": ["asr.language", "asr"],
  "media.tts.secretRef": ["media.secretEnv", "media"],
  "media.asr.secretRef": ["media.secretEnv", "media"],
  "purpose.enabled": ["agency.enabled", "state"],
  "purpose.quietStart": ["agency.quietStart", "state"],
  "purpose.quietEnd": ["agency.quietEnd", "state"],
};
const hostKeys =
  /^(dsh\.(baseUrl|authToken|allowRemote|reasoningEffort)|agentPreset|socialV2\.agentPreset|workspaceTitle|sessionCwd|webSearch\.|pricing\.)/;
const retiredKeys =
  /^(jobs\.(organize|weekly|monthly|yearly)|social\.|qq\.(engine|mode|ingest)|socialV2\.proactive\.|media\.svc\.(remoteBaseUrl|pollMs|jobTimeoutMs|secretRef)|guard\.|consolePort|consoleToken|allowAllWhenEmpty|qq\.rules\.allowAllWhenEmpty|notify\.(cmd|args)|toolsPath)/;
const entries = inventory.fields.map((f, index) => {
  const mappedKey =
    f.scope === "bili"
      ? biliMappings[f.path]
      : fieldMappings[f.path] ||
        (f.path.startsWith("jobs.") &&
        fields.some((field) => field.key === f.path)
          ? f.path
          : null);
  const defined = fields.find((field) => field.key === mappedKey);
  if (mappedKey && !defined)
    throw new Error(`映射缺少真实定义：${f.path} -> ${mappedKey}`);
  const target = defined
    ? [defined.key, defined.page]
    : f.scope !== "bili"
      ? mappings[f.path]
      : null;
  const status = target
    ? "mapped"
    : hostKeys.test(f.path)
      ? "host"
      : retiredKeys.test(f.path)
        ? "retired"
        : "planned";
  const note =
    status === "mapped"
      ? mappingNote(f.path, target[0])
      : status === "host"
        ? "由 DSH 已有模型、工具或会话服务统一管理，不再重复一套宿主配置。"
        : status === "retired"
          ? "旧引擎、平行机制或执行入口退役，不原样恢复为可点击控件。"
          : "对应运行能力尚未接入本版；保留盘点条目供后续实现，不提供假开关。";
  return {
    id: `legacy-${index + 1}`,
    scope: f.scope,
    key: f.path.startsWith("pricing.models.")
      ? "pricing.models.<模型>." + f.path.split(".").slice(3).join(".")
      : f.path,
    label: f.label,
    group: f.ownerTitle || f.group,
    help: f.copy?.explanation || f.help || "",
    status,
    target: target ? { key: target[0], page: target[1] } : null,
    note,
  };
});
const result = {
  format: 1,
  version: "0.1.5",
  sourceDate: "2026-11-01",
  registeredCount: entries.length,
  declarationCount: migration.declarations.length,
  entries,
  supplemental: migration.declarations
    .filter((d) => !d.declarationId.startsWith("fields:"))
    .map((d) => ({
      id: d.declarationId,
      scope: d.scope,
      key: d.oldKey,
      label: d.label,
      page: d.proposedPage,
      decision: d.decision,
      status: "reference",
    })),
  capabilities: migration.capabilities.map((c) => ({
    kind: c.kind,
    name: c.name,
    page: c.proposedPage,
    decision: retiredCapabilities.has(c.name)
      ? "固定整理与周期回顾已退役；自由笔记由角色自主维护"
      : c.decision,
    status: retiredCapabilities.has(c.name)
      ? "retired"
      : capabilityTargets[c.name]
        ? "equivalent"
        : "planned",
    target: capabilityTargets[c.name] || null,
  })),
  notice:
    "本清单不包含用户配置值、令牌或角色记忆。映射不表示旧引擎完整迁入；额外声明不是额外可编辑字段。",
};
fs.mkdirSync(path.resolve("src/configuration"), { recursive: true });
fs.writeFileSync(
  path.resolve("src/configuration/legacy-catalog.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    registered: entries.length,
    supplemental: result.supplemental.length,
    capabilities: result.capabilities.length,
    statuses: Object.fromEntries(
      ["mapped", "host", "retired", "planned"].map((s) => [
        s,
        entries.filter((e) => e.status === s).length,
      ]),
    ),
  }),
);
