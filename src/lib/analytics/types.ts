/**
 * 埋点事件契约。事件清单和「每个事件回答什么问题」见 docs/analytics-taxonomy.md。
 *
 * 命名是 `名词_动词过去式`，不是 `click_xxx` —— 以控件为中心的名字过半年就没人
 * 知道指的是哪个按钮了。
 */

export type StageName = 'loading' | 'landing' | 'playground' | 'onboarding' | 'live' | 'ending';

export type OnboardingStep = 'character' | 'persona' | 'topic';

export type AssetKind = 'scene' | 'hdr' | 'character' | 'motion' | 'voice' | 'persona' | 'bgm';

export type LiveTool = 'character' | 'live' | 'sound' | 'scene' | 'calendar' | 'webcam';

export type FeatureSurface = 'live' | 'audience' | 'playground';

/** 用来算「每个功能用了多少次 / 多少人」。打开面板不算，真正用了才打。 */
export type FeatureName =
  | 'character'
  | 'broadcast'
  | 'sound'
  | 'scene'
  | 'calendar'
  | 'mocap'
  | 'agent_mode'
  | 'mode_storytelling'
  | 'mode_reaction'
  | 'mode_singing'
  | 'chat'
  | 'gift'
  | 'ratio'
  | 'caption'
  | 'polaroid'
  | 'stream_toggle'
  | 'voice_input'
  | 'story_token'
  | 'tangent'
  | 'script_go_live'
  | 'audio_unlock'
  | 'diary'
  | 'audience_chat'
  | 'audience_follow'
  | 'audience_switch'
  | 'playground_create'
  | 'playground_watch'
  | 'replay';

/** 事件名 → 专有属性。公共属性由 SDK 自动补齐，不在这里声明。 */
export type AnalyticsEventMap = {
  app_opened: { referrer: string; is_returning: boolean };
  stage_entered: { stage: StageName; from_stage: StageName | null; ms_since_open: number };
  session_summary: {
    duration_ms: number;
    stage_dwell_ms: Partial<Record<StageName, number>>;
    event_count: number;
    end_reason: 'unload' | 'idle_timeout';
  };

  auth_started: { method: 'signup' | 'login'; entry: string };
  auth_succeeded: { method: 'signup' | 'login' };
  auth_failed: { method: 'signup' | 'login'; reason: string };

  onboarding_started: Record<string, never>;
  onboarding_step_completed: { step: OnboardingStep; step_index: number; dwell_ms: number };
  onboarding_abandoned: { last_step: OnboardingStep; dwell_ms: number };
  onboarding_completed: {
    total_ms: number;
    character_id?: string;
    persona_card_id?: string;
    voice_id?: string;
  };

  live_entered: { is_first_time: boolean; role: 'host' | 'audience' };
  feature_used: { feature: FeatureName; surface: FeatureSurface; asset_id?: string };
  stream_started: { platform?: string; agent_mode: string; has_stream_key: boolean };
  stream_ended: {
    duration_ms: number;
    end_reason: string;
    interaction_count: number;
    gift_count: number;
  };
  agent_interaction: { kind: 'chat_reply' | 'gift_reaction' | 'motion' | 'caption'; latency_ms?: number };
  agent_mode_changed: { from: string; to: string };
  tool_opened: { tool: LiveTool };
  mocap_toggled: { enabled: boolean; source: 'webcam' | 'vmc' };

  asset_selected: { kind: AssetKind; asset_id: string; surface: string };
  asset_load_failed: { kind: AssetKind; asset_id: string; reason: string; bytes?: number };

  perf_sampled: {
    fps_p50: number;
    fps_p05: number;
    draw_calls: number;
    triangles: number;
    memory_mb?: number;
  };
  error_occurred: { scope: string; message: string; fatal: boolean };
  rage_click: { target: string; count: number };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type DeviceInfo = {
  ua_family: string;
  os: string;
  is_mobile: boolean;
  screen_w: number;
  screen_h: number;
  dpr: number;
};

/** 落到 S3 的一行 NDJSON。 */
export type AnalyticsEnvelope = {
  event: AnalyticsEventName;
  event_id: string;
  ts: number;
  anon_id: string;
  session_id: string;
  user_id?: string;
  stage: StageName | null;
  app_version: string;
  locale: string;
  device: DeviceInfo;
  props: Record<string, unknown>;
};
