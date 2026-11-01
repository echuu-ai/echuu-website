const KEY = 'echuu-beta-referral-v1';
const VALID = /^[A-Za-z0-9_-]{8,32}$/;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function getReferral(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && VALID.test(saved.code) && Date.now() - saved.at >= 0 && Date.now() - saved.at < MAX_AGE) return saved.code;
  } catch { /* Storage may be blocked; URL still works for this page. */ }
  const code = new URLSearchParams(window.location.search).get('ref');
  if (code && VALID.test(code)) {
    try { sessionStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() })); } catch { /* Optional persistence. */ }
    return code;
  }
  return undefined;
}

export function clearReferral() {
  try { sessionStorage.removeItem(KEY); } catch { /* Optional persistence. */ }
}

// Capture before locale navigation removes the query. Codes never enter analytics.
getReferral();
