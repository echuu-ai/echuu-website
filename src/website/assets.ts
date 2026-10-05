import { publicUrl } from '../lib/publicUrl';

/**
 * 官网素材入口。
 *
 * 绝大部分直接引用产品 app 既有的 `public/` 资源，不再复制一份。
 * 只有为官网重新处理过的派生素材放在 `public/website/`：
 * 原始 Figma 天空图外层是浅灰底（#dfe0e4）不是透明，两个装饰图是黑底白线，
 * 直接放到白底页面会变成灰块/黑块，所以做了抠底与重上色。
 */

/** 复用：产品 app 既有 Figma 导出 */
export const RING_CENTER_A = publicUrl('figma/landing/figma-1146-ellipse-center-a.svg');
export const RING_LEFT = publicUrl('figma/landing/figma-1146-ellipse-left.svg');
export const RING_RIGHT = publicUrl('figma/landing/figma-1146-ellipse-right.svg');
export const WING_MARK = publicUrl('figma/landing/figma-1146-wing-mark.svg');
export const PLAY_ICON = publicUrl('figma/landing/figma-1146-play.svg');
export const SKY_GLOW = publicUrl('figma/landing/figma-1146-sky-glow.png');

/** 复用：礼物图标与条款文件 */
export const GIFT_ENVELOPE = publicUrl('assets/stream-gifts/sealed-envelope.png');
export const GIFT_PEBBLE = publicUrl('assets/stream-gifts/white-pebble.png');
export const LEGAL_TERMS = publicUrl('legal/terms.html');
export const LEGAL_PRIVACY = publicUrl('legal/privacy.html');
export const LEGAL_MINORS = publicUrl('legal/minors.html');
export const LEGAL_AI = publicUrl('legal/ai-content-disclosure.html');

/** 派生：为官网重新处理过 */
export const SKY_BLOB = publicUrl('website/sky-blob.png');
export const ANGEL_DECO = publicUrl('website/angel-deco.png');
export const WING_DECO = publicUrl('website/wing-deco.png');

/** 内部 moodboard 用的预研截帧（noindex，不进对外页面） */
export const PROTOTYPE_FRAME = (name: string) => publicUrl(`website/internal/${name}`);

/**
 * 首页 v2（Figma「Echuu-Website」2038:1044）素材。
 * 由 Figma 图片填充导出并压缩为 WebP / SVG，脚本记录见 docs/website/README.md。
 */
const FIG = (name: string) => publicUrl(`website/figma/${name}`);
export const HOME_ASSETS = {
  skyBg: FIG('sky-bg.webp'),
  heroShot: FIG('hero-shot.webp'),
  opening: {
    lie: FIG('op-01-lie.webp'),
    hand: FIG('op-02-hand.webp'),
    back: FIG('op-03-back.webp'),
    front: FIG('op-04-front.webp'),
    outline01: FIG('op-01-outline.svg'),
    outline02: FIG('op-02-outline.webp'),
    uiList: FIG('op-ui-list.webp'),
    star: FIG('op-star.png'),
    sword: FIG('deco-sword.webp'),
    pegasus: FIG('deco-pegasus.webp'),
    wing: FIG('deco-wing.webp'),
    plane: FIG('deco-plane.webp'),
    /** draw 阶段：黑场里的笔记本纸（Figma Opening-animation-01）；铅笔稿由 3D 睡姿实时生成 */
    paperSheet: FIG('opening-paper/sketch-body.webp'),
  },
  /** 首屏 logo：纯图版（星星 + 光环 + eChuu + 颜文字，不带副标题），Cory 2026-10-03 定稿 */
  logo3d: FIG('logo-pure.png'),
  /** Kling 生成的 logo 出场动画（星星闪 → 光环划出 → 像素字拼出），首屏默认播一次后交给平面 logo */
  logoReveal: { webm: publicUrl('website/loops/logo-reveal.webm'), hevc: publicUrl('website/loops/logo-reveal.mov'), startPoster: publicUrl('website/loops/logo-reveal-start.webp') },
  /** 页脚用的白色 logo（带「你的OC出道舞台」） */
  logoWhite: FIG('logo-white.png'),
  brooch: FIG('brooch.webp'),
  steps: [FIG('step-01.webp'), FIG('step-02.webp'), FIG('step-03.webp')],
  silhouetteGirl: FIG('silhouette-girl.svg'),
  videoPoster: FIG('video-poster.webp'),
  jaggedShape: FIG('jagged-shape.svg'),
  mocapFigure: FIG('mocap-figure.webp'),
  /** 动捕卡片的循环动画（直播间 stream-room/animations/mocap.webm，缩到 384 px；mov 给 Safari） */
  mocapLoop: { webm: publicUrl('website/feature/mocap.webm'), hevc: publicUrl('website/feature/mocap.mov'), poster: publicUrl('website/feature/mocap-poster.webp') },
  gifts: [FIG('gift-onigiri.webp'), FIG('gift-envelope.webp'), FIG('gift-bun.webp'), FIG('gift-croissant.webp')],
  snapshotStamp: FIG('snapshot-stamp.webp'),
  key: FIG('key.webp'),
  keyLeft: FIG('key-left.webp'),
  keyRight: FIG('key-right.webp'),
  runningSilhouette: FIG('running-silhouette.svg'),
  modes: { reaction: FIG('mode-reaction.webp'), song: FIG('mode-song.webp'), talk: FIG('mode-talk.webp') },
  cat: FIG('cat.webp'),
  crosswalk: FIG('crosswalk.webp'),
  creatorsCircle: FIG('creators-circle.webp'),
  footerWings: FIG('footer-wings.webp'),
  /** 上面两张图的短片（Kling 图生视频，抠绿后转码）：webm = VP9 alpha，hevc = Safari 用的 HEVC alpha */
  loops: {
    // 创作者圈：剪影绕着女孩转一圈、停在原图上（只播一次）；startPoster 是第一帧
    creators: { webm: publicUrl('website/loops/creators-circle.webm'), hevc: publicUrl('website/loops/creators-circle.mov'), startPoster: publicUrl('website/loops/creators-circle-start.webp') },
    footerWings: { webm: publicUrl('website/loops/footer-wings.webm'), hevc: publicUrl('website/loops/footer-wings.mov') },
  },
  icons: {
    language: FIG('icon-language.svg'),
    xiaohongshu: FIG('icon-xiaohongshu.svg'),
    bilibili: FIG('icon-bilibili.svg'),
    qq: FIG('icon-qq.svg'),
    discord: FIG('icon-discord.svg'),
    x: FIG('icon-x.svg'),
    heart: FIG('icon-heart.svg'),
    comment: FIG('icon-comment.svg'),
    share: FIG('icon-share.svg'),
    bookmark: FIG('icon-bookmark.svg'),
    star4: FIG('star-4.svg'),
    sparkle: FIG('sparkle.svg'),
  },
} as const;

/** 开场用的角色与动作：与产品 loading 阶段同一份 corynorootbone（含预压缩版） */
export const HOME_OPENING_MODEL = `${publicUrl('assets/loading/corynorootbone.loading.vrm')}?scope=website-opening`;
export const HOME_OPENING_MOTIONS = {
  sleep: publicUrl('assets/animation/mixamo/sleeping-idle.fbx'),
  standUp: publicUrl('assets/animation/mixamo/stand-up.fbx'),
  intro: publicUrl('assets/animation/mate-engine/PET_INTRO_PET_INTRO.vrma'),
  introEnd: publicUrl('assets/animation/mate-engine/PET_INTRO_PET_INTRO_END.vrma'),
  targetLock: publicUrl('assets/animation/vroid/Resources/animations/pv/male/spot_target_locked.vrma'),
} as const;
