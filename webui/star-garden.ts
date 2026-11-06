import * as THREE from "three";
import { gardenGroundHeight } from "./garden-detail";

type Resource = { dispose(): void };

export function addStarGarden(
  world: THREE.Scene,
  resources: Resource[],
  stoneTexture: THREE.Texture,
  light: boolean,
) {
  const own = <T extends Resource>(resource: T) => {
    resources.push(resource);
    return resource;
  };
  const garden = new THREE.Group();
  world.add(garden);
  const stone = own(
    new THREE.MeshStandardMaterial({
      color: "#526365",
      map: stoneTexture,
      bumpMap: stoneTexture,
      bumpScale: 0.055,
      roughness: 0.78,
      metalness: 0.2,
      flatShading: true,
    }),
  );
  const paleStone = own(
    new THREE.MeshStandardMaterial({
      color: "#aeb9af",
      map: stoneTexture,
      bumpMap: stoneTexture,
      bumpScale: 0.045,
      roughness: 0.62,
      metalness: 0.28,
      flatShading: true,
      emissive: "#263d3c",
      emissiveIntensity: 0.16,
    }),
  );
  const warmMetal = own(
    new THREE.MeshStandardMaterial({
      color: "#d7ae7f",
      metalness: 0.72,
      roughness: 0.3,
      emissive: "#865c3d",
      emissiveIntensity: 0.18,
    }),
  );
  const coolMetal = own(
    new THREE.MeshStandardMaterial({
      color: "#80b4b7",
      metalness: 0.62,
      roughness: 0.31,
      emissive: "#2e7477",
      emissiveIntensity: 0.23,
    }),
  );

  const makeTerrace = (
    radiusX: number,
    radiusZ: number,
    thickness: number,
    y: number,
    material: THREE.Material,
  ) => {
    const geometry = own(new THREE.CylinderGeometry(1, 1.025, thickness, 96));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(radiusX, 1, radiusZ);
    mesh.position.set(0, y, -20);
    garden.add(mesh);
    return mesh;
  };

  makeTerrace(11.2, 8.8, 0.58, -0.93, stone);
  makeTerrace(8.75, 6.85, 0.38, -0.52, paleStone);
  makeTerrace(6.45, 5.1, 0.33, -0.2, stone);

  const makeInlay = (
    radius: number,
    stretch: number,
    y: number,
    material: THREE.Material,
    start = 0,
    span = Math.PI * 2,
  ) => {
    const mesh = new THREE.Mesh(
      own(new THREE.TorusGeometry(radius, 0.035, 5, 100, span)),
      material,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.set(stretch, 1, 1);
    mesh.rotation.z = start;
    mesh.position.set(0, y, -20);
    garden.add(mesh);
  };
  makeInlay(10.6, 0.79, -0.62, warmMetal, 0.4, Math.PI * 1.54);
  makeInlay(8.3, 0.81, -0.31, coolMetal, -0.55, Math.PI * 1.72);
  makeInlay(6, 0.8, -0.015, warmMetal, 0.12, Math.PI * 1.5);

  const columnGeometry = own(new THREE.CylinderGeometry(0.36, 0.56, 1, 9, 1));
  const capitalGeometry = own(
    new THREE.CylinderGeometry(0.62, 0.49, 0.3, 9, 1),
  );
  const columnSites = light
    ? [
        [-10.7, -18, 8.2],
        [10.8, -20, 5.6],
        [-12.7, -29, 6.1],
        [12.4, -32, 9.6],
        [-8.6, -39, 4.8],
        [9.1, -41, 7.1],
      ]
    : [
        [-10.7, -18, 9.7],
        [10.8, -20, 6.6],
        [-12.7, -29, 7.4],
        [12.4, -32, 11.1],
        [-8.6, -39, 5.4],
        [9.1, -41, 8.3],
        [-15.3, -24, 5.6],
        [15.1, -37, 6.2],
      ];
  const columns = own(
    new THREE.InstancedMesh(columnGeometry, stone, columnSites.length),
  );
  const capitals = own(
    new THREE.InstancedMesh(capitalGeometry, paleStone, columnSites.length),
  );
  const dummy = new THREE.Object3D();
  const columnColors = ["#a2b2ab", "#d3b990", "#71999c", "#899fa4"].map(
    (color) => new THREE.Color(color),
  );
  for (const [index, [x, z, height]] of columnSites.entries()) {
    dummy.position.set(x, -0.8 + height / 2, z);
    dummy.rotation.set(0, index * 0.41, (index % 2 ? -1 : 1) * 0.025);
    dummy.scale.set(1, height, 1);
    dummy.updateMatrix();
    columns.setMatrixAt(index, dummy.matrix);
    columns.setColorAt(index, columnColors[index % columnColors.length]!);
    dummy.position.y = -0.8 + height;
    dummy.rotation.set(0, index * 0.41, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    capitals.setMatrixAt(index, dummy.matrix);
  }
  garden.add(columns, capitals);

  const archGeometry = own(
    new THREE.TorusGeometry(1, 0.045, 8, 78, Math.PI * 0.67),
  );
  const arches = [
    {
      x: -11.8,
      y: 6.4,
      z: -28,
      radius: 7.1,
      rotation: 0.23,
      material: warmMetal,
    },
    {
      x: 11.3,
      y: 7.7,
      z: -39,
      radius: 6.2,
      rotation: -0.31,
      material: coolMetal,
    },
  ];
  for (const arch of arches) {
    const mesh = new THREE.Mesh(archGeometry, arch.material);
    mesh.position.set(arch.x, arch.y, arch.z);
    mesh.rotation.set(Math.PI / 2, arch.rotation, arch.rotation);
    mesh.scale.setScalar(arch.radius);
    garden.add(mesh);
  }

  const poolMaterial = own(
    new THREE.MeshStandardMaterial({
      color: "#2c686c",
      metalness: 0.55,
      roughness: 0.22,
      emissive: "#1d6264",
      emissiveIntensity: 0.32,
      transparent: true,
      opacity: 0.82,
    }),
  );
  const poolGeometry = own(new THREE.CircleGeometry(1, 56));
  const pools = [
    { x: -12, z: -8.5, rx: 4.3, rz: 2.8 },
    { x: 12.6, z: -10.4, rx: 3.55, rz: 2.3 },
  ];
  for (const pool of pools) {
    const y = gardenGroundHeight(pool.x, pool.z) + 0.025;
    const surface = new THREE.Mesh(poolGeometry, poolMaterial);
    surface.rotation.x = -Math.PI / 2;
    surface.scale.set(pool.rx, pool.rz, 1);
    surface.position.set(pool.x, y, pool.z);
    garden.add(surface);
    for (const [index, radius] of [0.78, 0.93].entries()) {
      const ripple = new THREE.Mesh(
        own(new THREE.TorusGeometry(radius, 0.018, 4, 54)),
        index ? coolMetal : warmMetal,
      );
      ripple.rotation.x = Math.PI / 2;
      ripple.scale.set(pool.rx, pool.rz, 1);
      ripple.position.set(pool.x, y + 0.035 + index * 0.008, pool.z);
      garden.add(ripple);
    }
  }

  const shardGeometry = own(new THREE.OctahedronGeometry(0.8, 0));
  const shards = own(
    new THREE.InstancedMesh(shardGeometry, coolMetal, light ? 6 : 12),
  );
  for (let i = 0; i < shards.count; i++) {
    const side = i % 2 ? 1 : -1;
    dummy.position.set(
      side * (8 + (i % 3) * 1.3),
      3.8 + (i % 4) * 1.3,
      -14 - Math.floor(i / 2) * 5,
    );
    dummy.rotation.set(i * 0.32, i * 0.61, i * 0.25);
    dummy.scale.set(0.55 + (i % 3) * 0.18, 1.2 + (i % 2) * 0.4, 0.55);
    dummy.updateMatrix();
    shards.setMatrixAt(i, dummy.matrix);
    shards.setColorAt(
      i,
      i % 3 === 0 ? new THREE.Color("#dfba88") : new THREE.Color("#83b9bc"),
    );
  }
  garden.add(shards);

  return garden;
}
