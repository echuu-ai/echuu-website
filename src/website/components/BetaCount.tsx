import { useEffect, useState } from 'react';
import { useLocale } from '../locale-context';

// Verified from Sheet1 on 2026-09-29: 105 valid email rows, 104 unique emails.
const snapshot = { count: 104, updatedAt: '2026-09-29' };
const labels = {
  zh: (n: string) => `${n} 人已加入内测`,
  en: (n: string) => `${n} people have joined the beta`,
  ja: (n: string) => `${n} 人がベータテストに参加`,
  ko: (n: string) => `${n}명이 베타 테스트에 참여했어요`,
};

export function BetaCount() {
  const { locale } = useLocale();
  const [data, setData] = useState(snapshot);
  useEffect(() => {
    const endpoint = import.meta.env.VITE_BETA_COUNT_ENDPOINT;
    if (!endpoint) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    fetch(endpoint, { signal: controller.signal, credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Count unavailable');
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object') return;
        const { count, updatedAt } = value as Record<string, unknown>;
        if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 && typeof updatedAt === 'string' && Number.isFinite(Date.parse(updatedAt))) {
          setData({ count, updatedAt });
        }
      })
      .catch(() => { /* Keep the verified snapshot on network failure. */ })
      .finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, []);
  return <p className="hv-title__beta-count" title={new Date(data.updatedAt).toLocaleDateString(locale)}>
    <span aria-hidden="true" />{labels[locale](data.count.toLocaleString(locale))}
  </p>;
}
