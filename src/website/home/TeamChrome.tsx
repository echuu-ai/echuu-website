import type { ReactNode } from 'react';
import { SubpageChrome } from './SubpageChrome';

/** 团队页外壳：与其他子页共用 SubpageChrome；天空背景由团队页自己铺（team.css 的 .team-world）。 */
export function TeamChrome({ children }: { children: ReactNode }) {
  return <SubpageChrome className="team-chrome">{children}</SubpageChrome>;
}
