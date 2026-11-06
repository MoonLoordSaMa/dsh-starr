import * as THREE from "three";
import { STAR_CENTER } from "./observatory-model";

type Resource = { dispose(): void };

/** 九道薄绸由连续曲面构成；顶点褶皱和顺流高光在 GPU 内更新。 */
export function addGardenStarflow(
  world: THREE.Scene,
  resources: Resource[],
  light: boolean,
) {
  const paths = [
    {
      tint: "#f5c778",
      width: 1.45,
      amplitude: 0.48,
      points: [
        [-26, 2, 16],
        [-14, 3, 7],
        [-16, 5, -2],
        [-10, 9, -9],
        [-3.6, 9.6, -16],
      ],
    },
    {
      tint: "#f1d295",
      width: 1.65,
      amplitude: 0.52,
      points: [
        [27, 3, 18],
        [16, 2, 6],
        [18, 6, -4],
        [10, 10, -11],
        [4, 10, -18],
      ],
    },
    {
      tint: "#ebdeb5",
      width: 1.25,
      amplitude: 0.38,
      points: [
        [0, 1.6, 25],
        [5, 2.2, 7],
        [-3, 3.8, -1],
        [1.2, 5, -11],
        [2.4, 7, -18],
      ],
    },
    {
      tint: "#ffe0a0",
      width: 3.7,
      amplitude: 1.1,
      points: [
        [-125, 83, -190],
        [-70, 57, -120],
        [-29, 30, -72],
        [-19, 18, -38],
        [-8, 13, -25],
      ],
    },
    {
      tint: "#d8d8bb",
      width: 3.9,
      amplitude: 1,
      points: [
        [130, 100, -210],
        [74, 60, -130],
        [32, 34, -77],
        [21, 19, -35],
        [9, 12, -24],
      ],
    },
    {
      tint: "#e6c6a7",
      width: 4.2,
      amplitude: 1.2,
      points: [
        [12, 106, -230],
        [-27, 79, -160],
        [9, 47, -95],
        [-12, 27, -49],
        [-5, 13, -31],
      ],
    },
    {
      tint: "#f3d9aa",
      width: 2.1,
      amplitude: 0.6,
      points: [
        [-90, 13, -34],
        [-51, 16, -44],
        [-30, 15, -25],
        [-15, 12, -21],
        [-6, 10, -20],
      ],
    },
    {
      tint: "#c9d5b0",
      width: 2.3,
      amplitude: 0.65,
      points: [
        [95, 15, -24],
        [58, 19, -39],
        [33, 16, -29],
        [17, 12, -19],
        [7, 10, -20],
      ],
    },
    {
      tint: "#f3e4be",
      width: 2.8,
      amplitude: 0.8,
      points: [
        [-44, 56, 8],
        [-30, 37, -8],
        [-11, 26, -20],
        [5, 19, -26],
        [4, 12, -24],
      ],
    },
  ];
  const steps = light ? 128 : 256,
    columns = light ? 6 : 10;
  const positions: number[] = [],
    normals: number[] = [],
    colors: number[] = [],
    phases: number[] = [],
    across: number[] = [],
    widths: number[] = [],
    amplitudes: number[] = [],
    indices: number[] = [];
  const seeds: number[] = [],
    pointColors: number[] = [],
    rows: number[] = [],
    pointWidths: number[] = [],
    pointAmps: number[] = [];
  const textureWidth = 256,
    data = new Float32Array(textureWidth * paths.length * 4);
  const up = new THREE.Vector3(0, 1, 0),
    normal = new THREE.Vector3();
  for (const [row, path] of paths.entries()) {
    const curve = new THREE.CatmullRomCurve3(
      [
        ...path.points.map(
          (p) => new THREE.Vector3(...(p as [number, number, number])),
        ),
        STAR_CENTER.clone(),
      ],
      false,
      "centripetal",
    );
    const color = new THREE.Color(path.tint),
      start = phases.length;
    for (let i = 0; i < textureWidth; i++)
      data.set(
        [...curve.getPoint(i / (textureWidth - 1)).toArray(), 1],
        (row * textureWidth + i) * 4,
      );
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        p = curve.getPoint(t);
      normal.crossVectors(curve.getTangent(t), up).normalize();
      for (let j = 0; j <= columns; j++) {
        positions.push(...p.toArray());
        normals.push(...normal.toArray());
        colors.push(...color.toArray());
        phases.push(t);
        across.push((j / columns) * 2 - 1);
        widths.push(path.width);
        amplitudes.push(path.amplitude);
        if (i < steps && j < columns) {
          const a = start + i * (columns + 1) + j,
            b = a + columns + 1;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    for (let i = 0; i < (light ? 14 : 30); i++) {
      seeds.push((i + 0.37) / (light ? 14 : 30));
      pointColors.push(...color.toArray());
      rows.push((row + 0.5) / paths.length);
      pointWidths.push(path.width);
      pointAmps.push(path.amplitude);
    }
  }
  const pathTexture = new THREE.DataTexture(
    data,
    textureWidth,
    paths.length,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  pathTexture.minFilter = pathTexture.magFilter = THREE.NearestFilter;
  pathTexture.needsUpdate = true;
  const elapsed = { value: 0 },
    ratio = { value: 1 };
  // 四根内庭柱（含螺旋金饰）在完整宽度和褶皱计算后避让。
  const deformation = `
    vec3 avoidColumn(vec3 p,vec2 center){
      vec2 delta=p.xz-center;float d=length(delta);
      float height=1.-smoothstep(8.5,11.,p.y);
      if(d<3.0){float safe=mix(2.35,d,smoothstep(2.1,3.,d));p.xz+=delta/max(d,.0001)*(safe-d)*height;}
      return p;
    }
    vec3 displace(vec3 p,vec3 n,float t,float u,float width,float amplitude){
      float taper=pow(max(0.,1.-t),.65)*smoothstep(0.,.045,t);
      float twist=sin(t*13.-elapsed*.42)*.7+sin(t*27.+elapsed*.26)*.22;
      vec3 side=n*cos(twist)+vec3(0.,1.,0.)*sin(twist);
      vec3 fold=-n*sin(twist)+vec3(0.,1.,0.)*cos(twist);
      float flutter=sin(t*23.-elapsed*.95)*amplitude;
      p+=side*(u*width+flutter)*taper;
      p+=fold*(sin(u*6.3+t*33.-elapsed*1.3)*width*.14+sin(t*16.-elapsed*.65)*amplitude*.55)*taper;
      p=avoidColumn(p,vec2(-7.57,-12.97));p=avoidColumn(p,vec2(7.57,-12.97));
      p=avoidColumn(p,vec2(-7.57,-29.03));p=avoidColumn(p,vec2(7.57,-29.03));
      return p;
    }`;
  const silkGeo = new THREE.BufferGeometry();
  for (const [key, array, size] of [
    ["position", positions, 3],
    ["flowNormal", normals, 3],
    ["flowColor", colors, 3],
    ["phase", phases, 1],
    ["across", across, 1],
    ["width", widths, 1],
    ["amplitude", amplitudes, 1],
  ] as const)
    silkGeo.setAttribute(key, new THREE.Float32BufferAttribute(array, size));
  silkGeo.setIndex(indices);
  const silkMat = new THREE.ShaderMaterial({
    uniforms: { elapsed },
    vertexShader: `attribute vec3 flowNormal;attribute vec3 flowColor;attribute float phase;attribute float across;attribute float width;attribute float amplitude;
      uniform float elapsed;varying vec3 tint;varying vec2 cloth;
      ${deformation}
      void main(){vec3 p=displace(position,flowNormal,phase,across,width,amplitude);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);tint=flowColor;cloth=vec2(phase,across);}`,
    fragmentShader: `uniform float elapsed;varying vec3 tint;varying vec2 cloth;
      void main(){float t=cloth.x;float u=cloth.y;
        float edge=1.-smoothstep(.72,1.,abs(u));
        float fold=.5+.5*sin(u*6.3+t*33.-elapsed*1.3);
        float sheen=pow(fold,7.);float wave=pow(.5+.5*cos(t*42.-elapsed*2.1+u*2.4),4.);
        float fiber=pow(.5+.5*sin(u*65.+sin(t*19.-elapsed)*1.3),14.);
        // 多层顺流光脉和掠过的四芒星写入现有绸面，不新增透明网格。
        float lane=u+sin(t*18.-elapsed*.55)*.10;
        float stream=pow(.5+.5*cos(t*96.-elapsed*6.8+u*2.),18.)*pow(.5+.5*cos(lane*19.),12.);
        vec2 cell=vec2(t*64.-elapsed*3.4,lane*5.);
        vec2 p=abs(fract(cell)-.5)*2.;
        float star=pow(max(0.,1.-pow(sqrt(p.x)+sqrt(p.y),2.)),2.);
        float trail=exp(-p.y*25.)*pow(max(0.,1.-p.x),2.5);
        float glints=(star*.95+trail*.45)*(.6+.4*sin(floor(cell.x)*2.4+floor(cell.y)*8.));
        float alpha=(.10+fold*.11+sheen*.22+wave*.11+fiber*.025+stream*.4+glints*.75)*edge*smoothstep(0.,.035,t)*(1.-smoothstep(.98,1.,t));
        gl_FragColor=vec4(mix(tint,vec3(1.,.77,.36),.35)*(.8+sheen*.55+wave*.16+stream*.9+glints*1.5),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(seeds.length * 3), 3),
  );
  for (const [key, array, size] of [
    ["seed", seeds, 1],
    ["flowColor", pointColors, 3],
    ["pathRow", rows, 1],
    ["width", pointWidths, 1],
    ["amplitude", pointAmps, 1],
  ] as const)
    pointGeo.setAttribute(key, new THREE.Float32BufferAttribute(array, size));
  const pointMat = new THREE.ShaderMaterial({
    uniforms: { elapsed, ratio, paths: { value: pathTexture } },
    vertexShader: `attribute float seed;attribute float pathRow;attribute float width;attribute float amplitude;attribute vec3 flowColor;
      uniform sampler2D paths;uniform float elapsed;uniform float ratio;varying vec3 tint;varying float alpha;
      ${deformation}
      vec3 samplePath(float t){float f=clamp(t,0.,1.)*255.;float i=floor(f);return mix(texture2D(paths,vec2((i+.5)/256.,pathRow)).xyz,texture2D(paths,vec2((min(i+1.,255.)+.5)/256.,pathRow)).xyz,fract(f));}
      void main(){float t=fract(seed+elapsed*(.075+pathRow*.023));vec3 p=samplePath(t);
        vec3 tangent=samplePath(min(1.,t+.004))-samplePath(max(0.,t-.004));vec3 n=normalize(cross(tangent,vec3(0.,1.,0.)));
        p=displace(p,n,t,sin(seed*71.)*.65,width,amplitude);vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
        gl_PointSize=clamp((90.+fract(seed*71.)*90.)*ratio/max(2.,-view.z),1.5*ratio,9.*ratio);
        alpha=smoothstep(0.,.04,t)*(1.-smoothstep(.97,1.,t));tint=flowColor;
      }`,
    fragmentShader: `varying vec3 tint;varying float alpha;void main(){vec2 p=abs(gl_PointCoord-.5)*2.;float star=pow(sqrt(p.x)+sqrt(p.y),2.);float a=1.-smoothstep(.62,1.,star);if(a*alpha<.025)discard;gl_FragColor=vec4(tint,a*alpha*.85);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const silk = new THREE.Mesh(silkGeo, silkMat),
    stars = new THREE.Points(pointGeo, pointMat);
  silk.name = "九川归星 · 丝绸光带";
  stars.name = "向天枢行进的四芒星流";
  silk.userData.paths = paths;
  silk.userData.grid = { steps, columns };
  silk.frustumCulled = stars.frustumCulled = false;
  world.add(silk, stars);
  resources.push(pathTexture, silkGeo, silkMat, pointGeo, pointMat);
  return (time: number, pixelRatio = 1) => {
    elapsed.value = time;
    ratio.value = pixelRatio;
  };
}
