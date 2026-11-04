import fs from "node:fs";

const catalog = JSON.parse(
  fs.readFileSync(
    new URL("../src/configuration/legacy-catalog.json", import.meta.url),
    "utf8",
  ),
);
const escape = (value) =>
  String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", "<br>");
const statuses = {
  mapped: "已归并配置",
  host: "交由 DSH 管理",
  retired: "已退役机制",
  planned: "待接入",
};
const lines = [
  "# v0.1.5 旧功能逐项核验表",
  "",
  "由仓库内不含用户值的 legacy-catalog.json 生成。这里记录代码与入口对应，不代表真实账号或模型已经验收；没有读取个人记忆、密钥或生产配置。",
  "",
  "“已归并”不等于旧值可以原样导入。旧范围、单位、服务商、模型、目标与权限均须根据新字段重新确认；不匹配的旧引擎与无人确认的任意目标外发不恢复。",
  "",
  "| 旧注册字段状态 | 数量 |",
  "| --- | --- |",
  ...Object.entries(statuses).map(
    ([key, value]) =>
      `| ${value} | ${catalog.entries.filter((entry) => entry.status === key).length} |`,
  ),
  "",
  `旧能力盘点 ${catalog.capabilities.length} 项，其中 ${catalog.capabilities.filter((item) => item.target).length} 项由新入口承接、${catalog.capabilities.filter((item) => !item.target).length} 项待接入。额外参数声明 ${catalog.supplemental.length} 项仅作参考，不额外增加有效配置数量。`,
  "",
  "## 411 项旧注册字段",
  "",
  "| 编号 | 原分区 / 字段 | 标签 | 当前状态 | 目标字段 / 配置分组 | 处理说明 |",
  "| --- | --- | --- | --- | --- | --- |",
  ...catalog.entries.map(
    (entry, index) =>
      `| ${index + 1} | ${escape(entry.scope)}<br>${escape(entry.key)} | ${escape(entry.label)} | ${statuses[entry.status]} | ${entry.target ? `${escape(entry.target.key)}<br>${escape(entry.target.page)}` : "—"} | ${escape(entry.note)} |`,
  ),
  "",
  "## 140 项工具、命令与任务",
  "",
  "“由新入口承接”表示主要用途由当前服务提供，不保证旧名字、旧参数和旧实现完全一致。保留原盘点中的重复名称，避免漏算跨来源声明。私人历史与收藏不向角色公开资料工具开放；平台外发必须走当前授权。",
  "",
  "| 编号 | 类型 / 原名 | 当前状态 | 新入口或旧决策 | 说明 |",
  "| --- | --- | --- | --- | --- |",
  ...catalog.capabilities.map(
    (entry, index) =>
      `| ${index + 1} | ${escape(entry.kind)}<br>${escape(entry.name)} | ${entry.target ? "由新入口承接" : "待接入"} | ${escape(entry.target?.entry || entry.decision)} | ${escape(entry.target?.note || "没有对应的可运行入口；不显示为已实现或已实号验证。 ")} |`,
  ),
  "",
  "## 243 项额外声明",
  "",
  "以下来自旧配置或服务声明；原迁移决策供复核，不是本版实际运行状态。有效配置只以统一字段定义和功能页为准。",
  "",
  "| 编号 | 来源 / 原键 | 标签 | 原迁移决策 |",
  "| --- | --- | --- | --- |",
  ...catalog.supplemental.map(
    (entry, index) =>
      `| ${index + 1} | ${escape(entry.scope)}<br>${escape(entry.key)} | ${escape(entry.label)} | ${escape(entry.decision)} |`,
  ),
  "",
];
fs.writeFileSync(
  new URL("../docs/LEGACY-V015.md", import.meta.url),
  lines.join("\n"),
);
console.log(
  JSON.stringify({
    fields: catalog.entries.length,
    capabilities: catalog.capabilities.length,
    supplemental: catalog.supplemental.length,
  }),
);
