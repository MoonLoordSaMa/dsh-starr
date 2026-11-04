import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Resource = { dispose(): void };

// 连续地形高度供土坡、草叶、石块共用，中央道路始终保持开阔。
export function gardenGroundHeight(x: number, z: number) {
  const edge = THREE.MathUtils.smoothstep(Math.abs(x), 4.8, 8.5);
  const bank =
    2.2 * Math.exp(-((Math.abs(x) - 12) ** 2 / 48 + (z - 8) ** 2 / 140)) +
    1.35 * Math.exp(-((Math.abs(x) - 18) ** 2 / 85 + (z + 13) ** 2 / 270));
  const folds =
    0.18 * Math.sin(x * 0.57 + z * 0.28) + 0.12 * Math.cos(z * 0.55 - x * 0.21);
  return -1.08 + edge * (bank + folds);
}

// 同一张无缝石材用于颜色、凹凸与粗糙度；材质只在初始化时生成。
export function gardenStone(resources: Resource[]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(256, 256);
  let seed = 716;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const vein = Math.sin(
        (x * Math.PI) / 32 + Math.sin((y * Math.PI) / 64) * 2.4,
      );
      const value = 138 + random() * 46 + vein * 11;
      const i = (y * 256 + x) * 4;
      pixels.data.set([value * 0.94, value * 0.97, value, 255], i);
    }
  ctx.putImageData(pixels, 0, 0);
  for (let i = 0; i < 23; i++) {
    let x = random() * 256,
      y = random() * 256,
      angle = random() * Math.PI * 2;
    for (let j = 0; j < 15; j++) {
      const nx = x + Math.cos(angle) * 7,
        ny = y + Math.sin(angle) * 7;
      ctx.strokeStyle = `rgba(36,45,56,${0.035 + random() * 0.08})`;
      ctx.lineWidth = 0.4 + random() * 0.8;
      for (const dx of [-256, 0, 256])
        for (const dy of [-256, 0, 256]) {
          ctx.beginPath();
          ctx.moveTo(x + dx, y + dy);
          ctx.lineTo(nx + dx, ny + dy);
          ctx.stroke();
        }
      x = (nx + 256) % 256;
      y = (ny + 256) % 256;
      angle += (random() - 0.5) * 0.8;
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
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
  const rockMaterial = own(
    new THREE.MeshStandardMaterial({
      color: "#555d70",
      map: stone,
      bumpMap: stone,
      bumpScale: 0.12,
      roughness: 0.93,
      metalness: 0.08,
    }),
  );
  const rocks = own(
    new THREE.InstancedMesh(
      own(new THREE.DodecahedronGeometry(1, 0)),
      rockMaterial,
      light ? 30 : 70,
    ),
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < rocks.count; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (5.9 + random() * 10),
      z = 16 - random() * 42;
    dummy.position.set(x, gardenGroundHeight(x, z) + random() * 0.12, z);
    const size = 0.25 + random() ** 2 * 1.65;
    dummy.scale.set(
      size * (1 + random()),
      size * (0.5 + random() * 0.55),
      size,
    );
    dummy.rotation.set(random() * 2, random() * 6, random());
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  group.add(rocks);
  // 通往台阶的嵌地碎石路，近处尺度大、远处逐渐收拢。
  const paving = own(
    new THREE.InstancedMesh(
      own(new THREE.BoxGeometry(1, 1, 1)),
      rockMaterial,
      32,
    ),
  );
  for (let i = 0; i < paving.count; i++) {
    const z = 5 + (i / 32) * 15,
      x = (random() - 0.5) * 8.4;
    dummy.position.set(x, gardenGroundHeight(x, z) - 0.04, z);
    dummy.scale.set(
      0.7 + random() * 1.7,
      0.1 + random() * 0.12,
      0.5 + random() * 1.3,
    );
    dummy.rotation.set(0, (random() - 0.5) * 0.16, 0);
    dummy.updateMatrix();
    paving.setMatrixAt(i, dummy.matrix);
  }
  group.add(paving);

  // 枝干使用有弯曲的三维路径，前景与远山之间保留中央视线通道。
  const bark = own(
    new THREE.MeshStandardMaterial({
      color: "#313947",
      map: stone,
      bumpMap: stone,
      bumpScale: 0.14,
      roughness: 0.96,
    }),
  );
  const tips: THREE.Vector3[] = [];
  const branchGeometries: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const trunk = [
      new THREE.Vector3(side * 15.5, -1.2, 12),
      new THREE.Vector3(side * 14.5, 4.2, 11.5),
      new THREE.Vector3(side * 13.5, 8.5, 10),
      new THREE.Vector3(side * 9.8, 12.7, 9),
      new THREE.Vector3(side * 5.5, 15.5, 7),
    ];
    const curve = new THREE.CatmullRomCurve3(trunk);
    const tube = own(new THREE.TubeGeometry(curve, 26, 0.26, 7, false));
    // 沿树梢收细，避免均匀管道的观感。
    const position = tube.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const t = Math.floor(i / 8) / 26,
        center = curve.getPointAt(t);
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
          7,
          0.045 + (1 - t) * 0.055,
          5,
          false,
        ),
      );
      branchGeometries.push(branch);
      tips.push(end, mid);
    }
    tips.push(trunk[4]);
    for (let i = 0; i < 10; i++)
      tips.push(
        new THREE.Vector3(
          side * (7 + random() * 7),
          -0.2 + random() * 1.6,
          9 + random() * 8,
        ),
      );
  }
  const joinedBranches = mergeGeometries(branchGeometries, false);
  if (joinedBranches) group.add(new THREE.Mesh(own(joinedBranches), bark));
  // 宽叶带中央脊线，不使用不透明矩形贴片或景深后处理。
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
  sheen.addColorStop(0, "#8a9299");
  sheen.addColorStop(0.46, "#d8dce0");
  sheen.addColorStop(0.51, "#f0f0ed");
  sheen.addColorStop(0.56, "#9babad");
  sheen.addColorStop(1, "#60737f");
  lc.fillStyle = sheen;
  lc.fillRect(0, 0, 128, 256);
  lc.lineWidth = 0.7;
  lc.strokeStyle = "#3d5a6b66";
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
      color: "#78949b",
      map: leafTexture,
      bumpMap: leafTexture,
      bumpScale: 0.025,
      roughness: 0.63,
      metalness: 0.16,
      emissive: "#162d3a",
      emissiveIntensity: 0.14,
      side: THREE.DoubleSide,
    }),
  );
  leafMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.gardenTime = time;
    shader.vertexShader =
      "uniform float gardenTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x+=sin(gardenTime*.65+instanceMatrix[3].x*.4+instanceMatrix[3].z)*position.y*position.y*.055;",
      );
  };
  const leafCount = light ? 150 : 370;
  const leaves = own(
    new THREE.InstancedMesh(leafGeometry, leafMaterial, leafCount),
  );
  for (let i = 0; i < leafCount; i++) {
    const tip = tips[i % tips.length];
    dummy.position
      .copy(tip)
      .add(
        new THREE.Vector3(
          (random() - 0.5) * 2.3,
          (random() - 0.5) * 1.5,
          (random() - 0.5) * 1.6,
        ),
      );
    dummy.rotation.set(random() * 2.8, random() * 6.28, random() * 6.28);
    const s = 0.45 + random();
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(
      i,
      new THREE.Color().setHSL(
        0.48 + random() * 0.1,
        0.13 + random() * 0.15,
        0.28 + random() * 0.19,
      ),
    );
  }
  group.add(leaves);
  const coldLight = new THREE.DirectionalLight("#a5c6ed", 1.9);
  coldLight.position.set(-14, 10, 20);
  world.add(coldLight);
  const warmLight = new THREE.PointLight("#efb57d", 34, 23, 2);
  warmLight.position.set(0, 2.2, 1);
  world.add(warmLight);
  return (elapsed: number) => {
    time.value = elapsed;
  };
}
