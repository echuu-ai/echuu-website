import { canStartCursorFlight, isCursorUi, CURSOR_EDITOR_SELECTOR } from '../lib/cursor-interaction';
import { readUiFlightRoute, sampleUiFlightRoute } from '../lib/ui-cursor-flight';
import { useEffect, useRef, useState } from 'react';
import { sceneCursorFlight, startSceneCursorFlight, moveSceneCursorTarget, releaseSceneCursorFlight, cancelSceneCursorFlight } from '../lib/scene-cursor-flight';
import { updateCursorDepth } from '../lib/cursorDepth';
import { MetalPlaneCursor, type MetalPlaneCursorHandle } from './MetalPlaneCursor';
import { publicUrl } from '../lib/publicUrl';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/** Colorful code-chip trail. Custom cursor + tooltip stay on. */
export const BLEND_CURSOR_TRAIL_VISIBLE = false;

const BASE = 30;
const HOVER = 33;
// Tip of the supplied, horizontally mirrored artwork in the cropped viewport.
const TIP_X = 1.5 * BASE / 42;
const TIP_Y = 1.3 * BASE / 42;
const HOLD_DELAY_MS = 350;
const FLIGHT_DURATION_MS = 2500;
type FlightPoint = { x: number; y: number };
function bezierPoint(a: FlightPoint, b: FlightPoint, c: FlightPoint, d: FlightPoint, t: number): FlightPoint {
  const u = 1 - t;
  return { x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y };
}
const SPAWN_DISTANCE = 18;
const CHIP_LIFE_MS = 1600;
const INSERT_MS = 220;
const CHIP_POOL = 16;
const MAX_ACTIVE_CHIPS = 14;
const INTERACTIVE_SELECTOR = [
  '[data-cursor]',
  '[data-tooltip]',
  'button',
  'a',
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  'summary',
].join(',');
const TOOLTIP_SELECTOR = [
  '[data-tooltip]',
  'button',
  'a',
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  'summary',
].join(',');
const UI_TRAIL_OFF_SELECTOR = [
  TOOLTIP_SELECTOR,
  'input:not([type="hidden"])',
  'textarea',
  'select',
  'label',
  '[role="menuitem"]',
  '[role="tab"]',
  '.landing-header',
  '.landing-footer',
  '.site-language-switcher',
].join(',');
const NATIVE_CURSOR_PANEL_SELECTOR = [
  '.scene-editor',
  '.cursor-settings',
  '.stage-tools-menu',
  '.stage-page-floating-window',
  '.loading-layout-panel',
  '.vrm-rig-panel',
  '.app-color-tuner',
  '.landing-orbital-color-panel',
  '.landing-orbital-motion-panel',
  '.onboarding-timeline-debug',
].join(',');

const SNIPPETS = [
  'w, h = img',
  'field = curl(noise…',
  'z = fbm(vec3 * 0.01)',
  '(target - pos) * sin(time)',
  'hue = (time * 20.0) % 360.0;',
  'warp += noise(p * 4.0) * 0.02;',
  'base.copy()',
  '.size',
  'Path)',
  'p += curl(p) * dt',
] as const;

const CHIP_COLORS = [
  { bg: '#3ecbff', fg: '#001820' },
  { bg: '#ff2d2d', fg: '#ffffff' },
  { bg: '#ff7a1a', fg: '#1a0800' },
  { bg: '#c8ff2e', fg: '#142000' },
  { bg: '#2d5bff', fg: '#ffffff' },
  { bg: '#c9b8ff', fg: '#160e28' },
] as const;

type ChipSlot = {
  el: HTMLSpanElement;
  face: HTMLSpanElement;
  born: number;
  active: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  insertAxis: 'x' | 'y';
  insertFrom: number;
};

function readTooltip(element: Element | null) {
  if (!element) return '';
  const explicit = element.getAttribute('data-tooltip')?.trim();
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  const storedTitle = element instanceof HTMLElement ? element.dataset.nativeTitle?.trim() : '';
  const title = element.getAttribute('title')?.trim();
  const visibleText = element.textContent?.replace(/\s+/g, ' ').trim();
  return (explicit || ariaLabel || storedTitle || title || visibleText || '').slice(0, 80);
}

function suppressNativeTitle(element: Element | null) {
  if (!(element instanceof HTMLElement) || !element.hasAttribute('title')) return;
  element.dataset.nativeTitle = element.getAttribute('title') ?? '';
  element.removeAttribute('title');
}

function restoreNativeTitle(element: Element | null) {
  if (!(element instanceof HTMLElement) || element.dataset.nativeTitle == null) return;
  element.setAttribute('title', element.dataset.nativeTitle);
  delete element.dataset.nativeTitle;
}

function createChipPool(host: HTMLElement): ChipSlot[] {
  const slots: ChipSlot[] = [];
  for (let i = 0; i < CHIP_POOL; i += 1) {
    const el = document.createElement('span');
    el.className = 'blend-cursor-chip';
    el.setAttribute('aria-hidden', 'true');
    const face = document.createElement('span');
    face.className = 'blend-cursor-chip__face';
    el.appendChild(face);
    el.style.opacity = '0';
    host.appendChild(el);
    slots.push({
      el,
      face,
      born: 0,
      active: false,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      insertAxis: 'x',
      insertFrom: 1,
    });
  }
  return slots;
}

function easeOutCubic(t: number) {
  const rest = 1 - t;
  return 1 - rest * rest * rest;
}

function colorForLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash + label.charCodeAt(i) * (i + 1)) % CHIP_COLORS.length;
  }
  return CHIP_COLORS[hash];
}

export default function BlendCursor() {
  const reduced = usePrefersReducedMotion();
  const [imageReady, setImageReady] = useState(false);
  const planeRef = useRef<HTMLDivElement>(null);
  const metalRef = useRef<MetalPlaneCursorHandle>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const size = useRef(BASE);
  const targetSize = useRef(BASE);

  useEffect(() => {
    const pointer = pointerRef.current;
    const trail = trailRef.current;
    const tooltip = tooltipRef.current;
    const plane = planeRef.current;
    if (!pointer || !trail || !tooltip || !plane || !imageReady) return;
    if (!window.matchMedia('(pointer: fine) and (hover: hover)').matches) return;

    const chips = reduced || !BLEND_CURSOR_TRAIL_VISIBLE ? [] : createChipPool(trail);

    pointer.style.opacity = '0';

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let previousX = mx;
    let previousY = my;
    let lastFrame = performance.now();
    let hasPointer = false;
    let pressed = false;
    let pressedAt = 0;
    let flightX = 0;
    let flightY = 0;
    let flightHeading = 0;
    let wingRoll = 0;
    let flightDepth = 0;
    let launched = false;
    let pressX = 0;
    let pressY = 0;
    let flight: { started: number; points: FlightPoint[]; returning: boolean; uiRoute?: boolean } | null = null;
    let flightPosition = { x: mx, y: my };
    let flightVelocity = { x: 0, y: 0 };
    let lastChip: ChipSlot | null = null;
    let lastSpawnX = mx;
    let lastSpawnY = my;
    let snippetIndex = 0;
    let colorIndex = 0;
    let stackIndex = 0;
    let raf = 0;
    let pointerHiddenForPanel = false;
    let activeTooltipTarget: Element | null = null;
    let strokeArmed = false;

    const isChromeUi = (hit: Element | null) => {
      if (!(hit instanceof Element)) return false;
      if (hit.closest(NATIVE_CURSOR_PANEL_SELECTOR)) return true;
      if (hit.closest('.landing-orbital-hit-zone')) return false;
      return Boolean(hit.closest(UI_TRAIL_OFF_SELECTOR));
    };

    const paintTooltip = (label: string) => {
      tooltip.textContent = label;
      tooltip.dataset.visible = label ? 'true' : 'false';
      if (!label) return;
      const color = colorForLabel(label);
      tooltip.style.background = color.bg;
      tooltip.style.color = color.fg;
    };

    const hidePointer = () => {
      cancelSceneCursorFlight();
      pointer.style.opacity = '0';
      document.documentElement.classList.remove('cursor-hidden', 'cursor-native-editing');
      hasPointer = false;
      pressed = false;
      flightX = flightY = flightHeading = 0;
      flight = null;
      tooltip.dataset.visible = 'false';
      restoreNativeTitle(activeTooltipTarget);
      activeTooltipTarget = null;
    };

    const retireChip = (slot: ChipSlot) => {
      slot.active = false;
      slot.el.style.opacity = '0';
      if (lastChip === slot) lastChip = null;
    };

    const clearTrail = (atX: number, atY: number) => {
      for (let i = 0; i < chips.length; i += 1) {
        if (chips[i].active) retireChip(chips[i]);
      }
      lastChip = null;
      lastSpawnX = atX;
      lastSpawnY = atY;
    };

    const overlapsTip = (x: number, y: number, w: number, h: number, tip: ChipSlot) => (
      x < tip.x + tip.w
      && x + w > tip.x
      && y < tip.y + tip.h
      && y + h > tip.y
    );

    const placeAlongPath = (width: number, height: number, atX: number, atY: number) => {
      const x = Math.round(atX);
      let y = Math.round(atY);
      if (lastChip?.active && overlapsTip(x, y, width, height, lastChip)) {
        y = lastChip.y + lastChip.h;
      }
      return { x, y, insertAxis: 'y' as const, insertFrom: -1 };
    };

    const clipForInsert = (axis: 'x' | 'y', from: number, rest: number) => {
      if (axis === 'x') {
        return from < 0 ? `inset(0 ${rest}% 0 0)` : `inset(0 0 0 ${rest}%)`;
      }
      return from < 0 ? `inset(0 0 ${rest}% 0)` : `inset(${rest}% 0 0 0)`;
    };

    const spawnChip = (atX: number, atY: number) => {
      if (chips.length === 0) return;
      const active = chips.filter((item) => item.active);
      if (active.length >= MAX_ACTIVE_CHIPS) {
        const oldest = active.reduce((a, b) => (a.born < b.born ? a : b));
        retireChip(oldest);
      }
      let slot = chips.find((item) => !item.active);
      if (!slot) {
        slot = chips.reduce((oldest, item) => (item.born < oldest.born ? item : oldest));
        retireChip(slot);
      }
      const snippet = SNIPPETS[snippetIndex % SNIPPETS.length];
      const color = CHIP_COLORS[colorIndex % CHIP_COLORS.length];
      snippetIndex += 1;
      colorIndex += 1;
      stackIndex += 1;
      slot.face.textContent = snippet;
      const width = slot.el.offsetWidth;
      const height = slot.el.offsetHeight;
      const placed = placeAlongPath(width, height, atX, atY);
      slot.active = true;
      slot.born = performance.now();
      slot.x = placed.x;
      slot.y = placed.y;
      slot.w = width;
      slot.h = height;
      slot.insertAxis = placed.insertAxis;
      slot.insertFrom = placed.insertFrom;
      slot.el.style.background = color.bg;
      slot.el.style.color = color.fg;
      slot.el.style.zIndex = `${stackIndex}`;
      slot.el.style.opacity = '1';
      slot.el.style.clipPath = clipForInsert(placed.insertAxis, placed.insertFrom, 100);
      slot.el.style.transform = `translate3d(${placed.x}px, ${placed.y}px, 0)`;
      lastChip = slot;
      lastSpawnX = atX;
      lastSpawnY = atY;
    };

    const cancelGesture = () => {
      cancelSceneCursorFlight();
      pressed = false;
      launched = false;
      strokeArmed = false;
      flightX = flightY = flightHeading = 0;
      flight = null;
      wingRoll = flightDepth = 0;
      size.current = targetSize.current;
    };
    const onSelection = () => {
      if (!window.getSelection()?.isCollapsed) cancelGesture();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) cancelGesture();
    };

    const onMove = (event: MouseEvent) => {
      mx = event.clientX;
      my = event.clientY;
      moveSceneCursorTarget(mx, my);
      if (isCursorUi(event.target) || (pressed && !launched && Math.hypot(mx - pressX, my - pressY) > 6)) cancelGesture();
      if (!hasPointer) {
        previousX = mx;
        previousY = my;
        hasPointer = true;
      }
      document.documentElement.classList.add('cursor-hidden');
      if (!flight && !sceneCursorFlight.active) pointer.style.transform = `translate3d(${mx + flightX - TIP_X}px, ${my + flightY - TIP_Y}px, 0)`;
      const overNativePanel = Boolean(
        (event.target as Element | null)?.closest?.(`${NATIVE_CURSOR_PANEL_SELECTOR},${CURSOR_EDITOR_SELECTOR}`),
      );
      pointerHiddenForPanel = overNativePanel;
      document.documentElement.classList.toggle('cursor-native-editing', overNativePanel);
      if (overNativePanel) {
        cancelSceneCursorFlight();
        pressed = false;
        flightX = flightY = flightHeading = 0;
        flight = null;
      }
      pointer.style.opacity = overNativePanel || (sceneCursorFlight.active && sceneCursorFlight.inside) ? '0' : '1';
      if (overNativePanel) {
        tooltip.dataset.visible = 'false';
        restoreNativeTitle(activeTooltipTarget);
        activeTooltipTarget = null;
        return;
      }

      const interactiveHit = (event.target as Element | null)?.closest?.(INTERACTIVE_SELECTOR) ?? null;
      targetSize.current = interactiveHit && !pointerHiddenForPanel ? HOVER : BASE;
      const tooltipHit = (event.target as Element | null)?.closest?.(TOOLTIP_SELECTOR) ?? null;
      if (tooltipHit !== activeTooltipTarget) {
        restoreNativeTitle(activeTooltipTarget);
        suppressNativeTitle(tooltipHit);
        activeTooltipTarget = tooltipHit;
        paintTooltip(readTooltip(tooltipHit));
      }

      const atX = mx + 10;
      const atY = my + 14;
      const hit = event.target as Element | null;
      if (isChromeUi(hit)) {
        strokeArmed = false;
        clearTrail(atX, atY);
        return;
      }

      if (reduced || !strokeArmed) return;
      const dx = atX - lastSpawnX;
      const dy = atY - lastSpawnY;
      if (dx * dx + dy * dy < SPAWN_DISTANCE * SPAWN_DISTANCE) return;
      spawnChip(atX, atY);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!canStartCursorFlight(event) || reduced) { cancelGesture(); return; }
      const hit = event.target as Element | null;
      pressX = event.clientX;
      pressY = event.clientY;
      if (!flight && !sceneCursorFlight.active) pointer.style.transform = `translate3d(${mx - TIP_X}px, ${my - TIP_Y}px, 0)`;
      pressed = true;
      pressedAt = performance.now();
      launched = false;
      if (isChromeUi(hit)) {
        strokeArmed = false;
        return;
      }
      strokeArmed = true;
      lastChip = null;
      lastSpawnX = event.clientX + 10;
      lastSpawnY = event.clientY + 14;
    };

    const onPointerUp = () => {
      releaseSceneCursorFlight();
      pressed = false;
      if (flight && !flight.returning) {
        const distance = Math.hypot(mx - flightPosition.x, my - flightPosition.y);
        const speed = Math.hypot(flightVelocity.x, flightVelocity.y);
        const lead = Math.min(150, distance * 0.45);
        const dx = speed > 0.01 ? flightVelocity.x / speed : 0;
        const dy = speed > 0.01 ? flightVelocity.y / speed : -1;
        // Continue along the current tangent before gently curving back to the hand.
        flight = { started: performance.now(), returning: true, uiRoute: flight.uiRoute, points: [
          { ...flightPosition },
          { x: flightPosition.x + dx * lead, y: flightPosition.y + dy * lead },
          { x: mx + Math.min(90, distance * 0.2), y: my + Math.min(55, distance * 0.15) },
        ] };
      }
      strokeArmed = false;
      lastChip = null;
      if (!pointerHiddenForPanel && hasPointer) paintTooltip(readTooltip(activeTooltipTarget));
    };

    const onLeave = () => hidePointer();
    const onEnter = (event: MouseEvent) => onMove(event);
    const onVisibility = () => { if (document.hidden) hidePointer(); };

    const loop = (now: number) => {
      const dt = Math.min(50, Math.max(1, now - lastFrame));
      lastFrame = now;
      const blend = reduced ? 1 : 1 - Math.exp(-dt / 90);
      const vx = (mx - previousX) * 16.67 / dt;
      const vy = (my - previousY) * 16.67 / dt;
      previousX = mx;
      previousY = my;
      // Controls can appear beneath a stationary pointer (e.g. opening a dialog).
      // Recheck the hit surface before starting or continuing any decorative flight.
      const overUi = hasPointer && isCursorUi(document.elementFromPoint(mx, my));
      if (overUi) cancelGesture();
      if (pressed && !reduced && !launched && now - pressedAt >= HOLD_DELAY_MS) {
        launched = true;
        const uiRoute = readUiFlightRoute(mx, my);
        if (uiRoute) {
          cancelSceneCursorFlight();
          flight = { started: now, returning: false, points: uiRoute, uiRoute: true };
          flightPosition = { x: mx, y: my };
        } else if (!startSceneCursorFlight(mx, my)) {
        const sx = mx < window.innerWidth * 0.5 ? 1 : -1;
        const sy = my < window.innerHeight * 0.5 ? 1 : -1;
        const width = Math.min(680, (sx > 0 ? window.innerWidth - mx : mx) * 0.88);
        const height = Math.min(440, (sy > 0 ? window.innerHeight - my : my) * 0.8);
        const point = (x: number, y: number) => ({
          x: Math.max(32, Math.min(window.innerWidth - 48, mx + sx * width * x)),
          y: Math.max(32, Math.min(window.innerHeight - 48, my + sy * height * y)),
        });
        // Two broad asymmetric Bézier arcs, laid out in the available screen space.
        // The flight is anchored in the scene, so moving the mouse doesn't drag the loop.
        flight = { started: now, returning: false, points: [
          { x: mx, y: my }, point(0.02, 0.4), point(0.70, 0.90), point(0.88, 0.55),
          point(1.06, 0.20), point(0.34, -0.12),
        ] };
        flightPosition = { x: mx, y: my };
        }
      }
      let desiredHeading = 0;
      let depth = 0;
      if (flight) {
        const progress = Math.min(1, (now - flight.started) / (flight.returning ? (flight.uiRoute ? 1100 : 760) : flight.uiRoute ? 10500 : FLIGHT_DURATION_MS));
        // Catch the air on launch, linger at the far turn, then glide back in.
        // The sinusoidal time warp stays monotonic and keeps zero endpoint velocity.
        const t = flight.returning ? easeOutCubic(progress)
          : progress * progress * (3 - 2 * progress)
            + 0.10 * Math.sin(2 * Math.PI * progress) * Math.sin(Math.PI * progress);
        const p = flight.points;
        const destination = { x: mx, y: my };
        const next = flight.returning
          ? bezierPoint(p[0], p[1], p[2], destination, t)
          : flight.uiRoute ? sampleUiFlightRoute(p, t)
          : t < 0.5
            ? bezierPoint(p[0], p[1], p[2], p[3], t * 2)
            : bezierPoint(p[3], p[4], p[5], destination, (t - 0.5) * 2);
        if (!flight.returning && !flight.uiRoute) {
          // A small, tapered crosswind bends the long arc without a repetitive wobble.
          const breeze = Math.sin(Math.PI * progress) ** 2;
          next.x += 9 * breeze * Math.sin(2 * Math.PI * progress);
          next.y += 15 * breeze * Math.sin(3 * Math.PI * progress + 0.4);
        }
        flightVelocity = { x: (next.x - flightPosition.x) / dt, y: (next.y - flightPosition.y) / dt };
        flightPosition = next;
        flightX = next.x - mx;
        flightY = next.y - my;
        if (Math.hypot(flightVelocity.x, flightVelocity.y) > 0.01) {
          desiredHeading = Math.atan2(flightVelocity.y, flightVelocity.x) * 180 / Math.PI + 135;
        } else desiredHeading = flightHeading;
        // Let the plane recede slightly into the distance, then regain its size on approach.
        depth = flight.returning ? 0 : Math.sin(Math.PI * progress);
        const landing = Math.max(0, (progress - 0.82) / 0.18);
        desiredHeading = (((desiredHeading + 180) % 360 + 360) % 360 - 180) * (1 - landing);
        tooltip.dataset.visible = 'false';
        if (progress >= 1) {
          flight = null;
          flightX = flightY = 0;
          desiredHeading = 0;
          if (!pointerHiddenForPanel && hasPointer) paintTooltip(readTooltip(activeTooltipTarget));
        }
      } else flightX = flightY = 0;
      if (sceneCursorFlight.active) {
        flightX = sceneCursorFlight.x - mx;
        flightY = sceneCursorFlight.y - my;
        desiredHeading = sceneCursorFlight.heading;
        tooltip.dataset.visible = 'false';
      }
      pointer.style.opacity = hasPointer && !pointerHiddenForPanel && !(sceneCursorFlight.active && sceneCursorFlight.inside) ? '1' : '0';
      const flying = flight !== null || sceneCursorFlight.active;
      if (!flying) {
        // Ordinary cursor motion is 1:1, with no release glide or residual steering.
        desiredHeading = flightHeading = flightX = flightY = wingRoll = flightDepth = 0;
      }
      const headingDelta = ((desiredHeading - flightHeading + 540) % 360 + 360) % 360 - 180;
      const headingStep = headingDelta * (reduced ? 1 : 1 - Math.exp(-dt / 65));
      const turnLimit = flight?.uiRoute ? dt * (flight.returning ? 0.075 : 0.2) : Infinity;
      flightHeading += Math.max(-turnLimit, Math.min(turnLimit, headingStep));
      flightHeading = ((flightHeading + 180) % 360 + 360) % 360 - 180;
      if (!flying && Math.abs(flightHeading) < 0.1) flightHeading = 0;
      pointer.style.transform = `translate3d(${mx + flightX - TIP_X}px, ${my + flightY - TIP_Y}px, 0)`;
      // 前后层级：被实心表面遮挡，或交给 3D 画布在场景里画（见 lib/cursorDepth.ts）
      const tipX = mx + flightX;
      const tipY = my + flightY;
      const handedTo3d = updateCursorDepth(pointer, tipX, tipY, tipX - TIP_X, tipY - TIP_Y, flightHeading,
        !reduced && hasPointer && !pointerHiddenForPanel && !flying);
      if (handedTo3d) pointer.style.opacity = '0';
      const target = reduced ? BASE : flying ? BASE : pressed ? BASE * 0.92 : targetSize.current;
      size.current += (target - size.current) * blend;
      // Banking changes the wing silhouette, rather than merely spinning a flat icon.
      const targetRoll = reduced ? 0 : flying
        ? Math.max(-18, Math.min(18, headingDelta * .65))
        : 0;
      wingRoll += (targetRoll - wingRoll) * blend;
      flightDepth += ((reduced ? 0 : depth) - flightDepth) * blend;
      if (Math.abs(wingRoll) < 0.01) wingRoll = 0;
      if (flightDepth < 0.001) flightDepth = 0;
      const scale = size.current / BASE * (1 - flightDepth * 0.23);
      const wingTransform = wingRoll === 0 ? '' : ` perspective(240px) rotateY(${wingRoll}deg) rotateX(${wingRoll * 0.3}deg)`;
      const rendered3d = hasPointer && !pointerHiddenForPanel
        && metalRef.current?.draw(reduced ? 0 : wingRoll, 0, flightHeading, reduced || overUi || !hasPointer || pointerHiddenForPanel ? 0 : Math.min(1, Math.hypot(vx, vy) / 12 + (flying ? .6 : 0)), 0, 0);
      plane.style.transform = rendered3d ? `scale(${scale})`
        : `rotate(${flightHeading}deg)${wingTransform} scale(${scale})`;

      for (let i = 0; i < chips.length; i += 1) {
        const slot = chips[i];
        if (!slot.active) continue;
        const age = now - slot.born;
        if (age >= CHIP_LIFE_MS) {
          retireChip(slot);
          continue;
        }
        const insert = easeOutCubic(Math.min(1, age / INSERT_MS));
        const rest = (1 - insert) * 100;
        slot.el.style.clipPath = clipForInsert(slot.insertAxis, slot.insertFrom, rest);
        slot.el.style.transform = `translate3d(${slot.x}px, ${slot.y}px, 0)`;
        const life = age / CHIP_LIFE_MS;
        const fade = life > 0.72 ? 1 - (life - 0.72) / 0.28 : 1;
        slot.el.style.opacity = `${fade}`;
      }

      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      const tooltipX = mx + 22 + tooltipWidth > window.innerWidth - 12
        ? mx - tooltipWidth - 22
        : mx + 22;
      const tooltipY = Math.min(
        window.innerHeight - tooltipHeight - 12,
        Math.max(12, my - tooltipHeight / 2),
      );
      tooltip.style.transform = `translate3d(${tooltipX}px, ${tooltipY}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', cancelGesture, true);
    window.addEventListener('dragstart', cancelGesture);
    document.addEventListener('selectionchange', onSelection);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', cancelGesture, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      cancelSceneCursorFlight();
      restoreNativeTitle(activeTooltipTarget);
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', cancelGesture, true);
      window.removeEventListener('dragstart', cancelGesture);
      document.removeEventListener('selectionchange', onSelection);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', cancelGesture);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      pointer.style.opacity = '0';
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      document.documentElement.classList.remove('cursor-hidden', 'cursor-native-editing');
      trail.replaceChildren();
    };
  }, [imageReady, reduced]);

  return (
    <>
      <div
        ref={trailRef}
        className="blend-cursor-trail"
        hidden={!BLEND_CURSOR_TRAIL_VISIBLE}
        aria-hidden
      />
      <div
        ref={pointerRef}
        className="blend-cursor"
        aria-hidden
        style={{
          width: BASE,
          height: BASE * 482 / 528,
          opacity: 0,
        }}
      >
        <div ref={planeRef} className="blend-cursor__plane" style={{ transformOrigin: `${TIP_X}px ${TIP_Y}px` }}>
        <img
          className="blend-cursor__fallback"
          src={publicUrl('assets/cursor/silver-paper-plane.svg')}
          alt=""
          draggable={false}
          onLoad={() => setImageReady(true)}
          onError={() => setImageReady(false)}
        />
        <MetalPlaneCursor ref={metalRef} />
        </div>
      </div>
      <div ref={tooltipRef} className="cursor-tooltip" data-visible="false" aria-hidden="true" />
    </>
  );
}
