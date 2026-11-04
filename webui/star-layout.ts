import type { Memory, Link } from "./types";

export type Point3 = [number, number, number];
export type StarCluster = {
  kind: string;
  center: Point3;
  label: Point3;
  radius: number;
  count: number;
  average: number;
  origin: Point3;
  tilt: [number, number];
  spin: number;
};

export function randomFor(input: string) {
  let seed = 2166136261;
  for (const c of input) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function memoryWeight(node: Pick<Memory, "score" | "importance">) {
  const value = Number.isFinite(node.score) ? node.score : node.importance;
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value / 100 : 0));
}

/** 每团有独立倾角与厚度；同一空间分布也用于不参与选取的星尘。 */
export function sampleClusterPosition(
  group: Pick<StarCluster, "origin" | "radius" | "tilt" | "spin">,
  seed: string,
): Point3 {
  const random = randomFor(seed);
  const r = Math.sqrt(random()) * group.radius;
  const angle =
    group.spin +
    (Math.floor(random() * 3) * Math.PI * 2) / 3 +
    (r / group.radius) * 3.2 +
    (random() - 0.5) * 1.2;
  const u = Math.cos(angle) * r;
  const v = Math.sin(angle) * r * 0.82;
  const w = (random() + random() + random() - 1.5) * group.radius * 0.95;
  const [tx, ty] = group.tilt;
  const y = v * Math.cos(tx) - w * Math.sin(tx);
  const z = v * Math.sin(tx) + w * Math.cos(tx);
  return [
    group.origin[0] + u * Math.cos(ty) + z * Math.sin(ty),
    group.origin[1] + y,
    group.origin[2] - u * Math.sin(ty) + z * Math.cos(ty),
  ];
}

/** 只组织空间，不从分类或接近程度推导业务关系。坐标不随权重、筛选或列表排序改变。 */
export function layoutStarClusters(nodes: Memory[], kinds: string[]) {
  const groups = new Map<string, Memory[]>();
  for (const node of nodes) {
    if (!groups.has(node.kind)) groups.set(node.kind, []);
    groups.get(node.kind)!.push(node);
  }
  const populated = [
    ...new Set([...kinds, ...[...groups.keys()].sort()]),
  ].filter((kind) => groups.has(kind));
  const centers = new Map<string, Point3>();
  populated.forEach((kind, index) => {
    const angle = (index / populated.length) * Math.PI * 2 - Math.PI / 2;
    centers.set(kind, [
      populated.length > 1 ? Math.cos(angle) * 9.5 : 0,
      populated.length > 1 ? Math.sin(angle) * 6.5 : 0,
      populated.length > 1 ? Math.sin(angle * 2 + 0.65) * 5.2 : 0,
    ]);
  });
  const positions = new Map<string, Point3>();
  const clusters: StarCluster[] = [];
  for (const kind of populated) {
    const members = groups.get(kind)!;
    const center = centers.get(kind)!;
    const nearest = Math.min(
      ...populated
        .filter((other) => other !== kind)
        .map((other) => {
          const p = centers.get(other)!;
          return Math.hypot(
            p[0] - center[0],
            p[1] - center[1],
            p[2] - center[2],
          );
        }),
    );
    const radius =
      populated.length === 1
        ? 9
        : Math.min(
            nearest * 0.41,
            2.2 + Math.sqrt(members.length / Math.max(1, nodes.length)) * 3.3,
          );
    const spin = randomFor(`spin:${kind}`)() * Math.PI * 2;
    const frame = {
      origin: center,
      radius,
      spin,
      tilt: [
        (randomFor(`tilt-x:${kind}`)() - 0.5) * 1.8,
        (randomFor(`tilt-y:${kind}`)() - 0.5) * 1.6,
      ] as [number, number],
    };
    const glowCenter: Point3 = [0, 0, 0];
    let mass = 0;
    let total = 0;
    for (const node of [...members].sort((a, b) => a.id.localeCompare(b.id))) {
      const position = sampleClusterPosition(frame, node.id);
      positions.set(node.id, position);
      const weight = memoryWeight(node);
      const contribution = 0.08 + weight;
      for (let axis = 0; axis < 3; axis++)
        glowCenter[axis] += position[axis] * contribution;
      mass += contribution;
      total += weight;
    }
    clusters.push({
      ...frame,
      kind,
      center: glowCenter.map((v) => v / mass) as Point3,
      label: [center[0], center[1] + radius * 0.74 + 0.8, center[2]],
      radius,
      count: members.length,
      average: total / members.length,
    });
  }
  return { positions, clusters };
}

/** 双向/多种关系可以共用一根可视弧线，原始关系仍由业务层完整保存。 */
export function visualLinks(nodes: Memory[], links: Link[]) {
  const ids = new Set(nodes.map((node) => node.id));
  const unique = new Map<string, Link>();
  for (const link of links) {
    if (
      link.source === link.target ||
      !ids.has(link.source) ||
      !ids.has(link.target)
    )
      continue;
    const [source, target] = [link.source, link.target].sort();
    const key = JSON.stringify([source, target]);
    const old = unique.get(key);
    if (!old || link.weight > old.weight)
      unique.set(key, { ...link, source, target });
  }
  return [...unique.values()].sort(
    (a, b) =>
      a.source.localeCompare(b.source) || a.target.localeCompare(b.target),
  );
}

/** 小星团先保留名额；选中图外记录时仍保留它与重要邻居，绘制总量有上限。 */
export function sampleStarGraph(
  nodes: Memory[],
  links: Link[],
  selected: string | null = null,
  limit = 420,
) {
  const edges = visualLinks(nodes, links);
  const degree = new Map<string, number>();
  for (const edge of edges)
    for (const id of [edge.source, edge.target])
      degree.set(id, (degree.get(id) ?? 0) + 1);
  const rank = (a: Memory, b: Memory) =>
    memoryWeight(b) - memoryWeight(a) ||
    (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
    a.id.localeCompare(b.id);
  const sorted = [...nodes].sort(rank);
  const rankedGroups = new Map<string, Memory[]>();
  for (const node of sorted) {
    if (!rankedGroups.has(node.kind)) rankedGroups.set(node.kind, []);
    rankedGroups.get(node.kind)!.push(node);
  }
  const chosen = new Map<string, Memory>();
  const cap = Math.max(1, Math.floor(limit));
  const add = (node: Memory) => {
    if (chosen.size < cap) chosen.set(node.id, node);
  };
  const focus = nodes.find((node) => node.id === selected);
  if (focus) add(focus);
  const kinds = [...new Set(nodes.map((node) => node.kind))].sort();
  for (let index = 0; index < 8; index++)
    for (const kind of kinds) {
      const node = rankedGroups.get(kind)?.[index];
      if (node) add(node);
    }
  if (focus) {
    const near = new Set(
      edges
        .filter((edge) => edge.source === focus.id || edge.target === focus.id)
        .flatMap((edge) => [edge.source, edge.target]),
    );
    sorted
      .filter((node) => near.has(node.id))
      .slice(0, 80)
      .forEach(add);
  }
  sorted.forEach(add);
  const drawn = [...chosen.values()];
  return { nodes: drawn, links: visualLinks(drawn, edges) };
}

/** 与真实边分开返回的装饰星轨，不能参与计数、邻居查询或 Obsidian 双链。 */
export function decorativeStarTrails(nodes: Memory[], links: Link[]) {
  const occupied = new Set(
    links.map((edge) => JSON.stringify([edge.source, edge.target].sort())),
  );
  const result: { source: string; target: string }[] = [];
  for (const kind of [...new Set(nodes.map((node) => node.kind))].sort()) {
    const members = nodes
      .filter((node) => node.kind === kind)
      .sort((a, b) => a.id.localeCompare(b.id));
    const random = randomFor(`trail:${kind}`);
    const count = Math.min(32, Math.floor(members.length * 0.5));
    let added = 0;
    for (let attempt = 0; attempt < count * 5 && added < count; attempt++) {
      const a = members[Math.floor(random() * members.length)];
      const b = members[Math.floor(random() * members.length)];
      if (!a || !b || a.id === b.id) continue;
      const [source, target] = [a.id, b.id].sort();
      const key = JSON.stringify([source, target]);
      if (occupied.has(key)) continue;
      occupied.add(key);
      result.push({ source, target });
      added++;
    }
  }
  return result;
}
