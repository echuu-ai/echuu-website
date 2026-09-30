// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { canStartCursorFlight } from './cursor-interaction';

afterEach(() => document.body.replaceChildren());
function allowed(target: Element) {
  let result: boolean | undefined;
  target.addEventListener('pointerdown', event => {
    result = canStartCursorFlight(event as PointerEvent, null);
  }, { once: true });
  target.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', button: 0, bubbles: true, composed: true }));
  return result;
}
describe('decorative flight respects UI', () => {
  it.each(['button', 'a', 'label', 'input', 'textarea', 'select', 'summary', '[role=dialog]', '[tabindex=0]'])(
    'does not launch on %s or its content', selector => {
      const el = document.createElement(selector.startsWith('[') ? 'div' : selector);
      if (selector === '[role=dialog]') el.setAttribute('role', 'dialog');
      if (selector === '[tabindex=0]') el.setAttribute('tabindex', '0');
      document.body.append(el);
      expect(allowed(el)).toBe(false);
      if (!['input', 'textarea', 'select'].includes(selector)) {
        const child = document.createElement('span'); el.append(child);
        expect(allowed(child)).toBe(false);
      }
    });
  it('still allows deliberate gestures on the decorative background', () => {
    const background = document.createElement('div'); document.body.append(background);
    expect(allowed(background)).toBe(true);
  });
});
