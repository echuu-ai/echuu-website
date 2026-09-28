import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { goWebsite } from '../router';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children: ReactNode };

/** 站内链接：真实 href 保证可右键新开与被抓取，点击走 app 既有的过渡导航。 */
export function Link({ to, children, onClick, ...rest }: Props) {
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        goWebsite(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
