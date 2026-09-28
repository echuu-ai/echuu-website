import { OpenPanel } from '@openpanel/web';

export const OPENPANEL_DASHBOARD_URL = 'https://analysis.e.echuu.live';
const DEFAULT_API_URL = 'https://analysis.e.echuu.live/api';

let instance: OpenPanel | null | undefined;

export function getOpenPanel(): OpenPanel | null {
  if (instance !== undefined) return instance;
  if (import.meta.env.MODE === 'test') {
    instance = null;
    return null;
  }

  const clientId = String(import.meta.env.VITE_OPENPANEL_CLIENT_ID ?? '').trim();
  if (!clientId) {
    instance = null;
    return null;
  }

  instance = new OpenPanel({
    clientId,
    apiUrl: String(import.meta.env.VITE_OPENPANEL_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, ''),
    trackScreenViews: true,
    trackHashChanges: true,
    trackOutgoingLinks: true,
    trackAttributes: false,
  });
  return instance;
}

export function trackOpenPanel(name: string, properties?: Record<string, unknown>) {
  try {
    getOpenPanel()?.track(name, properties);
  } catch {
    // 埋点失败不影响产品
  }
}

export function identifyOpenPanel(profile: {
  profileId: string;
  email?: string | null;
  firstName?: string | null;
}) {
  try {
    getOpenPanel()?.identify({
      profileId: profile.profileId,
      email: profile.email || undefined,
      firstName: profile.firstName || undefined,
    });
  } catch {
    // ignore
  }
}

export function clearOpenPanel() {
  try {
    getOpenPanel()?.clear();
  } catch {
    // ignore
  }
}

export function resetOpenPanel() {
  instance = undefined;
}
