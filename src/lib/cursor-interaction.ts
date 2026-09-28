/** Native editing and controls always win over decorative cursor gestures. */
export const CURSOR_UI_SELECTOR = [
  'button', 'a', 'input', 'textarea', 'select', 'label', 'summary',
  '[contenteditable]:not([contenteditable="false"])', '[draggable="true"]',
  '[role="button"]', '[role="link"]', '[role="textbox"]', '[role="slider"]',
  '[role="checkbox"]', '[role="switch"]', '[role="radio"]', '[role="tab"]',
  '[role="option"]', '[role="combobox"]', '[role="spinbutton"]',
  '[role="menu"]', '[role="menuitem"]', '[role="dialog"]',
  '[data-cursor-interactive]', '[data-tooltip]', '.landing-header', '.landing-footer',
  '.scene-editor', '.cursor-settings', '.stage-tools-menu', '.stage-page-floating-window',
  '.loading-layout-panel', '.vrm-rig-panel', '.app-color-tuner',
  '.landing-orbital-color-panel', '.landing-orbital-motion-panel', '.onboarding-timeline-debug',
].join(',');

export const CURSOR_EDITOR_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
export function isCursorUi(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(CURSOR_UI_SELECTOR));
}
export function canStartCursorFlight(event: PointerEvent, selection = window.getSelection()) {
  return event.pointerType === 'mouse' && event.button === 0 && !event.defaultPrevented
    && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
    && !isCursorUi(event.target) && (!selection || selection.isCollapsed);
}
