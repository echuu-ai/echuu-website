import { HeroLogo } from './LogoTone';
import type { CSSProperties } from 'react';
import { DEBUT_SECONDS } from './debutHighlight';
import { createPortal } from 'react-dom';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useHomeDict } from './useHomeDict';
import { HOME_ASSETS } from '../assets';
import { LangSwitch } from '../components/LangSwitch';
import { HomeHeader } from './HomeHeader';
import { SoundToggle } from './SoundToggle';
import { LangPopover } from './LangPopover';
import { Link } from '../components/Link';
import { websitePath } from '../router';
import { BetaCount } from '../components/BetaCount';
import { SocialLinks } from '../components/SocialLinks';
import type { HoleRect } from './three/OpeningStage3D';
import type { SketchOutline } from './three/captureOutline';
import type { SketchStroke } from './sketchStrokes';
import {
  OPENING,
  OPENING_RATE,
  createOpeningClock,
  openingStarted,
  openingTime,
  phaseAt,
  skipOpening,
  smoothstep,
  startOpeningClock,
  type OpeningPhase,
} from './openingTimeline';
import { DrawWingsPaper } from './DrawWingsPaper';
import { updateOpeningSound } from '../lib/openingSound';

const OpeningStage3D = lazy(() => import('./three/OpeningStage3D').then((m) => ({ default: m.OpeningStage3D })));
/** 3D 金属 logo 试验版：地址带 ?logo=3d 才加载，替换首屏的平面 logo */
const Logo3D = lazy(() => import('./three/Logo3D'));
const LOGO_PARAM = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('logo') : null;
const LOGO_3D = LOGO_PARAM === '3d';
/** 首屏 logo 默认用 Kling 出场动画：星星闪 → 光环划出 → 像素字拼出；?logo=static 关掉，?logo=3d 看金属版 */
const LOGO_REVEAL = !LOGO_3D && LOGO_PARAM !== 'static';

/**
 * 出场动画叠在平面 logo 正上方、按同一张 808 × 620 画板像素对齐（位置见 home.css .hv-title__logo--reveal）。
 * 播完后平面 logo（带颜文字）淡入接管，视频淡出——看起来就是最后颜文字「冒」出来。
 */
function LogoReveal({ play, onDone }: { play: boolean; onDone: () => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const safari = typeof navigator !== 'undefined' && /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  useEffect(() => { if (play) ref.current?.play().catch(onDone); }, [play, onDone]);
  return (
    <video
      ref={ref}
      className="hv-title__logo--reveal"
      src={safari ? HOME_ASSETS.logoReveal.hevc : HOME_ASSETS.logoReveal.webm}
      poster={HOME_ASSETS.logoReveal.startPoster}
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      aria-hidden="true"
      onEnded={onDone}
      onError={onDone}
    />
  );
}

type StageMode = 'pending' | '3d' | 'still';

/** 手写提示语：不加任何 UI，只靠纸上这一句铅笔字引导（字体只有拉丁字形，所有语言都用这句英文） */
const DRAW_HINT = 'Draw its wings\n   \u2014 make it live';

/** 只要有 WebGL 就跑真实 3D（手机也是）；只有无 WebGL 或减少动态效果才走静态分镜。 */
function decideStageMode(reduced: boolean): StageMode {
  if (reduced) return 'still';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return gl ? '3d' : 'still';
  } catch {
    return 'still';
  }
}

const MENU_ANCHORS = [
  ['intro', '#intro'],
  ['steps', '#steps'],
  ['agent', '#feature'],
  ['creators', '#creators'],
  ['blog', '#blog'],
  ['beta', '#beta'],
] as const;

/** 蓝色描边 = 加载进度：drei 的 loader 进度会分批跳动，只取单调递增值，就绪前封顶 92% */
function useStrokeProgress(ready: boolean, mode: StageMode) {
  const { progress } = useProgress();
  const shown = useRef(0);
  if (ready || mode === 'still') shown.current = 1;
  else shown.current = Math.max(shown.current, Math.min(0.92, progress / 100));
  return shown.current;
}

export function OpeningHero({ onLogin, onBeta }: { onLogin: () => void; onBeta: () => void }) {
  const { h, locale } = useHomeDict();
  const reduced = usePrefersReducedMotion();
  const clock = useMemo(createOpeningClock, []);
  const [mode, setMode] = useState<StageMode>('pending');
  const [phase, setPhase] = useState<OpeningPhase>('loading');
  // logo 出场动画：减少动态效果时直接显示平面 logo
  const showReveal = LOGO_REVEAL && !reduced;
  const [revealDone, setRevealDone] = useState(false);
  const finishReveal = useCallback(() => setRevealDone(true), []);
  const [stillShot, setStillShot] = useState<'back' | 'front'>('back');
  const [menuOpen, setMenuOpen] = useState(false);
  const [debut, setDebut] = useState(false);
  useEffect(() => {
    if (phase !== 'hero' || reduced) { setDebut(false); return; }
    setDebut(true);
    const timer = window.setTimeout(() => setDebut(false), DEBUT_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);
  const [running, setRunning] = useState(true);
  const [ready, setReady] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const hole = useRef<HoleRect>({ x: 0, y: 0, w: 0, h: 0, open: false, reveal: 0, border: 0 });
  const paperArt = useRef<HTMLCanvasElement | null>(null);
  const [pendingWake, setPendingWake] = useState(false);
  // 3D 就绪后从睡姿拍出的铅笔稿 + 画翅膀引导：DOM 纸换上同一张线稿
  const [sketch, setSketch] = useState<{ strokes: SketchStroke[]; guide: string } | null>(null);
  const handleSketch = useCallback((next: SketchOutline) => {
    setSketch({ strokes: next.strokes, guide: next.guide.toDataURL('image/png') });
  }, []);
  const stroke = useStrokeProgress(ready, mode);

  // draw 阶段结束（翅膀画好）：时钟就绪则立刻开始 wake，否则等 3D 就绪后自动开始
  const beginWake = useCallback(() => {
    if (openingStarted(clock)) return;
    if (!clock.ready) {
      setPendingWake(true);
      return;
    }
    startOpeningClock(clock, performance.now());
    setPhase('wake');
  }, [clock]);
  useEffect(() => {
    if (ready && pendingWake) beginWake();
  }, [beginWake, pendingWake, ready]);
  // DEV：带 ophold（冻结时间线）时跳过画翅膀，就绪后直接起时钟；opmat 不跳过，画翅膀照常
  useEffect(() => {
    if (!import.meta.env.DEV || !ready || mode !== '3d') return;
    if (new URLSearchParams(window.location.search).has('ophold')) beginWake();
  }, [beginWake, mode, ready]);

  // 决定舞台模式；静态分镜自己起时钟，3D 等模型与动作就绪后再起
  useEffect(() => {
    const next = decideStageMode(reduced);
    setMode(next);
    if (next === 'still') {
      startOpeningClock(clock, performance.now());
      setReady(true);
      skipOpening(clock, performance.now());
      setPhase('hero');
    }
  }, [clock, reduced]);

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  // 模型 / 动作加载失败，或超时仍未就绪：退回静态分镜，绝不把页面锁死在黑场
  const fallbackToStill = useCallback(() => {
    setMode((current) => {
      if (current !== '3d') return current;
      startOpeningClock(clock, performance.now());
      setReady(true);
      skipOpening(clock, performance.now());
      setPhase('hero');
      return 'still';
    });
  }, [clock]);
  const handleFail = useCallback((error: unknown) => {
    console.warn('[website-opening] 3D stage failed, using stills', error);
    fallbackToStill();
  }, [fallbackToStill]);
  useEffect(() => {
    if (mode !== '3d') return;
    const timer = window.setTimeout(() => {
      if (!clock.ready) fallbackToStill();
    }, 25000);
    return () => window.clearTimeout(timer);
  }, [clock, fallbackToStill, mode]);

  // 低频轮询时钟推导阶段；逐帧更新只发生在 3D 场景与 CSS 过渡里
  useEffect(() => {
    if (mode === 'pending') return;
    const params = new URLSearchParams(window.location.search);
    const hold = import.meta.env.DEV && params.has('ophold') ? Number(params.get('ophold')) : NaN;
    const tick = () => {
      const now = performance.now();
      const t = Number.isFinite(hold) && clock.ready ? hold : openingTime(clock, now);
      const next = phaseAt(t, clock.ready, openingStarted(clock));
      setPhase((current) => (current === next ? current : next));
      if (mode === '3d') updateOpeningSound(t, openingStarted(clock));
      if (mode === 'still') setStillShot(t < OPENING.openStart + 3.2 ? 'back' : 'front');
    };
    tick();
    const timer = window.setInterval(tick, 80);
    return () => window.clearInterval(timer);
  }, [clock, mode]);

  // 开场期间锁住滚动；打开窗口时用 FLIP 把手机窗放大到整屏（3D 的黑幕开洞每帧跟着 DOM 走）
  useEffect(() => {
    const root = document.documentElement;
    if (phase === 'hero') {
      root.classList.remove('hv-lock');
      hole.current.open = true;
      return;
    }
    root.classList.add('hv-lock');
    window.scrollTo(0, 0);
    let raf = 0;
    const track = () => {
      const el = windowRef.current;
      if (el) {
        // draw / wake 阶段窗口还没回来：reveal = 0 时 3D 黑幕全黑；fold 里从窗口中心张开
        const t = openingTime(clock, performance.now());
        const rect = el.getBoundingClientRect();
        hole.current.x = rect.left;
        hole.current.y = rect.top;
        hole.current.w = rect.width;
        hole.current.h = rect.height;
        hole.current.reveal = mode === '3d' ? smoothstep(OPENING.windowBack, OPENING.windowBack + 0.9, t) : 1;
        hole.current.border = mode === '3d'
          ? smoothstep(OPENING.windowBack, OPENING.windowBack + 0.9, t) * (1 - smoothstep(OPENING.openStart, OPENING.openStart + 0.5, t))
          : 0;
        hole.current.open = false;
      }
      raf = requestAnimationFrame(track);
    };
    track();
    if (phase === 'open' && windowRef.current) {
      // 手机窗放大到整屏。容器 .hv-opening__frame 带 transform，会成为 fixed 的包含块，
      // 所以这里用相对 frame 的 absolute 坐标算目标，才能真正对齐视口（否则会偏出一条黑边、也不居中）
      const el = windowRef.current;
      const frame = el.parentElement as HTMLElement;
      const rect = el.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      el.style.transition = 'none';
      el.style.position = 'absolute';
      el.style.left = `${rect.left - frameRect.left}px`;
      el.style.top = `${rect.top - frameRect.top}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      void el.offsetWidth;
      el.style.transition = '';
      requestAnimationFrame(() => {
        el.style.left = `${-frameRect.left}px`;
        el.style.top = `${-frameRect.top}px`;
        el.style.width = `${window.innerWidth}px`;
        el.style.height = `${window.innerHeight}px`;
        el.style.boxShadow = '0 0 0 0 #000, inset 0 0 0 rgba(114,213,254,0)';
      });
    }
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('hv-lock');
    };
  }, [clock, mode, phase]);

  // 首屏离开视口后停掉 3D 渲染循环
  useEffect(() => {
    const node = heroRef.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => setRunning(entries.some((entry) => entry.isIntersecting)), { threshold: 0.02 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // 开场不提供跳过 / 唤醒按钮、回访也照常播放（Cory 2026-10-03 再次确认）；只留 Esc 作为无障碍退出口
  const skip = useCallback(() => {
    setPendingWake(false);
    // Skipping selects the final pose; it must never downgrade a loading 3D stage.
    if (!clock.ready) return;
    skipOpening(clock, performance.now());
    setPhase('hero');
  }, [clock]);

  useEffect(() => {
    if (phase === 'hero') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skip]);

  useEffect(() => setMenuOpen(false), [locale]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const showOpening = phase !== 'hero';
  const drawing = phase === 'loading' || phase === 'draw';
  const stageStill = mode === 'still';

  return (
    <section className={`hv-hero hv-hero--${mode}`} ref={heroRef} style={{ '--opening-window-duration': `${OPENING.windowOpenSeconds / OPENING_RATE}s` } as CSSProperties} data-phase={phase} aria-label={h.header.brand}>
      <div className="hv-stage" aria-hidden="true">
        {mode === '3d' ? (
          <Suspense fallback={null}>
            <OpeningStage3D clock={clock} onReady={handleReady} onFail={handleFail} running={running || showOpening} hole={hole} paperArt={paperArt} onSketch={handleSketch} />
          </Suspense>
        ) : null}
        {stageStill ? (
          <img
            className="hv-stage__still"
            src={stillShot === 'front' || phase === 'hero' ? HOME_ASSETS.heroShot : HOME_ASSETS.opening.back}
            alt=""
            width={1076}
            height={782}
            decoding="async"
          />
        ) : null}
      </div>

      {showOpening ? (
        <div className="hv-opening-controls" data-no-doodle>
          <SoundToggle label={h.header.sound} />
        </div>
      ) : null}

      {showOpening ? (
        <div className="hv-opening" role="presentation">
          {mode === '3d' && (drawing || phase === 'wake') ? (
            <DrawWingsPaper
              fading={phase === 'wake'}
              waiting={pendingWake && !ready}
              artRef={paperArt}
              onWake={beginWake}
              hint={DRAW_HINT}
              loadingLabel={h.opening.loading}
              sketch={sketch?.strokes ?? null}
              guide={sketch?.guide ?? null}
            />
          ) : null}
          <div className="hv-opening__frame">
            <p className="hv-opening__title" lang="en">
              <img src={HOME_ASSETS.opening.star} alt="" className="hv-opening__star" />
              <span>{h.opening.title.pre}</span>
              <mark className="hv-opening__hl hv-opening__hl--yellow">{h.opening.title.hl1}</mark>
              <span>{h.opening.title.mid}</span>
              <i className="hv-opening__dot" aria-hidden="true" />
              <mark className="hv-opening__hl hv-opening__hl--blue">{h.opening.title.hl2}</mark>
              <img src={HOME_ASSETS.opening.star} alt="" className="hv-opening__star" />
            </p>

            <img className="hv-opening__deco hv-opening__deco--wing" src={HOME_ASSETS.opening.wing} alt="" />
            <img className="hv-opening__deco hv-opening__deco--sword" src={HOME_ASSETS.opening.sword} alt="" />
            <img className="hv-opening__deco hv-opening__deco--pegasus" src={HOME_ASSETS.opening.pegasus} alt="" />
            <img className="hv-opening__deco hv-opening__deco--plane" src={HOME_ASSETS.opening.plane} alt="" />
            <img className="hv-opening__ui" src={HOME_ASSETS.opening.uiList} alt="" />
            <span className="hv-opening__stars" aria-hidden="true">★★★</span>

            <div className="hv-opening__window" ref={windowRef} data-loaded={stroke >= 1}>
              {/* 蓝色描边 = 进度条：沿矩形周长生长，描完镜头再冲进窗口 */}
              <svg className="hv-opening__stroke" viewBox="0 0 684 294" preserveAspectRatio="none" aria-hidden="true">
                <rect x="8.5" y="8.5" width="667" height="277" pathLength={1} style={{ strokeDashoffset: 1 - stroke }} />
              </svg>
              <span className="hv-opening__live">{h.opening.live}</span>
              {stageStill ? (
                <div className="hv-opening__stills">
                  <span className="hv-opening__sky" />
                  <img className="hv-opening__still hv-opening__still--lie" src={HOME_ASSETS.opening.lie} alt="" />
                  <img className="hv-opening__still hv-opening__still--hand" src={HOME_ASSETS.opening.hand} alt="" />
                </div>
              ) : null}
              <img className="hv-opening__outline hv-opening__outline--01" src={HOME_ASSETS.opening.outline01} alt="" />
              <img className="hv-opening__outline hv-opening__outline--02" src={HOME_ASSETS.opening.outline02} alt="" />
              {phase === 'loading' && mode !== '3d' ? <span className="hv-opening__loading">{h.opening.loading}</span> : null}
            </div>
          </div>
          {phase === 'open' ? <div className="hv-opening__flash" aria-hidden="true" /> : null}
        </div>
      ) : null}

      <div className="hv-chrome" data-visible={phase === 'hero'} data-debut={debut && !reduced}>
        <HomeHeader menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((value) => !value)} />

        <nav className="hv-menu" aria-label={h.header.menu}>
          {MENU_ANCHORS.map(([key, href]) => (
            <a key={key} href={href}>{h.menu[key]}</a>
          ))}
          <Link to={websitePath(locale, 'team')}>{h.menu.team}</Link>
        </nav>

        <div className="hv-title">
          <div
            className="hv-title__logo-wrap"
            data-reveal={showReveal ? (revealDone ? 'done' : 'playing') : undefined}
            style={{ '--logo-mask': `url("${HOME_ASSETS.logo3d}")` } as CSSProperties}
          >
            {LOGO_3D
              ? <Suspense fallback={<HeroLogo src={HOME_ASSETS.logo3d} alt={h.hero.logoAlt} />}><Logo3D label={h.hero.logoAlt} /></Suspense>
              : <HeroLogo src={HOME_ASSETS.logo3d} alt={h.hero.logoAlt} />}
            {showReveal ? <LogoReveal play={phase === 'hero'} onDone={finishReveal} /> : null}
            
          </div>
          <h1 className="hv-title__slogan">
            {h.hero.slogan.pre}
            <mark className="hv-title__hl hv-title__hl--yellow">{h.hero.slogan.hl1}</mark>
            {h.hero.slogan.mid}
            <mark className="hv-title__hl hv-title__hl--blue">{h.hero.slogan.hl2}</mark>
          </h1>
          <button type="button" className="hv-title__register" onClick={onLogin}>{h.hero.register}</button>
          <BetaCount />
        </div>



      </div>

      {phase === 'hero' && !menuOpen ? createPortal(
        <div className="hv-cta">
          <LangPopover locale={locale} label={h.header.language} />
          <SoundToggle label={h.header.sound} />
          <span className="hv-cta__group"><SocialLinks compact /></span>
          <button type="button" className="hv-cta__beta" onClick={onBeta}>
            {h.hero.beta}
            <i aria-hidden="true" />
          </button>
        </div>,
        document.querySelector('.echuu-website') ?? document.body,
      ) : null}

      {menuOpen ? (
        <div className="hv-menu-overlay" id="hv-menu">
          <button type="button" className="hv-menu-overlay__close" onClick={() => setMenuOpen(false)} aria-label={h.header.close}>×</button>
          <nav aria-label={h.header.menu}>
            {MENU_ANCHORS.map(([key, href]) => (
              <a key={key} href={href} onClick={() => setMenuOpen(false)}>{h.menu[key]}</a>
            ))}
            <Link to={websitePath(locale, 'team')} onClick={() => setMenuOpen(false)}>{h.menu.team}</Link>
          </nav>
          <div className="hv-menu-overlay__lang">
            <LangSwitch locale={locale} label={h.header.language} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
