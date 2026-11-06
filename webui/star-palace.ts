import * as THREE from "three";
import { gardenGroundHeight } from "./garden-detail";
import {
  batchGroup,
  gardenMaterials,
  type BatchGroup,
  type GardenMaterials,
  type Resource,
} from "./garden-materials";

export type SharedBuild = {
  materials: GardenMaterials;
  batch: BatchGroup;
};

type Vec3 = [number, number, number];

/**
 * 星宫宫廷：以星环为中心，星环背后立后殿，星环之前立门阙。
 *
 * 后殿（z = -52）：整座建筑在星环之后，宽度明显大于星环，
 *   让星环读作「殿前的一件仪器」。屋顶用四坡顶，坡面比檐口窄，
 *   屋脊高度足够，侧面能看出坡——不是一片压在柱列上的扁板。
 *
 * 前庭（z = -12）：一对门阙立在两侧，中间留出通路与低栏，
 *   高度压在星环视线以下，从首屏看是「穿过门阙才到星仪」。
 *
 * 所有构件走 batchGroup：几何与材质相同的全部实例化，
 * 两座宫加在一起只增加个位数的绘制批次。
 */
export function addStarPalace(
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

  /**
   * 庑殿顶。
   * 用真正的四坡几何（单位顶按半宽/高度/半深缩放），正脊是一条真实的屋脊线，
   * 而不是四棱锥的顶点；坡面上因此能看到前后两坡与左右山花的分界。
   */
  const hipRoof = (
    cx: number,
    baseY: number,
    cz: number,
    halfW: number,
    halfD: number,
    height: number,
  ) => {
    place(hip, materials.tile, cx, baseY, cz, halfW, height, halfD);
    place(eave, materials.gold, cx, baseY, cz, halfW, height, halfD);
  };

  /** 一排柱子：柱础、柱身、柱头、柱头金线。 */
  const colonnade = (
    xs: number[],
    z: number,
    groundY: number,
    height: number,
    radius: number,
  ) => {
    for (const x of xs) {
      place(
        box,
        materials.shadowStone,
        x,
        groundY + 0.07,
        z,
        radius * 2.6,
        0.14,
        radius * 2.6,
      );
      place(
        cylinder,
        materials.marble,
        x,
        groundY + height / 2,
        z,
        radius,
        height,
        radius,
      );
      place(
        box,
        materials.marble,
        x,
        groundY + height + 0.11,
        z,
        radius * 2.5,
        0.22,
        radius * 2.5,
      );
      place(
        box,
        materials.gold,
        x,
        groundY + height + 0.24,
        z,
        radius * 2.1,
        0.05,
        radius * 2.1,
      );
    }
  };

  /** 台阶：逐级抬升，正对中轴。 */
  const stairFlight = (
    cx: number,
    zNear: number,
    zFar: number,
    yTop: number,
    width: number,
    steps: number,
  ) => {
    const yBottom = gardenGroundHeight(cx, zNear);
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const z = THREE.MathUtils.lerp(zNear, zFar, t);
      const y = THREE.MathUtils.lerp(yBottom, yTop - 0.16, (i + 0.5) / steps);
      place(
        box,
        materials.basalt,
        cx,
        y,
        z,
        width * (1 - t * 0.05),
        Math.max(0.16, (yTop - yBottom) / steps),
        Math.abs(zFar - zNear) / steps + 0.05,
      );
    }
  };

  const lanterns: Vec3[] = [];

  // ——————————————————————————————————————————————
  // 后殿
  // ——————————————————————————————————————————————
  const rearZ = -58;
  const rearScale = light ? 0.92 : 1;
  // 台基三级：宽度逐级收进，落地贴合地形。
  let tierTop = gardenGroundHeight(0, rearZ);
  const tierHeights = [0.44, 0.4, 0.36];
  for (let i = 0; i < 3; i++) {
    const halfW = (17.5 - i * 1.5) * rearScale;
    const halfD = (9.6 - i * 0.9) * rearScale;
    tierTop += tierHeights[i];
    place(
      box,
      materials.basalt,
      0,
      tierTop - tierHeights[i] / 2,
      rearZ,
      halfW * 2,
      tierHeights[i],
      halfD * 2,
    );
    place(
      box,
      materials.gold,
      0,
      tierTop - 0.02,
      rearZ,
      halfW * 2 + 0.08,
      0.035,
      halfD * 2 + 0.08,
    );
  }
  const deck = tierTop;
  // 正面台阶：从台基前沿落到地面。
  stairFlight(
    0,
    rearZ + 11.2 * rearScale,
    rearZ + 9.4 * rearScale,
    deck,
    8.4 * rearScale,
    light ? 5 : 7,
  );

  const columnHeight = 14.2 * rearScale;
  const bay = 3.4 * rearScale;
  const columnXs: number[] = [];
  for (let i = 0; i < 9; i++) columnXs.push((i - 4) * bay);
  colonnade(
    columnXs,
    rearZ + 7.4 * rearScale,
    deck,
    columnHeight,
    0.44 * rearScale,
  );
  colonnade(
    columnXs,
    rearZ - 7.4 * rearScale,
    deck,
    columnHeight,
    0.44 * rearScale,
  );
  // 两端山墙柱，略粗。
  for (const side of [-1, 1])
    for (const dz of [7.4, -7.4])
      place(
        cylinder,
        materials.marble,
        side * 13.4 * rearScale,
        deck + columnHeight / 2,
        rearZ + dz * rearScale,
        0.52 * rearScale,
        columnHeight,
        0.52 * rearScale,
      );

  // 殿身：柱廊之后的实体墙，给柱列一个真实的暗部。
  // 殿身：柱廊之后的墙体。用夜蓝石材而不是近黑石材，
  // 侧面看过去才有材质可读，不会变成一整片死黑板。
  place(
    box,
    materials.basalt,
    0,
    deck + columnHeight * 0.44,
    rearZ,
    19.2 * rearScale,
    columnHeight * 0.88,
    9.4 * rearScale,
  );
  // 墙面壁柱：等距竖向亮石材，替墙身分出开间节奏。
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 3.6 * rearScale;
    place(
      box,
      materials.marble,
      x,
      deck + columnHeight * 0.44,
      rearZ + 4.72 * rearScale,
      0.5 * rearScale,
      columnHeight * 0.86,
      0.12,
    );
  }
  // 上楣与勒脚：两条横向石带，把墙面分成墙裙、墙身与上楣。
  place(
    box,
    materials.marble,
    0,
    deck + columnHeight * 0.1,
    rearZ + 4.74 * rearScale,
    19 * rearScale,
    0.22,
    0.12,
  );
  place(
    box,
    materials.marble,
    0,
    deck + columnHeight * 0.8,
    rearZ + 4.74 * rearScale,
    19 * rearScale,
    0.2,
    0.12,
  );
  // 门洞：门框亮石材，门芯用深色，形成三处真实的暗部。
  for (const dx of [-5.4, 0, 5.4]) {
    place(
      box,
      materials.marble,
      dx * rearScale,
      deck + columnHeight * 0.4,
      rearZ + 4.76 * rearScale,
      2.9 * rearScale,
      columnHeight * 0.8,
      0.1,
    );
    place(
      box,
      materials.shadowStone,
      dx * rearScale,
      deck + columnHeight * 0.36,
      rearZ + 4.79 * rearScale,
      2.3 * rearScale,
      columnHeight * 0.72,
      0.06,
    );
  }

  // 檐口：横梁 + 斗拱 + 金线。
  const eaveY = deck + columnHeight + 0.44;
  const eaveHalfW = 16.2 * rearScale,
    eaveHalfD = 11.2 * rearScale;
  place(
    box,
    materials.basalt,
    0,
    eaveY,
    rearZ,
    eaveHalfW * 1.9,
    0.24,
    eaveHalfD * 1.9,
  );
  const bracketCount = light ? 11 : 21;
  for (let i = 0; i < bracketCount; i++) {
    const x = (i / (bracketCount - 1) - 0.5) * (eaveHalfW * 2 - 1.2);
    place(
      box,
      materials.marble,
      x,
      eaveY - 0.44,
      rearZ + (eaveHalfD - 0.35),
      0.4,
      0.36,
      0.46,
    );
  }

  // 屋顶：坡面略窄于檐口，高度足够，正面与侧面都能看出坡。
  hipRoof(
    0,
    eaveY + 0.28,
    rearZ,
    eaveHalfW * 1.02,
    eaveHalfD * 1.02,
    7.4 * rearScale,
  );
  // 正脊与两端鸱吻。
  place(
    box,
    materials.gold,
    0,
    eaveY + 0.28 + 7.4 * rearScale + 0.01,
    rearZ,
    7.2 * rearScale,
    0.1,
    0.16,
  );
  for (const side of [-1, 1])
    place(
      box,
      materials.gold,
      side * 3.5 * rearScale,
      eaveY + 0.28 + 7.4 * rearScale + 0.14,
      rearZ,
      0.32,
      0.5 * rearScale,
      0.2,
    );

  // 殿前长明灯：沿台阶两侧，与石阶灯同一高度节奏。
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = side * (5.8 + i * 1.6) * rearScale,
        z = rearZ + (13.6 + i * 1.4) * rearScale;
      const y = gardenGroundHeight(x, z);
      place(box, materials.shadowStone, x, y + 0.3, z, 0.15, 0.6, 0.15);
      lanterns.push([x, y + 0.66, z]);
    }
    for (const dx of [4.2, 9.4])
      lanterns.push([
        side * dx * rearScale,
        deck + 2.9 * rearScale,
        rearZ + 7.5 * rearScale,
      ]);
  }

  // ——————————————————————————————————————————————
  // 前庭门阙
  // 不做成「细柱托一块小屋顶」的凉亭：四角粗柱之间填实体门墙，
  // 正面留出拱形门洞，读作可以穿过的门楼。
  // ——————————————————————————————————————————————
  const gateZ = -12.2;
  const gateHalfW = 2.6,
    gateHalfD = 1.9,
    gateHeight = 6.6;
  for (const side of [-1, 1]) {
    const gx = side * 16.4;
    const gateGround = gardenGroundHeight(gx, gateZ);
    // 台座两级，落地。
    place(
      box,
      materials.basalt,
      gx,
      gateGround + 0.26,
      gateZ,
      gateHalfW * 2 + 1.2,
      0.52,
      gateHalfD * 2 + 1.2,
    );
    place(
      box,
      materials.gold,
      gx,
      gateGround + 0.53,
      gateZ,
      gateHalfW * 2 + 1.3,
      0.035,
      gateHalfD * 2 + 1.3,
    );
    const gateDeck = gateGround + 0.54;
    // 四角柱：粗、贴角，承担体量而不是装饰。
    for (const dx of [-1, 1])
      for (const dz of [-1, 1])
        place(
          cylinder,
          materials.marble,
          gx + dx * (gateHalfW - 0.34),
          gateDeck + gateHeight / 2,
          gateZ + dz * (gateHalfD - 0.34),
          0.34,
          gateHeight,
          0.34,
        );
    // 门墙：实体填充，中间是穿行的门洞（由两侧墙体和上部过梁围合）。
    for (const dx of [-1, 1])
      place(
        box,
        materials.shadowStone,
        gx + dx * (gateHalfW - 0.95),
        gateDeck + gateHeight * 0.42,
        gateZ,
        1.5,
        gateHeight * 0.84,
        gateHalfD * 2 - 0.9,
      );
    // 门洞过梁与门槛金线。
    place(
      box,
      materials.shadowStone,
      gx,
      gateDeck + gateHeight * 0.78,
      gateZ,
      gateHalfW * 2 - 1.3,
      gateHeight * 0.22,
      gateHalfD * 2 - 0.9,
    );
    place(
      box,
      materials.gold,
      gx,
      gateDeck + gateHeight * 0.67,
      gateZ,
      gateHalfW * 2 - 1.25,
      0.04,
      0.12,
    );
    // 檐口与屋顶。
    place(
      box,
      materials.basalt,
      gx,
      gateDeck + gateHeight + 0.24,
      gateZ,
      gateHalfW * 2 + 0.5,
      0.44,
      gateHalfD * 2 + 0.4,
    );
    place(
      box,
      materials.gold,
      gx,
      gateDeck + gateHeight + 0.48,
      gateZ,
      gateHalfW * 2 + 0.6,
      0.04,
      gateHalfD * 2 + 0.5,
    );
    hipRoof(
      gx,
      gateDeck + gateHeight + 0.55,
      gateZ,
      gateHalfW + 0.42,
      gateHalfD + 0.32,
      2.1,
    );
    place(
      box,
      materials.gold,
      gx,
      gateDeck + gateHeight + 0.55 + 2.1,
      gateZ,
      1.2,
      0.06,
      0.09,
    );
    // 门洞两侧各一盏灯，与殿前灯形成横向暖线。
    for (const dx of [-1, 1])
      lanterns.push([
        gx + dx * (gateHalfW + 0.34),
        gateDeck + 2.1,
        gateZ + gateHalfD,
      ]);
  }
  // 门阙之间的低栏：中间留通路，不挡视线。
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const x = side * (3.6 + i * 2.1);
      const y = gardenGroundHeight(x, gateZ);
      place(box, materials.marble, x, y + 0.4, gateZ, 1.9, 0.08, 0.14);
      place(box, materials.marble, x, y + 0.2, gateZ, 0.11, 0.42, 0.11);
    }

  // 共用模式不在这里提交，交由调用者统一 flush。
  if (!shared) batch.flush();

  // 灯芯合并为一次点精灵，避免逐盏透明贴片叠加提交。
  const lanternGeometry = new THREE.BufferGeometry();
  lanternGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(lanterns.flat(), 3),
  );
  resources.push(lanternGeometry);
  const lanternMaterial = new THREE.PointsMaterial({
    map: glowSprite(resources),
    color: "#ffc890",
    size: 1.9,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  resources.push(lanternMaterial);
  const lanternPoints = new THREE.Points(lanternGeometry, lanternMaterial);
  lanternPoints.frustumCulled = false;
  world.add(lanternPoints);
}

/** 小尺寸径向渐变贴图，供灯芯使用。 */
function glowSprite(resources: Resource[]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.14, "#ffffffcc");
  gradient.addColorStop(0.4, "#ffffff44");
  gradient.addColorStop(1, "#ffffff00");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  resources.push(texture);
  return texture;
}
