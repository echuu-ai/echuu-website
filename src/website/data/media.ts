/**
 * 演示素材登记。每条都记录来源与权利状态。
 * rightsStatus = 'approved' 才允许出现在对外页面；
 * 'unverified' 只在内部 moodboard 显示（见 docs/source-audit.md）。
 */
export type RightsStatus = 'approved' | 'unverified' | 'pending-material';

export type MediaItem = {
  id: string;
  /** 事实性名称，缺少角色名时不虚构。 */
  nameKey: string;
  /** 素材来源路径或 URL；没有取得素材时为 null。 */
  src: string | null;
  kind: 'video-embed' | 'image' | 'pending';
  /** 内测演示 / 本地预研演示 */
  statusKey: 'beta' | 'local';
  rightsStatus: RightsStatus;
  creator: string | null;
  creatorNote?: string;
  sourceNote: string;
  aiNote: string;
  youtubeId?: string;
  watchUrl?: string;
};

/**
 * 公开视频：团队已在 Notion 文档中公开的 YouTube 链接。
 * 点击后才加载第三方播放器。
 */
export const INTRO_VIDEO_ITEM: MediaItem = {
  id: 'intro-video',
  nameKey: 'introVideo',
  src: null,
  kind: 'video-embed',
  statusKey: 'beta',
  rightsStatus: 'approved',
  creator: 'Echuu',
  sourceNote: 'Echuu 团队公开发布的介绍视频（YouTube）。',
  aiNote: '视频中角色的对话与语音表演由 AI 生成。',
  youtubeId: 'qvF5M1orvcU',
  watchUrl: 'https://youtu.be/qvF5M1orvcU',
};

/**
 * 09-11 本地预研录制（6 分 24 秒，文件已核对）中的画面。
 * 角色模型的作者与授权尚未确认，因此不进入对外页面。
 */
export const PROTOTYPE_STILLS: MediaItem[] = [
  {
    id: 'proto-idle',
    nameKey: 'protoIdle',
    src: 'idle.jpg',
    kind: 'image',
    statusKey: 'local',
    rightsStatus: 'unverified',
    creator: null,
    creatorNote: '画面中角色模型的作者与授权未确认，不作为 Echuu 原创角色展示。',
    sourceNote: '本地文件 Echuu-预研完整演示-主题-弹幕-礼物-MVP.mp4，00:15。',
    aiNote: '表演内容由本地预研 agent 生成。',
  },
  {
    id: 'proto-script-generating',
    nameKey: 'protoScriptGenerating',
    src: 'script-generating.jpg',
    kind: 'image',
    statusKey: 'local',
    rightsStatus: 'unverified',
    creator: null,
    sourceNote: '同上，01:50，剧本生成中。',
    aiNote: '剧本由 AI 生成。',
  },
  {
    id: 'proto-script-preview',
    nameKey: 'protoScriptPreview',
    src: 'script-preview.jpg',
    kind: 'image',
    statusKey: 'local',
    rightsStatus: 'unverified',
    creator: null,
    sourceNote: '同上，02:48，剧本预览。',
    aiNote: '剧本由 AI 生成。',
  },
  {
    id: 'proto-chat-panel',
    nameKey: 'protoChatPanel',
    src: 'chat-panel.jpg',
    kind: 'image',
    statusKey: 'local',
    rightsStatus: 'unverified',
    creator: null,
    sourceNote: '同上，05:12，聊天面板与角色回应。',
    aiNote: '角色回应由本地预研 agent 生成。',
  },
  {
    id: 'proto-subtitle',
    nameKey: 'protoSubtitle',
    src: 'subtitle.jpg',
    kind: 'image',
    statusKey: 'local',
    rightsStatus: 'unverified',
    creator: null,
    sourceNote: '同上，05:56，字幕与角色表演。',
    aiNote: '台词与语音由 AI 生成。',
  },
];

/** 截帧文件名，实际 URL 由 assets.ts 的 PROTOTYPE_FRAME 拼出。 */

/** 对外 Gallery 只取 approved 项。 */
export const PUBLIC_GALLERY: MediaItem[] = [INTRO_VIDEO_ITEM].filter(
  (item) => item.rightsStatus === 'approved',
);

/** 还没有取得素材的条目，如实显示为待取得，不生成假缩略图。 */
export const PENDING_GALLERY_SLOTS = [
  { id: 'pending-chat', nameKey: 'pendingChat', noteKey: 'pendingChatNote' },
  { id: 'pending-gift', nameKey: 'pendingGift', noteKey: 'pendingGiftNote' },
] as const;

/** 每个语言对素材的事实性名称。 */
export const MEDIA_NAMES: Record<string, Record<string, string>> = {
  zh: {
    introVideo: '介绍视频',
    protoIdle: '预研演示 01 · 角色待机',
    protoScriptGenerating: '预研演示 02 · 剧本生成中',
    protoScriptPreview: '预研演示 03 · 剧本预览',
    protoChatPanel: '预研演示 04 · 聊天面板',
    protoSubtitle: '预研演示 05 · 字幕表演',
    pendingChat: '杂谈演示 · 待取得素材',
    pendingGift: '礼物互动演示 · 待取得素材',
    pendingChatNote: '来源 Notion 06-actual-live.gif，尚未取得文件。',
    pendingGiftNote: '来源 Notion 07-gift-steers-story.gif，尚未取得文件。',
  },
  ja: {
    introVideo: '紹介動画',
    protoIdle: '試作デモ 01 · 待機',
    protoScriptGenerating: '試作デモ 02 · 台本生成中',
    protoScriptPreview: '試作デモ 03 · 台本プレビュー',
    protoChatPanel: '試作デモ 04 · チャットパネル',
    protoSubtitle: '試作デモ 05 · 字幕つきの配信',
    pendingChat: '雑談デモ · 素材は取得待ち',
    pendingGift: 'ギフト連動デモ · 素材は取得待ち',
    pendingChatNote: '出典 Notion 06-actual-live.gif。ファイルは未入手です。',
    pendingGiftNote: '出典 Notion 07-gift-steers-story.gif。ファイルは未入手です。',
  },
  en: {
    introVideo: 'Intro video',
    protoIdle: 'Prototype demo 01 · Idle',
    protoScriptGenerating: 'Prototype demo 02 · Script generating',
    protoScriptPreview: 'Prototype demo 03 · Script preview',
    protoChatPanel: 'Prototype demo 04 · Chat panel',
    protoSubtitle: 'Prototype demo 05 · Subtitled performance',
    pendingChat: 'Chat demo · material pending',
    pendingGift: 'Gift interaction demo · material pending',
    pendingChatNote: 'Source: Notion 06-actual-live.gif. The file has not been obtained.',
    pendingGiftNote: 'Source: Notion 07-gift-steers-story.gif. The file has not been obtained.',
  },
  ko: {
    introVideo: '소개 영상',
    protoIdle: '프로토타입 데모 01 · 대기',
    protoScriptGenerating: '프로토타입 데모 02 · 대본 생성 중',
    protoScriptPreview: '프로토타입 데모 03 · 대본 미리보기',
    protoChatPanel: '프로토타입 데모 04 · 채팅 패널',
    protoSubtitle: '프로토타입 데모 05 · 자막 방송',
    pendingChat: '토크 데모 · 자료 확보 예정',
    pendingGift: '선물 연동 데모 · 자료 확보 예정',
    pendingChatNote: '출처 Notion 06-actual-live.gif. 파일을 아직 확보하지 못했습니다.',
    pendingGiftNote: '출처 Notion 07-gift-steers-story.gif. 파일을 아직 확보하지 못했습니다.',
  },
};
