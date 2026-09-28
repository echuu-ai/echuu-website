/**
 * 在离屏 canvas 上复现 CSS 里的 SVG 调色滤镜。
 *
 * 截图走 canvas 2D，而 `ctx.filter` 里的 `url(#id)` 引用曾把导出的 PNG 整张画成透明
 * （源是 WebGL canvas 时尤其不可靠），所以不能指望它。这里把滤镜链拆成三段：url()
 * 之前的函数式滤镜、中间的 feComponentTransfer 曲线、之后的函数式滤镜；曲线改用
 * 像素级查找表自己算，前后两段仍交给原生 `ctx.filter`。
 *
 * 查找表的结果已和 Chrome 的 SVG 滤镜逐通道比对过，误差不超过 1/255，
 * 见 canvas-color-grade.test.ts。
 */

export type FilterChainParts = {
  /** url() 之前的函数式滤镜，可直接交给 ctx.filter。 */
  pre: string;
  /** feComponentTransfer 滤镜的 element id，没有则为 null。 */
  transferId: string | null;
  /** url() 之后的函数式滤镜。 */
  post: string;
};

export type TransferLuts = {
  r: Uint8ClampedArray | null;
  g: Uint8ClampedArray | null;
  b: Uint8ClampedArray | null;
  a: Uint8ClampedArray | null;
};

const URL_REFERENCE = /url\(\s*["']?(?:[^"')]*)#([^"')\s]+)["']?\s*\)/i;

/** 按第一个 url() 引用把滤镜链切成前后两段。多余的 url() 无法复现，直接丢弃。 */
export function splitFilterChain(chain: string): FilterChainParts {
  const normalized = (chain ?? '').trim();
  if (!normalized || normalized === 'none') return { pre: '', transferId: null, post: '' };

  const match = URL_REFERENCE.exec(normalized);
  if (!match) return { pre: cleanupFunctions(normalized), transferId: null, post: '' };

  const pre = normalized.slice(0, match.index);
  const post = normalized.slice(match.index + match[0].length);
  return {
    pre: cleanupFunctions(pre),
    transferId: match[1],
    post: cleanupFunctions(post),
  };
}

function cleanupFunctions(part: string) {
  return part
    .replace(new RegExp(URL_REFERENCE.source, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 把 blur 半径换算到输出分辨率，否则高 DPR 导出时模糊会明显偏弱。 */
export function scaleFilterBlur(filter: string, scale: number) {
  if (!filter || scale === 1) return filter;
  return filter.replace(
    /blur\(\s*([\d.]+)px\s*\)/gi,
    (_, radius: string) => `blur(${Number(radius) * scale}px)`,
  );
}

/**
 * 展开 feComponentTransfer `type="table"` 成 256 项查找表。
 * 规范：n = 值个数 - 1，k = floor(C*n)（C=1 时取 n-1），
 * C' = v[k] + (C*n - k) * (v[k+1] - v[k])。
 */
export function buildTransferLut(tableValues: string | null | undefined): Uint8ClampedArray | null {
  if (!tableValues) return null;
  const values = tableValues
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return null;

  const lut = new Uint8ClampedArray(256);
  // 单值表在规范里是常量函数。
  if (values.length === 1) {
    lut.fill(Math.round(clamp01(values[0]) * 255));
    return lut;
  }

  const n = values.length - 1;
  for (let i = 0; i < 256; i += 1) {
    const c = i / 255;
    const position = c * n;
    const k = Math.min(Math.floor(position), n - 1);
    const t = position - k;
    lut[i] = Math.round(clamp01(values[k] + t * (values[k + 1] - values[k])) * 255);
  }
  return lut;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** 判断这套查找表是否等价于恒等变换，是的话就不必走像素遍历。 */
export function isIdentityLuts(luts: TransferLuts) {
  const channels = [luts.r, luts.g, luts.b, luts.a];
  return channels.every((lut) => {
    if (!lut) return true;
    for (let i = 0; i < 256; i += 1) {
      if (Math.abs(lut[i] - i) > 1) return false;
    }
    return true;
  });
}

/** 读取页面里的 feComponentTransfer 滤镜，展开成逐通道查找表。 */
export function resolveTransferLuts(transferId: string, doc: Document = document): TransferLuts | null {
  const filterElement = doc.getElementById(transferId);
  if (!filterElement) return null;
  const read = (tag: string) => {
    const node = filterElement.querySelector(tag);
    if (!node) return null;
    // 只有 type="table" 能用查找表精确复现；identity/linear/gamma 走不到这里就当没有。
    const type = node.getAttribute('type');
    if (type && type !== 'table' && type !== 'discrete') return null;
    return buildTransferLut(node.getAttribute('tableValues'));
  };

  const luts: TransferLuts = {
    r: read('feFuncR'),
    g: read('feFuncG'),
    b: read('feFuncB'),
    a: read('feFuncA'),
  };
  if (!luts.r && !luts.g && !luts.b && !luts.a) return null;
  return luts;
}

/**
 * 逐像素套用查找表。
 * feComponentTransfer 作用在非预乘的 sRGB 分量上，和 ImageData 的语义一致，
 * 所以这里不需要额外的预乘/线性化转换。
 */
export function applyTransferLuts(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  luts: TransferLuts,
) {
  if (width <= 0 || height <= 0) return;
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const { r, g, b, a } = luts;
  for (let i = 0; i < data.length; i += 4) {
    if (r) data[i] = r[data[i]];
    if (g) data[i + 1] = g[data[i + 1]];
    if (b) data[i + 2] = b[data[i + 2]];
    if (a) data[i + 3] = a[data[i + 3]];
  }
  context.putImageData(image, 0, 0);
}
