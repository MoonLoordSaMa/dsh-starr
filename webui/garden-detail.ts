import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Resource = { dispose(): void };

/** 确定性值噪声：地形、草叶与石块共用同一族函数，重建后形态稳定。 */
function hash2(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx),
    uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz),
    b = hash2(ix + 1, iz),
    c = hash2(ix, iz + 1),
    d = hash2(ix + 1, iz + 1);
  return (
    a * (1 - ux) * (1 - uz) +
    b * ux * (1 - uz) +
    c * (1 - ux) * uz +
    d * ux * uz
  );
}
function fbm(x: number, z: number) {
  return (
    noise2(x, z) * 0.55 +
    noise2(x * 2.07, z * 2.03) * 0.28 +
    noise2(x * 4.1, z * 4.3) * 0.17
  );
}

/** 中央道路始终平坦开阔，两侧土坡缓起，远端抬起承托星仪与宫殿。 */
export function gardenGroundHeight(x: number, z: number) {
  const ax = Math.abs(x);
  // 道路走廊：宽度内完全压平，避免石阶两侧出现台阶状断差。
  const corridor = THREE.MathUtils.smoothstep(ax, 4.6, 11.5);
  const bank =
    2.1 * Math.exp(-((ax - 13.5) ** 2 / 62 + (z - 6) ** 2 / 190)) +
    1.15 * Math.exp(-((ax - 21) ** 2 / 120 + (z + 16) ** 2 / 320));
  const swell = (fbm(x * 0.075 + 4.2, z * 0.075 - 1.7) - 0.42) * 3.4;
  // 远端向山脚抬升，近端略微下沉，形成有纵深的坡面而非一块平板。
  const rise = THREE.MathUtils.smoothstep(-z, 6, 64) * 2.6;
  const fall = THREE.MathUtils.smoothstep(z, 4, 26) * 1.25;
  // 星仪所在的台地：中央远端隆起一级缓台，承台落在地形上而不是悬在空处。
  const terrace =
    1.05 *
    THREE.MathUtils.smoothstep(-z, 11, 17) *
    (1 - THREE.MathUtils.smoothstep(-z, 30, 42)) *
    (1 - THREE.MathUtils.smoothstep(ax, 9, 19));
  let height = -1.18 + corridor * (bank + swell * 0.9 + rise) - fall + terrace;
  // 建筑的完整占地压平，并在外圈平滑接回坡面，不能只采样中心高度。
  const pads = [
    [0, -21, 9, 10, -0.4],
    [0, -58, 19, 13, -1.18],
    [30, -64, 11, 8, 1.1],
    [-34, -92, 8, 6, 1.1],
  ];
  for (const [cx, cz, halfW, halfD, level] of pads) {
    const edge = Math.max(Math.abs(x - cx) - halfW, Math.abs(z - cz) - halfD);
    height = THREE.MathUtils.lerp(
      level,
      height,
      THREE.MathUtils.smoothstep(edge, 0, 5),
    );
  }
  return height;
}

/** 地表尘埃与苔痕的细微起伏，只用于草叶与石块的落位，不进入主地形网格。 */
export function gardenGroundDetail(x: number, z: number) {
  return gardenGroundHeight(x, z) + (noise2(x * 1.7, z * 1.7) - 0.5) * 0.055;
}

/** 同一张无缝石材用于颜色、凹凸与粗糙度；材质只在初始化时生成。 */
export function gardenStone(resources: Resource[], light = false) {
  const size = light ? 256 : 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(size, size);
  let seed = 716;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 8,
        v = (y / size) * 8;
      const vein = Math.sin(u * 3.1 + Math.sin(v * 2.4) * 2.2);
      const grain = fbm(u * 5.5, v * 5.5) - 0.5;
      const value = 132 + grain * 54 + vein * 9 + (random() - 0.5) * 20;
      const i = (y * size + x) * 4;
      pixels.data.set(
        [value * 0.96 + 3, value * 0.98 + 4, value * 1.02 + 6, 255],
        i,
      );
    }
  ctx.putImageData(pixels, 0, 0);
  // 细裂缝按三次循环绘制，保证贴图四边可无缝平铺。
  const cracks = Math.round(size / 11);
  for (let i = 0; i < cracks; i++) {
    let x = random() * size,
      y = random() * size,
      angle = random() * Math.PI * 2;
    for (let j = 0; j < 18; j++) {
      const nx = x + Math.cos(angle) * 9,
        ny = y + Math.sin(angle) * 9;
      ctx.strokeStyle = `rgba(34,42,54,${0.04 + random() * 0.1})`;
      ctx.lineWidth = 0.4 + random() * 0.9;
      for (const dx of [-size, 0, size])
        for (const dy of [-size, 0, size]) {
          ctx.beginPath();
          ctx.moveTo(x + dx, y + dy);
          ctx.lineTo(nx + dx, ny + dy);
          ctx.stroke();
        }
      x = (nx + size) % size;
      y = (ny + size) % size;
      angle += (random() - 0.5) * 0.8;
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = light ? 2 : 4;
  resources.push(texture);
  return texture;
}

/**
 * 地表与坡体共用的一张噪声贴图：颜色偏冷灰，苔痕偏青，
 * 让近景不再是同一种平滑灰。
 */
export function gardenGround(resources: Resource[], light = false) {
  const size = light ? 256 : 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 12,
        v = (y / size) * 12;
      const coarse = fbm(u * 0.9, v * 0.9);
      const fine = noise2(u * 7, v * 7);
      const moss = THREE.MathUtils.smoothstep(coarse, 0.5, 0.78);
      const i = (y * size + x) * 4;
      const grit = 150 + fine * 34 + (coarse - 0.5) * 58;
      pixels.data.set(
        [
          grit * (0.92 - moss * 0.16),
          grit * (0.98 + moss * 0.05),
          grit * (1.04 - moss * 0.1),
          255,
        ],
        i,
      );
    }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = light ? 2 : 8;
  resources.push(texture);
  return texture;
}

export function addGardenForeground(
  world: THREE.Scene,
  resources: Resource[],
  stone: THREE.Texture,
  light: boolean,
) {
  const own = <T extends Resource>(resource: T): T => {
    resources.push(resource);
    return resource;
  };
  let seed = 3197;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const group = new THREE.Group();
  world.add(group);

  // 石块：低多面体几何加两次不同尺度的抖动，接近碎石而不是标准二十面体。
  const rockMaterial = own(
    new THREE.MeshStandardMaterial({
      color: "#8b9ab0",
      emissive: "#435e80",
      emissiveIntensity: 0.45,
      map: stone,
      bumpMap: stone,
      bumpScale: 0.16,
      roughness: 0.95,
      metalness: 0.06,
      vertexColors: true,
    }),
  );
  const rockGeometry = own(new THREE.DodecahedronGeometry(1, 1));
  {
    const position = rockGeometry.getAttribute("position");
    const vector = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      vector.fromBufferAttribute(position, i);
      const scale =
        1 +
        (noise2(vector.x * 2.1 + 11, vector.z * 2.1 - 7) - 0.5) * 0.42 +
        (noise2(vector.y * 4.3 - 3, vector.x * 4.3 + 5) - 0.5) * 0.16;
      position.setXYZ(i, vector.x * scale, vector.y * scale, vector.z * scale);
    }
    rockGeometry.computeVertexNormals();
  }
  const rockCount = light ? 20 : 46;
  const rocks = own(
    new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount),
  );
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let i = 0; i < rockCount; i++) {
    // 近景两侧密集、远处稀疏，并在道路边缘留出通行宽度。
    const side = i % 2 ? 1 : -1;
    const near = i < rockCount * 0.55;
    const x = side * (near ? 5.6 + random() * 7 : 7 + random() * 17),
      z = near ? 18 - random() * 30 : 12 - random() * 52;
    const size = near ? 0.22 + random() ** 2 * 1.1 : 0.3 + random() ** 2 * 2.1;
    dummy.position.set(
      x,
      gardenGroundHeight(x, z) + size * (0.12 + random() * 0.2),
      z,
    );
    dummy.scale.set(
      size * (1 + random() * 0.9),
      size * (0.42 + random() * 0.5),
      size * (0.85 + random() * 0.6),
    );
    dummy.rotation.set(
      random() * 0.5,
      random() * 6.28,
      (random() - 0.5) * 0.35,
    );
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    rocks.setColorAt(
      i,
      tint.setHSL(
        0.58 + random() * 0.06,
        0.05 + random() * 0.07,
        0.55 + random() * 0.2,
      ),
    );
  }
  group.add(rocks);

  // 草坪已移除；近景保留两侧枝叶与石块。
  // 枝干使用有弯曲的三维路径，前景与远山之间保留中央视线通道。
  const bark = own(
    new THREE.MeshStandardMaterial({
      color: "#2f3542",
      map: stone,
      bumpMap: stone,
      bumpScale: 0.18,
      roughness: 0.97,
    }),
  );
  const tips: THREE.Vector3[] = [];
  const branchGeometries: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const trunk = [
      new THREE.Vector3(side * 17.5, -1.4, 12),
      new THREE.Vector3(side * 16.5, 4.2, 11.5),
      new THREE.Vector3(side * 15.5, 8.5, 10),
      new THREE.Vector3(side * 12, 12.7, 9),
      new THREE.Vector3(side * 8.4, 15.5, 7),
    ];
    const curve = new THREE.CatmullRomCurve3(trunk);
    const tube = own(
      new THREE.TubeGeometry(
        curve,
        light ? 16 : 30,
        0.26,
        light ? 5 : 8,
        false,
      ),
    );
    // 沿树梢收细，避免均匀管道的观感。
    const position = tube.getAttribute("position");
    const tubular = light ? 16 : 30;
    for (let i = 0; i < position.count; i++) {
      const t = Math.floor(i / (light ? 5 : 8)) / tubular,
        center = curve.getPointAt(Math.min(1, t));
      const p = new THREE.Vector3().fromBufferAttribute(position, i);
      p.sub(center)
        .multiplyScalar(1.4 - t * 1.2)
        .add(center);
      position.setXYZ(i, p.x, p.y, p.z);
    }
    tube.computeVertexNormals();
    branchGeometries.push(tube);
    for (let i = 0; i < 13; i++) {
      const t = 0.24 + i / 18.5;
      const base = curve.getPointAt(t);
      const end = base
        .clone()
        .add(
          new THREE.Vector3(
            side * ((i % 2 ? -1 : 1) * (1 + random() * 2.4)),
            0.8 + random() * 2,
            -1 + random() * 2.6,
          ),
        );
      const mid = base
        .clone()
        .lerp(end, 0.55)
        .add(new THREE.Vector3(0, 0.4, -0.3));
      const branch = own(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([base, mid, end]),
          light ? 5 : 8,
          0.045 + (1 - t) * 0.055,
          light ? 4 : 5,
          false,
        ),
      );
      branchGeometries.push(branch);
      tips.push(end, mid);
    }
    tips.push(trunk[4]);
  }
  const joinedBranches = mergeGeometries(branchGeometries, false);
  if (joinedBranches) group.add(new THREE.Mesh(own(joinedBranches), bark));

  // 叶片：宽叶带中央脊线，成簇生长，贴图自带叶脉与冷银反光。
  const vertices: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8,
      w = Math.sin(t * Math.PI) * 0.22;
    vertices.push(
      -w,
      t,
      t * t * 0.22,
      0,
      t,
      t * t * 0.22 + w * 0.2,
      w,
      t,
      t * t * 0.22,
    );
    uvs.push(0, t, 0.5, t, 1, t);
    if (i < 8)
      for (let side = 0; side < 2; side++) {
        const j = i * 3 + side;
        indices.push(j, j + 3, j + 1, j + 1, j + 3, j + 4);
      }
  }
  const leafGeometry = own(new THREE.BufferGeometry());
  leafGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  leafGeometry.setIndex(indices);
  leafGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  leafGeometry.computeVertexNormals();
  const leafCanvas = document.createElement("canvas");
  leafCanvas.width = 128;
  leafCanvas.height = 256;
  const lc = leafCanvas.getContext("2d")!;
  const sheen = lc.createLinearGradient(0, 0, 128, 0);
  sheen.addColorStop(0, "#7c8b8e");
  sheen.addColorStop(0.44, "#c3d2d0");
  sheen.addColorStop(0.52, "#e4ece6");
  sheen.addColorStop(0.6, "#93aaa8");
  sheen.addColorStop(1, "#56696d");
  lc.fillStyle = sheen;
  lc.fillRect(0, 0, 128, 256);
  lc.lineWidth = 0.7;
  lc.strokeStyle = "#3d5a6b55";
  for (let i = 0; i < 14; i++)
    for (const side of [-1, 1]) {
      lc.beginPath();
      lc.moveTo(64, 12 + i * 18);
      lc.quadraticCurveTo(
        64 + side * 20,
        20 + i * 18,
        64 + side * 64,
        56 + i * 18,
      );
      lc.stroke();
    }
  for (let i = 0; i < 850; i++) {
    lc.fillStyle = random() > 0.5 ? "#ffffff0b" : "#13273612";
    lc.fillRect(random() * 128, random() * 256, 1, 1);
  }
  const leafTexture = own(new THREE.CanvasTexture(leafCanvas));
  leafTexture.colorSpace = THREE.SRGBColorSpace;
  const time = { value: 0 };
  const leafMaterial = own(
    new THREE.MeshStandardMaterial({
      color: "#7f9aa0",
      map: leafTexture,
      bumpMap: leafTexture,
      bumpScale: 0.03,
      roughness: 0.58,
      metalness: 0.22,
      emissive: "#1a3340",
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide,
      vertexColors: true,
    }),
  );
  leafMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.gardenTime = time;
    shader.vertexShader =
      "uniform float gardenTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x+=sin(gardenTime*.5+instanceMatrix[3].x*.4+instanceMatrix[3].z)*position.y*position.y*.075;",
      );
  };
  const leafCount = light ? 140 : 320;
  const leaves = own(
    new THREE.InstancedMesh(leafGeometry, leafMaterial, leafCount),
  );
  for (let i = 0; i < leafCount; i++) {
    // 五个叶片共用同一个枝梢，形成簇而不是均匀撒点。
    const clusterSize = 5;
    const cluster = Math.floor(i / clusterSize);
    const tip = tips[cluster % tips.length];
    const spread = 0.55 + (i % clusterSize) * 0.12;
    dummy.position
      .copy(tip)
      .add(
        new THREE.Vector3(
          (random() - 0.5) * 2.1 * spread,
          (random() - 0.5) * 1.3 * spread,
          (random() - 0.5) * 1.5 * spread,
        ),
      );
    dummy.rotation.set(
      (random() - 0.5) * 1.4,
      random() * 6.28,
      (random() - 0.5) * 1.6,
    );
    const s = 0.5 + random() * 0.95;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(
      i,
      tint.setHSL(
        0.46 + random() * 0.1,
        0.12 + random() * 0.14,
        0.3 + random() * 0.2,
      ),
    );
  }
  group.add(leaves);

  const coldLight = new THREE.DirectionalLight("#a8cbf0", 2.1);
  coldLight.position.set(-16, 12, 18);
  world.add(coldLight);
  const warmLight = new THREE.PointLight("#efb57d", 40, 26, 2);
  warmLight.position.set(0, 2.2, 1);
  world.add(warmLight);
  return (elapsed: number) => {
    time.value = elapsed;
  };
}
