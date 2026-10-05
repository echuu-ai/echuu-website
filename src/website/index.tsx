import { armSummerAmbience } from './lib/summerAmbience';
import { lazy, Suspense, useEffect } from 'react';
import { DICTS, WEBSITE_LOCALES, type Locale } from './i18n';
import { LocaleContext } from './locale-context';
import { useI18nStore } from '../hooks/use-i18n';
import { useWebsiteLocation, WEBSITE_BASE } from './router';
import { SITE_NAVIGATE_EVENT } from '../lib/pageTransition';
import { useSmoothScroll } from './lib/useSmoothScroll';
import { HomeV2 } from './home/HomeV2';
import { TeamChrome } from './home/TeamChrome';
import { SubpageChrome } from './home/SubpageChrome';
import './styles/global.css';
import './styles/layout.css';

// 子页面按路由懒加载：首页（HomeV2）留在主入口块，其余页面各自成块，打开时才下载；
// 首页空闲时预取，站内跳转通常不用等。外壳（SubpageChrome / TeamChrome）留在主块，加载时页头页脚与背景照常显示。
const PAGE_LOADERS = {
  gallery: () => import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage })),
  creators: () => import('./pages/CreatorsPage').then((m) => ({ default: m.CreatorsPage })),
  journal: () => import('./pages/JournalPage').then((m) => ({ default: m.JournalPage })),
  blog: () => import('./pages/BlogPage').then((m) => ({ default: m.BlogPage })),
  team: () => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })),
  feedback: () => import('./pages/FeedbackPage').then((m) => ({ default: m.FeedbackPage })),
  doodle: () => import('./pages/DoodlePage').then((m) => ({ default: m.DoodlePage })),
  moodboard: () => import('./pages/MoodboardPage').then((m) => ({ default: m.MoodboardPage })),
  notFound: () => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
};
const GalleryPage = lazy(PAGE_LOADERS.gallery);
const CreatorsPage = lazy(PAGE_LOADERS.creators);
const JournalPage = lazy(PAGE_LOADERS.journal);
const BlogPage = lazy(PAGE_LOADERS.blog);
const TeamPage = lazy(PAGE_LOADERS.team);
const FeedbackPage = lazy(PAGE_LOADERS.feedback);
const DoodlePage = lazy(PAGE_LOADERS.doodle);
const MoodboardPage = lazy(PAGE_LOADERS.moodboard);
const NotFoundPage = lazy(PAGE_LOADERS.notFound);

/** 页面加载完、浏览器空闲时预取全部子页面代码（开场资源优先，8 s 后再开始） */
function usePrefetchPages() {
  useEffect(() => {
    let idle = 0;
    const run = () => { for (const load of Object.values(PAGE_LOADERS)) void load(); };
    const timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(run, { timeout: 5000 });
      else run();
    }, 8000);
    return () => {
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, []);
}

/** 深链接刷新后滚到锚点；没有锚点时回到顶部。 */
function useScrollManager(page: string, hash: string) {
  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [page, hash]);
}

/**
 * 官网根组件。挂在 /website/{locale}/... 下，与产品 app 的 `/` 入口互不影响。
 * URL 里的语言是来源，进入时同步进 app 的 i18n store，语言切换两边一起走。
 */
export default function EchuuWebsite() {
  const { locale, page, hash } = useWebsiteLocation();
  const setLocale = useI18nStore((state) => state.setLocale);
  const storeLocale = useI18nStore((state) => state.locale);

  // 访问 /website 不带语言时，用 app 已有的语言检测补齐并改写地址，不做 IP 跳转
  useEffect(() => {
    const parts = window.location.pathname.slice(WEBSITE_BASE.length).split('/').filter(Boolean);
    const hasLocale = parts[0] && WEBSITE_LOCALES.includes(parts[0] as Locale);
    if (!hasLocale) {
      const target = `${WEBSITE_BASE}/${storeLocale}${parts[0] ? `/${parts[0]}` : ''}`;
      window.history.replaceState(null, '', target + window.location.hash);
      window.dispatchEvent(new Event(SITE_NAVIGATE_EVENT));
    }
  }, [storeLocale]);

  useEffect(() => {
    if (storeLocale !== locale) setLocale(locale as Locale);
  }, [locale, storeLocale, setLocale]);

  useScrollManager(page, hash);
  usePrefetchPages();
  useSmoothScroll(page);
  useEffect(() => { if (page === 'home') return armSummerAmbience(); }, [page]);

  // 产品 app 的全局样式给 body 设了 overflow: hidden（直播舞台不滚动）；官网是普通长页，必须能滚
  useEffect(() => {
    const body = document.body;
    const previous = { overflow: body.style.overflow, overflowX: body.style.overflowX, overflowY: body.style.overflowY };
    body.style.overflowY = 'auto';
    body.style.overflowX = 'hidden';
    return () => {
      body.style.overflow = previous.overflow;
      body.style.overflowX = previous.overflowX;
      body.style.overflowY = previous.overflowY;
    };
  }, []);

  const t = DICTS[locale];
  const body =
    page === 'gallery' ? <GalleryPage />
    : page === 'creators' ? <CreatorsPage />
    : page === 'journal' ? <JournalPage />
    : page === 'blog' ? <BlogPage />
    : page === 'team' ? <TeamPage />
    : page === 'feedback' ? <FeedbackPage />
    : page === 'doodle' ? <DoodlePage />
    : page === 'moodboard' ? <MoodboardPage />
    : page === 'not-found' ? <NotFoundPage />
    : <HomeV2 />;

  return (
    <LocaleContext.Provider value={{ locale, t }}>
      <div className="echuu-website" data-locale={locale} data-page={page} data-shell={page === 'home' ? 'home' : 'subpage'}>
        <a className="skip-link" href="#main">
          {t.nav.skipToContent}
        </a>
        {/* 首页自带开场与页头页脚；其余页面一律走官网子页外壳，不再有未包装的页面 */}
        {page === 'home' ? (
          <main id="main">{body}</main>
        ) : page === 'team' ? (
          <TeamChrome><main id="main"><Suspense fallback={null}>{body}</Suspense></main></TeamChrome>
        ) : (
          <SubpageChrome className="subpage-chrome" world>
            <main id="main" className="subpage-sheet"><Suspense fallback={null}>{body}</Suspense></main>
          </SubpageChrome>
        )}
      </div>
    </LocaleContext.Provider>
  );
}
