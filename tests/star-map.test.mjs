import test from "node:test";
import assert from "node:assert/strict";
import {
  decorativeStarTrails,
  layoutStarClusters,
  sampleStarGraph,
  visualLinks,
} from "../webui/star-layout.ts";

const kinds = ["moment", "person", "promise", "interest", "diary", "summary"];
const memory = (id, kind = "moment", score = 50) => ({
  id,
  kind,
  score,
  importance: score,
  title: id,
  content: "合成星图验收",
  anchor: 0,
  confidence: 100,
  source: "test",
  created: "2026-11-03T00:00:00Z",
});
const ordered = (positions) =>
  [...positions].sort(([a], [b]) => a.localeCompare(b));

test("星图坐标在排序、权重变化和空分类加入后保持稳定，光雾仍响应权重", () => {
  const nodes = Array.from({ length: 90 }, (_, i) =>
    memory(`star-${i}`, kinds[i % 3], 20),
  );
  const original = layoutStarClusters(nodes, kinds);
  const reordered = layoutStarClusters([...nodes].reverse(), [
    "empty",
    ...kinds,
  ]);
  const brighter = layoutStarClusters(
    nodes.map((n) => ({ ...n, score: 95 })),
    kinds,
  );
  assert.deepEqual(ordered(original.positions), ordered(reordered.positions));
  assert.deepEqual(ordered(original.positions), ordered(brighter.positions));
  assert.equal(original.clusters.length, 3);
  assert.equal(original.positions.size, nodes.length);
  assert.ok(
    brighter.clusters.every(
      (g) =>
        g.average > original.clusters.find((o) => o.kind === g.kind).average,
    ),
  );
});

test("分类形成可区分的星团，孤立与单分类记忆均有有效三维坐标", () => {
  const nodes = kinds.flatMap((kind) =>
    Array.from({ length: 80 }, (_, i) => memory(`${kind}:${i}`, kind)),
  );
  const { positions, clusters } = layoutStarClusters(nodes, kinds);
  let nearestOwnCluster = 0;
  for (const node of nodes) {
    const p = positions.get(node.id);
    assert.ok(p.every(Number.isFinite));
    const nearest = [...clusters].sort(
      (a, b) =>
        Math.hypot(...p.map((v, i) => v - a.center[i])) -
        Math.hypot(...p.map((v, i) => v - b.center[i])),
    )[0];
    if (nearest.kind === node.kind) nearestOwnCluster++;
  }
  assert.ok(nearestOwnCluster / nodes.length > 0.95);
  for (const list of [
    [],
    [memory("alone")],
    nodes.filter((n) => n.kind === "diary"),
  ]) {
    const layout = layoutStarClusters(list, kinds);
    assert.equal(layout.positions.size, list.length);
    assert.ok(
      [...layout.positions.values()].every((p) => p.every(Number.isFinite)),
    );
  }
});

test("星团中心分布与团内节点均有实际纵深，各团拥有独立倾角", () => {
  const nodes = kinds.flatMap((kind) =>
    Array.from({ length: 100 }, (_, i) => memory(`${kind}:${i}`, kind)),
  );
  const { positions, clusters } = layoutStarClusters(nodes, kinds);
  const depths = clusters.map((g) => g.origin[2]);
  assert.ok(Math.max(...depths) - Math.min(...depths) > 7);
  assert.equal(
    new Set(clusters.map((g) => g.tilt.join(","))).size,
    kinds.length,
  );
  for (const group of clusters) {
    const points = nodes
      .filter((n) => n.kind === group.kind)
      .map((n) => positions.get(n.id));
    const matrix = Array.from({ length: 3 }, () => [0, 0, 0]);
    const center = [0, 1, 2].map(
      (axis) => points.reduce((sum, p) => sum + p[axis], 0) / points.length,
    );
    for (const p of points)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          matrix[i][j] +=
            ((p[i] - center[i]) * (p[j] - center[j])) / points.length;
    const [a, b, c] = matrix;
    const determinant =
      a[0] * (b[1] * c[2] - b[2] * c[1]) -
      a[1] * (b[0] * c[2] - b[2] * c[0]) +
      a[2] * (b[0] * c[1] - b[1] * c[0]);
    const trace = a[0] + b[1] + c[2];
    assert.ok(determinant / trace ** 3 > 0.005, `${group.kind} 不应退化为平面`);
  }
});

test("大库绘制保留小星团与图外选中记录，绘制数量始终受限", () => {
  const nodes = [
    ...Array.from({ length: 1600 }, (_, i) =>
      memory(`large-${i}`, "moment", 99),
    ),
    memory("small-1", "diary", 1),
    memory("small-2", "diary", 2),
    memory("selected", "person", 0),
  ];
  const links = nodes.slice(0, 600).map((n) => ({
    source: "selected",
    target: n.id,
    weight: 1,
    kind: "explicit",
  }));
  const sampled = sampleStarGraph(nodes, links, "selected");
  assert.equal(sampled.nodes.length, 420);
  const ids = new Set(sampled.nodes.map((n) => n.id));
  for (const id of ["small-1", "small-2", "selected"]) assert.ok(ids.has(id));
  assert.ok(
    sampled.links.every((edge) => ids.has(edge.source) && ids.has(edge.target)),
  );
  assert.ok(
    sampled.links.filter(
      (edge) => edge.source === "selected" || edge.target === "selected",
    ).length >= 80,
  );
});

test("双向与不同类型的同组关联共用可视弧线，原始关联不被修改", () => {
  const nodes = [memory("a"), memory("b"), memory("isolated")];
  const links = [
    { source: "a", target: "b", weight: 0.2, kind: "explicit" },
    { source: "b", target: "a", weight: 0.8, kind: "semantic" },
    { source: "a", target: "a", weight: 1, kind: "explicit" },
    { source: "a", target: "missing", weight: 1, kind: "explicit" },
  ];
  const before = structuredClone(links);
  const drawn = visualLinks(nodes, links);
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0].weight, 0.8);
  assert.deepEqual(links, before);
});

test("装饰星轨与真实边分开，不伪造业务关系或跨分类连接", () => {
  const nodes = kinds
    .slice(0, 3)
    .flatMap((kind) =>
      Array.from({ length: 30 }, (_, i) => memory(`${kind}:${i}`, kind)),
    );
  const links = [
    { source: "moment:0", target: "moment:1", weight: 1, kind: "explicit" },
  ];
  const decorations = decorativeStarTrails(nodes, links);
  assert.ok(decorations.length > 0);
  assert.deepEqual(
    decorations,
    decorativeStarTrails([...nodes].reverse(), links),
  );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set([JSON.stringify(["moment:0", "moment:1"])]);
  for (const edge of decorations) {
    assert.notEqual(edge.source, edge.target);
    assert.equal(byId.get(edge.source).kind, byId.get(edge.target).kind);
    const key = JSON.stringify([edge.source, edge.target].sort());
    assert.ok(!seen.has(key));
    seen.add(key);
  }
  assert.equal(links.length, 1);
});
