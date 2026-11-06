import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** 用户观星楼按材质合并，坐标转换与比例已烘焙进资源。 */
export const STAR_CENTER = new THREE.Vector3(0, 8.12759857, -21);

export function loadObservatory(
  world: THREE.Scene,
  canvas: HTMLCanvasElement,
  invalidate: () => void,
) {
  let disposed = false;
  let model: THREE.Group | undefined;
  const release = (root: THREE.Object3D) => {
    const materials = new Set<THREE.Material>();
    const geometries = new Set<THREE.BufferGeometry>();
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        geometries.add(child.geometry);
        for (const material of Array.isArray(child.material)
          ? child.material
          : [child.material])
          materials.add(material);
      }
    });
    geometries.forEach((g) => g.dispose());
    const textures = new Set<THREE.Texture>();
    materials.forEach((m) => {
      for (const value of Object.values(m))
        if (value instanceof THREE.Texture) textures.add(value);
      m.dispose();
    });
    textures.forEach((t) => t.dispose());
  };
  canvas.dataset.observatory = "loading";
  new GLTFLoader().load(
    new URL("./scenes/qinglv-observatory.glb", document.baseURI).href,
    (gltf) => {
      if (disposed) {
        release(gltf.scene);
        return;
      }
      model = gltf.scene;
      model.name = "青绿观星楼 · 用户模型";
      model.position.set(0, 0, -21);
      world.add(model);
      canvas.dataset.observatory = "ready";
      invalidate();
    },
    undefined,
    () => {
      if (disposed) return;
      canvas.dataset.observatory = "unavailable";
      invalidate();
    },
  );
  return () => {
    disposed = true;
    if (model) {
      world.remove(model);
      release(model);
    }
  };
}
