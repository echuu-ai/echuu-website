import { describe, expect, it } from 'vitest';
import { formatInviteCode, generateInviteCode, isWellFormedInviteCode, normalizeInviteCode } from './inviteCode';

describe('invite code format', () => {
  it('generates well-formed ECHU-XXXX-XXXX-C codes', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateInviteCode();
      expect(code).toMatch(/^ECHU-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z*~$=U]$/);
      expect(isWellFormedInviteCode(code)).toBe(true);
    }
  });

  it('accepts sloppy input: lowercase, spaces, no dashes, O/I/L look-alikes', () => {
    const code = generateInviteCode(() => Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]));
    const compact = normalizeInviteCode(code);
    expect(isWellFormedInviteCode(compact.toLowerCase())).toBe(true);
    expect(isWellFormedInviteCode(`echu ${compact.slice(0, 4)} ${compact.slice(4)}`)).toBe(true);
    // 0 / 1 写成 O / I 也认
    expect(isWellFormedInviteCode(code.replace('-0', '-O'))).toBe(true);
    expect(formatInviteCode(compact)).toBe(code);
  });

  it('catches a single wrong character and adjacent swaps locally', () => {
    let caught = 0;
    let total = 0;
    for (let n = 0; n < 50; n += 1) {
      const body = normalizeInviteCode(generateInviteCode());
      for (let i = 0; i < 8; i += 1) {
        const wrong = body.slice(0, i) + (body[i] === 'A' ? 'B' : 'A') + body.slice(i + 1);
        total += 1; if (!isWellFormedInviteCode(wrong)) caught += 1;
        if (i < 7 && body[i] !== body[i + 1]) {
          const swapped = body.slice(0, i) + body[i + 1] + body[i] + body.slice(i + 2);
          total += 1; if (!isWellFormedInviteCode(swapped)) caught += 1;
        }
      }
    }
    expect(caught).toBe(total);
  });

  it('rejects wrong length and foreign characters', () => {
    expect(isWellFormedInviteCode('ECHU-1234')).toBe(false);
    expect(isWellFormedInviteCode('ECHU-12#4-5678-9')).toBe(false);
  });
});
