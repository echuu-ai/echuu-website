import * as THREE from 'three';

/** Small pooled blue-white glints, shared by the pointer renderer and world-space flight. */
export function createPlaneSparkles(parent: THREE.Object3D) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const particles = Array.from({ length: 14 }, () => {
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, toneMapped: false,
      uniforms: { opacity: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float opacity;
        void main(){
          vec2 p=abs(vUv-.5)*2.;
          float horizontal=exp(-p.y*32.)*pow(max(0.,1.-p.x),.9);
          float vertical=exp(-p.x*32.)*pow(max(0.,1.-p.y),.9);
          float core=exp(-dot(p,p)*95.);
          float halo=exp(-dot(p,p)*10.)*.24;
          float rays=max(horizontal,vertical);
          float a=clamp(rays*1.4+core+halo,0.,1.)*opacity;
          vec3 color=mix(vec3(.22,.56,1.),vec3(.91,.98,1.),clamp(rays+core,0.,1.));
          gl_FragColor=vec4(color*2.2,a);
        }`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 6;
    parent.add(mesh);
    return { mesh, material, age: 1, life: .5, size: 1, drift: new THREE.Vector3() };
  });
  let cursor = 0, lastEmission = -Infinity;
  const offset = new THREE.Vector3();
  return {
    update(now: number, dt: number, origin: THREE.Vector3, strength: number, size: number, camera: THREE.Camera) {
      let alive = false;
      if (strength > .04 && now - lastEmission > 75 + 90 * (1 - strength)) {
        lastEmission = now;
        const p = particles[cursor++ % particles.length];
        const angle = cursor * 2.39996;
        offset.set(Math.cos(angle) * size * 1.15, Math.sin(angle) * size * .85, size * .12).applyQuaternion(camera.quaternion);
        p.mesh.position.copy(origin).add(offset);
        p.drift.copy(offset).multiplyScalar(.28);
        p.age = 0; p.life = .6 + (cursor % 3) * .12;
        p.size = 1.65 * size * (.65 + (cursor % 4) * .18) * (.75 + strength * .25);
      }
      for (const p of particles) {
        p.age += dt;
        const t = p.age / p.life;
        p.mesh.visible = t < 1;
        if (!p.mesh.visible) continue;
        alive = true;
        p.mesh.position.addScaledVector(p.drift, dt);
        p.mesh.quaternion.copy(camera.quaternion);
        const envelope = Math.sin(Math.PI * t) ** .85;
        p.mesh.scale.setScalar(p.size * (.75 + envelope * .35));
        p.material.uniforms.opacity.value = envelope;
      }
      return alive;
    },
    clear() { for (const p of particles) { p.age = p.life; p.mesh.visible = false; } },
    dispose() { geometry.dispose(); for (const p of particles) { parent.remove(p.mesh); p.material.dispose(); } },
  };
}
