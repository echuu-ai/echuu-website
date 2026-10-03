import { playInteractionSound } from '../lib/interactionSound';
/**
 * 「礼物投掷」卡片的点击彩蛋：从点击处炸出一把礼物（饭团 / 信封 / 包子 / 可颂），
 * 向上散开、带旋转，受重力落下并淡出，像直播间里观众扔礼物。
 * 用一层固定定位的覆盖层（不挡点击），全部 transform 动画；减少动态效果时不放。
 */

const COUNT = 18;
const LIFE_MS = 1600;
const GRAVITY = 2200; // px / s²

let layer: HTMLDivElement | null = null;

function ensureLayer() {
  if (layer && document.body.contains(layer)) return layer;
  layer = document.createElement('div');
  layer.className = 'hv-gift-burst';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

export function burstGifts(x: number, y: number, images: readonly string[]) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !images.length) return;
  playInteractionSound('gift');
  const host = ensureLayer();
  const items = Array.from({ length: COUNT }, (_, i) => {
    const img = document.createElement('img');
    img.src = images[i % images.length];
    img.alt = '';
    img.decoding = 'async';
    const size = 44 + Math.random() * 46;
    img.style.width = `${size}px`;
    host.appendChild(img);
    // 向上为主的扇形散开
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 700 + Math.random() * 900;
    return {
      img, size,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 720, rot: (Math.random() - 0.5) * 40,
      delay: Math.random() * 90,
    };
  });
  const start = performance.now();
  const frame = (now: number) => {
    const elapsed = now - start;
    let alive = false;
    for (const it of items) {
      const t = Math.max(0, elapsed - it.delay) / 1000;
      if (t * 1000 > LIFE_MS) { it.img.remove(); continue; }
      alive = true;
      const px = x + it.vx * t - it.size / 2;
      const py = y + it.vy * t + 0.5 * GRAVITY * t * t - it.size / 2;
      const fade = 1 - Math.max(0, (t * 1000 - LIFE_MS * 0.6) / (LIFE_MS * 0.4));
      const pop = Math.min(1, t * 8);
      it.img.style.transform = `translate3d(${px}px, ${py}px, 0) rotate(${it.rot + it.spin * t}deg) scale(${0.4 + 0.6 * pop})`;
      it.img.style.opacity = String(fade);
    }
    if (alive) requestAnimationFrame(frame);
    else for (const it of items) it.img.remove();
  };
  requestAnimationFrame(frame);
}
