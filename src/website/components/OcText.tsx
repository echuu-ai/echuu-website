import { Fragment } from 'react';
import { useLocale } from '../locale-context';
import type { Locale } from '../i18n';

/**
 * 文字里的「OC」变成一个不显眼的链接：跳到「什么是 OC」的百科词条（新标签页）。
 * 外观完全继承周围文字——不加下划线、不加高亮，只有鼠标变成手指、悬停有提示。
 */
const OC_WIKI: Record<Locale, { href: string; title: string }> = {
  zh: { href: 'https://zh.moegirl.org.cn/%E5%8E%9F%E5%88%9B%E8%A7%92%E8%89%B2', title: '什么是 OC（原创角色）？' },
  en: { href: 'https://en.wikipedia.org/wiki/Original_character', title: 'What is an OC (original character)?' },
  ja: { href: 'https://dic.pixiv.net/a/%E3%82%AA%E3%83%AA%E3%82%B8%E3%83%8A%E3%83%AB%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC', title: 'OC（オリジナルキャラクター）とは？' },
  // 韩文维基没有对应词条，用英文维基
  ko: { href: 'https://en.wikipedia.org/wiki/Original_character', title: 'OC(오리지널 캐릭터)란?' },
};

export function OcText({ children }: { children: string }) {
  const { locale } = useLocale();
  const parts = children.split(/(OC)/);
  if (parts.length === 1) return <>{children}</>;
  const wiki = OC_WIKI[locale];
  return (
    <>
      {parts.map((part, i) => (part === 'OC'
        ? <a key={i} className="hv-oc-link" href={wiki.href} target="_blank" rel="noopener noreferrer" title={wiki.title}>OC</a>
        : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}
