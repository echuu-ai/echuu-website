import { PLANNED_ORIGIN } from '../seo/siteSeo';
import { LEGAL_AI, LEGAL_MINORS, LEGAL_PRIVACY, LEGAL_TERMS } from '../assets';

/**
 * 站点配置。正式域名、报名接口、社交地址等都从这里读取，
 * 没有确认的项保持 null，页面据此降级，不猜测。
 */

/** 正式地址 https://www.echuu.ai（裸域 echuu.ai 308 跳过来）；索引需 VITE_SITE_INDEXABLE=1 显式启用。 */
export const CANONICAL_ORIGIN = new URL(import.meta.env.VITE_SITE_ORIGIN?.trim() || PLANNED_ORIGIN).origin;

/** 官网挂载路径。与 src/website/router.ts 的 WEBSITE_BASE 一致。 */
export const BASE_PATH = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/website`;

/**
 * 内测报名接口。没有已验证的接口时保持 null，
 * 全站 CTA 自动切换为邮件申请，不显示假的「提交成功」。
 */
export const BETA_SIGNUP_ENDPOINT: string | null =
  (import.meta.env.VITE_BETA_SIGNUP_ENDPOINT as string | undefined) ?? null;

/** 意见箱接口。同上。 */
export const FEEDBACK_ENDPOINT: string | null =
  (import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined) ?? null;

/** 主联系邮箱（官网、法律文档、内测申请展示用）。 */
export const CONTACT_EMAIL = 'cory@echuu.ai';
/** 备用联系邮箱（商务 / 兜底，和主邮箱一起列出、一起收信）。 */
export const CONTACT_EMAIL_ALT = 'cory958014884@gmail.com';
/** mailto 收件人：两个邮箱都收，避免漏掉内测申请 / 反馈 / 联系。 */
export const CONTACT_RECIPIENTS = `${CONTACT_EMAIL},${CONTACT_EMAIL_ALT}`;

/** 只列已取得真实地址的社交账号。 */
export const SOCIAL_LINKS = [
  { id: 'xiaohongshu', label: '小红书', href: 'https://www.xiaohongshu.com/discovery/item/6aa7598600000000260082ce?app_platform=ios&app_version=9.46&share_from_user_hidden=true&xsec_source=app_share&type=video&xsec_token=CBrupst93eg5hDP3eKDcN5QnUWQx0evF1yETMv5parcIU=&author_share=1&xhsshare=CopyLink&shareRedId=ODc2QzNKOE82NzUyOTgwNjY1OTk0O0tK&apptime=1789893332&share_id=17d12c73dafc4882ab3f6e44266931f8' },
  { id: 'x', label: 'X', href: 'https://x.com/Echuu_AIVTUBING' },
  { id: 'youtube', label: 'YouTube', href: 'https://youtu.be/4EOBKoR7OQQ' },
] as const;

/** Beta 文档 / 准备指南。 */
export const BETA_DOC_URL =
  'https://corylinyu.notion.site/Echuu-Beta-39fe9388c38f82b1967e011eba07fb3b';

/** 介绍视频：Notion 中列出的 YouTube 链接。 */
export const INTRO_VIDEO = {
  youtubeId: 'qvF5M1orvcU',
  watchUrl: 'https://youtu.be/qvF5M1orvcU',
  /** 素材真实来源状态：内测演示 / 本地预研演示 */
  status: 'beta' as 'beta' | 'local',
  /** 本地封面帧未取得；使用品牌天空底作为 poster，不伪造视频画面。 */
  poster: null as string | null,
};

/** 直接复用产品 app 既有的条款文件，不复制。 */
export const LEGAL_DOCS = {
  terms: LEGAL_TERMS,
  privacy: LEGAL_PRIVACY,
  ai: LEGAL_AI,
  minors: LEGAL_MINORS,
} as const;

/** 条款定稿状态：2026-10-05 补齐运营主体、服务商、保存期限与删除流程后定稿（四份法律文件同步）。 */
export const LEGAL_FINALIZED = true;

/** Product sign-up remains on the separately deployed product app. */
export const PRODUCT_ORIGIN = (import.meta.env.VITE_PRODUCT_ORIGIN || (import.meta.env.DEV ? "http://localhost:5173" : "https://echuu.live")).replace(/\/$/, "");
