import { useState, useRef, type CSSProperties } from 'react';
import { AccessDialog, type AccessMode } from '../auth/AccessDialog';
import { useLocale } from '../locale-context';
import { Head } from '../components/Head';
import { HOME_ASSETS } from '../assets';
import { useHomeDict } from './useHomeDict';
import { OpeningHero } from './OpeningHero';
import { CreatorsSection, FeatureSection, IntroSection, ModesSection, StepsSection } from './HomeSections';
import { HomeFooter } from './HomeFooter';
import '../styles/home.css';

/**
 * 官网首页 v2：Figma「Echuu-Website」(2038:1044)。
 * 首屏是 corynorootbone 的 3D 开场（Opening-animation-01 → 04），
 * 之后是简介 / 三步 / 直播间体验 / 直播模式 / 创作者 / 内测与页脚。
 * 自带页头与页脚，不使用旧版 SiteHeader / SiteFooter。
 */
export function HomeV2() {
  const { locale, t } = useLocale();
  const [accessMode, setAccessMode] = useState<AccessMode | null>(null);
  const accessTrigger = useRef<HTMLElement | null>(null);
  const openAccess = (mode: AccessMode) => { accessTrigger.current = document.activeElement as HTMLElement; setAccessMode(mode); };
  const { h } = useHomeDict();
  const style = { '--hv-sky-bg': `url(${HOME_ASSETS.skyBg})` } as CSSProperties;
  return (
    <div className="hv" style={style}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs><filter id="hv-cool-art" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1.04 0 0 0 0   0 1.09 0 0 0   0 0 1.18 0 0   0 0 0 1 0" />
        </filter></defs>
      </svg>
      <Head locale={locale} htmlLang={t.htmlLang} title={h.meta.title} description={h.meta.description} path="" />
      <OpeningHero onLogin={() => openAccess('invite')} onBeta={() => openAccess('signup')} />
      <div className="hv-body">
        <IntroSection />
        <StepsSection />
        <FeatureSection />
        <ModesSection />
        <CreatorsSection />
      </div>
      <HomeFooter onBeta={() => openAccess('signup')} />
      <AccessDialog returnFocusRef={accessTrigger} mode={accessMode} onClose={() => setAccessMode(null)} onModeChange={setAccessMode} />
    </div>
  );
}
