import type { CSSProperties } from 'react';
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
  const { h } = useHomeDict();
  const style = { '--hv-sky-bg': `url(${HOME_ASSETS.skyBg})` } as CSSProperties;
  return (
    <div className="hv" style={style}>
      <Head locale={locale} htmlLang={t.htmlLang} title={h.meta.title} description={h.meta.description} path="" />
      <OpeningHero />
      <div className="hv-body">
        <IntroSection />
        <StepsSection />
        <FeatureSection />
        <ModesSection />
        <CreatorsSection />
        <HomeFooter />
      </div>
    </div>
  );
}
