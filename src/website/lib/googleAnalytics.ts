import { CANONICAL_ORIGIN } from '../config/site';

/**
 * Google Analytics 4（官网访问统计）。
 * - 只在设置了 VITE_GA_MEASUREMENT_ID（G-XXXXXXX）的正式构建、且在正式域名上才加载；本地、预览站一律不加载。
 * - 页面空闲后才下载 gtag.js（开场与首屏优先）；在那之前的跳转先排队，加载后一起发出。
 * - 站内跳转是 pushState，不会自动计页面浏览：每次路由变化手动发 page_view。
 * - 广告相关全部关闭（Google 信号、广告个性化）；欧洲经济区、英国、瑞士默认不写分析 Cookie
 *   （Consent Mode：只发无 Cookie 的匿名请求）。隐私政策第 2、6 节有对应说明。
 */
const MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || '';
const EEA_UK_CH = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH'];

type Gtag = (...args: unknown[]) => void;
declare global { interface Window { dataLayer?: unknown[]; gtag?: Gtag } }

let started = false;

export function analyticsEnabled() {
  return import.meta.env.PROD && /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID) && typeof window !== 'undefined' && window.location.origin === CANONICAL_ORIGIN;
}

function gtag(...args: unknown[]) {
  // gtag.js 要求放进 dataLayer 的是 arguments 对象本身
  // eslint-disable-next-line prefer-rest-params
  (window.dataLayer ??= []).push(arguments);
  void args;
}

/** 设好默认值并排队；脚本空闲时再下载。重复调用无副作用。 */
export function startAnalytics() {
  if (started || !analyticsEnabled()) return;
  started = true;
  window.gtag = gtag;
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', region: EEA_UK_CH });
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const load = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    document.head.appendChild(script);
  };
  const idle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(load, { timeout: 6000 });
    else setTimeout(load, 3000);
  };
  if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });
}

/** 记一次页面浏览（首次进入与每次站内跳转）；未启用时什么都不做。 */
export function trackPageView(title: string) {
  if (!started) return;
  gtag('event', 'page_view', { page_location: window.location.href, page_path: window.location.pathname, page_title: title });
}
