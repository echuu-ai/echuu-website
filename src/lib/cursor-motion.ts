export const createCursorMotion = () => ({ vx: 0, vy: 0, heading: 0, blurX: 0, blurY: 0, energy: 0, offsetX: 0, offsetY: 0, glide: 0, throwX: 0, throwY: 0, pitch: 0, armed: 0, quiet: 0, launchHeading: 0 });
/** Velocity-led steering with a brief acceleration kick; all units use a 60Hz-normalized frame. */
export function stepCursorMotion(state: ReturnType<typeof createCursorMotion>, vx: number, vy: number, dt: number, disabled: boolean) {
  if (disabled) { for (const key of Object.keys(state) as (keyof typeof state)[]) state[key] = 0; return; }
  const previousSpeed = Math.hypot(state.vx, state.vy);
  // A quick stroke followed by release launches a short glide, rather than merely rotating in place.
  const rawSpeed = Math.hypot(vx, vy);
  if (state.glide === 0 && rawSpeed > 15) {
    const distance = Math.min(85, rawSpeed * 2.2);
    state.throwX = vx / rawSpeed * distance; state.throwY = vy / rawSpeed * distance;
    state.armed = 1; state.quiet = 0;
  } else if (state.glide === 0 && state.armed) {
    // Don't mistake a gap between 60Hz pointer events on a 120Hz display for release.
    state.quiet += dt;
    if (state.quiet >= 48) { state.glide = .001; state.armed = 0; state.launchHeading = state.heading; }
  }
  if (state.glide > 0) {
    state.glide = Math.min(1, state.glide + dt / 1150);
    const t = state.glide;
    // Continuous outward momentum, a soft apex, then zero-speed arrival back at the pointer.
    const travel = t * (1 - t) ** 3 / .10546875;
    const lift = Math.sin(Math.PI * t) ** 2;
    state.offsetX = state.throwX * travel;
    state.offsetY = state.throwY * travel - 16 * lift;
    state.pitch = -.5 * lift;
    if (t === 1) { state.glide = state.offsetX = state.offsetY = state.pitch = 0; }
  }
  const follow = 1 - Math.exp(-dt / 45);
  state.vx += (vx - state.vx) * follow; state.vy += (vy - state.vy) * follow;
  const speed = Math.hypot(state.vx, state.vy);
  const acceleration = Math.max(0, speed - previousSpeed);
  state.energy += (Math.min(1, speed / 25 + acceleration / 12) - state.energy) * (1 - Math.exp(-dt / 95));
  const angle = ((Math.atan2(state.vy, state.vx) * 180 / Math.PI + 135 + 540) % 360) - 180;
  const continuousAngle = state.heading + ((angle - state.heading + 540) % 360) - 180;
  // Keep a restrained yaw and unwind early, rather than swinging the tail through 180 degrees.
  const targetHeading = state.glide > 0
    ? (state.glide < .25 ? state.launchHeading : 0)
    : Math.max(-75, Math.min(75, continuousAngle)) * Math.min(1, speed / 12);
  const turn = ((targetHeading - state.heading + 540) % 360) - 180;
  const settling = state.glide > .25 || speed < 1;
  const step = turn * (1 - Math.exp(-dt / (settling ? 220 : 120)));
  const maxTurn = (settling ? 75 : 240) * dt / 1000;
  state.heading += Math.max(-maxTurn, Math.min(maxTurn, step));
  state.heading = ((state.heading + 540) % 360) - 180;
  const length = Math.min(6, speed * .16 + state.energy * 2);
  state.blurX = speed > .01 ? state.vx / speed * length : 0;
  state.blurY = speed > .01 ? state.vy / speed * length : 0;
  if (speed < .01 && Math.abs(state.heading) < .1) state.heading = 0;
}
