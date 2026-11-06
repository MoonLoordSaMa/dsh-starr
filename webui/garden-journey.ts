import * as THREE from "three";
import { addGardenStarflow } from "./garden-starflow";
import { gardenGroundHeight } from "./garden-detail";
import { batchGroup, gardenMaterials, type Resource } from "./garden-materials";
import type { SharedBuild } from "./star-palace";

/**
 * 石阶之外的侧殿与星流。
 * 侧殿落在真实地形上：下沉的勒脚 → 三层台基 → 柱列 → 檐口 → 庑殿顶。
 * 传入 `shared` 时构件并进调用者的批次，由调用者统一提交。
 */
export function addGardenJourney(
  world: THREE.Scene,
  resources: Resource[],
  texture: THREE.Texture,
  light: boolean,
  shared?: SharedBuild,
) {
  const materials =
    shared?.materials ?? gardenMaterials(resources, texture, light);
  const batch = shared?.batch ?? batchGroup(world, resources);
  const { place, box, cylinder, hip, eave } = batch;

  // 侧殿：近殿低矮宽大，远殿更小，避免两座同样的建筑并排出现。
  for (const [cx, cz, scale] of [
    [30, -64, 0.92],
    [-34, -92, 0.62],
  ]) {
    const base = gardenGroundHeight(cx, cz);
    // 勒脚沉进地表，避免远看像一块悬空的板。
    place(
      box,
      materials.shadowStone,
      cx,
      base - 0.6,
      cz,
      21 * scale,
      1.6,
      13.6 * scale,
    );
    for (let step = 0; step < 3; step++)
      place(
        box,
        materials.basalt,
        cx,
        base + 0.16 + step * 0.38,
        cz,
        (19 - step * 1.6) * scale,
        0.4,
        (12 - step * 1.2) * scale,
      );
    const deck = base + 0.16 + 2 * 0.38 + 0.2;
    const columnHeight = 7.4 * scale;
    for (const side of [-1, 1])
      for (let i = 0; i < 6; i++) {
        const x = cx + (i - 2.5) * 2.6 * scale,
          z = cz + side * 3.7 * scale;
        place(
          cylinder,
          materials.marble,
          x,
          deck + columnHeight / 2,
          z,
          0.4 * scale,
          columnHeight,
          0.4 * scale,
        );
        place(
          box,
          materials.gold,
          x,
          deck + 0.06,
          z,
          0.82 * scale,
          0.12,
          0.82 * scale,
        );
        place(
          box,
          materials.marble,
          x,
          deck + columnHeight,
          z,
          1.05 * scale,
          0.34 * scale,
          1.05 * scale,
        );
        place(
          box,
          materials.gold,
          x,
          deck + columnHeight + 0.2 * scale,
          z,
          0.86 * scale,
          0.06,
          0.86 * scale,
        );
      }
    const eaveY = deck + columnHeight + 0.4 * scale;
    place(
      box,
      materials.basalt,
      cx,
      eaveY + 0.3 * scale,
      cz,
      16.6 * scale,
      0.6 * scale,
      10 * scale,
    );
    // 侧殿和主殿共用舒展的曲面飞檐，屋面与金边一起合批。
    place(
      hip,
      materials.tile,
      cx,
      eaveY + 0.66 * scale,
      cz,
      8.6 * scale,
      4.4 * scale,
      5.2 * scale,
    );
    place(
      eave,
      materials.gold,
      cx,
      eaveY + 0.66 * scale,
      cz,
      8.6 * scale,
      4.4 * scale,
      5.2 * scale,
    );
    place(
      box,
      materials.gold,
      cx,
      eaveY + 0.66 * scale + 4.4 * scale + 0.01,
      cz,
      5.6 * scale,
      0.09 * scale,
      0.12 * scale,
    );
  }

  // 星仪承台：顶面石材，只在边缘压细金线。
  const terraceY = 0.2;
  place(cylinder, materials.basalt, 0, terraceY, -21, 7.4, 0.62, 7.4);
  place(cylinder, materials.marble, 0, terraceY + 0.42, -21, 6.9, 0.42, 6.9);
  place(cylinder, materials.marble, 0, terraceY + 0.7, -21, 6.2, 0.16, 6.2);
  const ringGeo = new THREE.RingGeometry(5.85, 6.12, light ? 40 : 72);
  ringGeo.rotateX(-Math.PI / 2);
  resources.push(ringGeo);
  const ringMesh = new THREE.Mesh(ringGeo, materials.gold);
  ringMesh.position.set(0, terraceY + 0.79, -21);
  world.add(ringMesh);
  const innerGeo = new THREE.RingGeometry(2.3, 2.42, light ? 32 : 56);
  innerGeo.rotateX(-Math.PI / 2);
  resources.push(innerGeo);
  const innerMesh = new THREE.Mesh(innerGeo, materials.gold);
  innerMesh.position.set(0, terraceY + 0.79, -21);
  world.add(innerMesh);

  // 共用模式不在这里提交，交由调用者统一 flush。
  if (!shared) batch.flush();

  return addGardenStarflow(world, resources, light);
}
