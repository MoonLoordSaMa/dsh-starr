import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createCelestialInstrument } from "./celestial-instrument";
import { addGardenStarflow } from "./garden-starflow";
import { loadObservatory, STAR_CENTER } from "./observatory-model";
import {
  addMountainBackdrop,
  addStarGround,
  mountainMoonPosition,
} from "./garden-landscape";
import { createGardenDepth } from "./garden-depth";
import type { State } from "./types";

/** 用户观星楼、同心四芒星仪和银河；镜头在回廊内按分段权重游览。
 * 静态建筑按材质合批，星流在着色器内推进，景深复用主渲染深度。
 */
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
  const [systemReduced, setSystemReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setSystemReduced(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  const deviceMemory =
    "deviceMemory" in navigator
      ? Number((navigator as Navigator & { deviceMemory: number }).deviceMemory)
      : 8;
  const lowDevice = deviceMemory <= 4 || innerWidth < 700 || quality === "low";
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
        antialias: !lowDevice,
        powerPreference: lowDevice ? "low-power" : "high-performance",
      });
    } catch {
      setFallback(true);
      return;
    }
    setFallback(false);
    const reduced = motion === "reduced" || systemReduced;
    const light = motion === "light" || lowDevice;
    const vivid = motion === "vivid";
    let pixelRatio = Math.min(
      devicePixelRatio,
      lowDevice
        ? 0.75
        : light || quality === "low"
          ? 0.85
          : quality === "high"
            ? 1.25
            : 1,
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor("#15131b");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    el.prepend(renderer.domElement);
    const world = new THREE.Scene();
    // 雾色与天空底部同源，远山才会自然融进天色而不是浮在暗底上。
    world.fog = new THREE.FogExp2("#46414a", 0.0018);
    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1000);
    const depth = light ? undefined : createGardenDepth(renderer, camera);
    renderer.info.autoReset = false;
    renderer.domElement.dataset.depthOfField = depth
      ? "subtle"
      : "particle-only";
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
    world.add(new THREE.HemisphereLight("#f3e1bb", "#77756d", 2.5));
    const moonlight = new THREE.DirectionalLight("#ffe2af", 2.6);
    moonlight.position.set(20, 26, -20);
    world.add(moonlight);
    // 补一盏极弱的环境补光，避免侧看时背光面全黑成剪影。
    const fillLight = new THREE.DirectionalLight("#d5d5c7", 1.65);
    fillLight.position.set(-24, 8, 26);
    world.add(fillLight);

    // ——— 天空 ———
    const skyGeo = geo(
      new THREE.SphereGeometry(800, light ? 32 : 48, light ? 20 : 30),
    );
    const skyMat = mat(
      new THREE.ShaderMaterial({
        uniforms: {
          moonDir: { value: new THREE.Vector3(0.3, 0.34, -0.89).normalize() },
        },
        vertexShader: `varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `
        varying vec3 vDir;
        uniform vec3 moonDir;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float grain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
        void main(){
          vec3 d=normalize(vDir);
          float h=clamp(d.y,0.,1.);
          vec3 horizon=mix(vec3(.12,.086,.065),vec3(.105,.083,.09),smoothstep(-.6,.8,d.x));
          vec3 c=mix(horizon,vec3(.026,.025,.041),smoothstep(.02,.80,h));
          // 有星云色差、暗尘带和细碎恒星的银河；固定天球坐标，不随镜头游动。
          vec2 space=vec2(atan(d.x,-d.z),asin(clamp(d.y,-1.,1.)));
          float across=space.y-.36-space.x*.38;
          float cloud=grain(space*9.)*.38+grain(space*23.)*.30+grain(space*61.)*.20+grain(space*147.)*.12;
          float band=exp(-pow((across+(cloud-.5)*.23)*7.,2.));
          float core=exp(-pow((across-.018)*16.,2.));
          float dust=smoothstep(.40,.64,grain(space*35.+vec2(7.,11.)));
          vec3 nebula=mix(vec3(.24,.18,.10),vec3(.18,.14,.14),smoothstep(-.7,.7,d.x));
          c+=nebula*band*(.08+pow(cloud,2.)*1.6);
          c+=vec3(.55,.39,.20)*core*pow(cloud,3.)*.8;
          c*=1.-dust*core*.48;
          vec2 grid=space*740.; vec2 cell=floor(grid); vec2 q=fract(grid)-.5;
          float tiny=exp(-dot(q,q)*120.)*step(.975,hash(cell));
          c+=mix(vec3(.48,.72,1.),vec3(1.,.76,.44),hash(cell+3.))*tiny*band*.8;
          float md=max(0.,dot(d,normalize(moonDir)));
          c+=vec3(.21,.18,.22)*pow(md,28.)*.4;
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
        depthWrite: false,
        depthTest: false,
        side: THREE.BackSide,
      }),
    );
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.renderOrder = -100;
    world.add(sky);

    // ——— 月 ———
    // 月面由确定性陨坑纹理生成，避免依赖外部图片；边缘带轻微明暗过渡。
    const plate = document.createElement("canvas");
    plate.width = plate.height = 512;
    const ctx = plate.getContext("2d")!;
    ctx.fillStyle = "#a89486";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) {
      const x = random() * 512,
        y = random() * 512,
        r = 1 + random() ** 3.4 * 40;
      const gradient = ctx.createRadialGradient(
        x + r * 0.15,
        y - r * 0.2,
        r * 0.05,
        x,
        y,
        r,
      );
      gradient.addColorStop(0, `rgba(46,34,34,${0.05 + random() * 0.2})`);
      gradient.addColorStop(0.67, "rgba(70,55,52,.1)");
      gradient.addColorStop(0.89, "rgba(238,214,190,.1)");
      gradient.addColorStop(1, "rgba(180,158,143,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 月海：几片低洼的暗区，让球面读起来有朝向与体积。
    for (let i = 0; i < 5; i++) {
      const x = 90 + random() * 330,
        y = 120 + random() * 280,
        r = 40 + random() * 70;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(58,44,42,.24)");
      g.addColorStop(1, "rgba(58,44,42,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const texture = new THREE.CanvasTexture(plate);
    texture.colorSpace = THREE.SRGBColorSpace;
    resources.push(texture);
    const moonRadius = 54;
    const moonPos = mountainMoonPosition();
    skyMat.uniforms.moonDir.value.copy(moonPos).normalize();
    const moon = new THREE.Mesh(
      geo(
        new THREE.SphereGeometry(moonRadius, light ? 36 : 72, light ? 24 : 48),
      ),
      mat(
        new THREE.MeshStandardMaterial({
          map: texture,
          // 月面偏冷白，只在受光边缘带一层暖色，避免整颗月亮发橙。
          color: "#e7e2df",
          roughness: 0.98,
          emissive: "#dfc9a2",
          emissiveIntensity: 0.7,
          fog: false,
        }),
      ),
    );
    moon.position.copy(moonPos);
    moon.name = "远天明月";
    world.add(moon);
    // 辉光分三层：贴面柔光、外层光晕、极淡的大气散射，近月处才可见。
    const moonHalos: THREE.Mesh[] = [];
    const halo = (size: number, strength: number, color: string) => {
      const spriteMaterial = mat(
        new THREE.ShaderMaterial({
          uniforms: {
            strength: { value: strength },
            tint: { value: new THREE.Color(color) },
          },
          vertexShader: `varying vec2 p;void main(){p=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `uniform float strength;uniform vec3 tint;varying vec2 p;void main(){float r=length(p)*2.;float a=exp(-r*r*5.5)*(1.-smoothstep(.6,1.,r))*strength;gl_FragColor=vec4(tint,a);}`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const sprite = new THREE.Mesh(
        geo(new THREE.PlaneGeometry(size, size)),
        spriteMaterial,
      );
      sprite.position.copy(moonPos);
      moonHalos.push(sprite);
      world.add(sprite);
      return spriteMaterial;
    };
    const haloInner = halo(moonRadius * 3.6, 0.34, "#f5d8a0");
    const haloOuter = halo(moonRadius * 7.5, 0.12, "#e1c69c");

    // ——— 星空 ———
    const starPositions: number[] = [],
      starSizes: number[] = [],
      starPhases: number[] = [],
      starColors: number[] = [],
      starLayers: number[] = [];
    const starPalette = [
      new THREE.Color("#e2ecf4"),
      new THREE.Color("#f6dcb8"),
      new THREE.Color("#b7e0dc"),
      new THREE.Color("#cfc6e6"),
      new THREE.Color("#ffffff"),
    ];
    // 天体分布不均：大部分星集中在银河带两侧，天顶相对稀疏。
    const starCount = Math.round((light ? 850 : vivid ? 3200 : 2400) * density);
    for (let i = 0; i < starCount; i++) {
      const banded = random() < 0.62;
      const az = random() * Math.PI * 2;
      const bandY = 0.36 + Math.cos(az) * 0.38;
      const y = banded
        ? bandY + (random() - 0.5) * 0.24
        : random() * 0.72 + 0.12;
      const radius = 540 + random() * 80;
      const elevation = Math.asin(THREE.MathUtils.clamp(y, -0.1, 1));
      const cosE = Math.cos(elevation);
      starPositions.push(
        Math.cos(az) * cosE * radius,
        Math.sin(elevation) * radius + 4,
        Math.sin(az) * cosE * radius - 34,
      );
      // 少数亮星带明显尺寸差，避免所有星点一样大。
      const bright = random() > 0.965;
      starSizes.push(bright ? 3.2 + random() * 2.6 : 0.7 + random() ** 3 * 1.7);
      starPhases.push(random() * 6.28);
      starLayers.push(bright ? 1 : 0);
      starColors.push(
        ...starPalette[Math.floor(random() * starPalette.length)]!.toArray(),
      );
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
    starsGeo.setAttribute(
      "bright",
      new THREE.Float32BufferAttribute(starLayers, 1),
    );
    starsGeo.setAttribute(
      "starTint",
      new THREE.Float32BufferAttribute(starColors, 3),
    );
    const starsMat = mat(
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          ratio: { value: renderer.getPixelRatio() },
        },
        vertexShader: `attribute float size;attribute float phase;attribute float bright;attribute vec3 starTint;varying float a;varying float starBright;varying vec3 tint;uniform float time;uniform float ratio;
        void main(){a=.35+.65*pow(.5+.5*sin(time*.7+phase*2.4),2.);starBright=bright;tint=starTint;
        gl_PointSize=size*ratio*(1.+bright*.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying float a;varying float starBright;varying vec3 tint;
        void main(){vec2 p=gl_PointCoord-.5;float r2=dot(p,p);float k=exp(-r2*26.);
        float rays=(exp(-abs(p.x)*60.)+exp(-abs(p.y)*60.))*exp(-length(p)*9.)*starBright*.55;
        float v=(k+rays)*a;if(v<.02)discard;gl_FragColor=vec4(tint,v);}`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    world.add(new THREE.Points(starsGeo, starsMat));

    // 平面山景共用纸纹，保留景深层次。
    addMountainBackdrop(world, resources, light);
    // 山谷薄雾：横贯地平线上的软带，衔接山脚与地面。
    const valleyMist = mat(
      new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform float time;varying vec2 p;
        void main(){
          float y = exp(-pow((p.y - .5) * 3.2, 2.));
          float waves = .55 + .45 * sin(p.x * 7. + time * .07 + sin(p.x * 17. - time * .05) * 1.8);
          float edge = smoothstep(0., .18, p.x) * (1. - smoothstep(.82, 1., p.x));
          gl_FragColor = vec4(.30, .31, .40, y * waves * edge * .3);
        }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const mist = new THREE.Mesh(
      geo(new THREE.PlaneGeometry(560, 45)),
      valleyMist,
    );
    mist.position.set(0, -6, -145);
    world.add(mist);

    const updateJourney = addGardenStarflow(world, resources, light);
    const updateGround = addStarGround(world, resources, light);
    const instrument = createCelestialInstrument(resources, light);
    instrument.group.position.copy(STAR_CENTER);
    group.add(instrument.group);

    // ——— 近景漂浮火星与星屑 ———
    const particlesCount = Math.round(
      (light ? 100 : vivid ? 420 : 300) * density,
    );
    const particlesGeo = geo(new THREE.BufferGeometry());
    const particlePositions = new Float32Array(particlesCount * 3),
      phases = new Float32Array(particlesCount),
      particleSizes = new Float32Array(particlesCount);
    for (let i = 0; i < particlesCount; i++) {
      // 一半星芒集中在游览的庭心，其他分散到近处、廊外和远空。
      const near = i % 2 === 0;
      particlePositions[i * 3] = (random() - 0.5) * (near ? 42 : 160);
      particlePositions[i * 3 + 1] = 1 + random() * (near ? 26 : 70);
      particlePositions[i * 3 + 2] = near
        ? -48 + random() * 68
        : -165 + random() * 195;
      phases[i] = random() * 6.28;
      particleSizes[i] = 0.55 + random() ** 2.4 * 1.25;
    }
    particlesGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    particlesGeo.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    particlesGeo.setAttribute(
      "size",
      new THREE.BufferAttribute(particleSizes, 1),
    );
    const particlesMat = mat(
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          ratio: { value: renderer.getPixelRatio() },
          focus: { value: 24 },
        },
        vertexShader: `attribute float phase;attribute float size;uniform float time;uniform float ratio;uniform float focus;varying float a;varying vec3 tint;varying float blur;
        void main(){
          vec3 p=position;
          p.x+=sin(time*.15+phase)*2.4;
          p.y=mod(p.y+time*(.14+.10*sin(phase)),72.);
          p.z+=cos(time*.11+phase)*1.8;
          vec4 v=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*v;
          blur=smoothstep(.7,2.,abs(-v.z-focus)/max(2.,-v.z));
          gl_PointSize=clamp(size*95.*ratio/max(2.,-v.z),2.*ratio,11.*ratio)*(1.+blur*.35);
          a=(.5+.5*pow(.5+.5*sin(time*.65+phase*2.),2.))*smoothstep(0.,2.,p.y)*(1.-smoothstep(65.,72.,p.y));
          tint=mix(vec3(.52,.88,1.),vec3(1.,.8,.42),.5+.5*sin(phase+time*.075));
        }`,
        fragmentShader: `varying float a;varying vec3 tint;varying float blur;void main(){vec2 p=abs(gl_PointCoord-.5)*2.;
        float shape=pow(sqrt(p.x)+sqrt(p.y),2.);
        float k=(1.-smoothstep(.54-blur*.16,1.+blur*.5,shape))*.9+exp(-dot(p,p)*9.)*.26;
        if(k*a<.025)discard;gl_FragColor=vec4(tint*1.5,k*a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const driftingStars = new THREE.Points(particlesGeo, particlesMat);
    driftingStars.name = "浮光 · 空中四芒星";
    driftingStars.frustumCulled = false;
    world.add(driftingStars);

    let width = 1,
      height = 1,
      time = 0,
      last = 0,
      frame = 0,
      scroll = 0,
      visible = !document.hidden;
    let renderedFrames = 0,
      measuredMs = 0,
      measuredIntervals = 0,
      intervalSamples = 0;
    let mx = 0,
      my = 0,
      px = 0,
      py = 0;
    const desiredCamera = new THREE.Vector3(),
      desiredLook = new THREE.Vector3(),
      // 由廊前推进庭心，再绕星仪侧上方游览，最后回望山月。
      cameraTrack = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 3.6, 1.4),
          new THREE.Vector3(0, 5, -4),
          new THREE.Vector3(-4.5, 7.5, -12),
          new THREE.Vector3(-5, 8.5, -14),
          new THREE.Vector3(2, 9.5, -9),
          new THREE.Vector3(5.5, 7.2, -5),
        ],
        false,
        "centripetal",
      ),
      focusTrack = new THREE.CatmullRomCurve3(
        [
          STAR_CENTER.clone(),
          STAR_CENTER.clone(),
          STAR_CENTER.clone(),
          STAR_CENTER.clone(),
          STAR_CENTER.clone(),
          STAR_CENTER.clone(),
        ],
        false,
        "centripetal",
      ),
      look = STAR_CENTER.clone();
    // 滚动区间各有独立时长，端点速度归零，回滚与前进使用同一映射。
    const stops = [0, 0.23, 0.46, 0.66, 0.84, 1];
    function journeyWeight(progress: number) {
      let segment = 0;
      while (segment < stops.length - 2 && progress > stops[segment + 1])
        segment++;
      const t = THREE.MathUtils.clamp(
        (progress - stops[segment]) / (stops[segment + 1] - stops[segment]),
        0,
        1,
      );
      const smooth = t * t * t * (t * (t * 6 - 15) + 10);
      return (segment + smooth) / (stops.length - 1);
    }
    let main = document.querySelector("main");
    let journeyLength = height;
    // 调试句柄：仅开发期用于逐层排查，生产构建不依赖它。
    if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV)
      (window as unknown as { __starrWorld?: unknown }).__starrWorld = {
        world,
        camera,
        renderer,
        children: world.children,
        cameraTrack,
        focusTrack,
        instrument: instrument.group,
        moon,
        journeyWeight,
      };
    const readScroll = () => {
      main = document.querySelector("main");
      journeyLength = main
        ? Math.max(1, main.scrollHeight - main.clientHeight)
        : height;
      scroll = main
        ? THREE.MathUtils.clamp(main.scrollTop / journeyLength, 0, 1)
        : 0;
    };
    camera.position.copy(cameraTrack.getPoint(0));
    function destination() {
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
      const progress = journeyWeight(home ? scroll : scroll * 0.55);
      cameraTrack.getPoint(progress, desiredCamera);
      focusTrack.getPoint(progress, desiredLook);
      if (!home) {
        // 非首屏各自偏移一点，并压低滚动带来的位移，让功能内容更好读。
        desiredCamera.x += side * 0.55;
        desiredCamera.y += memory ? 0.25 : heart ? -0.1 : 0.15;
        desiredCamera.z += sense ? 0.4 : 0.7;
        desiredLook.x += side * 0.25;
      }
    }
    const projectedInstrument = new THREE.Vector3();
    let diagnosticTime = -1;
    function draw(dt: number) {
      if (!reduced) time += dt * (vivid ? 1.3 : 1);
      updateJourney(reduced ? 0 : time, pixelRatio);
      updateGround(reduced ? 0 : time);
      px += (mx - px) * (reduced ? 1 : Math.min(1, dt * 2.6));
      py += (my - py) * (reduced ? 1 : Math.min(1, dt * 2.6));
      destination();
      // 指针视差只做轻微位移与旋转，不改变焦点中点。
      desiredCamera.x += px * 0.22;
      desiredCamera.y += py * 0.14;
      const damping = reduced ? 1 : 1 - Math.exp(-dt * 2.2);
      camera.position.lerp(desiredCamera, damping);
      look.lerp(desiredLook, damping);
      camera.lookAt(look);
      instrument.faceCamera(camera);
      instrument.update(
        time,
        dt,
        stateRef.current?.organism,
        stateRef.current?.energy ?? 80,
        reduced,
      );
      starsMat.uniforms.time.value =
        particlesMat.uniforms.time.value =
        valleyMist.uniforms.time.value =
          reduced ? 0 : time;
      (moon.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.7 + (reduced ? 0 : Math.sin(time * 0.22) * 0.02);
      // 视差：近处的辉光随镜头轻微反向偏移，远景几乎不动。
      haloInner.uniforms.strength.value = 0.34 + Math.sin(time * 0.19) * 0.025;
      haloOuter.uniforms.strength.value = 0.12 + Math.sin(time * 0.13) * 0.012;
      // 光晕始终面向实际相机，月面与银河处在同一个远天方位。
      for (const halo of moonHalos) halo.quaternion.copy(camera.quaternion);
      const focusDistance = camera.position.distanceTo(STAR_CENTER);
      particlesMat.uniforms.focus.value = focusDistance;
      if (depth) depth.render(world, focusDistance);
      else {
        renderer.info.reset();
        renderer.render(world, camera);
      }
      // 调试属性每秒最多更新十次，避免每帧字符串分配和 DOM 属性写入。
      if (time - diagnosticTime < 0.1 && dt !== 1 && dt !== 0) return;
      diagnosticTime = time;
      renderer.domElement.dataset.journeyProgress = scroll.toFixed(3);
      renderer.domElement.dataset.cameraPosition = camera.position
        .toArray()
        .map((n) => n.toFixed(2))
        .join(",");
      renderer.domElement.dataset.cameraSettled = String(
        camera.position.distanceTo(desiredCamera) < 0.045 &&
          look.distanceTo(desiredLook) < 0.045,
      );
      projectedInstrument.copy(instrument.group.position).project(camera);
      renderer.domElement.dataset.instrumentScreen = `${(((projectedInstrument.x + 1) * width) / 2).toFixed(1)},${(((1 - projectedInstrument.y) * height) / 2).toFixed(1)}`;
      renderer.domElement.dataset.drawCalls = String(
        renderer.info.render.calls,
      );
    }
    const frameInterval = () =>
      light || quality === "low" ? 1000 / 30 - 0.5 : 1000 / 60 - 0.5;
    let adaptiveChecks = 0;
    const tick = (t: number) => {
      frame = 0;
      if (!visible || reduced) return;
      if (t - last >= frameInterval()) {
        const started = performance.now();
        draw(Math.min(0.08, last ? (t - last) / 1000 : 0.016));
        measuredMs += performance.now() - started;
        // 浏览器被遮挡时可能仍报告 visible，却把帧回调限制到每秒一次。
        // 排除暂停间隔，不能将系统节流误判成显卡不足并持续降画质。
        if (last && t - last < 250) {
          measuredIntervals += t - last;
          intervalSamples++;
        }
        renderedFrames++;
        if (renderedFrames >= 72) {
          const average = measuredMs / renderedFrames;
          const interval = measuredIntervals / Math.max(1, intervalSamples);
          if (
            (average > 9 ||
              (intervalSamples >= 24 &&
                interval > (light ? 33.34 : 16.67) * 1.5)) &&
            quality !== "low" &&
            adaptiveChecks >= 1 &&
            pixelRatio > 0.7
          ) {
            pixelRatio = Math.max(0.7, pixelRatio - 0.1);
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(width, height);
            depth?.resize();
            starsMat.uniforms.ratio.value = particlesMat.uniforms.ratio.value =
              pixelRatio;
          }
          renderer.domElement.dataset.cpuSubmitMs = average.toFixed(2);
          renderer.domElement.dataset.frameIntervalMs = intervalSamples
            ? interval.toFixed(2)
            : "unavailable";
          renderer.domElement.dataset.pixelRatio = pixelRatio.toFixed(2);
          renderer.domElement.dataset.drawCalls = String(
            renderer.info.render.calls,
          );
          renderer.domElement.dataset.triangles = String(
            renderer.info.render.triangles,
          );
          renderer.domElement.dataset.points = String(
            renderer.info.render.points,
          );
          adaptiveChecks++;
          renderedFrames = 0;
          measuredMs = 0;
          measuredIntervals = 0;
          intervalSamples = 0;
        }
        last = t;
      }
      frame = requestAnimationFrame(tick);
    };
    function invalidate() {
      readScroll();
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
      depth?.resize();
      camera.aspect = width / height;
      camera.fov = width < 700 ? 84 : 72;
      // 投影中心对齐导航以下的可视区域，避免星仪因顶栏占高而偏上。
      const headerHeight =
        document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
      const scroller = document.querySelector("main");
      const gutter = scroller
        ? Math.max(0, scroller.offsetWidth - scroller.clientWidth)
        : 0;
      camera.setViewOffset(
        width,
        height,
        gutter / 2,
        -headerHeight / 2,
        width,
        height,
      );
      camera.updateProjectionMatrix();
      readScroll();
      draw(reduced ? 1 : 0);
      renderer.domElement.dataset.drawCalls = String(
        renderer.info.render.calls,
      );
      invalidate();
    };
    const pointer = (e: PointerEvent) => {
      mx = (e.clientX / width - 0.5) * 2;
      my = (0.5 - e.clientY / height) * 2;
    };
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.tagName === "MAIN") {
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
    const disposeObservatory = loadObservatory(
      world,
      renderer.domElement,
      invalidate,
    );
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
      const handle = window as unknown as {
        __starrWorld?: { world: THREE.Scene };
      };
      if (handle.__starrWorld?.world === world) delete handle.__starrWorld;
      disposeObservatory();
      depth?.dispose();
      for (const r of resources) r.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [motion, density, quality, systemReduced]);
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
