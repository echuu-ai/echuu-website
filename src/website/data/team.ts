import type { Locale } from '../i18n';

/**
 * 团队名单。内容与 Notion「Echuu Beta 中文文档」的「团队」段落对齐（最后更新 2026.8.28），
 * 外加 Cory 2026-09-30 指定的技术顾问。没有的语言字段回落到 en。
 */
export type TeamMember = {
  id: string;
  /** 显示名：昵称（本名） */
  name: Record<Locale, string>;
  role: Record<Locale, string>;
  bio?: Record<Locale, string>;
  links?: { website?: string; github?: string };
  group: 'core' | 'advisor';
};

export const TEAM: TeamMember[] = [
  {
    id: 'cory',
    group: 'core',
    name: { zh: 'Cory（李艺华）', en: 'Cory Yihua Li', ja: 'Cory（李艺华）', ko: 'Cory (李艺华)' },
    role: { zh: '创始人', en: 'Founder', ja: '創業者', ko: '창업자' },
    bio: {
      zh: '媒体艺术家。纽约大学 ITP 项目硕士（MPS）。工作领域涵盖 3D、人机交互（HCI）研究、前端工程及 AI 角色设计。曾任小红书产品经理。',
      en: 'Media artist. MPS from NYU ITP. Works across 3D, HCI research, front-end engineering and AI character design. Former product manager at Xiaohongshu.',
      ja: 'メディアアーティスト。ニューヨーク大学 ITP 修士（MPS）。3D、HCI 研究、フロントエンド開発、AI キャラクターデザインを手がける。元 小紅書（Xiaohongshu）プロダクトマネージャー。',
      ko: '미디어 아티스트. 뉴욕대학교 ITP 석사(MPS). 3D, HCI 연구, 프런트엔드 엔지니어링, AI 캐릭터 디자인을 다룹니다. 전 샤오홍슈 프로덕트 매니저.',
    },
    links: { website: 'https://coryleeart.com/' },
  },
  {
    id: 'koko',
    group: 'core',
    name: { zh: 'Koko（程晨航）', en: 'Koko Chenhang Cheng', ja: 'Koko（程晨航）', ko: 'Koko (程晨航)' },
    role: { zh: '技术负责人 / CTO', en: 'Tech lead / CTO', ja: '技術責任者 / CTO', ko: '기술 책임자 / CTO' },
  },
  {
    id: 'ajun',
    group: 'core',
    name: { zh: '阿俊', en: 'Ajun', ja: '阿俊', ko: '阿俊' },
    role: { zh: '后端助理', en: 'Back-end assistant', ja: 'バックエンドアシスタント', ko: '백엔드 어시스턴트' },
  },
  {
    id: 'xu-chuyan',
    group: 'core',
    name: { zh: '徐楚燕', en: 'Chuyan Xu', ja: '徐楚燕', ko: '徐楚燕' },
    role: { zh: '创意技术专家', en: 'Creative technologist', ja: 'クリエイティブテクノロジスト', ko: '크리에이티브 테크놀로지스트' },
    links: { website: 'https://mukae1997.github.io/' },
  },
  {
    id: 'zhang-linna',
    group: 'core',
    name: { zh: '张琳娜', en: 'Linna Zhang', ja: '張琳娜', ko: '张琳娜' },
    role: { zh: '用户体验研究', en: 'UX research', ja: 'UX リサーチ', ko: 'UX 리서치' },
  },
  {
    id: 'zhou-shimeng',
    group: 'core',
    name: { zh: '周诗萌', en: 'Shimeng Zhou', ja: '周詩萌', ko: '周诗萌' },
    role: { zh: '市场营销与创作者策略', en: 'Marketing & creator strategy', ja: 'マーケティング / クリエイター戦略', ko: '마케팅 & 크리에이터 전략' },
  },
  {
    id: 'xymri',
    group: 'core',
    name: { zh: 'xymri（Cynthia）', en: 'xymri (Cynthia)', ja: 'xymri（Cynthia）', ko: 'xymri (Cynthia)' },
    role: { zh: '音乐', en: 'Music', ja: '音楽', ko: '음악' },
  },
  {
    id: 'zjp',
    group: 'advisor',
    name: { zh: '张佳鹏（zjp / shadow）', en: 'Jiapeng Zhang (zjp / shadow)', ja: '張佳鵬（zjp / shadow）', ko: '张佳鹏 (zjp / shadow)' },
    role: { zh: '技术顾问', en: 'Technical advisor', ja: '技術アドバイザー', ko: '기술 고문' },
    bio: {
      zh: '前 Vast 算法工程师。',
      en: 'Former algorithm engineer at Vast.',
      ja: '元 Vast アルゴリズムエンジニア。',
      ko: '전 Vast 알고리즘 엔지니어.',
    },
    // GitHub 地址待 Cory 提供；有了再填，不猜测用户名
    links: {},
  },
];
