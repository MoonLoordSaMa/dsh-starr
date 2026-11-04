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
  group.position.set(0, 6.4, -19);
  const frameMat = keep(
    new THREE.MeshStandardMaterial({
      color: "#c0a286",
      metalness: 0.87,
      roughness: 0.32,
      emissive: "#8b5d3b",
      emissiveIntensity: 0.22,
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
  for (let i = 0; i < (light ? 4 : 6); i++) {
    const orbit = new THREE.Group(),
      radius = 2.2 + i * 0.39;
    orbit.rotation.set(0.25 + i * 0.56, 0.3 + i * 0.78, i * 0.22);
    orbits.push(orbit);
    group.add(orbit);
    const rail = new THREE.Mesh(
      keep(
        new THREE.TorusGeometry(
          radius,
          i === 5 ? 0.045 : 0.022,
          5,
          96,
          Math.PI * (i % 2 ? 1.52 : 1.82),
        ),
      ),
      frameMat,
    );
    orbit.add(rail);
    const arc = new THREE.Mesh(
      keep(
        new THREE.TorusGeometry(
          radius + 0.055,
          0.018,
          4,
          76,
          Math.PI * (1.16 + (i % 3) * 0.13),
        ),
      ),
      arcMat,
    );
    arc.rotation.z = i * 1.7;
    orbit.add(arc);
  }
  const equator = new THREE.Group();
  equator.rotation.x = Math.PI * 0.39;
  group.add(equator);
  const tickGeometry = keep(new THREE.BoxGeometry(0.024, 0.14, 0.028));
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
  equator.add(ticks);
  const limb = new THREE.Mesh(
    keep(new THREE.TorusGeometry(4.58, 0.025, 4, 128, Math.PI * 1.8)),
    frameMat,
  );
  equator.add(limb);
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
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2,
      r = i % 2 ? 0.28 : 0.72;
    if (!i) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starShape.closePath();
  const coreMat = keep(
    new THREE.MeshStandardMaterial({
      color: "#ffedcb",
      emissive: "#f4be76",
      emissiveIntensity: 1.6,
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
      fragmentShader: `varying vec2 p;uniform float time;uniform vec3 tint;uniform float intensity;void main(){float r=length(p)*2.;float glow=exp(-r*r*9.);float ray=pow(max(0.,1.-abs(p.x)*12.),18.)*exp(-abs(p.y)*9.)+pow(max(0.,1.-abs(p.y)*12.),18.)*exp(-abs(p.x)*9.);float edge=1.-smoothstep(.7,1.,r);gl_FragColor=vec4(tint,(glow*.22+ray*.16)*edge*intensity);}`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(7, 7)), haloMat);
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
  const point = new THREE.Vector3();
  return {
    group,
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
      targetColor.set(organism?.emotions[0]?.color ?? "#f2bd8e");
      currentColor.lerp(targetColor, mix * 0.5);
      arcMat.uniforms.time.value = reduced ? 0 : time;
      arcMat.uniforms.speed.value = 0.2 + urgency * 0.65;
      arcMat.uniforms.tint.value.copy(currentColor);
      haloMat.uniforms.tint.value.copy(currentColor);
      haloMat.uniforms.intensity.value =
        0.5 +
        moodEnergy * 0.45 +
        (reduced ? 0 : Math.sin(time * (0.55 + urgency)) * 0.08);
      orbits.forEach((orbit, i) => {
        orbit.rotation.z =
          i * 0.22 +
          (reduced ? 0 : time * (i % 2 ? -0.022 : 0.031) * (1 + urgency));
        orbit.rotation.y =
          0.3 + i * 0.78 + (reduced ? 0 : Math.sin(time * 0.08 + i) * 0.18);
      });
      equator.rotation.z = reduced ? -0.2 : -0.2 - time * 0.018;
      core.rotation.y = reduced ? 0.2 : time * 0.24;
      core.rotation.z = reduced ? 0 : Math.sin(time * 0.2) * 0.15;
      core.position.y = reduced ? 0 : Math.sin(time * 0.65) * 0.12;
      sphere.rotation.y = reduced ? 0 : -time * 0.08;
      for (let i = 0; i < satellites.count; i++) {
        const orbit = orbits[i % orbits.length],
          radius = 2.2 + (i % orbits.length) * 0.39,
          speed =
            (i % 2 ? -1 : 1) * (0.1 + urgency * 0.18) * (1 + (i % 3) * 0.18);
        for (let j = 0; j < 18; j++) {
          const angle =
            i * 2.4 +
            (reduced ? 0 : time * speed) -
            j * 0.015 * Math.sign(speed);
          point
            .set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
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
