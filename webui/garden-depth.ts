import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

/** 直接复用主场景深度，单次九点采样完成轻景深，避免再渲染整座建筑。 */
export function createGardenDepth(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: true,
    samples: 2,
  });
  target.texture.name = "星庭景深色彩";
  target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const uniforms = {
    colorMap: { value: target.texture },
    depthMap: { value: target.depthTexture },
    texel: { value: new THREE.Vector2(1, 1) },
    clips: { value: new THREE.Vector2(camera.near, camera.far) },
    focus: { value: 24 },
    strength: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform sampler2D colorMap;uniform sampler2D depthMap;
      uniform vec2 texel;uniform vec2 clips;uniform float focus;uniform float strength;varying vec2 vUv;
      float distanceAt(vec2 uv){float z=texture2D(depthMap,uv).x;return clips.x*clips.y/(clips.y-z*(clips.y-clips.x));}
      void main(){
        float distance=distanceAt(vUv);
        // 宽阔的清晰焦段保住星环；近处至多 2.8 像素，远山至多 1.45 像素。
        float relative=abs(distance-focus)/max(distance,1.);
        float coc=smoothstep(.23,.95,relative)*(distance<focus?2.8:1.45)*strength;
        vec3 c=texture2D(colorMap,vUv).rgb*4.;float weight=4.;
        for(int i=0;i<8;i++){
          float angle=float(i)*.785398163;
          vec2 uv=vUv+vec2(cos(angle),sin(angle))*texel*coc;
          // 深度突变处减弱跨边采样，避免金色星核和栏杆边缘晕到天空。
          float w=mix(.12,1.,1.-smoothstep(.12,.5,abs(distanceAt(uv)-distance)/max(distance,1.)));
          c+=texture2D(colorMap,uv).rgb*w;weight+=w;
        }
        gl_FragColor=vec4(c/weight,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const quad = new FullScreenQuad(material);
  const size = new THREE.Vector2();
  return {
    resize() {
      renderer.getDrawingBufferSize(size);
      target.setSize(size.x, size.y);
      uniforms.texel.value.set(1 / size.x, 1 / size.y);
    },
    render(world: THREE.Scene, focus: number, strength = 1) {
      uniforms.focus.value = focus;
      uniforms.strength.value = strength;
      renderer.info.reset();
      renderer.setRenderTarget(target);
      renderer.render(world, camera);
      renderer.setRenderTarget(null);
      quad.render(renderer);
    },
    dispose() {
      target.depthTexture?.dispose();
      target.dispose();
      material.dispose();
      quad.dispose();
    },
  };
}
