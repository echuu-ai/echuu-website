import { describe, expect, it } from 'vitest';
import { prefersHevcAlpha } from './alphaVideo';

const nav = (userAgent: string, platform = '', maxTouchPoints = 0) => ({ userAgent, platform, maxTouchPoints });

describe('prefersHevcAlpha', () => {
  it('uses HEVC on every iOS WebKit browser, including in-app browsers without "Safari" in the UA', () => {
    expect(prefersHevcAlpha(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49', 'iPhone', 5))).toBe(true);
    expect(prefersHevcAlpha(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0 Mobile/15E148 Safari/604.1', 'iPhone', 5))).toBe(true);
    // iPadOS 伪装成桌面 Mac
    expect(prefersHevcAlpha(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 'MacIntel', 5))).toBe(true);
  });
  it('uses HEVC on desktop Safari only', () => {
    expect(prefersHevcAlpha(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 'MacIntel'))).toBe(true);
    expect(prefersHevcAlpha(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 'MacIntel'))).toBe(false);
    expect(prefersHevcAlpha(nav('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36', 'Linux armv8l', 5))).toBe(false);
    expect(prefersHevcAlpha(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0', 'Win32'))).toBe(false);
  });
});
