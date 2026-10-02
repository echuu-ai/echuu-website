import type { CSSProperties } from 'react';
import { TAGLINE_CLIP, toneEquals, useLogoTuning, type LogoTone } from './logoTuning';

const IDENTITY_KEYS = { deepen: 1, blueShift: 0, saturate: 1, brightness: 1 };
const isIdentity = (t: LogoTone) => t.deepen === IDENTITY_KEYS.deepen && t.blueShift === IDENTITY_KEYS.blueShift
  && t.saturate === IDENTITY_KEYS.saturate && t.brightness === IDENTITY_KEYS.brightness;

/** gamma 压深中间调（白色 1 保持 1），红绿压得比蓝多 = 偏蓝；再调饱和度与亮度 */
function ToneFilter({ id, tone }: { id: string; tone: LogoTone }) {
  const blue = tone.deepen;
  const green = tone.deepen * (1 + tone.blueShift * 0.6);
  const red = tone.deepen * (1 + tone.blueShift * 1.4);
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feComponentTransfer>
        <feFuncR type="gamma" amplitude={tone.brightness} exponent={red} offset="0" />
        <feFuncG type="gamma" amplitude={tone.brightness} exponent={green} offset="0" />
        <feFuncB type="gamma" amplitude={tone.brightness} exponent={blue} offset="0" />
      </feComponentTransfer>
      <feColorMatrix type="saturate" values={String(tone.saturate)} />
    </filter>
  );
}

const filterFor = (id: string, tone: LogoTone, shadow: number) => [
  isIdentity(tone) ? '' : `url(#${id})`,
  shadow > 0 ? `drop-shadow(0 6px 20px rgba(0, 40, 90, ${shadow}))` : '',
].filter(Boolean).join(' ') || 'none';

const { top, right, bottom, left } = TAGLINE_CLIP;
/** 字母部分：整张图挖掉标语那一块（evenodd） */
const MARK_CLIP = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}% ${top}%, ${left}% ${100 - bottom}%, ${100 - right}% ${100 - bottom}%, ${100 - right}% ${top}%, ${left}% ${top}%)`;
const TAGLINE_RECT = `inset(${top}% ${right}% ${bottom}% ${left}%)`;

/**
 * 首屏 logo：字母 / 外环和标语分开调色（参数见 logoTuning.ts）。
 * 两者参数相同时只画一张图；不同时叠一张只露出标语的图，底下那张挖掉标语区域。
 */
export function HeroLogo({ src, alt }: { src: string; alt: string }) {
  const tuning = useLogoTuning();
  const split = !toneEquals(tuning.mark, tuning.tagline);
  const markStyle: CSSProperties = {
    filter: filterFor('hv-logo-tone-mark', tuning.mark, tuning.shadow),
    opacity: tuning.mark.opacity,
    clipPath: split ? MARK_CLIP : undefined,
  };
  const taglineStyle: CSSProperties = {
    filter: filterFor('hv-logo-tone-tagline', tuning.tagline, tuning.shadow),
    opacity: tuning.tagline.opacity,
    clipPath: TAGLINE_RECT,
  };
  return (
    <>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <ToneFilter id="hv-logo-tone-mark" tone={tuning.mark} />
          <ToneFilter id="hv-logo-tone-tagline" tone={tuning.tagline} />
        </defs>
      </svg>
      <img className="hv-title__logo" src={src} alt={alt} width={808} height={620} style={markStyle} />
      {split ? <img className="hv-title__logo hv-title__logo--tagline" src={src} alt="" aria-hidden="true" width={808} height={620} style={taglineStyle} /> : null}
    </>
  );
}
