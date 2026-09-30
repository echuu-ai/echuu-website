import { useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HomeHeader } from './HomeHeader';
import { HomeFooter } from './HomeFooter';
import { useHomeDict } from './useHomeDict';
import { Link } from '../components/Link';
import { LangInline } from '../components/LangInline';
import { websitePath } from '../router';
import { AccessDialog, type AccessMode } from '../auth/AccessDialog';

/** Reuse the homepage chrome without mounting its opening scene. */
export function TeamChrome({ children }: { children: ReactNode }) {
  const { locale, h } = useHomeDict();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accessMode, setAccessMode] = useState<AccessMode | null>(null);
  const accessTrigger = useRef<HTMLElement | null>(null);
  const menuTrigger = useRef<HTMLElement | null>(null);
  const home = websitePath(locale);
  const anchors = [['intro', '#intro'], ['steps', '#steps'], ['agent', '#feature'], ['creators', '#creators'], ['blog', '#blog'], ['beta', '#beta']] as const;
  return (
    <div className="hv team-chrome">
      <HomeHeader menuOpen={menuOpen} menuId="team-home-menu" onToggleMenu={() => {
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
        <Dialog.Content className="hv-menu-overlay" id="team-home-menu" aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); menuTrigger.current?.focus(); }}>
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
