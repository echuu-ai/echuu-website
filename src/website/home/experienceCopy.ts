import type { Locale } from '../i18n';

export const EXPERIENCE_COPY: Record<Locale, { wake: string; soundOn: string; soundOff: string; music: string }> = {
  zh: { wake: '直接唤醒角色', soundOn: '开启声音', soundOff: '关闭声音', music: '蝉鸣、风铃与轻微交互音效' },
  en: { wake: 'Wake the character', soundOn: 'Turn sound on', soundOff: 'Turn sound off', music: 'Cicadas, wind chimes & subtle interaction sounds' },
  ja: { wake: 'キャラクターを起こす', soundOn: '音をオンにする', soundOff: '音をオフにする', music: '蝉の声・風鈴・ささやかな操作音' },
  ko: { wake: '캐릭터 깨우기', soundOn: '소리 켜기', soundOff: '소리 끄기', music: '매미·풍경·은은한 인터랙션 효과음' },
};
