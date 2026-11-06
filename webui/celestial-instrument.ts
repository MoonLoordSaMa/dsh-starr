import * as THREE from "three";
import type { Organism } from "../src/starrcore/organism";

export function createCelestialInstrument(
  resources: { dispose(): void }[],
  light: boolean,
) {
  const keep = <T extends { dispose(): void }>(value: T) => {
    resources.push(value);
    return value;
  };
  const group = new THREE.Group();
  group.name = "天枢 · 浑天刻度星仪";
  const frameMat = keep(
    new THREE.MeshStandardMaterial({
      color: "#e6bd72",
      metalness: 0.87,
      roughness: 0.32,
      emissive: "#8b5d3b",
      emissiveIntensity: 0.5,
    }),
  );
  const glowMat = keep(
    new THREE.MeshBasicMaterial({
      color: "#efc38a",
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const arcMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        tint: { value: new THREE.Color("#f2bd8e") },
        speed: { value: 0.25 },
      },
      vertexShader: `varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time;uniform float speed;uniform vec3 tint;varying vec2 p;void main(){float pulse=pow(.5+.5*cos(p.x*18.85-time*speed*4.),8.);gl_FragColor=vec4(tint,.22+pulse*.78);}`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const orbits: THREE.Group[] = [];
  const tracks: THREE.Group[] = [];
  for (let i = 0; i < (light ? 4 : 6); i++) {
    const orbit = new THREE.Group(),
      radius = 2.2 + i * 0.39;
    orbit.rotation.set(0.25 + i * 0.56, 0.3 + i * 0.78, i * 0.22);
    orbits.push(orbit);
    group.add(orbit);
    const track = new THREE.Group();
    orbit.name = `第${i + 1}环 · 环面转轴`;
    track.name = `第${i + 1}环 · 沿圆周运行`;
    orbit.add(track);
    tracks.push(track);
    const rail = new THREE.Mesh(
      keep(
        new THREE.TorusGeometry(
          radius,
          i === 5 ? 0.06 : 0.038,
          5,
          96,
          Math.PI * (i % 2 ? 1.52 : 1.82),
        ),
      ),
      frameMat,
    );
    track.add(rail);
    const arc = new THREE.Mesh(
      keep(
        new THREE.TorusGeometry(
          radius + 0.055,
          0.024,
          4,
          76,
          Math.PI * (1.16 + (i % 3) * 0.13),
        ),
      ),
      arcMat,
    );
    arc.rotation.z = i * 1.7;
    track.add(arc);
  }
  const equator = new THREE.Group();
  equator.rotation.x = Math.PI * 0.39;
  group.add(equator);
  const equatorTrack = new THREE.Group();
  equator.name = "外周 · 环面转轴";
  equatorTrack.name = "外周 · 刻度沿圆周运行";
  equator.add(equatorTrack);
  const tickGeometry = keep(new THREE.BoxGeometry(0.035, 0.14, 0.035));
  const ticks = keep(
      new THREE.InstancedMesh(tickGeometry, frameMat, light ? 72 : 144),
    ),
    dummy = new THREE.Object3D();
  const tickCount = ticks.count;
  for (let i = 0; i < tickCount; i++) {
    const angle = (i / tickCount) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 4.42, Math.sin(angle) * 4.42, 0);
    dummy.rotation.set(0, 0, angle - Math.PI / 2);
    dummy.scale.set(1, i % 12 === 0 ? 2.6 : i % 3 === 0 ? 1.45 : 0.75, 1);
    dummy.updateMatrix();
    ticks.setMatrixAt(i, dummy.matrix);
  }
  equatorTrack.add(ticks);
  const limb = new THREE.Mesh(
    keep(new THREE.TorusGeometry(4.58, 0.025, 4, 128, Math.PI * 1.8)),
    frameMat,
  );
  equatorTrack.add(limb);
  const lattice: number[] = [];
  for (let ring = 0; ring < 3; ring++)
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2,
        b = ((i + 1) / 60) * Math.PI * 2;
      const r = 1.25;
      for (const t of [a, b])
        lattice.push(
          r * Math.cos(t),
          r * Math.sin(t) * Math.cos((ring * Math.PI) / 3),
          r * Math.sin(t) * Math.sin((ring * Math.PI) / 3),
        );
    }
  const latticeGeo = keep(new THREE.BufferGeometry());
  latticeGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(lattice, 3),
  );
  const sphere = new THREE.LineSegments(
    latticeGeo,
    keep(
      new THREE.LineBasicMaterial({
        color: "#c9b2ad",
        transparent: true,
        opacity: 0.34,
      }),
    ),
  );
  group.add(sphere);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 2,
      r = i % 2 ? 0.25 : 1.125;
    if (!i) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starShape.closePath();
  const coreMat = keep(
    new THREE.MeshStandardMaterial({
      color: "#ffce54",
      emissive: "#ff8b09",
      emissiveIntensity: 4.8,
      metalness: 0.48,
      roughness: 0.26,
    }),
  );
  const core = new THREE.Mesh(
    keep(
      new THREE.ExtrudeGeometry(starShape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.065,
        bevelThickness: 0.06,
      }),
    ),
    coreMat,
  );
  core.position.z = -0.09;
  group.add(core);
  const haloMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        tint: { value: new THREE.Color("#e9bb91") },
        intensity: { value: 0.7 },
      },
      vertexShader: `varying vec2 p;void main(){p=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 p;uniform float time;uniform vec3 tint;uniform float intensity;void main(){float r=length(p)*2.;float glow=exp(-r*r*9.);float ray=pow(max(0.,1.-abs(p.x)*12.),18.)*exp(-abs(p.y)*9.)+pow(max(0.,1.-abs(p.y)*12.),18.)*exp(-abs(p.x)*9.);float edge=1.-smoothstep(.7,1.,r);gl_FragColor=vec4(tint,(glow*.42+ray*.6)*edge*intensity);}`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 9)), haloMat);
  core.name = "天枢 · 金色四芒星";
  const glow = new THREE.PointLight("#ffc75f", 36, 24, 2);
  group.add(glow);
  group.add(halo);
  const satellites = keep(
    new THREE.InstancedMesh(
      keep(new THREE.OctahedronGeometry(0.095)),
      glowMat,
      light ? 6 : 12,
    ),
  );
  group.add(satellites);
  const trailPositions = new Float32Array((light ? 6 : 12) * 18 * 3),
    trailColors = new Float32Array(trailPositions.length);
  const trailGeo = keep(new THREE.BufferGeometry());
  trailGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(trailPositions, 3),
  );
  trailGeo.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
  const trailMat = keep(
    new THREE.PointsMaterial({
      size: 0.048,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(new THREE.Points(trailGeo, trailMat));
  const currentColor = new THREE.Color("#f2bd8e"),
    targetColor = new THREE.Color();
  let urgency = 0.35,
    moodEnergy = 0.8;
  const point = new THREE.Vector3(),
    spinAxis = new THREE.Vector3(0, 0, 1);
  return {
    group,
    faceCamera(camera: THREE.Camera) {
      core.quaternion.copy(camera.quaternion);
      halo.quaternion.copy(camera.quaternion);
    },
    update(
      time: number,
      dt: number,
      organism: Organism | undefined,
      energy: number,
      reduced: boolean,
    ) {
      const mix = reduced ? 1 : 1 - Math.exp(-dt * 1.4);
      urgency += ((organism?.rhythm.urgency ?? 35) / 100 - urgency) * mix;
      moodEnergy += (energy / 100 - moodEnergy) * mix;
      targetColor
        .set("#f2ce8a")
        .lerp(
          new THREE.Color("#79cfe7"),
          reduced ? 0.25 : 0.5 + 0.5 * Math.sin(time * 0.055),
        );
      currentColor.lerp(targetColor, mix * 0.5);
      arcMat.uniforms.time.value = reduced ? 0 : time;
      arcMat.uniforms.speed.value = 0.2 + urgency * 0.65;
      arcMat.uniforms.tint.value.copy(currentColor);
      haloMat.uniforms.tint.value.set("#ffd16e");
      haloMat.uniforms.intensity.value =
        2.1 +
        moodEnergy * 0.6 +
        (reduced ? 0 : Math.sin(time * (0.55 + urgency)) * 0.08);
      orbits.forEach((orbit, i) => {
        // 父轴改变环面朝向，子轴绕环面法线自转，两种运动独立叠加。
        orbit.rotation.x =
          0.25 + i * 0.56 + (reduced ? 0 : Math.sin(time * 0.22 + i) * 0.22);
        orbit.rotation.z =
          i * 0.22 + (reduced ? 0 : time * (i % 2 ? -0.055 : 0.07));
        orbit.rotation.y =
          0.3 + i * 0.78 + (reduced ? 0 : Math.sin(time * 0.19 + i) * 0.28);
        tracks[i].rotation.z = reduced
          ? 0
          : time * (i % 2 ? -0.19 : 0.25) * (1 + urgency);
      });
      equator.rotation.y = reduced ? 0 : Math.sin(time * 0.17) * 0.18;
      equatorTrack.rotation.z = reduced ? -0.2 : -0.2 - time * 0.19;
      coreMat.emissiveIntensity = 4.5 + moodEnergy * 0.8;
      sphere.rotation.y = reduced ? 0 : -time * 0.15;
      for (let i = 0; i < satellites.count; i++) {
        const orbit = orbits[i % orbits.length],
          radius = 2.2 + (i % orbits.length) * 0.39,
          speed =
            (i % 2 ? -1 : 1) * (0.23 + urgency * 0.28) * (1 + (i % 3) * 0.18);
        for (let j = 0; j < 18; j++) {
          const angle =
            i * 2.4 +
            (reduced ? 0 : time * speed) -
            j * 0.015 * Math.sign(speed);
          point
            .set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
            .applyAxisAngle(spinAxis, tracks[i % tracks.length].rotation.z)
            .applyEuler(orbit.rotation);
          const index = (i * 18 + j) * 3;
          trailPositions[index] = point.x;
          trailPositions[index + 1] = point.y;
          trailPositions[index + 2] = point.z;
          const alpha = (1 - j / 18) ** 2;
          trailColors[index] = currentColor.r * alpha;
          trailColors[index + 1] = currentColor.g * alpha;
          trailColors[index + 2] = currentColor.b * alpha;
          if (!j) {
            dummy.position.copy(point);
            dummy.rotation.set(angle, i, time * 0.3);
            dummy.scale.setScalar(i % 3 === 0 ? 1.3 : 0.8);
            dummy.updateMatrix();
            satellites.setMatrixAt(i, dummy.matrix);
          }
        }
      }
      satellites.instanceMatrix.needsUpdate = true;
      trailGeo.attributes.position.needsUpdate =
        trailGeo.attributes.color.needsUpdate = true;
    },
  };
}
