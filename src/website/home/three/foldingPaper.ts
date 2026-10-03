import * as THREE from 'three';

/**
 * 能真正折起来的纸：按经典纸飞机的折法切成每侧三块，用铰链层级连起来。
 *   ① 上角往中线折（角三角绕对角线翻 180°）
 *   ② 沿中线对折成 V（两半各绕中线转起来，龙骨在下）
 *   ③ 机翼往外翻平（外侧条带绕龙骨上缘转回水平）
 * 纸面本地坐标：中心为原点，x 向右，y 向图片上方（= 机头），z 朝纸的正面（= 机背朝上）。
 * UV 按纸面绝对坐标算，所以折起来以后图案（铅笔稿、观众画的翅膀）都跟着纸走。
 */
export type FoldingPaper = {
  root: THREE.Group;
  /** 三步折叠的进度，各 0–1 */
  setFold: (corner: number, valley: number, wings: number) => void;
  dispose: () => void;
};

/** 龙骨宽度占纸宽的比例（中线到机翼折痕） */
const KEEL = 0.17;
/** V 折与翻翼的角度（接近 90°，留一点开口更像真的纸飞机） */
const VALLEY_ANGLE = THREE.MathUtils.degToRad(82);

export function createFoldingPaper(material: THREE.Material, width: number, height: number): FoldingPaper {
  const W = width;
  const H = height;
  const k = W * KEEL;
  const geometries: THREE.BufferGeometry[] = [];

  /** 凸多边形（纸面坐标）→ 三角扇；顶点减去铰链原点，UV 用绝对坐标 */
  const polygon = (points: Array<[number, number]>, ox: number, oy: number) => {
    const position: number[] = [];
    const uv: number[] = [];
    for (let i = 1; i < points.length - 1; i += 1) {
      for (const [x, y] of [points[0], points[i], points[i + 1]]) {
        position.push(x - ox, y - oy, 0);
        uv.push(x / W + 0.5, y / H + 0.5);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    geometries.push(geometry);
    return new THREE.Mesh(geometry, material);
  };

  const root = new THREE.Group();
  const sides = [1, -1].map((s) => {
    const side = new THREE.Group();
    root.add(side);
    // 龙骨：中线到折痕，顶上斜边让给角三角
    side.add(polygon([[0, -H / 2], [s * k, -H / 2], [s * k, H / 2 - k], [0, H / 2]], 0, 0));
    // 机翼：折痕到外边
    const wing = new THREE.Group();
    wing.position.x = s * k;
    side.add(wing);
    wing.add(polygon([[s * k, -H / 2], [s * W / 2, -H / 2], [s * W / 2, H / 2 - W / 2], [s * k, H / 2 - k]], s * k, 0));
    // 角三角：铰链在上边中点，沿对角线翻到纸面上（略抬高一点，避免和下面的纸面打架）
    const corner = new THREE.Group();
    corner.position.set(0, H / 2, 0.002);
    side.add(corner);
    corner.add(polygon([[0, H / 2], [s * W / 2, H / 2], [s * W / 2, H / 2 - W / 2]], 0, H / 2));
    const axis = new THREE.Vector3(s, -1, 0).normalize();
    return { s, side, wing, corner, axis };
  });

  const setFold = (corner: number, valley: number, wings: number) => {
    for (const { s, side, wing, corner: c, axis } of sides) {
      c.quaternion.setFromAxisAngle(axis, s * Math.PI * 0.985 * corner);
      // 两半往正面（+z）立起来成 V，机翼再转回水平
      side.rotation.y = -s * VALLEY_ANGLE * valley;
      wing.rotation.y = s * VALLEY_ANGLE * wings;
    }
  };
  setFold(0, 0, 0);

  return {
    root,
    setFold,
    dispose: () => { for (const geometry of geometries) geometry.dispose(); },
  };
}
