/**
 * 前端埋点 SDK。产品事件发到 OpenPanel（analysis.e.echuu.live），看板用他们的 UI。
 * 测试可注入假 transport；默认不再 POST 到自建 /api/analytics/*。
 *
 * 事件契约见 ./types.ts，方案见 docs/analytics-taxonomy.md。
 */
import type {
  AnalyticsEnvelope,
  AnalyticsEventMap,
  AnalyticsEventName,
  AssetKind,
  DeviceInfo,
  FeatureName,
  FeatureSurface,
  StageName,
} from './types';
import { clearOpenPanel, getOpenPanel, identifyOpenPanel, resetOpenPanel, trackOpenPanel } from './openpanel';

const ANON_ID_KEY = 'echuu.analytics.anon-id';
const OPT_OUT_KEY = 'echuu.analytics.opt-out';
const SESSION_KEY = 'echuu.analytics.session';

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_AT_QUEUE_SIZE = 20;
const MAX_QUEUE = 200;
/** 超过这个时长没有事件就算新会话。 */
const SESSION_IDLE_MS = 30 * 60 * 1000;

export type AnalyticsTransport = (batch: AnalyticsEnvelope[], opts: { beacon: boolean }) => Promise<void>;

export type ContentKind = 'persona' | 'topic' | 'chat';

export type AnalyticsConfig = {
  /** 仅测试或显式自建入库时需要。正式环境走 OpenPanel，不要配。 */
  endpoint?: string;
  /** 已废弃：文本改走 OpenPanel，不要再打自建 /analytics/content。 */
  contentEndpoint?: string;
  appVersion: string;
  locale?: string;
  /** 覆盖默认 transport，测试用。 */
  transport?: AnalyticsTransport;
  /** dev 下把事件同时打到 console。 */
  debug?: boolean;
  now?: () => number;
};

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function safeLocal(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // 隐私模式 / 被禁用
  }
}

function readDevice(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { ua_family: 'unknown', os: 'unknown', is_mobile: false, screen_w: 0, screen_h: 0, dpr: 1 };
  }
  const ua = navigator.userAgent;
  const family = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : /Firefox\//.test(ua) ? 'Firefox'
    : 'other';
  const os = /Mac OS X/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'other';
  return {
    ua_family: family,
    os,
    is_mobile: /Android|iPhone|iPad|iPod/.test(ua),
    screen_w: window.screen?.width ?? 0,
    screen_h: window.screen?.height ?? 0,
    dpr: window.devicePixelRatio ?? 1,
  };
}

async function noopTransport(): Promise<void> {
  // OpenPanel 在 track() 时已经发出去了
}

class Analytics {
  private config: AnalyticsConfig | null = null;
  private queue: AnalyticsEnvelope[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private anonId = '';
  private sessionId = '';
  private lastEventAt = 0;
  private openedAt = 0;
  private stage: StageName | null = null;
  private stageEnteredAt = 0;
  private stageDwell: Partial<Record<StageName, number>> = {};
  private userId: string | undefined;
  private eventCount = 0;
  private optedOut = false;
  private sending = false;
  private pageHidden = false;
  private qualityCleanup: (() => void) | null = null;
  private failedAssets = new Set<string>();

  init(config: AnalyticsConfig) {
    if (this.config) return;
    this.config = config;
    const store = safeLocal();
    this.optedOut = store?.getItem(OPT_OUT_KEY) === '1';

    this.anonId = store?.getItem(ANON_ID_KEY) ?? uuid();
    store?.setItem(ANON_ID_KEY, this.anonId);

    const now = this.now();
    this.openedAt = now;
    const prior = this.readSession();
    const isReturning = prior !== null;
    this.sessionId = prior && now - prior.lastAt < SESSION_IDLE_MS ? prior.id : uuid();
    this.lastEventAt = now;
    this.writeSession();
    this.pageHidden = false;

    if (typeof window !== 'undefined') {
      this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
      window.addEventListener('pagehide', this.onPageHide);
      window.addEventListener('beforeunload', this.onPageHide);
      this.installQualityCollectors();
    }

    this.track('app_opened', {
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      is_returning: isReturning,
    });

    if (!this.optedOut) {
      try {
        getOpenPanel()?.setGlobalProperties({
          app_version: config.appVersion,
          locale: config.locale ?? 'unknown',
        });
      } catch {
        // ignore
      }
      identifyOpenPanel({ profileId: this.anonId });
    }
  }

  private now() {
    return this.config?.now?.() ?? Date.now();
  }

  private readSession(): { id: string; lastAt: number } | null {
    try {
      const raw = safeLocal()?.getItem(SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed.id === 'string' && typeof parsed.lastAt === 'number' ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeSession() {
    safeLocal()?.setItem(SESSION_KEY, JSON.stringify({ id: this.sessionId, lastAt: this.lastEventAt }));
  }

  setUser(userId: string | undefined, profile?: { email?: string | null; name?: string | null }) {
    this.userId = userId;
    if (userId) {
      identifyOpenPanel({
        profileId: userId,
        email: profile?.email,
        firstName: profile?.name,
      });
      return;
    }
    clearOpenPanel();
    if (this.anonId) identifyOpenPanel({ profileId: this.anonId });
  }

  /** 阶段切换：顺带累计上一个阶段的停留时长，供 session_summary 用。 */
  setStage(stage: StageName) {
    const now = this.now();
    if (this.stage && this.stage !== stage) {
      const prev = this.stage;
      this.stageDwell[prev] = (this.stageDwell[prev] ?? 0) + (now - this.stageEnteredAt);
    }
    const from = this.stage;
    if (from !== stage) {
      this.stage = stage;
      this.stageEnteredAt = now;
      this.track('stage_entered', { stage, from_stage: from, ms_since_open: now - this.openedAt });
    }
  }

  /** 功能被真正用到时打一条，供 OpenPanel 按 feature 拆使用频次。 */
  trackFeature(feature: FeatureName, props: { surface: FeatureSurface; asset_id?: string }) {
    this.track('feature_used', {
      feature,
      surface: props.surface,
      ...(props.asset_id ? { asset_id: props.asset_id } : {}),
    });
  }

  /** VRM / HDR / 场景 / 动作加载失败。同一资源同会话只记一次。 */
  trackAssetLoadFailed(kind: AssetKind, assetId: string, reason: unknown, bytes?: number) {
    const id = String(assetId || 'unknown').slice(0, 160);
    const key = `${kind}:${id}`;
    if (this.failedAssets.has(key)) return;
    this.failedAssets.add(key);
    const message = reason instanceof Error ? reason.message : String(reason ?? 'unknown');
    this.track('asset_load_failed', {
      kind,
      asset_id: id,
      reason: message.slice(0, 160),
      ...(typeof bytes === 'number' ? { bytes } : {}),
    });
  }

  track<E extends AnalyticsEventName>(event: E, props: AnalyticsEventMap[E]) {
    if (!this.config || this.optedOut) return;
    const now = this.now();
    // 静默太久算新会话，避免把隔夜的行为拼进同一段
    if (now - this.lastEventAt > SESSION_IDLE_MS) {
      this.sessionId = uuid();
      this.stageDwell = {};
      this.eventCount = 0;
    }
    this.lastEventAt = now;
    this.writeSession();
    this.eventCount += 1;

    const envelope: AnalyticsEnvelope = {
      event,
      event_id: uuid(),
      ts: now,
      anon_id: this.anonId,
      session_id: this.sessionId,
      user_id: this.userId,
      stage: this.stage,
      app_version: this.config.appVersion,
      locale: this.config.locale ?? 'unknown',
      device: readDevice(),
      props: props as Record<string, unknown>,
    };

    if (this.config.debug) console.debug('[analytics]', event, props);

    trackOpenPanel(event, {
      ...envelope.props,
      stage: envelope.stage,
      anon_id: envelope.anon_id,
      session_id: envelope.session_id,
      user_id: envelope.user_id,
    });

    this.queue.push(envelope);
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    if (this.queue.length >= FLUSH_AT_QUEUE_SIZE) void this.flush();
  }

  async flush(opts: { beacon?: boolean } = {}): Promise<void> {
    if (!this.config || this.optedOut || this.queue.length === 0) return;
    if (this.sending && !opts.beacon) return;
    const batch = this.queue;
    this.queue = [];
    this.sending = true;
    const send = this.config.transport ?? noopTransport;
    try {
      await send(batch, { beacon: Boolean(opts.beacon) });
    } catch {
      try {
        await send(batch, { beacon: Boolean(opts.beacon) });
      } catch {
        // 重试一次仍失败就丢弃：埋点不值得把队列撑爆或补发过期数据
      }
    } finally {
      this.sending = false;
    }
  }

  private onPageHide = () => {
    if (!this.config || this.optedOut || this.pageHidden) return;
    this.pageHidden = true;
    const now = this.now();
    if (this.stage) {
      this.stageDwell[this.stage] = (this.stageDwell[this.stage] ?? 0) + (now - this.stageEnteredAt);
    }
    this.track('session_summary', {
      duration_ms: now - this.openedAt,
      stage_dwell_ms: { ...this.stageDwell },
      event_count: this.eventCount,
      end_reason: 'unload',
    });
    void this.flush({ beacon: true });
  };

  /**
   * 上报自由文本（人设 / 主题 / 弹幕）。走 OpenPanel，不打自建入库。
   * `chat` 是观众写的第三方内容，调用方必须自己确认已获得采集许可。
   */
  captureContent(kind: ContentKind, text: string, meta: { authorRef?: string; lang?: string } = {}) {
    if (!this.config || this.optedOut) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    trackOpenPanel('content_captured', {
      kind,
      text: trimmed,
      lang: meta.lang ?? this.config.locale,
      author_ref: meta.authorRef,
      anon_id: this.anonId,
      session_id: this.sessionId,
      user_id: this.userId,
    });
  }

  optOut() {
    this.optedOut = true;
    this.queue = [];
    safeLocal()?.setItem(OPT_OUT_KEY, '1');
    clearOpenPanel();
  }

  optIn() {
    this.optedOut = false;
    safeLocal()?.removeItem(OPT_OUT_KEY);
    resetOpenPanel();
  }

  isOptedOut() {
    return this.optedOut;
  }

  /** 重置匿名身份（隐私入口用）。 */
  resetIdentity() {
    this.anonId = uuid();
    this.sessionId = uuid();
    safeLocal()?.setItem(ANON_ID_KEY, this.anonId);
    this.writeSession();
    clearOpenPanel();
    identifyOpenPanel({ profileId: this.anonId });
  }

  /** 连点同一控件、约 60s 采一次帧率。失败不影响产品。 */
  private installQualityCollectors() {
    this.qualityCleanup?.();
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let lastKey = '';
    let lastAt = 0;
    let burst = 0;
    const onClick = (event: MouseEvent) => {
      const el = (event.target as Element | null)?.closest?.('button, a, [role="button"]');
      const key = el
        ? `${el.tagName}:${el.getAttribute('aria-label') || el.id || (el as HTMLElement).className || ''}`.slice(0, 80)
        : 'unknown';
      const now = this.now();
      if (key === lastKey && now - lastAt < 800) {
        burst += 1;
        if (burst === 3) this.track('rage_click', { target: key, count: burst });
      } else {
        burst = 1;
      }
      lastKey = key;
      lastAt = now;
    };
    document.addEventListener('click', onClick, true);

    const deltas: number[] = [];
    let lastFrame = performance.now();
    let raf = 0;
    let sampleTimer: ReturnType<typeof setInterval> | null = null;
    const onFrame = (now: number) => {
      deltas.push(now - lastFrame);
      lastFrame = now;
      if (deltas.length > 240) deltas.splice(0, deltas.length - 240);
      raf = window.requestAnimationFrame(onFrame);
    };
    raf = window.requestAnimationFrame(onFrame);
    sampleTimer = setInterval(() => {
      if (deltas.length < 20) return;
      const fps = deltas.map((d) => (d > 0 ? 1000 / d : 0)).sort((a, b) => a - b);
      const at = (p: number) => fps[Math.min(fps.length - 1, Math.floor((fps.length - 1) * p))] ?? 0;
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      this.track('perf_sampled', {
        fps_p50: Math.round(at(0.5)),
        fps_p05: Math.round(at(0.05)),
        draw_calls: 0,
        triangles: 0,
        memory_mb: memory ? Math.round(memory.usedJSHeapSize / 1_048_576) : undefined,
      });
      deltas.length = 0;
    }, 60_000);

    this.qualityCleanup = () => {
      document.removeEventListener('click', onClick, true);
      window.cancelAnimationFrame(raf);
      if (sampleTimer !== null) clearInterval(sampleTimer);
    };
  }

  /** 测试用：拆掉定时器和监听。 */
  dispose() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.qualityCleanup?.();
    this.qualityCleanup = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.onPageHide);
      window.removeEventListener('beforeunload', this.onPageHide);
    }
    this.config = null;
    this.queue = [];
    this.stage = null;
    this.stageDwell = {};
    this.eventCount = 0;
    this.userId = undefined;
    this.failedAssets.clear();
  }

  /** 测试用。 */
  peekQueue(): readonly AnalyticsEnvelope[] {
    return this.queue;
  }
}

export const analytics = new Analytics();
