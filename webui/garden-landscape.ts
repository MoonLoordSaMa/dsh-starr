import * as THREE from "three";
import { gardenGroundHeight } from "./garden-detail";

type Resource = { dispose(): void };

/** 五层青绿画山，峰群使用不等距山脊；环形画卷在游览过程中没有侧壁或边缘。 */
export function mountainRidge(angle: number, layer: number) {
  const peaks = [
    [-0.77, 0.15, 82],
    [-0.47, 0.12, 110],
    [-0.23, 0.14, 42],
    [0.08, 0.17, 47],
    [0.43, 0.14, 119],
    [0.72, 0.19, 89],
    [1.3, 0.23, 75],
    [-1.5, 0.22, 90],
    [2.4, 0.25, 80],
    [-2.6, 0.27, 95],
  ];
  let height = 68 + (4 - layer) * 7;
  for (const [center, width, amplitude] of peaks) {
    const delta = Math.atan2(
      Math.sin(angle - center - layer * 0.065),
      Math.cos(angle - center - layer * 0.065),
    );
    height +=
      amplitude *
      (0.88 + 0.12 * Math.cos(layer * 1.9 + center * 4)) *
      Math.exp(-((delta / width) ** 2));
  }
  const rough =
    Math.sin(angle * 31 + layer * 1.8) * 2.8 +
    Math.sin(angle * 71 - layer * 2.2) * 1.3 +
    Math.sin(angle * 129 + layer) * 0.6;
  return height + rough;
}

/** 月心放在主山脊的视线上，下半月由真实山体深度遮住。 */
export function mountainMoonPosition() {
  const x = 80,
    z = -435,
    az = Math.atan2(x, -z - 20);
  let y = 0;
  for (let layer = 0; layer < 5; layer++) {
    const r = 340 - layer * 23,
      rz = -Math.cos(az) * r - 20;
    y = Math.max(
      y,
      3.6 + ((mountainRidge(az, layer) - 3.6) * (z - 8)) / (rz - 8),
    );
  }
  return new THREE.Vector3(x, y, z);
}

export function addMountainBackdrop(
  world: THREE.Scene,
  resources: Resource[],
  light = false,
) {
  const paper = document.createElement("canvas");
  paper.width = 1024;
  paper.height = 512;
  const ctx = paper.getContext("2d")!;
  let seed = 813;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pixels = ctx.createImageData(1024, 512);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = 232 + random() * 23;
    pixels.data.set([grain, grain, grain, 255], i);
  }
  ctx.putImageData(pixels, 0, 0);
  // 叠染、碎笔和不等长披麻皴，避免重复的竖条与塑料高光。
  for (let i = 0; i < 380; i++) {
    const x = random() * 1024,
      y = random() * 512,
      r = 12 + random() * 90;
    const wash = ctx.createRadialGradient(x, y, 0, x, y, r);
    wash.addColorStop(0, `rgba(49,66,62,${0.018 + random() * 0.065})`);
    wash.addColorStop(1, "rgba(49,66,62,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 3500; i++) {
    const x = random() * 1024,
      y = random() * 512,
      length = 3 + random() ** 2 * 90,
      bend = (random() - 0.5) * 30;
    ctx.lineWidth = 0.3 + random() * 1.3;
    ctx.strokeStyle = `rgba(38,62,60,${0.025 + random() * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + bend,
      y + length * 0.25,
      x - bend * 0.35,
      y + length * 0.65,
      x + bend * 0.4,
      y + length,
    );
    ctx.stroke();
    if (i % 4 === 0) {
      ctx.fillStyle = "rgba(215,215,193,.12)";
      ctx.fillRect(x + 2, y, 1, random() * 5 + 1);
    }
  }
  // 矿色沿短折线积染，横向石阶和斜向皴笔打散整面垂直纹理。
  for (let i = 0; i < 1100; i++) {
    const x = random() * 1024,
      y = random() * 512,
      w = 4 + random() ** 2 * 56,
      h = 2 + random() * 14;
    ctx.lineWidth = 0.5 + random() * 1.5;
    ctx.strokeStyle =
      i % 3 === 0
        ? `rgba(203,199,154,${0.04 + random() * 0.1})`
        : `rgba(29,66,76,${0.035 + random() * 0.09})`;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y + h * 0.4);
    ctx.lineTo(x - w * 0.1, y);
    ctx.lineTo(x + w * 0.25, y + h * 0.1);
    ctx.lineTo(x + w * 0.5, y - h * 0.2);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(paper);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const positions: number[] = [],
    colors: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const palette = ["#b9ad97", "#a8aa94", "#909e86", "#748f7d", "#587d74"];
  const cols = light ? 240 : 480,
    rows = light ? 6 : 12;
  for (let layer = 0; layer < 5; layer++) {
    const base = positions.length / 3,
      ink = new THREE.Color(palette[layer]),
      jade = new THREE.Color("#93a183"),
      foot = new THREE.Color("#b9ab88"),
      radius = 340 - layer * 23;
    for (let row = 0; row <= rows; row++)
      for (let i = 0; i <= cols; i++) {
        const u = i / cols,
          angle = (u - 0.5) * Math.PI * 2,
          v = row / rows,
          summit = mountainRidge(angle, layer);
        positions.push(
          Math.sin(angle) * radius,
          THREE.MathUtils.lerp(summit, -35, v),
          -Math.cos(angle) * radius - 20,
        );
        const tint =
          v < 0.5
            ? ink.clone().lerp(jade, v * 1.35)
            : jade.clone().lerp(foot, (v - 0.5) * 1.65);
        const ledge =
          Math.sin(v * 32 + Math.sin(angle * 23 + layer) * 1.8) * 0.025;
        const folds =
          Math.sin(angle * 51 + Math.sin(angle * 17) * 2 + v * 3 + layer * 2) *
            0.045 +
          Math.sin(angle * 97 + v * 7) * 0.022 +
          ledge;
        tint.multiplyScalar(0.94 + folds + Math.pow(1 - v, 5) * 0.11);
        // 山谷薄岚已画进山腰，远山不会变成发光的平板。
        tint.lerp(new THREE.Color("#b7b09e"), Math.pow(v, 3) * 0.32);
        colors.push(...tint.toArray());
        uvs.push(u * 4 + layer * 0.271, v);
        if (row < rows && i < cols) {
          const j = base + row * (cols + 1) + i;
          indices.push(
            j,
            j + cols + 1,
            j + 1,
            j + 1,
            j + cols + 1,
            j + cols + 2,
          );
        }
      }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    vertexColors: true,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mountains = new THREE.Mesh(geometry, material);
  mountains.name = "paper-mountains";
  resources.push(texture, geometry, material);
  world.add(mountains);
}

/** 星芒在地表着色器内流动；保留承托建筑的高度，不再生成草坪或凹凸贴图。 */
export function addStarGround(
  world: THREE.Scene,
  resources: Resource[],
  light: boolean,
) {
  const elapsed = { value: 0 };
  const geometry = new THREE.PlaneGeometry(
    700,
    650,
    light ? 64 : 96,
    light ? 60 : 90,
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -30);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    // 中央细分密、外围稀疏：扩大地面时仍能准确贴合庭院的压平台地。
    const x =
      Math.sign(position.getX(i)) *
      (Math.abs(position.getX(i)) / 350) ** 2 *
      350;
    const z0 = position.getZ(i) + 30;
    const z = Math.sign(z0) * (Math.abs(z0) / 325) ** 2 * 325 - 30;
    const distance = Math.hypot(x, z + 21);
    const bank = THREE.MathUtils.smoothstep(distance, 26, 55);
    position.setXYZ(
      i,
      x,
      THREE.MathUtils.lerp(
        -2.5,
        Math.min(-1.4, gardenGroundHeight(x, z)),
        bank,
      ),
      z,
    );
  }
  geometry.computeBoundingSphere();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      elapsed,
      base: { value: new THREE.Color("#101a2d") },
      jade: { value: new THREE.Color("#1b303b") },
      ochre: { value: new THREE.Color("#38342d") },
      silver: { value: new THREE.Color("#a5a58d") },
      gold: { value: new THREE.Color("#f0cd99") },
    },
    vertexShader: `varying vec3 land;
      void main(){land=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform float elapsed;uniform vec3 base;uniform vec3 jade;uniform vec3 ochre;uniform vec3 silver;uniform vec3 gold;varying vec3 land;
      void main(){
        vec2 q=land.xz;
        float bend=sin(q.y*.085+elapsed*.13)*3.2+sin(q.y*.19-elapsed*.11)*1.1;
        float wave=pow(.5+.5*sin(q.x*.52+bend),20.);
        float second=pow(.5+.5*sin(q.x*.38-q.y*.12+elapsed*.22),28.);
        vec2 flow=q*1.05+vec2(sin(elapsed*.09)*.13,elapsed*.09);
        vec2 cell=floor(flow);vec2 p=fract(flow)-.5;
        float h=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
        p-=vec2(h-.5,fract(h*23.7)-.5)*.45;
        float core=exp(-dot(p,p)*240.);
        float rays=(exp(-abs(p.x)*85.)+exp(-abs(p.y)*85.))*exp(-length(p)*15.);
        float pulse=.65+.35*sin(elapsed*.75+h*31.);
        float courtyardDistance=length(q-vec2(0.,-21.));
        float outer=smoothstep(19.,29.,courtyardDistance)*(1.-smoothstep(75.,125.,courtyardDistance));
        float stars=(core+rays*.5)*smoothstep(mix(.86,.82,outer),.98,h)*pulse;
        float distanceFade=1.-smoothstep(38.,125.,length(q-vec2(0.,12.)));
        float warmth=.5+.5*sin(q.x*.026+q.y*.017+elapsed*.045);
        vec3 groundTone=mix(mix(base,jade,.35+.3*sin(q.y*.024)),ochre,warmth*.65);
        vec3 c=groundTone*(.85+wave*.16+second*.10);
        c+=silver*(wave*.045+second*.025)*distanceFade;
        float wandering=pow(.5+.5*sin(q.x*.25-q.y*.09+bend*.4+elapsed*.19),32.);
        c+=mix(silver,gold,warmth*.16)*(wave*.13+second*.075+wandering*.045)*outer*distanceFade;
        c+=mix(silver,gold,clamp(h*.3+warmth*.7,0.,1.))*stars*(.65+outer*.2)*distanceFade;
        c=mix(c,vec3(.012,.024,.035),smoothstep(80.,260.,length(q))*.8);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.name = "flowing-star-ground";
  resources.push(geometry, material);
  world.add(ground);
  return (time: number) => {
    elapsed.value = time;
  };
}
