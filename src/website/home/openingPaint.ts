import { useSyncExternalStore } from 'react';

/**
 * 「开场第一屏已经画上屏幕」信号：3D 开场 = 纸张被浏览器记为 LCP（见 DrawWingsPaper 的 waitForPaint）；
 * 静态首屏 / 3D 失败 = 立即。
 * 开场是不透明的全屏覆盖层，它下面的首屏 chrome、各区块、页脚在这之前都看不见，
 * 等这个信号再挂载，它们的图片、字体、视频才不会和纸张抢带宽（慢网下首屏会晚好几秒）。
 * 只会从 false 变成 true；整页刷新才会重置。
 */
let painted = false;
const listeners = new Set<() => void>();

export function markOpeningPainted() {
  if (painted) return;
  painted = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useOpeningPainted() {
  return useSyncExternalStore(subscribe, () => painted, () => painted);
}
