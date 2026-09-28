const PAGE_TRANSITION_MS = 180;
export const SITE_NAVIGATE_EVENT = 'echuu:site-navigate';

let navigationPending = false;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function revealApplication() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.classList.remove('echuu-booting');
      document.documentElement.classList.add('echuu-ready');
    });
  });
}

export function navigateWithTransition(href: string) {
  if (navigationPending) return;

  const destination = new URL(href, window.location.href);
  if (destination.href === window.location.href) return;

  const normalizedPath = destination.pathname.replace(/\/$/, '') || '/';
  // 官网 /website/{locale}/... 自己处理路由，和其他站点页一样走 pushState，不整页跳转
  const isWebsiteRoute = normalizedPath === '/website' || normalizedPath.startsWith('/website/');
  const isSiteRoute = isWebsiteRoute
    || ['/', '/about', '/career', '/contact', '/blog'].includes(normalizedPath);
  if (destination.origin === window.location.origin && isSiteRoute) {
    window.history.pushState({}, '', `${destination.pathname}${destination.search}${destination.hash}`);
    window.dispatchEvent(new CustomEvent(SITE_NAVIGATE_EVENT, { detail: destination.href }));
    return;
  }

  if (prefersReducedMotion()) {
    window.location.assign(destination.href);
    return;
  }

  navigationPending = true;
  document.documentElement.classList.add('echuu-leaving');
  window.setTimeout(() => window.location.assign(destination.href), PAGE_TRANSITION_MS);
}

export function installPageTransitions() {
  const handleClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.dataset.noPageTransition === 'true') return;

    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin || !/^https?:$/.test(destination.protocol)) return;

    const sameDocumentHash =
      destination.pathname === window.location.pathname
      && destination.search === window.location.search
      && destination.hash;
    if (sameDocumentHash) return;

    event.preventDefault();
    navigateWithTransition(destination.href);
  };

  document.addEventListener('click', handleClick, true);
  revealApplication();

  return () => document.removeEventListener('click', handleClick, true);
}
