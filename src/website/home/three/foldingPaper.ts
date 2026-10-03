import * as THREE from 'three';

/**
 * 真的按纸飞机（dart）的折法折一张纸：纸面切成细网格，每一折都是「折痕一侧的顶点绕折痕旋转」。
 *   ① 上面两个角折到中线（角三角翻到正面）
 *   ② 新的斜边再折到中线一次，机头变尖、机身变长
 *   ③ 沿中线对折，龙骨朝下
 *   ④ 两侧机翼沿龙骨上缘翻回水平
 * 前两折完成后纸又是平的，所以每一折的「哪一侧要动」都在平面坐标里判断；③④ 是立体的，先翻翼再对折。
 * 顶点颜色按朝向做一点明暗，折痕在画面里读得出来；平铺时是纯白，和 DOM 纸一致。
 * 纸面本地坐标：中心为原点，x 向右，y 向图片上方（= 机头），z 朝纸的正面（= 机背朝上）。
 */
export type FoldingPaper = {
  mesh: THREE.Mesh;
  /** 四步折叠的进度，各 0–1；light 为纸面本地坐标里的光照方向（用来算折痕明暗） */
  setFold: (corners: number, nose: number, valley: number, wings: number, light?: THREE.Vector3) => void;
  dispose: () => void;
};

const COLS = 48;
const ROWS = 66;
/** 龙骨高度：第二折完成后中线到机翼折痕的距离（占纸宽） */
const KEEL = 0.11;
/** 对折与翻翼的角度：两半立到接近竖直，机翼翻回到略微上反 */
const VALLEY_ANGLE = THREE.MathUtils.degToRad(84);
const WING_ANGLE = THREE.MathUtils.degToRad(96);
/** 每多叠一层往正面抬一点，避免层与层打架 */
const LAYER = 0.0025;

type Hinge = { px: number; py: number; dx: number; dy: number };

/** 平面上的点关于直线做镜像 */
function reflect(x: number, y: number, h: Hinge): [number, number] {
  const rx = x - h.px;
  const ry = y - h.py;
  const along = rx * h.dx + ry * h.dy;
  return [h.px + 2 * along * h.dx - rx, h.py + 2 * along * h.dy - ry];
}
/** 点在直线的哪一侧（叉积符号） */
function sideOf(x: number, y: number, h: Hinge) {
  return (x - h.px) * h.dy - (y - h.py) * h.dx;
}

export function createFoldingPaper(material: THREE.Material, width: number, height: number): FoldingPaper {
  const W = width;
  const H = height;
  const geometry = new THREE.PlaneGeometry(W, H, COLS, ROWS);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const count = position.count;
  const flat = Float32Array.from(position.array as ArrayLike<number>);
  const colors = new Float32Array(count * 3).fill(1);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  // ① 角折：对角线，铰链过机头中点；② 鼻折：斜边与中线的角平分线，同样过机头
  const corner = [1, -1].map((s): Hinge => ({ px: 0, py: H / 2, dx: s / Math.SQRT2, dy: -1 / Math.SQRT2 }));
  const half = Math.PI / 8;
  const nose = [1, -1].map((s): Hinge => ({ px: 0, py: H / 2, dx: s * Math.sin(half), dy: -Math.cos(half) }));
  const k = W * KEEL;

  // 预先算好每个顶点在前两折完成后的平面坐标与层数（判断后面每一折归哪一侧）
  const stepA = new Float32Array(count * 2);
  const stepB = new Float32Array(count * 2);
  const inA = new Int8Array(count);
  const inB = new Int8Array(count);
  for (let i = 0; i < count; i += 1) {
    let x = flat[i * 3];
    let y = flat[i * 3 + 1];
    const s = x >= 0 ? 0 : 1;
    // 角三角：在对角线「外上方」的部分
    if (sideOf(x, y, corner[s]) * (s === 0 ? 1 : -1) < 0) {
      [x, y] = reflect(x, y, corner[s]);
      inA[i] = 1;
    }
    stepA[i * 2] = x;
    stepA[i * 2 + 1] = y;
    const t = x >= 0 ? 0 : 1;
    if (sideOf(x, y, nose[t]) * (t === 0 ? 1 : -1) < 0) {
      [x, y] = reflect(x, y, nose[t]);
      inB[i] = 1;
    }
    stepB[i * 2] = x;
    stepB[i * 2 + 1] = y;
  }

  const p = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const normal = new THREE.Vector3();
  const defaultLight = new THREE.Vector3(0.2, 0.3, 1).normalize();

  /** 绕平面内的铰链（z = 0）旋转一个点 */
  const rotateAbout = (h: Hinge, angle: number) => {
    pivot.set(h.px, h.py, 0);
    axis.set(h.dx, h.dy, 0);
    q.setFromAxisAngle(axis, angle);
    p.sub(pivot).applyQuaternion(q).add(pivot);
  };

  let last = '';
  const setFold = (a: number, b: number, c: number, d: number, light = defaultLight) => {
    // 平铺或停在同一状态时不用重算几千个顶点
    const key = a + b + c + d === 0 ? 'flat' : `${a},${b},${c},${d},${light.x.toFixed(2)},${light.y.toFixed(2)},${light.z.toFixed(2)}`;
    if (key === last) return;
    last = key;
    const arr = position.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const x0 = flat[i * 3];
      const y0 = flat[i * 3 + 1];
      p.set(x0, y0, 0);
      // ① 角折（翻到正面：沿铰链转 ±π）
      if (inA[i]) {
        const s = x0 >= 0 ? 1 : -1;
        rotateAbout(corner[x0 >= 0 ? 0 : 1], s * Math.PI * 0.985 * a);
        p.z += LAYER * a;
      }
      // ② 鼻折：只在①折完后才看得出来；被折的点（含已经叠在上面的角）绕第二条铰链转
      if (inB[i]) {
        if (a >= 0.999) p.set(stepA[i * 2], stepA[i * 2 + 1], inA[i] ? LAYER : 0);
        const s = stepA[i * 2] >= 0 ? 1 : -1;
        rotateAbout(nose[stepA[i * 2] >= 0 ? 0 : 1], s * Math.PI * 0.985 * b);
        p.z += LAYER * 2 * b;
      }
      // ③④ 在平面布局（前两折完成后）上做：先翻翼，再对折
      if (c > 0 || d > 0) {
        const bx = stepB[i * 2];
        const s = bx >= 0 ? 1 : -1;
        // 前两折都完成后用折好的平面坐标；否则沿用当前（只会发生在动画交界的一瞬）
        if (a >= 0.999 && b >= 0.999) p.set(bx, stepB[i * 2 + 1], (inA[i] ? LAYER : 0) + (inB[i] ? LAYER * 2 : 0));
        if (Math.abs(bx) > k && d > 0) {
          // 机翼：绕 x = ±k 的竖线转回来
          p.x -= s * k;
          p.applyAxisAngle(axis.set(0, 1, 0), s * WING_ANGLE * d);
          p.x += s * k;
        }
        // 对折：两半绕中线立起来（龙骨朝下）
        p.applyAxisAngle(axis.set(0, 1, 0), -s * VALLEY_ANGLE * c);
      }
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    // 折痕明暗：朝光的面亮，侧过去的面暗一点；平铺时 = 1（纯白，与 DOM 纸一致）
    const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const folding = Math.max(a, b, c, d);
    for (let i = 0; i < count; i += 1) {
      normal.fromBufferAttribute(normals, i);
      const lit = 0.72 + 0.28 * Math.abs(normal.dot(light));
      const shade = 1 - (1 - lit) * Math.min(1, folding * 3);
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade;
      colors[i * 3 + 2] = shade;
    }
    (geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    geometry.computeBoundingSphere();
  };
  setFold(0, 0, 0, 0);

  return { mesh, setFold, dispose: () => geometry.dispose() };
}
