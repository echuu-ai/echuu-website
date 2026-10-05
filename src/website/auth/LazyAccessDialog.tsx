import { lazy, Suspense, useEffect, useState, type ComponentProps } from 'react';
import type { AccessDialog as AccessDialogComponent } from './AccessDialog';

export type { AccessMode } from './AccessDialog';

const loadAccessDialog = () => import('./AccessDialog');
const AccessDialog = lazy(() => loadAccessDialog().then((m) => ({ default: m.AccessDialog })));

/**
 * 内测 / 登录弹窗按需加载：弹窗和它的入场动画库（motion）不进主入口块。
 * 第一次打开时才挂载（之后一直挂着，关闭由 Radix 的 open 控制）；页面空闲时预取，点击时代码通常已在缓存。
 */
export function LazyAccessDialog(props: ComponentProps<typeof AccessDialogComponent>) {
  const [mounted, setMounted] = useState(false);
  if (props.mode && !mounted) setMounted(true);

  useEffect(() => {
    let idle = 0;
    // 首屏（含开场纸张、3D 资源）先走，2.5 s 后再在空闲时预取
    const timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(() => { void loadAccessDialog(); }, { timeout: 3000 });
      else void loadAccessDialog();
    }, 2500);
    return () => {
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, []);

  return mounted ? <Suspense fallback={null}><AccessDialog {...props} /></Suspense> : null;
}
