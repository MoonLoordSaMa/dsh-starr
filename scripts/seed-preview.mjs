// 仅为明确命名的隔离预览角色添加合成记录，不导入真实角色数据。
const base = "http://127.0.0.1:17841/api";
const request = async (p, data) => {
  const r = await fetch(
    base + p,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {},
  );
  if (!r.ok) throw new Error((await r.json()).error);
  return r.json();
};
const boot = await request("/bootstrap"),
  role = boot.characters.find((c) => c.name === "预览角色");
if (!role) throw new Error("没有明确的预览角色，拒绝写入示例");
const templates = [
  ["moment", "窗边的微光", "示例经历：雨停之后，窗边出现了一点柔和的光"],
  ["person", "喜欢观星的朋友", "示例人物：一个喜欢记录星座故事的虚构朋友"],
  ["promise", "一起整理知识库", "示例约定：下一次见面时把散落的笔记整理好"],
  ["interest", "夜空与纸张", "示例兴趣：喜欢星空、手写笔记与安静的夜晚"],
  ["diary", "今天收好了星光", "示例日记：为这个独立预览留下第一段文字"],
  [
    "summary",
    "关于这片小宇宙",
    "示例概览：此处用于验收星图、分类和真实关系连线",
  ],
];
const records = [];
for (let i = 0; i < 36; i++) {
  const [kind, title, content] = templates[i % templates.length];
  records.push(
    await request(`/characters/${role.id}/memories`, {
      title: `${title} · 示例 ${Math.floor(i / 6) + 1}`,
      content: `${content}\n\n这是一条合成验收记录，不属于真实斯塔的历史。`,
      kind,
      importance: 25 + ((i * 17) % 75),
      confidence: 100,
      anchor: i % 11 === 0,
      source: "独立初版 · 合成验收数据",
      eventKey: `preview-memory-v1-${i}`,
    }),
  );
}
for (let i = 1; i < records.length; i++) {
  if (i % 3 !== 0)
    await request(`/characters/${role.id}/links`, {
      source: records[i - 1].id,
      target: records[i].id,
      kind: "explicit",
      weight: 0.8,
    });
  if (i > 6 && i % 4 === 0)
    await request(`/characters/${role.id}/links`, {
      source: records[i - 6].id,
      target: records[i].id,
      kind: "explicit",
      weight: 0.6,
    });
}
console.log(
  `已在隔离预览角色中保存 ${records.length} 条明确标记的示例；真实角色与旧库未改动`,
);
