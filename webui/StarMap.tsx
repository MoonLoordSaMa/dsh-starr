import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as THREE from "three";
import { ArrowLeft, Crosshair, RotateCcw } from "lucide-react";
import type { Memory, Link } from "./types";
import { kindColors, kindNames } from "./types";
import {
  decorativeStarTrails,
  layoutStarClusters,
  memoryWeight,
  randomFor,
  sampleClusterPosition,
  sampleStarGraph,
} from "./star-layout";

const vertex = `
attribute float starSize; attribute vec3 starColor; attribute float starIndex; attribute float starWeight;
varying vec3 tint; varying float emphasis; varying float pulse; varying float weight;
uniform float selected; uniform float hovered; uniform float ratio; uniform float time;
void main(){
  tint=starColor; weight=starWeight;
  emphasis=(abs(starIndex-selected)<.1||abs(starIndex-hovered)<.1)?1.:0.;
  pulse=.94+.06*sin(time*.8+starIndex*1.7);
  vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p;
  gl_PointSize=clamp(starSize*(1.+emphasis*.5)*ratio*23./max(3.,-p.z),5.,105.);
}`;
const fragment = `
varying vec3 tint; varying float emphasis; varying float pulse; varying float weight;
void main(){
  vec2 uv=gl_PointCoord-.5; float r=length(uv);
  float core=exp(-r*r*160.);
  float halo=exp(-r*r*26.)*(.12+.34*weight);
  float ray=(exp(-abs(uv.x)*145.)+exp(-abs(uv.y)*145.))*exp(-r*11.)*(.08+.3*weight);
  float a=core+halo+ray;
  float luminosity=mix(.22,1.,pow(weight,1.05));
  luminosity=mix(luminosity,1.,emphasis);
  if(a<.012)discard;
  gl_FragColor=vec4(mix(tint,vec3(1.),core*(.25+.5*weight)),a*pulse*luminosity);
}`;
const cloudVertex = `attribute vec3 tint; attribute float glow; attribute float diameter; varying vec3 color; varying float intensity; uniform float ratio; void main(){color=tint;intensity=glow;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(diameter*ratio*420./max(5.,-p.z),1.,650.);}`;
const cloudFragment = `varying vec3 color; varying float intensity; void main(){vec2 uv=gl_PointCoord-.5;float r=length(uv);float a=exp(-r*r*16.)*(1.-smoothstep(.33,.5,r))*intensity;if(a<.001)discard;gl_FragColor=vec4(color,a);}`;
const edgeVertex = `attribute vec3 edgeColor; attribute float progress; attribute float strength; varying vec3 tint; varying float along; varying float alpha; void main(){tint=edgeColor;along=progress;alpha=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const edgeFragment = `uniform float time; uniform float decoration; varying vec3 tint; varying float along; varying float alpha; void main(){float flow=pow(max(0.,sin((along-time*.075)*6.28318)),24.);float a=alpha*(.54+flow*.46);if(decoration>.5)a*=.24;gl_FragColor=vec4(mix(tint,vec3(.92,.96,1.),flow*.35),a);}`;
const dustVertex = `attribute vec3 color; varying vec3 tint; uniform float ratio; void main(){tint=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(70.*ratio/max(3.,-p.z),1.,6.);}`;
const dustFragment = `varying vec3 tint;void main(){float r=length(gl_PointCoord-.5);float a=exp(-r*r*28.)*.36;if(a<.01)discard;gl_FragColor=vec4(tint,a);}`;
const DEFAULT_AZIMUTH = 0.48;
const DEFAULT_POLAR = 1.04;
type View = {
  center: THREE.Vector3;
  radius: number;
  azimuth: number;
  polar: number;
};
type Controls = { back: () => void; home: () => void; recenter: () => void };

export default function StarMap({
  nodes,
  links,
  selected,
  onSelect,
  motion = "default",
  filter = "",
  onFilterChange,
}: {
  nodes: Memory[];
  links: Link[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  motion?: string;
  filter?: string;
  onFilterChange?: (kind: string) => void;
}) {
  const [internalFilter, setInternalFilter] = useState("");
  const activeFilter = onFilterChange ? filter : internalFilter;
  const ref = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  const filterRef = useRef(activeFilter);
  const callback = useRef(onSelect);
  const filterCallback = useRef(onFilterChange);
  const redrawRef = useRef<() => void>(() => {});
  const controls = useRef<Controls>({ back() {}, home() {}, recenter() {} });
  // 采样因选中邻居变化时，保留视角；仅替换星点数据，不重新从全景起飞。
  const savedView = useRef<{
    layout: ReturnType<typeof layoutStarClusters>;
    current: View;
    desired: View;
    parent: View | null;
    focus: string | null | undefined;
    filter: string | undefined;
    elapsed: number;
  } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const layout = useMemo(
    () => layoutStarClusters(nodes, Object.keys(kindColors)),
    [nodes],
  );
  const base = useMemo(() => sampleStarGraph(nodes, links), [nodes, links]);
  const sceneData = useMemo(() => {
    if (!selected) return base;
    const ids = new Set(base.nodes.map((node) => node.id));
    const neighbors = new Set(
      links
        .filter((edge) => edge.source === selected || edge.target === selected)
        .flatMap((edge) => [edge.source, edge.target]),
    );
    const priorities = nodes
      .filter((node) => neighbors.has(node.id))
      .sort((a, b) => memoryWeight(b) - memoryWeight(a))
      .slice(0, 80);
    if (ids.has(selected) && priorities.every((node) => ids.has(node.id)))
      return base;
    return sampleStarGraph(nodes, links, selected);
  }, [base, nodes, links, selected]);
  useEffect(() => {
    selectedRef.current = selected;
    redrawRef.current();
  }, [selected]);
  useEffect(() => {
    filterRef.current = activeFilter;
    redrawRef.current();
  }, [activeFilter]);
  useEffect(() => {
    callback.current = onSelect;
    filterCallback.current = onFilterChange;
  }, [onSelect, onFilterChange]);
  function chooseCategory(kind: string) {
    selectedRef.current = null;
    callback.current(null);
    filterRef.current = kind;
    if (filterCallback.current) filterCallback.current(kind);
    else setInternalFilter(kind);
    redrawRef.current();
  }
  const chooseRef = useRef(chooseCategory);
  chooseRef.current = chooseCategory;

  useEffect(() => {
    const el = ref.current!;
    const labels = labelsRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    setHover(null);
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, motion === "light" ? 1 : 1.6),
    );
    renderer.setClearColor(0, 0);
    el.prepend(renderer.domElement);
    const drawn = sceneData.nodes;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 250);
    const map = new Map(
      [...layout.positions].map(([id, p]) => [id, new THREE.Vector3(...p)]),
    );
    const nodeById = new Map(
      drawn.map((node, index) => [node.id, { node, index }]),
    );
    const weights = drawn.map(memoryWeight);
    const originalColors = drawn.map(
      (node) => new THREE.Color(kindColors[node.kind] ?? "#dae6ff"),
    );
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        drawn.flatMap((node) => map.get(node.id)!.toArray()),
        3,
      ),
    );
    geometry.setAttribute(
      "starColor",
      new THREE.Float32BufferAttribute(
        originalColors.flatMap((c) => c.toArray()),
        3,
      ),
    );
    geometry.setAttribute(
      "starSize",
      new THREE.Float32BufferAttribute(
        drawn.map(
          (node, i) => (9 + weights[i] ** 1.55 * 40) * (node.anchor ? 1.14 : 1),
        ),
        1,
      ),
    );
    geometry.setAttribute(
      "starIndex",
      new THREE.Float32BufferAttribute(
        drawn.map((_, i) => i),
        1,
      ),
    );
    geometry.setAttribute(
      "starWeight",
      new THREE.Float32BufferAttribute(weights, 1),
    );
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        selected: { value: -1 },
        hovered: { value: -1 },
        ratio: { value: renderer.getPixelRatio() },
        time: { value: 0 },
      },
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        layout.clusters.flatMap((group) => group.center),
        3,
      ),
    );
    cloudGeo.setAttribute(
      "tint",
      new THREE.Float32BufferAttribute(
        layout.clusters.flatMap((group) =>
          new THREE.Color(kindColors[group.kind] ?? "#dae6ff").toArray(),
        ),
        3,
      ),
    );
    cloudGeo.setAttribute(
      "glow",
      new THREE.Float32BufferAttribute(
        layout.clusters.map((group) => 0.018 + group.average ** 1.4 * 0.075),
        1,
      ),
    );
    cloudGeo.setAttribute(
      "diameter",
      new THREE.Float32BufferAttribute(
        layout.clusters.map((group) => group.radius * 2.3),
        1,
      ),
    );
    const cloudMat = new THREE.ShaderMaterial({
      vertexShader: cloudVertex,
      fragmentShader: cloudFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ratio: { value: renderer.getPixelRatio() } },
    });
    const clouds = new THREE.Points(cloudGeo, cloudMat);
    clouds.renderOrder = -1;
    scene.add(clouds);

    function makeEdges(
      edges: { source: string; target: string; weight?: number }[],
      decoration: boolean,
    ) {
      const positions: number[] = [],
        colors: number[] = [],
        progress: number[] = [],
        strengths: number[] = [];
      const ranges: {
        start: number;
        count: number;
        source: string;
        target: string;
        weight: number;
      }[] = [];
      for (const edge of edges) {
        const a = map.get(edge.source)!,
          b = map.get(edge.target)!;
        const random = randomFor(
          `${decoration ? "trail" : "relation"}:${edge.source}:${edge.target}`,
        );
        const delta = b.clone().sub(a);
        const bend =
          delta.length() * (0.16 + random() * 0.26) * (random() > 0.5 ? 1 : -1);
        const normal = new THREE.Vector3(-delta.y, delta.x, 0).normalize();
        const mid = a
          .clone()
          .add(b)
          .multiplyScalar(0.5)
          .addScaledVector(normal, bend);
        mid.z += (random() - 0.5) * delta.length() * 0.38;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const divisions = motion === "light" ? 12 : 22;
        const segments = curve.getPoints(divisions);
        const ca = originalColors[nodeById.get(edge.source)!.index],
          cb = originalColors[nodeById.get(edge.target)!.index];
        const start = positions.length / 3;
        for (let i = 1; i < segments.length; i++)
          for (const t of [i - 1, i]) {
            positions.push(...segments[t].toArray());
            colors.push(
              ...ca
                .clone()
                .lerp(cb, t / divisions)
                .toArray(),
            );
            progress.push(t / divisions);
            strengths.push(decoration ? 0.23 : 0.3);
          }
        ranges.push({
          start,
          count: divisions * 2,
          source: edge.source,
          target: edge.target,
          weight: Math.max(0, Math.min(1, edge.weight ?? 1)),
        });
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geo.setAttribute(
        "edgeColor",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      geo.setAttribute(
        "progress",
        new THREE.Float32BufferAttribute(progress, 1),
      );
      geo.setAttribute(
        "strength",
        new THREE.Float32BufferAttribute(strengths, 1),
      );
      const mat = new THREE.ShaderMaterial({
        vertexShader: edgeVertex,
        fragmentShader: edgeFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          decoration: { value: decoration ? 1 : 0 },
        },
      });
      scene.add(new THREE.LineSegments(geo, mat));
      return { geo, mat, ranges };
    }
    const relations = makeEdges(sceneData.links, false);
    const trails = makeEdges(
      decorativeStarTrails(drawn, sceneData.links),
      true,
    );
    const bg: number[] = [];
    const random = randomFor("atlas-background");
    for (let i = 0; i < (motion === "light" ? 240 : 1000); i++) {
      const theta = random() * Math.PI * 2,
        vertical = random() * 2 - 1,
        r = 25 + random() * 32,
        plane = Math.sqrt(1 - vertical * vertical);
      bg.push(
        Math.cos(theta) * plane * r,
        vertical * r * 0.8,
        Math.sin(theta) * plane * r,
      );
    }
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute("position", new THREE.Float32BufferAttribute(bg, 3));
    const bgMat = new THREE.PointsMaterial({
      color: "#b2b8e3",
      size: 0.028,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    scene.add(new THREE.Points(bgGeo, bgMat));

    // 稀疏记忆也有体积可辨的旋臂星尘；它们不参与拾取、关系与记忆计数。
    const dustPositions: number[] = [],
      dustColors: number[] = [];
    const dustKinds: string[] = [];
    const dustOriginal: THREE.Color[] = [];
    for (const group of layout.clusters) {
      for (let index = 0; index < (motion === "light" ? 35 : 100); index++) {
        dustPositions.push(
          ...sampleClusterPosition(group, `dust:${group.kind}:${index}`),
        );
        const tint = new THREE.Color(
          kindColors[group.kind] ?? "#dae6ff",
        ).multiplyScalar(0.55 + group.average * 0.45);
        dustColors.push(...tint.toArray());
        dustKinds.push(group.kind);
        dustOriginal.push(tint);
      }
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(dustPositions, 3),
    );
    dustGeo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(dustColors, 3),
    );
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: { ratio: { value: renderer.getPixelRatio() } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(dustGeo, dustMat));

    const allPoints = [...map.values()];
    const home = allPoints.length
      ? new THREE.Box3().setFromPoints(allPoints).getCenter(new THREE.Vector3())
      : new THREE.Vector3();
    const target = home.clone(),
      desired = home.clone();
    const ray = new THREE.Raycaster();
    ray.params.Points = { threshold: 0.36 };
    const pointer = new THREE.Vector2(2, 2);
    const reduced =
      motion === "reduced" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    let radius = 30,
      desiredRadius = 30,
      homeRadius = 30;
    let azimuth = DEFAULT_AZIMUTH,
      desiredAzimuth = azimuth,
      polar = DEFAULT_POLAR,
      desiredPolar = polar;
    let lookX = 0,
      lookY = 0,
      wantedX = 0,
      wantedY = 0;
    let down = false,
      moved = false,
      shifting = false,
      startX = 0,
      startY = 0,
      lastX = 0,
      lastY = 0;
    let hoverIndex = -1,
      frame = 0,
      last = 0,
      elapsed = 0,
      shown = true,
      active = !document.hidden,
      sized = false;
    let lastFocus: string | null | undefined,
      lastFilter: string | undefined,
      lastHighlight = "";
    let parentView: View | null = null;
    const saved =
      savedView.current?.layout === layout ? savedView.current : null;
    if (saved) {
      target.copy(saved.current.center);
      radius = saved.current.radius;
      azimuth = saved.current.azimuth;
      polar = saved.current.polar;
      desired.copy(saved.desired.center);
      desiredRadius = saved.desired.radius;
      desiredAzimuth = saved.desired.azimuth;
      desiredPolar = saved.desired.polar;
      parentView = saved.parent;
      lastFocus = saved.focus;
      lastFilter = saved.filter;
      elapsed = saved.elapsed;
    }
    let recenterTimer: ReturnType<typeof setTimeout> | undefined;
    let lastTick = 0;
    let topInset = 64;
    let sceneWidth = 1,
      sceneHeight = 1;
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: { distance: number; radius: number } | null = null;
    const projected = new THREE.Vector3();
    const labelButtons = Array.from(
      labels.querySelectorAll<HTMLButtonElement>("button"),
    );
    const labelOrder = layout.clusters.map((group, index) => ({
      group,
      index,
    }));
    let labelSizes = labelButtons.map((button) => ({
      width: button.offsetWidth,
      height: button.offsetHeight,
    }));

    function fit(
      points: THREE.Vector3[],
      center: THREE.Vector3,
      az = DEFAULT_AZIMUTH,
      po = DEFAULT_POLAR,
    ) {
      const forward = new THREE.Vector3().setFromSphericalCoords(1, po, az);
      const right = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), forward)
        .normalize();
      const up = new THREE.Vector3().crossVectors(forward, right).normalize();
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const tanH = tanV * camera.aspect;
      let distance = 10;
      for (const p of points) {
        const offset = p.clone().sub(center);
        distance = Math.max(
          distance,
          offset.dot(forward) +
            Math.max(
              Math.abs(offset.dot(right)) / tanH,
              Math.abs(offset.dot(up)) / tanV,
            ) *
              1.1,
        );
      }
      return distance;
    }
    function anchor() {
      const group = layout.clusters.find(
        (group) => group.kind === filterRef.current,
      );
      return (
        map.get(selectedRef.current ?? "") ??
        (group ? new THREE.Vector3(...group.center) : home)
      );
    }
    function restore(view: View) {
      desired.copy(view.center);
      desiredRadius = view.radius;
      desiredAzimuth = view.azimuth;
      desiredPolar = view.polar;
    }
    function snapshot(): View {
      return {
        center: desired.clone(),
        radius: desiredRadius,
        azimuth: desiredAzimuth,
        polar: desiredPolar,
      };
    }
    function recenter() {
      clearTimeout(recenterTimer);
      recenterTimer = undefined;
      if (!down && !pinch) {
        desired.copy(anchor());
        invalidate();
      }
    }
    function armRecenter() {
      clearTimeout(recenterTimer);
      recenterTimer = setTimeout(recenter, 1350);
    }
    controls.current = {
      back() {
        if (selectedRef.current) {
          selectedRef.current = null;
          callback.current(null);
        } else if (filterRef.current) chooseRef.current("");
        invalidate();
      },
      home() {
        clearTimeout(recenterTimer);
        selectedRef.current = null;
        filterRef.current = "";
        callback.current(null);
        chooseRef.current("");
        parentView = null;
        lastFocus = null;
        lastFilter = "";
        wantedX = wantedY = 0;
        restore({
          center: home,
          radius: homeRadius,
          azimuth: DEFAULT_AZIMUTH,
          polar: DEFAULT_POLAR,
        });
        invalidate();
      },
      recenter,
    };
    function updateHighlights(focus: string | null, category: string) {
      const hot = hoverIndex >= 0 ? drawn[hoverIndex].id : focus;
      const near = new Set(
        sceneData.links
          .filter((edge) => edge.source === hot || edge.target === hot)
          .flatMap((edge) => [edge.source, edge.target]),
      );
      const color = geometry.getAttribute("starColor") as THREE.BufferAttribute;
      drawn.forEach((node, index) => {
        const factor =
          category && node.kind !== category
            ? 0.15
            : hot && hot !== node.id && !near.has(node.id)
              ? 0.36
              : 1;
        const c = originalColors[index];
        color.setXYZ(index, c.r * factor, c.g * factor, c.b * factor);
      });
      color.needsUpdate = true;
      const glow = cloudGeo.getAttribute("glow") as THREE.BufferAttribute;
      layout.clusters.forEach((group, index) =>
        glow.setX(
          index,
          (0.018 + group.average ** 1.4 * 0.075) *
            (category && category !== group.kind ? 0.1 : 1),
        ),
      );
      glow.needsUpdate = true;
      const dustTint = dustGeo.getAttribute("color") as THREE.BufferAttribute;
      dustKinds.forEach((kind, index) => {
        const tint = dustOriginal[index],
          factor = category && category !== kind ? 0.12 : 1;
        dustTint.setXYZ(
          index,
          tint.r * factor,
          tint.g * factor,
          tint.b * factor,
        );
      });
      dustTint.needsUpdate = true;
      for (const edges of [relations, trails]) {
        const strength = edges.geo.getAttribute(
          "strength",
        ) as THREE.BufferAttribute;
        for (const edge of edges.ranges) {
          const a = nodeById.get(edge.source)!.node,
            b = nodeById.get(edge.target)!.node;
          const muted = category && a.kind !== category && b.kind !== category;
          const connected = edge.source === hot || edge.target === hot;
          const value = muted
            ? 0.025
            : hot
              ? connected
                ? 0.96
                : 0.045
              : 0.2 + edge.weight * 0.15;
          for (let index = edge.start; index < edge.start + edge.count; index++)
            strength.setX(index, value);
        }
        strength.needsUpdate = true;
      }
      el.dataset.view = focus ? "memory" : category ? "cluster" : "all";
    }
    function layoutLabels() {
      const width = sceneWidth,
        height = sceneHeight;
      const occupied: {
        x: number;
        y: number;
        width: number;
        height: number;
      }[] = [];
      const order = labelOrder.sort(
        (a, b) =>
          Number(b.group.kind === filterRef.current) -
          Number(a.group.kind === filterRef.current),
      );
      for (const { group, index } of order) {
        const button = labelButtons[index];
        if (!button) continue;
        projected.set(...group.label).project(camera);
        const size = labelSizes[index] ?? { width: 90, height: 26 };
        const x = Math.max(
          8,
          Math.min(
            width - size.width - 8,
            ((projected.x + 1) / 2) * width - size.width / 2,
          ),
        );
        let top = 0;
        const y = Math.max(
          topInset + 1,
          Math.min(height - size.height - 49, ((1 - projected.y) / 2) * height),
        );
        let valid =
          projected.z < 1 &&
          projected.z > -1 &&
          Math.abs(projected.x) < 1.1 &&
          Math.abs(projected.y) < 1.1;
        const found = [y, y - 30, y + 30, y - 60, y + 60, y - 90, y + 90].find(
          (candidate) => {
            top = candidate;
            return (
              candidate > topInset &&
              candidate + size.height < height - 48 &&
              !occupied.some(
                (o) =>
                  x < o.x + o.width + 8 &&
                  x + size.width > o.x - 8 &&
                  candidate < o.y + o.height + 6 &&
                  candidate + size.height > o.y - 6,
              )
            );
          },
        );
        valid = valid && found !== undefined;
        button.style.visibility = valid ? "visible" : "hidden";
        if (!valid) continue;
        button.style.transform = `translate(${x.toFixed(1)}px,${top.toFixed(1)}px)`;
        occupied.push({ x, y: top, ...size });
      }
    }
    function render(dt: number) {
      const focus = selectedRef.current,
        category = filterRef.current;
      if (category !== lastFilter) {
        lastFilter = category;
        parentView = null;
        const group = layout.clusters.find((group) => group.kind === category);
        desired.copy(group ? new THREE.Vector3(...group.center) : home);
        const members = drawn
          .filter((node) => node.kind === category)
          .map((node) => map.get(node.id)!);
        desiredRadius = group
          ? Math.min(
              homeRadius,
              fit(members, desired, desiredAzimuth, desiredPolar),
            )
          : homeRadius;
        if (focus) lastFocus = undefined;
      }
      if (focus !== lastFocus) {
        clearTimeout(recenterTimer);
        if (focus && map.has(focus)) {
          if (!lastFocus) parentView = snapshot();
          desired.copy(map.get(focus)!);
          desiredRadius = Math.max(7.5, Math.min(11, homeRadius * 0.52));
        } else if (lastFocus) {
          if (parentView) restore(parentView);
          else desired.copy(anchor());
          parentView = null;
        }
        lastFocus = focus;
      }
      const smoothing = reduced ? 1 : 1 - Math.exp(-dt * 7);
      target.lerp(desired, smoothing);
      radius += (desiredRadius - radius) * smoothing;
      azimuth += (desiredAzimuth - azimuth) * smoothing;
      polar += (desiredPolar - polar) * smoothing;
      lookX += ((reduced ? 0 : wantedX) - lookX) * smoothing;
      lookY += ((reduced ? 0 : wantedY) - lookY) * smoothing;
      camera.position
        .setFromSphericalCoords(radius, polar + lookY, azimuth + lookX)
        .add(target);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      if (!down) {
        ray.setFromCamera(pointer, camera);
        const hit = ray
          .intersectObject(points)
          .find(
            (hit) =>
              hit.index !== undefined &&
              (!category || drawn[hit.index].kind === category),
          );
        hoverIndex = hit?.index ?? -1;
        el.style.cursor = hoverIndex >= 0 ? "pointer" : "grab";
      }
      material.uniforms.selected.value = nodeById.get(focus ?? "")?.index ?? -1;
      material.uniforms.hovered.value = hoverIndex;
      const hovered = drawn[hoverIndex];
      const text = hovered
        ? `${hovered.title} · 权重 ${Math.round(weights[hoverIndex] * 100)}`
        : null;
      setHover((old) => (old === text ? old : text));
      const key = `${focus}:${hoverIndex}:${category}`;
      if (key !== lastHighlight) {
        lastHighlight = key;
        updateHighlights(focus, category);
      }
      elapsed += dt;
      material.uniforms.time.value =
        relations.mat.uniforms.time.value =
        trails.mat.uniforms.time.value =
          reduced ? 0 : elapsed;
      renderer.render(scene, camera);
      layoutLabels();
    }
    const tick = (time: number) => {
      frame = 0;
      if (!active || !shown) return;
      const moving =
        down ||
        target.distanceToSquared(desired) > 0.00001 ||
        Math.abs(radius - desiredRadius) +
          Math.abs(azimuth - desiredAzimuth) +
          Math.abs(polar - desiredPolar) +
          Math.abs(lookX - wantedX) +
          Math.abs(lookY - wantedY) >
          0.0003;
      const interval =
        motion === "light" ? (moving ? 32 : 62) : moving ? 16 : 42;
      if (time - last >= interval) {
        render(Math.min(0.1, lastTick ? (time - lastTick) / 1000 : 0.016));
        last = lastTick = time;
      }
      if (!reduced) frame = requestAnimationFrame(tick);
    };
    function invalidate() {
      if (reduced && active && shown) render(1);
    }
    redrawRef.current = invalidate;
    const resize = new ResizeObserver(() => {
      const b = el.getBoundingClientRect();
      sceneWidth = Math.max(1, b.width);
      sceneHeight = Math.max(1, b.height);
      renderer.setSize(sceneWidth, sceneHeight);
      camera.aspect = b.width / Math.max(1, b.height);
      camera.updateProjectionMatrix();
      homeRadius = fit(
        [
          ...allPoints,
          ...layout.clusters.map((group) => new THREE.Vector3(...group.label)),
        ],
        home,
      );
      labelSizes = labelButtons.map((button) => ({
        width: button.offsetWidth || 90,
        height: button.offsetHeight || 26,
      }));
      topInset = Math.max(
        64,
        (el.parentElement?.querySelector(".map-top")?.getBoundingClientRect()
          .height ?? 40) + 23,
      );
      if (!selectedRef.current && !filterRef.current)
        desiredRadius = homeRadius;
      if (!sized) {
        if (!saved) radius = desiredRadius = homeRadius;
        sized = true;
      }
      // 调整投影只重绘当前帧，不能把相机过渡推进一整秒。
      render(reduced ? 1 : 0);
    });
    resize.observe(el);
    const restart = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      active = !document.hidden;
      lastTick = 0;
      if (active && shown) {
        if (reduced) render(1);
        else frame = requestAnimationFrame(tick);
      } else clearTimeout(recenterTimer);
    };
    function updatePointer(e: PointerEvent) {
      const b = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        (-(e.clientY - b.top) / b.height) * 2 + 1,
      );
      wantedX = pointer.x * 0.065;
      wantedY = -pointer.y * 0.045;
    }
    const move = (e: PointerEvent) => {
      updatePointer(e);
      if (touches.has(e.pointerId))
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        desiredRadius = THREE.MathUtils.clamp(
          (pinch.radius * pinch.distance) /
            Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          5,
          homeRadius * 2,
        );
        invalidate();
        return;
      }
      if (down) {
        const dx = e.clientX - lastX,
          dy = e.clientY - lastY;
        if (shifting) {
          const worldPerPixel =
            (2 * radius * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
            Math.max(1, el.clientHeight);
          desired.addScaledVector(
            new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0),
            -dx * worldPerPixel,
          );
          desired.addScaledVector(
            new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1),
            dy * worldPerPixel,
          );
        } else {
          desiredAzimuth -= dx * 0.006;
          desiredPolar = THREE.MathUtils.clamp(
            desiredPolar - dy * 0.006,
            0.18,
            Math.PI - 0.18,
          );
        }
        lastX = e.clientX;
        lastY = e.clientY;
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5)
          moved = true;
      }
      invalidate();
    };
    const press = (e: PointerEvent) => {
      if (e.button !== 0) return;
      clearTimeout(recenterTimer);
      updatePointer(e);
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          radius: desiredRadius,
        };
        moved = true;
        down = false;
        return;
      }
      render(reduced ? 1 : 0);
      down = true;
      moved = false;
      shifting = e.shiftKey;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
    };
    const release = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
      const wasPinch = Boolean(pinch);
      if (touches.size < 2) pinch = null;
      if (down && !moved && e.type !== "pointercancel" && !wasPinch) {
        if (hoverIndex >= 0) callback.current(drawn[hoverIndex].id);
        else controls.current.back();
      }
      down = false;
      if (wasPinch) moved = true;
      armRecenter();
      invalidate();
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      desiredRadius = THREE.MathUtils.clamp(
        desiredRadius *
          Math.exp(THREE.MathUtils.clamp(e.deltaY, -160, 160) * 0.0018),
        5,
        homeRadius * 2,
      );
      armRecenter();
      invalidate();
    };
    const leave = () => {
      if (!down) {
        pointer.set(2, 2);
        wantedX = wantedY = 0;
        invalidate();
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("wheel", wheel, { passive: false });
    const observer = new IntersectionObserver((entries) => {
      shown = entries[0].isIntersecting;
      restart();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", restart);
    frame = requestAnimationFrame(tick);
    return () => {
      savedView.current = {
        layout,
        current: { center: target.clone(), radius, azimuth, polar },
        desired: snapshot(),
        parent: parentView,
        focus: lastFocus,
        filter: lastFilter,
        elapsed,
      };
      cancelAnimationFrame(frame);
      clearTimeout(recenterTimer);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", restart);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", press);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointercancel", release);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("wheel", wheel);
      for (const resource of [
        geometry,
        material,
        cloudGeo,
        cloudMat,
        relations.geo,
        relations.mat,
        trails.geo,
        trails.mat,
        bgGeo,
        bgMat,
        dustGeo,
        dustMat,
      ])
        resource.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      redrawRef.current = () => {};
    };
  }, [sceneData, layout, motion]);

  return (
    <div className="starmap-wrap">
      <div
        className="starmap"
        ref={ref}
        aria-label={`三维记忆星图，图中 ${sceneData.nodes.length} / 全库 ${nodes.length} 条记忆，${sceneData.links.length} 组真实关联`}
      />
      <div className="cluster-labels" ref={labelsRef} aria-label="星团分类">
        {layout.clusters.map((group) => (
          <button
            key={group.kind}
            type="button"
            className="cluster-label"
            style={
              {
                "--cluster-color": kindColors[group.kind] ?? "#dae6ff",
              } as CSSProperties
            }
            aria-pressed={activeFilter === group.kind}
            aria-label={`聚焦${kindNames[group.kind] ?? group.kind}星团，${group.count} 条记忆`}
            onClick={() => chooseCategory(group.kind)}
          >
            <i />
            {kindNames[group.kind] ?? group.kind}
            <small>{group.count}</small>
          </button>
        ))}
      </div>
      <div className="map-top">
        <span className="map-caption">
          {selected
            ? "拾忆一笺"
            : activeFilter
              ? `${kindNames[activeFilter] ?? activeFilter}星团`
              : "记忆全景"}
          <i />
          {sceneData.nodes.length < nodes.length
            ? `${sceneData.nodes.length} / ${nodes.length}`
            : nodes.length}{" "}
          颗记忆
        </span>
        <div className="map-controls">
          <button
            type="button"
            className="map-reset"
            disabled={!selected && !activeFilter}
            aria-label="返回上一级星图"
            onClick={() => controls.current.back()}
          >
            <ArrowLeft size={13} />
            溯流而上
          </button>
          <button
            type="button"
            className="map-reset"
            title="只回正位置，保留旋转与缩放"
            onClick={() => controls.current.recenter()}
          >
            <Crosshair size={13} />
            归于中天
          </button>
          <button
            type="button"
            className="map-reset"
            onClick={() => controls.current.home()}
          >
            <RotateCcw size={13} />
            万象
          </button>
        </div>
      </div>
      {!nodes.length && (
        <div className="map-empty">
          <span>星空已经准备好</span>
          <p>写下第一条记忆，让它有一个坐标</p>
        </div>
      )}
      {unavailable && (
        <div className="map-fallback">
          <p>当前设备不支持三维渲染，记忆仍可从下方选择</p>
        </div>
      )}
      <div className="map-bottom">
        <span title="轻移鼠标看视角，拖动旋转，Shift + 拖动平移，滚轮缩放；停手后只回正位置；点空白返回上一级">
          {hover ?? "拖动旋转 · Shift 平移 · 空白处返回上一级"}
        </span>
        <span
          className="weight-legend"
          title="亮度和星核大小对应当前召回权重；较暗星轨只为空间装饰"
        >
          <i />
          <i />
          <i />
          权重越高，星光越亮
        </span>
      </div>
      <div className="sr-only" aria-label="星图记忆列表">
        {nodes.map((n) => (
          <button key={n.id} onClick={() => onSelect(n.id)}>
            {kindNames[n.kind]}：{n.title}，权重 {n.score ?? n.importance}
          </button>
        ))}
      </div>
    </div>
  );
}
