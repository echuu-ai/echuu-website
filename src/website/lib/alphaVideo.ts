/**
 * 透明底视频选源：WebM VP9 alpha 还是 HEVC alpha（.mov）。
 *
 * 苹果的 WebKit（macOS Safari，以及 iPhone / iPad 上的所有浏览器——微信、QQ、小红书内置浏览器、iOS Chrome 都是 WebKit）
 * 能播 WebM 但会丢掉 alpha，画面变成黑底或一片噪点；它们必须用 HEVC alpha。
 * 不能靠 UA 里有没有 "Safari"：微信等内置浏览器的 UA 不带 Safari。
 */
export function prefersHevcAlpha(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> & { platform?: string } = navigator) {
  const ua = nav.userAgent;
  // iPhone / iPod / iPad（iPadOS 13+ 伪装成 Mac：MacIntel + 触屏）
  if (/iPhone|iPod|iPad/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)) return true;
  // macOS 上的 Safari（排除 Chrome / Edge / Firefox / Opera，它们用自己的解码器，WebM alpha 正常）
  return /Macintosh/.test(ua) && /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(ua);
}

export function alphaVideoSource(webm: string, hevc: string) {
  if (typeof navigator === 'undefined') return webm;
  return prefersHevcAlpha(navigator) ? hevc : webm;
}
