import { getCursorSettings } from '../../lib/cursor-settings';
import { createPlaneSparkles } from './plane-sparkles';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const SIZE = 112;
const GUTTER = 40;

/** Small, isolated HDR render: studio chrome + alpha-aware highlight bloom. */
export async function createPaperPlaneRenderer(canvas: HTMLCanvasElement, url: string, resolution = 224) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false });
  renderer.setSize(resolution, resolution, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  const target = new THREE.WebGLRenderTarget(resolution, resolution, { type: THREE.HalfFloatType, samples: 4 });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-SIZE / 2, SIZE / 2, SIZE / 2, -SIZE / 2, 0.1, 200);
  camera.position.z = 60;
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#101722');
  const panelGeometry = new THREE.PlaneGeometry(1, 1);
  const panelMaterials: THREE.MeshBasicMaterial[] = [];
  const panel = (color: string, intensity: number, x: number, y: number, z: number, w: number, h: number) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    panelMaterials.push(material);
    const mesh = new THREE.Mesh(panelGeometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, 1);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
  };
  // Broad white softbox, long narrow strips and a cool rim produce liquid-silver reflections.
  panel('#ffffff', 6, -3, 4, 5, 3, 7);
  panel('#d8e8ff', 4, 4, 1, 3, 0.7, 9);
  panel('#ffffff', 5, 0, -4, 4, 7, 0.65);
  panel('#8eb9f2', 2, -4, 0, -2, 1, 6);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.025, 0.1, 30);
  scene.environment = environment.texture;
  panelGeometry.dispose();
  panelMaterials.forEach(material => material.dispose());
  pmrem.dispose();
  const material = new THREE.MeshPhysicalMaterial({
    color: '#e4edfa', metalness: 1, roughness: 0.17,
    clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.15,
  });
  const pivot = new THREE.Group();
  // Canvas includes a 40px transparent gutter for full rotation and bloom; keep the nose at the existing click hotspot.
  pivot.position.set(-SIZE / 2 + GUTTER + 1.5 * 30 / 42, SIZE / 2 - GUTTER - 1.3 * 30 / 42, 0);
  scene.add(pivot);
  const sparkles = createPlaneSparkles(scene);
  const sparkleOrigin = new THREE.Vector3();
  const sparkleOffset = new THREE.Vector3(10, -12, 4);
  let lastTime = performance.now(), sparkling = false;
  const composite = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { motionVector: { value: new THREE.Vector2() }, bloomStrength: { value: .22 }, source: { value: target.texture }, texel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) }, resolutionFactor: { value: resolution / SIZE * 0.6 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `
      uniform vec2 motionVector; uniform float bloomStrength; uniform sampler2D source; uniform vec2 texel; uniform float resolutionFactor; varying vec2 vUv;
      vec3 bright(vec2 p) { vec3 c=texture2D(source,p).rgb; return c * max(0., max(max(c.r,c.g),c.b)-1.25) / max(1.,max(max(c.r,c.g),c.b)); }
      vec3 tone(vec3 c) { return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.); }
      void main(){
        vec4 base=texture2D(source,vUv);
        // Keep a crisp nose and smear only behind the current velocity vector.
        vec4 streak=vec4(0.);
        for(int i=1;i<=6;i++) {
          float t=float(i)/6.;
          streak+=texture2D(source,vUv+motionVector*t)*(1.-t*.65)/3.725;
        }
        float amount=clamp(length(motionVector)*112./3.,0.,1.)*.38;
        base=mix(base,streak,amount);
        vec3 glow=vec3(0.);
        for(int y=-3;y<=3;y++) for(int x=-3;x<=3;x++) {
          vec2 d=vec2(float(x),float(y));
          float w=exp(-dot(d,d)/4.);
          glow+=bright(vUv+d*texel*(resolutionFactor))*w/12.25;
        }
        glow*=bloomStrength;
        // Preserve transparent corners; only luminous highlights contribute halo alpha.
        float halo=clamp(max(max(glow.r,glow.g),glow.b)*.45,0.,.45);
        float a=base.a+(1.-base.a)*halo;
        vec3 c=tone(base.rgb+glow);
        c=mix(12.92*c,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));
        gl_FragColor=vec4(c,a);
      }`,
  });
  const quad = new FullScreenQuad(composite);
  let model: THREE.Object3D | undefined;
  let disposed = false;
  let lastRoll = NaN;
  let lastPitch = NaN;
  let lastHeading = NaN;
  const draw = (roll = 0, pitch = 0, heading = 0, sparkle = 0, blurX = 0, blurY = 0) => {
    if (disposed || !model || renderer.getContext().isContextLost()) return;
    const now = performance.now();
    const dt = Math.min(.05, (now - lastTime) / 1000); lastTime = now;
    const motionChanged = Math.abs(composite.uniforms.motionVector.value.x - blurX / SIZE) > .00001 || Math.abs(composite.uniforms.motionVector.value.y + blurY / SIZE) > .00001;
    composite.uniforms.motionVector.value.set(blurX / SIZE, -blurY / SIZE);
    const wasSparkling = sparkling;
    const settings = getCursorSettings();
    const bloomChanged = composite.uniforms.bloomStrength.value !== settings.bloom;
    composite.uniforms.bloomStrength.value = settings.bloom;
    sparkleOrigin.copy(sparkleOffset).applyQuaternion(pivot.quaternion).add(pivot.position);
    sparkling = sparkles.update(now, dt, sparkleOrigin, sparkle * settings.sparkles, 14, camera);
    if (!motionChanged && !bloomChanged && !sparkling && !wasSparkling && (Math.abs(roll - lastRoll) < 0.002 && Math.abs(pitch - lastPitch) < 0.002 && Math.abs(heading - lastHeading) < 0.002)) return;
    lastRoll = roll; lastPitch = pitch; lastHeading = heading;
    pivot.rotation.order = 'ZYX';
    pivot.rotation.set(pitch * 0.3, roll * Math.PI / 180 * 0.6, -heading * Math.PI / 180);
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    quad.render(renderer);
  };
  const dispose = () => {
    disposed = true;
    model?.traverse(node => { if (node instanceof THREE.Mesh) node.geometry.dispose(); });
    sparkles.dispose(); material.dispose(); environment.dispose(); target.dispose(); composite.dispose(); quad.dispose(); renderer.dispose();
  };
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    model = gltf.scene;
    const oldMaterials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    model.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      for (const old of Array.isArray(node.material) ? node.material : [node.material]) {
        oldMaterials.add(old);
        for (const value of Object.values(old)) if (value instanceof THREE.Texture) textures.add(value);
      }
      node.material = material;
      // Bake the presentation angle once; the pivot remains exactly at the nose.
      node.geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI * 0.34));
      node.geometry.applyMatrix4(new THREE.Matrix4().makeRotationZ(-Math.PI / 4));
    });
    oldMaterials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    const bounds = new THREE.Box3().setFromObject(model);
    const extent = bounds.getSize(new THREE.Vector3());
    const scale = 28 / Math.max(extent.x, extent.y);
    // Original model's nose is near (-.95, .11, 0), identified from the GLB vertices.
    const nose = new THREE.Vector3(-0.95, 0.11, 0)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.34)
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4);
    model.position.copy(nose).multiplyScalar(-scale);
    model.scale.setScalar(scale);
    pivot.add(model);
    draw();
    return { draw, dispose };
  } catch (error) { dispose(); throw error; }
}
