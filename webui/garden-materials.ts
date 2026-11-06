import * as THREE from "three";

export type Resource = { dispose(): void };

/**
 * 庭院共用材质。所有建筑、石阶、灯具都从这里取材质，
 * 才能在远景、中景、近景之间保持同一套明度关系：
 * 夜蓝石作结构，月灰石作台基与栏板，暖杏金只作嵌线，瓦面偏冷压在最上。
 * 同一材质实例被多处复用，配合实例化合批，绘制批次不随构件数量增长。
 */
export function gardenMaterials(
  resources: Resource[],
  stone: THREE.Texture,
  light: boolean,
) {
  const own = <T extends Resource>(value: T): T => {
    resources.push(value);
    return value;
  };

  /** 夜蓝石材：结构主体，粗糙、低反射。 */
  const basalt = own(
    new THREE.MeshStandardMaterial({
      color: "#7b8ba4",
      map: stone,
      bumpMap: stone,
      bumpScale: light ? 0.08 : 0.14,
      roughness: 0.92,
      metalness: 0.08,
    }),
  );

  /** 月灰石：台基、栏板、柱身，明度更高、表面更细。 */
  const marble = own(
    new THREE.MeshStandardMaterial({
      color: "#b9c1cf",
      map: stone,
      bumpMap: stone,
      bumpScale: light ? 0.04 : 0.07,
      roughness: 0.78,
      metalness: 0.14,
    }),
  );

  /** 深色石材：柱础、阴影处，不靠纯黑制造对比。 */
  const shadowStone = own(
    new THREE.MeshStandardMaterial({
      color: "#64758e",
      map: stone,
      bumpMap: stone,
      bumpScale: 0.1,
      roughness: 0.95,
      metalness: 0.06,
    }),
  );

  /** 瓦面：偏冷的青灰，轻微金属感，受光时出现一条冷高光。 */
  const tile = own(
    new THREE.MeshStandardMaterial({
      color: "#4b8e8a",
      roughness: 0.8,
      metalness: 0.12,
      emissive: "#184341",
      emissiveIntensity: 0.22,
    }),
  );

  /** 暖杏金：只做嵌线、柱头与屋脊，带极弱自发光，夜里仍能读到轮廓。 */
  const gold = own(
    new THREE.MeshStandardMaterial({
      color: "#e2b78c",
      metalness: 0.68,
      roughness: 0.34,
      emissive: "#7a4f2a",
      emissiveIntensity: 0.4,
    }),
  );

  /** 灯芯：实体小构件用纯色自发光，不叠透明层。 */
  const ember = own(
    new THREE.MeshBasicMaterial({
      color: "#ffcf9b",
    }),
  );

  Object.entries({ basalt, marble, shadowStone, tile, gold, ember }).forEach(
    ([name, material]) => (material.name = name),
  );
  return { basalt, marble, shadowStone, tile, gold, ember };
}

export type GardenMaterials = ReturnType<typeof gardenMaterials>;

/**
 * 合批容器：按「几何 + 材质」归并矩阵，最后每类只提交一次。
 * 建筑构件数量多但种类少，这是把绘制批次压在几十次以内的关键。
 *
 * 侧殿与星宫必须共用同一个容器，否则同一套石材会被两个 InstancedMesh
 * 各提交一次，绘制批次凭空翻倍。
 */
/** 合批容器的类型，供多个建造函数共享同一个容器。 */
export type BatchGroup = {
  place: (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rotateY?: number,
  ) => void;
  flush: () => void;
  box: THREE.BufferGeometry;
  cylinder: THREE.BufferGeometry;
  cone: THREE.BufferGeometry;
  halfRound: THREE.BufferGeometry;
  hip: THREE.BufferGeometry;
  eave: THREE.BufferGeometry;
};

export function batchGroup(
  world: THREE.Object3D,
  resources: Resource[],
  /** 传入已有的容器即可把多个建造函数并进同一批，避免重复提交。 */
  existing?: BatchGroup,
) {
  if (existing) return existing;
  const batches = new Map<
    string,
    {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      matrices: THREE.Matrix4[];
    }
  >();
  const dummy = new THREE.Object3D();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 20);
  const cone = new THREE.ConeGeometry(1, 1, 4, 1);
  // 半圆柱只用于拱券与柱身收分，段数少，仍走合批。
  const halfRound = new THREE.CylinderGeometry(
    1,
    1,
    1,
    14,
    1,
    false,
    0,
    Math.PI,
  );
  // 庑殿顶：单位尺寸的四坡屋顶，带一条真正的正脊。
  // 用 (缩放 x, 高度, 缩放 z) 套到任意建筑上，正脊长度由 ridge 比例决定。
  const hip = hipRoofGeometry(0.34);
  const eave = hipRoofGeometry(0.34, 0.97);
  box.name = "梁枋台基";
  cylinder.name = "柱与圆台";
  hip.name = "青瓦庑殿顶";
  eave.name = "贴合飞檐金边";
  resources.push(box, cylinder, cone, halfRound, hip, eave);

  const place = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rotateY = 0,
  ) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotateY, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    const key = `${geometry.uuid}:${material.uuid}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { geometry, material, matrices: [] };
      batches.set(key, batch);
    }
    batch.matrices.push(dummy.matrix.clone());
  };

  const flush = () => {
    for (const batch of batches.values()) {
      const mesh = new THREE.InstancedMesh(
        batch.geometry,
        batch.material,
        batch.matrices.length,
      );
      mesh.name = `${batch.geometry.name || "庭院构件"}-${batch.material.name || "石作"}`;
      batch.matrices.forEach((matrix, index) =>
        mesh.setMatrixAt(index, matrix),
      );
      mesh.computeBoundingSphere();
      resources.push(mesh);
      world.add(mesh);
    }
    batches.clear();
  };

  return { place, flush, box, cylinder, cone, halfRound, hip, eave };
}

/**
 * 单位庑殿顶：
 * 底面是 x∈[-1,1]、z∈[-1,1] 的矩形，正脊沿 x 轴、位于 y=1，
 * 长度由 `ridge` 给出；坡面有轻微内凹，外檐与四角向上收起。
 * 中心对齐原点底部，缩放 (halfW, height, halfD) 即可套到任意建筑。
 * `edgeStart` 用于从同一曲面截取窄檐边，保持屋面和金线吻合。
 */
export function hipRoofGeometry(ridge = 0.34, edgeStart = 0) {
  const r = Math.max(0.05, Math.min(0.9, ridge));
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const across = 16;
  // 金边和瓦面共用最后两行顶点；底面与立边封合，侧看也有真实厚度。
  const samples = edgeStart
    ? [0.97, 1]
    : [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 0.97, 1];
  const rows = samples.length - 1;
  for (let face = 0; face < 4; face++) {
    for (let shell = 0; shell < (edgeStart ? 1 : 2); shell++) {
      const first = positions.length / 3;
      for (let row = 0; row <= rows; row++) {
        const t = samples[row];
        for (let i = 0; i <= across; i++) {
          const s = (i / across) * 2 - 1;
          const span = r + (1 - r) * t;
          // 中坡舒展、檐角轻翘；金边使用完全相同的曲面，避免直线穿出屋面。
          const y =
            (1 - t) ** 1.55 +
            0.055 * Math.abs(s) ** 6 * t ** 5 -
            shell * 0.035 +
            (edgeStart ? 0.0015 : 0);
          const x = face < 2 ? s * span : (face === 2 ? 1 : -1) * span;
          const z = face < 2 ? (face === 0 ? 1 : -1) * t : s * t;
          const edgeOffset = edgeStart ? 1.001 : 1;
          positions.push(x * edgeOffset, y, z * edgeOffset);
          uvs.push((i / across) * 4, t * 2);
          if (row < rows && i < across) {
            const j = first + row * (across + 1) + i;
            const a = j,
              b = j + 1,
              c = j + across + 1,
              d = c + 1;
            if ((face === 0 || face === 3) !== (shell === 1))
              indices.push(a, c, b, b, c, d);
            else indices.push(a, b, c, b, d, c);
          }
        }
      }
    }
    // 外檐立边沿同一曲面封口，不在四坡接缝插入多余内壁。
    const first = positions.length / 3;
    for (let i = 0; i <= across; i++) {
      const s = (i / across) * 2 - 1;
      const x = face < 2 ? s : face === 2 ? 1 : -1;
      const z = face < 2 ? (face === 0 ? 1 : -1) : s;
      const top = 0.055 * Math.abs(s) ** 6;
      for (let side = 0; side < 2; side++) {
        const edgeOffset = edgeStart ? 1.001 : 1;
        positions.push(
          x * edgeOffset,
          top - side * (edgeStart ? 0.025 : 0.035) + (edgeStart ? 0.0015 : 0),
          z * edgeOffset,
        );
        uvs.push((i / across) * 4, side * 0.1);
      }
      if (i < across) {
        const a = first + i * 2;
        if (face === 0 || face === 3)
          indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
        else indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
