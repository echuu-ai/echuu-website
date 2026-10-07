import { useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { PerformanceMonitor, type PerformanceMonitorApi } from '@react-three/drei';

/**
 * 掉帧时自动降低画布分辨率，跟得上再升回来；性能够的设备始终是满分辨率（画面不变）。
 * 判定：连续约 2.5 s 平均帧率低于 50（高刷屏）/ 45（60 Hz 屏）才降一档；高于上限才升一档；
 * 来回翻转 3 次后固定在最低档，避免画面反复变清晰又变糊。
 * enabled=false 时不测量、不改分辨率（首屏开场期间保持原画质，开场结束后才启用）。
 */
export function AdaptiveDpr({ max, min = 1, enabled = true }: { max: number; min?: number; enabled?: boolean }) {
  const setDpr = useThree((state) => state.setDpr);
  const top = Math.max(min, Math.min(max, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1));
  const apply = useCallback((api: PerformanceMonitorApi) => {
    setDpr(Math.round((min + (top - min) * api.factor) * 100) / 100);
  }, [min, setDpr, top]);
  const fallback = useCallback(() => setDpr(min), [min, setDpr]);
  if (!enabled) return null;
  return (
    <PerformanceMonitor
      factor={1}
      step={0.25}
      ms={250}
      iterations={10}
      flipflops={3}
      bounds={(refresh) => (refresh > 90 ? [50, 90] : [45, 58])}
      onChange={apply}
      onFallback={fallback}
    />
  );
}
