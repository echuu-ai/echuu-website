import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * 官网平滑滚动（参考 Shopify Editions：桌面用 Lenis，手机保留原生滚动）。
 *
 * - 只在桌面精确指针 + 宽屏启用；减少动态效果时不启用。
 * - 开场锁滚（html.hv-lock）和任何打开的弹层期间暂停，弹层内部的滚动区域交还给原生滚动。
 * - 仍然驱动的是 window 原生滚动位置，依赖 window.scrollY 的效果（首屏切口、色散）不需要改。
 */
export function useSmoothScroll(page: string) {
  useEffect(() => {
    const enable = window.matchMedia?.('(pointer: fine) and (min-width: 900px)').matches
      && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!enable) return;

    const lenis = new Lenis({
      duration: 1,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      // Lenis 1.3 默认不自带动画循环，交给它自己的 rAF
      autoRaf: true,
      wheelMultiplier: 1,
      anchors: { offset: 0 },
      prevent: (node) => !!node.closest?.('[role="dialog"], .hv-fcards, textarea, [data-lenis-prevent]'),
    });

    if (import.meta.env.DEV) (window as Window & { __lenis?: Lenis }).__lenis = lenis;
    const root = document.documentElement;
    const syncLock = () => {
      const locked = root.classList.contains('hv-lock')
        || document.body.hasAttribute('data-scroll-locked')
        || !!document.querySelector('[role="dialog"][data-state="open"], [aria-modal="true"]');
      if (locked) lenis.stop();
      else lenis.start();
    };
    // Lenis 接管滚轮后会绕过弹层自己的锁滚，所以弹层打开（菜单、内测申请）时要显式暂停
    const observer = new MutationObserver(syncLock);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked', 'data-state'], childList: true, subtree: true });
    syncLock();

    return () => {
      observer.disconnect();
      lenis.destroy();
    };
    // 换页时重建，避免沿用上一页的目标位置
  }, [page]);
}
