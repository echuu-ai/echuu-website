import * as THREE from 'three';

/**
 * 首屏衔接切口用的可平铺 fbm 柏林噪声（灰度，0.5 为中值）。
 * 256²、周期 8、4 个八度，线性过滤 + 重复包裹：采样连续，切口用 fwidth 抗锯齿后很干净。
 */
export function createEdgeNoise(size = 256, period = 8): THREE.DataTexture {
  // 固定种子的置换表，保证每次加载切口形状一致
  let seed = 20261002;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];

  const grads = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const dot = (h: number, x: number, y: number) => grads[h & 7][0] * x + grads[h & 7][1] * y;

  // 周期性柏林噪声：格点按 period 取模，纹理四边可无缝平铺
  const perlin = (x: number, y: number, p: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const x0 = ((xi % p) + p) % p;
    const y0 = ((yi % p) + p) % p;
    const x1 = (x0 + 1) % p;
    const y1 = (y0 + 1) % p;
    const u = fade(xf);
    const v = fade(yf);
    const a = lerp(dot(perm[perm[x0] + y0], xf, yf), dot(perm[perm[x1] + y0], xf - 1, yf), u);
    const b = lerp(dot(perm[perm[x0] + y1], xf, yf - 1), dot(perm[perm[x1] + y1], xf - 1, yf - 1), u);
    return lerp(a, b, v);
  };

  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let value = 0;
      let amplitude = 0.5;
      let frequency = 1;
      let p = period;
      for (let octave = 0; octave < 4; octave++) {
        value += amplitude * perlin((x / size) * period * frequency, (y / size) * period * frequency, p);
        amplitude *= 0.5;
        frequency *= 2;
        p *= 2;
      }
      const byte = Math.max(0, Math.min(255, Math.floor((value + 1) * 0.5 * 255)));
      const o = (y * size + x) * 4;
      data[o] = byte;
      data[o + 1] = byte;
      data[o + 2] = byte;
      data[o + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
