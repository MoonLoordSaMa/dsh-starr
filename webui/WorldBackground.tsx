import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createCelestialInstrument } from "./celestial-instrument";
import {
  addGardenForeground,
  gardenStone,
  gardenGroundHeight,
} from "./garden-detail";
import type { State } from "./types";

// 原生程序场景：远月、山脊、星环庭院与近景星屑。无远端素材与后期全屏模糊。
export default function WorldBackground({
  motion,
  density,
  scene = "overview",
  state,
  quality = "auto",
}: {
  motion: string;
  density: number;
  scene?: string;
  state?: State;
  quality?: string;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(scene);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    update.current();
  }, [state]);
  const update = useRef<() => void>(() => {});
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    sceneRef.current = scene;
    update.current();
  }, [scene]);
  useEffect(() => {
    const el = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    setFallback(false);
    const reduced =
      motion === "reduced" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const light = motion === "light";
    const vivid = motion === "vivid";
    let pixelRatio = Math.min(
      devicePixelRatio,
      light || quality === "low" ? 0.85 : quality === "high" ? 1.5 : 1.2,
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor("#0d101b");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.prepend(renderer.domElement);
    const world = new THREE.Scene();
    world.fog = new THREE.FogExp2("#252330", 0.012);
    const camera = new THREE.PerspectiveCamera(49, 1, 0.1, 220);
    const resources: { dispose(): void }[] = [];
    const geo = <T extends THREE.BufferGeometry>(g: T) => {
      resources.push(g);
      return g;
    };
    const mat = <T extends THREE.Material>(m: T) => {
      resources.push(m);
      return m;
    };
    let seed = 503;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const group = new THREE.Group();
    world.add(group);
    world.add(new THREE.HemisphereLight("#b4b6e1", "#171520", 1.5));
    const moonlight = new THREE.DirectionalLight("#f6be9b", 3.1);
    moonlight.position.set(14, 24, 18);
    world.add(moonlight);

    const skyGeo = geo(new THREE.PlaneGeometry(210, 110));
    const skyMat = mat(
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 uvp;void main(){uvp=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 uvp;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float grain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
        void main(){vec3 c=mix(vec3(.18,.16,.23),vec3(.025,.035,.068),smoothstep(0.,.95,uvp.y));float haze=exp(-length((uvp-vec2(.6,.44))*vec2(2.1,3.3))*4.);c+=vec3(.16,.10,.11)*haze;
        float n=grain(uvp*vec2(11.,7.))*.7+grain(uvp*vec2(31.,19.))*.3;
        float river=exp(-pow((uvp.y-.51-sin(uvp.x*5.)*.095-n*.055)*9.,2.));
        c+=mix(vec3(.025,.043,.083),vec3(.09,.055,.077),n)*river*.8;
        c+=(grain(uvp*320.)-.5)*.007;gl_FragColor=vec4(c,1.);}`,
        depthWrite: false,
      }),
    );
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(0, 26, -105);
    world.add(sky);

    // 月面由确定性陨坑纹理生成，避免依赖外部图片。
    const plate = document.createElement("canvas");
    plate.width = plate.height = 512;
    const ctx = plate.getContext("2d")!;
    ctx.fillStyle = "#b29c8e";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) {
      const x = random() * 512,
        y = random() * 512,
        r = 1 + random() ** 3 * 46;
      const gradient = ctx.createRadialGradient(
        x + r * 0.15,
        y - r * 0.2,
        r * 0.05,
        x,
        y,
        r,
      );
      gradient.addColorStop(0, `rgba(50,37,37,${0.06 + random() * 0.24})`);
      gradient.addColorStop(0.67, "rgba(73,57,53,.12)");
      gradient.addColorStop(0.89, "rgba(237,210,181,.11)");
      gradient.addColorStop(1, "rgba(180,158,143,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(plate);
    texture.colorSpace = THREE.SRGBColorSpace;
    resources.push(texture);
    const moon = new THREE.Mesh(
      geo(new THREE.SphereGeometry(8.4, 64, 40)),
      mat(
        new THREE.MeshStandardMaterial({
          map: texture,
          color: "#efd0b7",
          roughness: 1,
          emissive: "#b86d52",
          emissiveIntensity: 0.42,
        }),
      ),
    );
    moon.position.set(8.4, 14.2, -48);
    world.add(moon);
    const glowMat = mat(
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 p;void main(){p=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 p;void main(){float r=length(p)*2.;float a=exp(-r*r*4.)*.24*(1.-smoothstep(.75,1.,r));gl_FragColor=vec4(.94,.48,.31,a);}`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const glow = new THREE.Mesh(geo(new THREE.PlaneGeometry(38, 38)), glowMat);
    glow.position.copy(moon.position);
    glow.position.z -= 2;
    world.add(glow);

    const starPositions: number[] = [],
      starSizes: number[] = [],
      starPhases: number[] = [];
    for (
      let i = 0;
      i < Math.round((light ? 230 : vivid ? 860 : 620) * density);
      i++
    ) {
      starPositions.push(
        (random() - 0.5) * 190,
        random() * 67 + 1,
        -55 - random() * 45,
      );
      starSizes.push(0.7 + random() ** 3 * 4);
      starPhases.push(random() * 6.28);
    }
    const starsGeo = geo(new THREE.BufferGeometry());
    starsGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    starsGeo.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(starSizes, 1),
    );
    starsGeo.setAttribute(
      "phase",
      new THREE.Float32BufferAttribute(starPhases, 1),
    );
    const starsMat = mat(
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          ratio: { value: renderer.getPixelRatio() },
        },
        vertexShader: `attribute float size;attribute float phase;varying float a;uniform float time;uniform float ratio;void main(){a=.4+.6*pow(.5+.5*sin(time*.8+phase),2.);gl_PointSize=size*ratio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying float a;void main(){vec2 p=gl_PointCoord-.5;float k=exp(-dot(p,p)*24.);if(k<.04)discard;gl_FragColor=vec4(.78,.84,1.,k*a);}`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    world.add(new THREE.Points(starsGeo, starsMat));

    // 多层山脊拥有不同的高度与颜色，在真实三维空间形成遮挡。
    for (let layer = 0; layer < 5; layer++) {
      const positions: number[] = [],
        indices: number[] = [];
      const z = -70 + layer * 11;
      for (let i = 0; i <= 70; i++) {
        const x = (i / 70 - 0.5) * 180;
        const valley = 1 - Math.exp(-(((x - 5) / 20) ** 2));
        const y =
          1 +
          valley * (8 + layer * 1.4) +
          Math.sin(i * 0.38 + layer) * 1.9 +
          random() * 2.2;
        positions.push(x, y, z, x, -10, z + 2);
        if (i < 70) {
          const j = i * 2;
          indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
        }
      }
      const g = geo(new THREE.BufferGeometry());
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setIndex(indices);
      g.computeVertexNormals();
      const m = mat(
        new THREE.MeshBasicMaterial({
          color: ["#393343", "#302e3c", "#252737", "#1c2130", "#131b28"][layer],
          side: THREE.DoubleSide,
        }),
      );
      group.add(new THREE.Mesh(g, m));
    }
    const stoneTexture = gardenStone(resources);
    const groundTexture = stoneTexture.clone();
    groundTexture.repeat.set(32, 28);
    resources.push(groundTexture);
    const updateGarden = addGardenForeground(
      world,
      resources,
      stoneTexture,
      light || quality === "low",
    );
    const groundGeometry = geo(new THREE.PlaneGeometry(180, 160, 90, 80));
    groundGeometry.rotateX(-Math.PI / 2);
    groundGeometry.translate(0, 0, -24);
    const terrain = groundGeometry.getAttribute("position");
    for (let i = 0; i < terrain.count; i++)
      terrain.setY(i, gardenGroundHeight(terrain.getX(i), terrain.getZ(i)));
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(
      groundGeometry,
      mat(
        new THREE.MeshStandardMaterial({
          color: "#343d50",
          map: groundTexture,
          bumpMap: groundTexture,
          bumpScale: 0.07,
          metalness: 0.25,
          roughness: 0.82,
        }),
      ),
    );
    group.add(ground);
    const rockMat = mat(
      new THREE.MeshStandardMaterial({
        color: "#414958",
        map: stoneTexture,
        bumpMap: stoneTexture,
        bumpScale: 0.09,
        roughness: 0.92,
        metalness: 0.15,
      }),
    );
    const paleMat = mat(
      new THREE.MeshStandardMaterial({
        color: "#3f404b",
        map: stoneTexture,
        bumpMap: stoneTexture,
        bumpScale: 0.065,
        roughness: 0.85,
        metalness: 0.3,
      }),
    );
    const goldMat = mat(new THREE.MeshBasicMaterial({ color: "#ddad7f" }));
    const cylinder = geo(new THREE.CylinderGeometry(1, 1, 1, 12));
    const boxGeo = geo(new THREE.BoxGeometry(1, 1, 1));
    const stoneBatches = new Map<
      string,
      {
        geometry: THREE.BufferGeometry;
        material: THREE.Material;
        matrices: THREE.Matrix4[];
      }
    >();
    const stone = (
      g: THREE.BufferGeometry,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.updateMatrix();
      const key = `${g.uuid}:${m.uuid}`;
      const batch = stoneBatches.get(key) || {
        geometry: g,
        material: m,
        matrices: [],
      };
      batch.matrices.push(mesh.matrix.clone());
      stoneBatches.set(key, batch);
    };
    // 观星庭院：台阶、两侧石柱、悬浮星环，留出中央的视线通道。
    for (let i = 0; i < 7; i++)
      stone(
        boxGeo,
        rockMat,
        0,
        -0.65 + i * 0.13,
        3 - i * 2,
        12 - i * 0.55,
        0.22,
        2.2,
      );
    let glowTexture: THREE.CanvasTexture | undefined;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const z = -4 - i * 5.8,
          x = side * (7.6 - i * 0.5),
          height = 3.2 + random() * 4;
        stone(cylinder, paleMat, x, height / 2 - 0.6, z, 0.35, height, 0.35);
        stone(boxGeo, rockMat, x, -0.45, z, 1.15, 0.42, 1.15);
        stone(boxGeo, paleMat, x, height - 0.6, z, 1, 0.24, 0.9);
        stone(boxGeo, goldMat, x, height - 0.46, z, 0.24, 0.04, 0.24);
      }
      for (let i = 0; i < 8; i++) {
        const x = side * (4.7 - i * 0.12),
          z = 5 - i * 4.6;
        stone(boxGeo, rockMat, x, -0.12, z, 0.48, 1.1, 0.48);
        const lamp = new THREE.Sprite(
          mat(
            new THREE.SpriteMaterial({
              map: makeGlowTexture(),
              color: "#f1b66d",
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              opacity: 0.75,
            }),
          ),
        );
        lamp.position.set(x, 0.52, z);
        lamp.scale.set(2.6, 2.6, 1);
        group.add(lamp);
      }
    }
    // 台阶与石柱按材质和几何批量提交，保留相同纹理与空间位置。
    for (const batch of stoneBatches.values()) {
      const instances = new THREE.InstancedMesh(
        batch.geometry,
        batch.material,
        batch.matrices.length,
      );
      batch.matrices.forEach((matrix, index) =>
        instances.setMatrixAt(index, matrix),
      );
      instances.computeBoundingSphere();
      resources.push(instances);
      group.add(instances);
    }
    function makeGlowTexture() {
      if (glowTexture) return glowTexture;
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const p = c.getContext("2d")!;
      const g = p.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.08, "#fff");
      g.addColorStop(0.2, "#ffffff88");
      g.addColorStop(0.5, "#ffffff22");
      g.addColorStop(1, "#ffffff00");
      p.fillStyle = g;
      p.fillRect(0, 0, 64, 64);
      glowTexture = new THREE.CanvasTexture(c);
      resources.push(glowTexture);
      return glowTexture;
    }
    const instrument = createCelestialInstrument(resources, light);
    group.add(instrument.group);

    // 字标放进三维场景，前景石柱能够自然遮挡它。
    const lettering = document.createElement("canvas");
    lettering.width = 2048;
    lettering.height = 640;
    const lc = lettering.getContext("2d")!;
    lc.fillStyle = "#f1e3d3";
    lc.font = "600 590px Georgia";
    lc.textAlign = "center";
    lc.textBaseline = "middle";
    lc.fillText("starr", 1024, 300);
    const letterTexture = new THREE.CanvasTexture(lettering);
    letterTexture.colorSpace = THREE.SRGBColorSpace;
    resources.push(letterTexture);
    const wordmark = new THREE.Mesh(
      geo(new THREE.PlaneGeometry(33, 10.3)),
      mat(
        new THREE.MeshBasicMaterial({
          map: letterTexture,
          transparent: true,
          opacity: 0.86,
          depthWrite: false,
        }),
      ),
    );
    wordmark.position.set(-1.5, 8.2, -33);
    world.add(wordmark);

    // 近景草叶和星屑，与远景形成明显的视差。
    const grassVertices: number[] = [],
      grassIndices: number[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6,
        bend = t * t * 0.3,
        width = (1 - t) * 0.07;
      grassVertices.push(bend - width, t, 0, bend + width, t, 0);
      if (i < 6) {
        const j = i * 2;
        grassIndices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    const grassGeo = geo(new THREE.BufferGeometry());
    grassGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(grassVertices, 3),
    );
    grassGeo.setIndex(grassIndices);
    const grassMat = mat(
      new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `uniform float time;varying float t;void main(){vec3 p=position;t=p.y;p.x+=sin(time*.8+instanceMatrix[3].x+instanceMatrix[3].z)*p.y*p.y*.2;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
        fragmentShader: `varying float t;void main(){gl_FragColor=vec4(mix(vec3(.04,.07,.08),vec3(.14,.20,.21),t),1.);}`,
        side: THREE.DoubleSide,
      }),
    );
    const grass = new THREE.InstancedMesh(
      grassGeo,
      grassMat,
      light ? 350 : 1100,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < grass.count; i++) {
      const side = random() > 0.5 ? 1 : -1;
      const x = side * (6 + random() * 19),
        z = -16 + random() * 32;
      dummy.position.set(x, gardenGroundHeight(x, z) - 0.015, z);
      dummy.scale.set(0.6 + random(), 0.4 + random() * 1.15, 0.7);
      dummy.rotation.set(random() * 0.5, random() * 6, side * random() * 0.4);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    group.add(grass);
    resources.push(grass);
    const particlesCount = light ? 40 : 150;
    const particlesGeo = geo(new THREE.BufferGeometry());
    const particlePositions = new Float32Array(particlesCount * 3),
      phases = new Float32Array(particlesCount);
    for (let i = 0; i < particlesCount; i++) {
      particlePositions[i * 3] = (random() - 0.5) * 45;
      particlePositions[i * 3 + 1] = random() * 22;
      particlePositions[i * 3 + 2] = -25 + random() * 45;
      phases[i] = random() * 6.28;
    }
    particlesGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    particlesGeo.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    const particlesMat = mat(
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          ratio: { value: renderer.getPixelRatio() },
        },
        vertexShader: `attribute float phase;uniform float time;uniform float ratio;varying float a;void main(){vec3 p=position;p.x+=sin(time*.16+phase)*2.2;p.y=mod(p.y+time*(.32+.22*sin(phase)),24.);p.z+=cos(time*.12+phase)*2.;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((45.+phase*8.)*ratio/max(2.,-v.z),2.,17.);a=.4+.5*sin(time+phase);}`,
        fragmentShader: `varying float a;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);float k=exp(-r*r*45.)+(exp(-abs(p.x)*55.)+exp(-abs(p.y)*55.))*exp(-r*8.)*.24;if(k<.02)discard;gl_FragColor=vec4(1.,.72,.4,k*max(.2,a));}`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    world.add(new THREE.Points(particlesGeo, particlesMat));
    const moteShape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        r = i % 2 ? 0.07 : 0.3;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (!i) moteShape.moveTo(x, y);
      else moteShape.lineTo(x, y);
    }
    moteShape.closePath();
    const motes = new THREE.InstancedMesh(
      geo(new THREE.ShapeGeometry(moteShape)),
      mat(
        new THREE.MeshBasicMaterial({
          color: "#d9ae83",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        }),
      ),
      light ? 12 : vivid ? 64 : 42,
    );
    const moteOrigins = Array.from({ length: motes.count }, (_, i) => ({
      x:
        i < 6 ? (i % 2 ? 1 : -1) * (5.6 + random() * 3) : (random() - 0.5) * 42,
      y: i < 6 ? 0.3 + random() * 3.4 : random() * 25,
      z: i < 6 ? 10 + random() * 5 : -22 + random() * 36,
      phase: random() * 6.28,
      size: i < 6 ? 0.65 + random() * 0.7 : 0.3 + random() * 0.7,
    }));
    const nearHalos = Array.from({ length: 6 }, () => {
      const sprite = new THREE.Sprite(
        mat(
          new THREE.SpriteMaterial({
            map: makeGlowTexture(),
            color: "#d8d7ec",
            opacity: 0.14,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        ),
      );
      sprite.scale.set(1.5, 1.5, 1);
      world.add(sprite);
      return sprite;
    });
    world.add(motes);
    resources.push(motes);
    const mistMat = mat(
      new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform float time;varying vec2 p;void main(){float a=sin(p.x*9.+time*.12+sin(p.x*17.-time*.08))* .5+.5;float band=exp(-pow((p.y-.42)*7.,2.));float edge=smoothstep(0.,.2,p.x)*(1.-smoothstep(.8,1.,p.x));gl_FragColor=vec4(.47,.43,.52,a*band*edge*.15);}`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const mist = new THREE.Mesh(geo(new THREE.PlaneGeometry(95, 12)), mistMat);
    mist.position.set(0, 1.7, -24);
    world.add(mist);
    let width = 1,
      height = 1,
      time = 0,
      last = 0,
      frame = 0,
      scroll = 0,
      visible = !document.hidden;
    let renderedFrames = 0,
      measuredMs = 0;
    let mx = 0,
      my = 0,
      px = 0,
      py = 0;
    const desiredCamera = new THREE.Vector3(),
      desiredLook = new THREE.Vector3(),
      look = new THREE.Vector3(0, 7, -24);
    camera.position.set(0, 5.2, 25);
    function destination() {
      const main = document.querySelector("main");
      scroll = main
        ? Math.max(0, Math.min(1, main.scrollTop / (height * 1.15)))
        : 0;
      const home = sceneRef.current === "overview";
      const route = sceneRef.current;
      const memory = route.startsWith("memory"),
        heart = ["state", "intentions"].includes(route);
      const sense = [
        "media",
        "hearing",
        "vision",
        "singing",
        "expressions",
      ].includes(route);
      const side = memory ? -1 : heart ? 1 : sense ? -0.6 : 0.6;
      desiredCamera.set(
        home
          ? mx * 1.3 + Math.sin(scroll * 1.3) * 2
          : side * (7 - scroll * 4) + mx * 0.45,
        home
          ? 5.2 + my * 0.6 + scroll * 3
          : (memory ? 9 : heart ? 4.8 : 7) +
              my * 0.3 +
              scroll * (heart ? 5 : -2),
        home ? 25 - scroll * 9 : 31 - scroll * (sense ? 9 : 7),
      );
      desiredLook.set(
        home ? scroll * 1.8 : side * (2 - scroll * 3),
        home ? 7.2 - scroll : 7 + scroll * (heart ? 2 : -1),
        -24 + scroll * 5,
      );
    }
    function draw(dt: number) {
      time += dt * (vivid ? 1.35 : 1);
      updateGarden(reduced ? 0 : time);
      px += (mx - px) * (reduced ? 1 : Math.min(1, dt * 3));
      py += (my - py) * (reduced ? 1 : Math.min(1, dt * 3));
      destination();
      desiredCamera.x += px * 0.5;
      desiredCamera.y += py * 0.3;
      const damping = reduced ? 1 : 1 - Math.exp(-dt * 2.4);
      camera.position.lerp(desiredCamera, damping);
      look.lerp(desiredLook, damping);
      camera.lookAt(look);
      instrument.update(
        time,
        dt,
        stateRef.current?.organism,
        stateRef.current?.energy ?? 80,
        reduced,
      );
      wordmark.material.opacity = sceneRef.current === "overview" ? 0.86 : 0;
      starsMat.uniforms.time.value = particlesMat.uniforms.time.value = reduced
        ? 0
        : time;
      grassMat.uniforms.time.value = mistMat.uniforms.time.value = reduced
        ? 0
        : time;
      moteOrigins.forEach((m, i) => {
        dummy.position.set(
          m.x + Math.sin(time * 0.25 + m.phase) * (i < 6 ? 0.55 : 2),
          i < 6
            ? m.y + Math.sin(time * 0.28 + m.phase) * 0.4
            : ((((m.y - (reduced ? 0 : time * 0.65)) % 25) + 25) % 25) - 1,
          m.z + Math.cos(time * 0.17 + m.phase),
        );
        dummy.rotation.set(
          reduced ? m.phase : time * 0.32 + m.phase,
          reduced ? m.phase : time * 0.2 + m.phase,
          reduced ? m.phase : time * 0.24 + m.phase,
        );
        dummy.scale.setScalar(m.size);
        dummy.updateMatrix();
        motes.setMatrixAt(i, dummy.matrix);
        if (i < 6) nearHalos[i].position.copy(dummy.position);
      });
      motes.instanceMatrix.needsUpdate = true;
      renderer.render(world, camera);
      renderer.domElement.dataset.drawCalls = String(
        renderer.info.render.calls,
      );
    }
    const tick = (t: number) => {
      frame = 0;
      if (!visible || reduced) return;
      if (
        t - last >=
        (light || quality === "low"
          ? 65
          : sceneRef.current !== "overview"
            ? 40
            : 32)
      ) {
        const started = performance.now();
        draw(Math.min(0.08, last ? (t - last) / 1000 : 0.016));
        measuredMs += performance.now() - started;
        renderedFrames++;
        if (quality === "auto" && renderedFrames >= 90) {
          const average = measuredMs / renderedFrames;
          if (average > 12 && pixelRatio > 0.75) {
            pixelRatio = Math.max(0.75, pixelRatio - 0.15);
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(width, height);
          }
          renderer.domElement.dataset.renderMs = average.toFixed(2);
          renderer.domElement.dataset.pixelRatio = pixelRatio.toFixed(2);
          renderedFrames = 0;
          measuredMs = 0;
        }
        last = t;
      }
      frame = requestAnimationFrame(tick);
    };
    function invalidate() {
      if (reduced) {
        destination();
        draw(1);
      } else if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    }
    update.current = invalidate;
    const resize = () => {
      width = innerWidth;
      height = innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw(reduced ? 1 : 0);
      invalidate();
    };
    const pointer = (e: PointerEvent) => {
      mx = (e.clientX / width - 0.5) * 2;
      my = (0.5 - e.clientY / height) * 2;
    };
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.tagName === "MAIN") {
        scroll = Math.max(0, Math.min(1, target.scrollTop / (height * 1.15)));
        invalidate();
      }
    };
    const visibility = () => {
      visible = !document.hidden;
      cancelAnimationFrame(frame);
      frame = 0;
      invalidate();
    };
    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("scroll", onScroll, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      update.current = () => {};
      removeEventListener("resize", resize);
      removeEventListener("pointermove", pointer);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("visibilitychange", visibility);
      for (const r of resources) r.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [motion, density, quality]);
  return (
    <div
      ref={mount}
      className={`world-scene ${fallback ? "world-scene-fallback" : ""}`}
      data-scene={scene}
      aria-hidden="true"
    >
      <div className="world-vignette" />
    </div>
  );
}
