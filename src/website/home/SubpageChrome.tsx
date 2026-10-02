import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HomeHeader } from './HomeHeader';
import { HomeFooter } from './HomeFooter';
import { useHomeDict } from './useHomeDict';
import { Link } from '../components/Link';
import { LangInline } from '../components/LangInline';
import { websitePath } from '../router';
import { AccessDialog, type AccessMode } from '../auth/AccessDialog';
import { HOME_ASSETS } from '../assets';
import '../styles/subpage.css';

/**
 * 官网子页统一外壳：首页同款页头、菜单弹层、内测入口与页脚，不挂开场 3D。
 * 除首页外的每个页面都必须经过它（见 index.tsx），不再有旧版 SiteHeader / SiteFooter。
 *
 * - `world`：铺一层固定的模糊天空背景（团队页自带背景，不需要）。
 * - 页面内容由调用方决定是否放进浅色纸面（`.subpage-sheet`），旧版浅底排版在纸面上保持可读。
 */
export function SubpageChrome({ children, className, world = false }: { children: ReactNode; className: string; world?: boolean }) {
  const { locale, h } = useHomeDict();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accessMode, setAccessMode] = useState<AccessMode | null>(null);
  const accessTrigger = useRef<HTMLElement | null>(null);
  const menuTrigger = useRef<HTMLElement | null>(null);
  const home = websitePath(locale);
  const menuId = `${className}-menu`;
  const anchors = [['intro', '#intro'], ['steps', '#steps'], ['agent', '#feature'], ['creators', '#creators'], ['blog', '#blog'], ['beta', '#beta']] as const;
  return (
    <div className={`hv ${className}`}>
      {world ? <div className="subpage-world" aria-hidden="true" style={{ '--hv-sky-bg': `url(${HOME_ASSETS.skyBg})` } as CSSProperties} /> : null}
      <HomeHeader menuOpen={menuOpen} menuId={menuId} onToggleMenu={() => {
        menuTrigger.current = document.activeElement as HTMLElement;
        setMenuOpen(!menuOpen);
      }} />
      {children}
      <HomeFooter onBeta={() => {
        accessTrigger.current = document.activeElement as HTMLElement;
        setAccessMode('signup');
      }} />
      <AccessDialog mode={accessMode} onClose={() => setAccessMode(null)} onModeChange={setAccessMode} returnFocusRef={accessTrigger} />
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Content className="hv-menu-overlay" id={menuId} aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); menuTrigger.current?.focus(); }}>
          <Dialog.Title className="team-menu-title">{h.header.menu}</Dialog.Title>
          <Dialog.Close className="hv-menu-overlay__close" aria-label={h.header.close}>×</Dialog.Close>
          <nav aria-label={h.header.menu}>
            {anchors.map(([key, hash]) => <Link key={key} to={`${home}${hash}`} onClick={() => setMenuOpen(false)}>{h.menu[key]}</Link>)}
            <Link to={websitePath(locale, 'team')} onClick={() => setMenuOpen(false)}>{h.menu.team}</Link>
          </nav>
          <div className="hv-menu-overlay__lang"><LangInline locale={locale} label={h.header.language} /></div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
