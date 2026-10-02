import { useEffect, type RefObject } from 'react';

/**
 * 首页「一屏一屏」入场：每个大区块（.hv-section / .hv-footer）进入视口时整体编排一次——
 * 标题揭开 → 导语、配图 → 卡片依次错开。具体动效在 styles/home-scenes.css。
 *
 * - 只用一个 IntersectionObserver，区块入场后即停止观察；动画全部是 CSS 过渡（opacity / translate / scale / clip-path）。
 * - 先由 JS 标成 pending 再隐藏：没有 JS、减少动态效果或不支持 IntersectionObserver 时内容直接可见。
 * - 不劫持滚动，正常滚动即可。
 */
export function useSceneReveal(rootRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const root = rootRef.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!root || reduce || typeof IntersectionObserver === 'undefined') return;
    const scenes = Array.from(root.querySelectorAll<HTMLElement>('.hv-section, .hv-footer'));
    for (const scene of scenes) scene.dataset.scene = 'pending';
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.scene = 'in';
          observer.unobserve(entry.target);
        }
      },
      // 区块露出约两成、且越过视口底部 12% 时才开始，保证动画在眼前发生
      { threshold: 0.18, rootMargin: '0px 0px -12% 0px' },
    );
    for (const scene of scenes) observer.observe(scene);
    return () => {
      observer.disconnect();
      for (const scene of scenes) delete scene.dataset.scene;
    };
  }, [rootRef]);
}
