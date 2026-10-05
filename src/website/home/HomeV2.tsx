import { lazy, Suspense, useState, useRef, type CSSProperties } from 'react';
import { AccessDialog, type AccessMode } from '../auth/AccessDialog';
import { useLocale } from '../locale-context';
import { Head } from '../components/Head';
import { HOME_ASSETS } from '../assets';
import { useHomeDict } from './useHomeDict';
import { OpeningHero } from './OpeningHero';
import { CreatorsSection, FeatureSection, IntroSection, ModesSection, StepsSection } from './HomeSections';
import { HomeFooter } from './HomeFooter';
import { AnswersSection } from './AnswersSection';
import { BlogSection } from './BlogSection';
import { useSceneReveal } from './useSceneReveal';
import { HeroGuideLines } from './HeroGuideLines';
import { PageDoodle } from './PageDoodle';
import { useOpeningPainted } from './openingPaint';
import '../styles/home.css';
import '../styles/home-scenes.css';

// 开发用调节面板：只在 dev 且地址带 ?tune=seam（切口）或 ?tune=logo（logo 调色）/ ?tune=grade（3D 调色）时加载，正式构建里整段被裁掉
const SeamTuningPanel = import.meta.env.DEV ? lazy(() => import('./SeamTuningPanel')) : null;
const LogoTuningPanel = import.meta.env.DEV ? lazy(() => import('./LogoTuningPanel')) : null;
const SceneGradePanel = import.meta.env.DEV ? lazy(() => import('./SceneGradePanel')) : null;
const tuneParam = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('tune'));
const showSeamTuning = () => tuneParam() === 'seam';

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
  // 开场覆盖层下面的内容（天空背景、各区块、页脚）等开场第一屏画好再挂载，不和纸张抢带宽；见 openingPaint.ts
  const painted = useOpeningPainted();
  const style = (painted ? { '--hv-sky-bg': `url(${HOME_ASSETS.skyBg})` } : undefined) as CSSProperties | undefined;
  // 首屏以下按屏入场（标题揭开 → 导语配图 → 卡片错开）
  const rootRef = useRef<HTMLDivElement>(null);
  useSceneReveal(rootRef, painted);
  return (
    <div className="hv" style={style} ref={rootRef}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs><filter id="hv-cool-art" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1.04 0 0 0 0   0 1.09 0 0 0   0 0 1.18 0 0   0 0 0 1 0" />
        </filter></defs>
      </svg>
      <Head locale={locale} htmlLang={t.htmlLang} title={h.meta.title} description={h.meta.description} path="" />
      <OpeningHero onLogin={() => openAccess('invite')} onBeta={() => openAccess('signup')} />
      {painted ? <>
        <div className="hv-body">
          <IntroSection />
          <StepsSection />
          <FeatureSection />
          <ModesSection />
          <CreatorsSection />
          <BlogSection />
          <AnswersSection />
        </div>
        <HomeFooter onBeta={() => openAccess('signup')} />
        {/* 构图辅助线：固定在视口上，按当前所在区块切换线组 */}
        <HeroGuideLines />
        {/* 白色铅笔涂鸦：开场结束后在空白处拖动就能画 */}
        <PageDoodle />
      </> : null}
      {SeamTuningPanel && showSeamTuning() && <Suspense fallback={null}><SeamTuningPanel /></Suspense>}
      {LogoTuningPanel && tuneParam() === 'logo' && <Suspense fallback={null}><LogoTuningPanel /></Suspense>}
      {SceneGradePanel && tuneParam() === 'grade' && <Suspense fallback={null}><SceneGradePanel /></Suspense>}
      <AccessDialog returnFocusRef={accessTrigger} mode={accessMode} onClose={() => setAccessMode(null)} onModeChange={setAccessMode} />
    </div>
  );
}
