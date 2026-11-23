// Motion constants and equations from productivity/MenuCards.tsx.
export const COUNT = 60;
export const ANCHOR = 20;
export const RADIUS = 8.5;
export const STEP = .045;
export const baseOpacity = (index: number) => index <= ANCHOR
  ? Math.pow(Math.max(0, 1 - (ANCHOR - index) / ANCHOR), 2.2)
  : Math.pow(Math.max(0, 1 - (index - ANCHOR) / (COUNT - 1 - ANCHOR)), 1.8);
export function slotPose(index: number, active: number, progress: number, elapsed: number) {
  const offset = index > active ? -.5 * progress : index < active ? .5 * progress : 0;
  const local = elapsed - Math.abs(index - active) / 37.5;
  const pulse = local < 0 ? 0 : 1.45 * Math.sin(2 * Math.PI * 1.25 * local) * Math.exp(-3.5 * local);
  const phi = (index - ANCHOR + offset) * STEP * (1 + pulse);
  return { x: -RADIUS + RADIUS * Math.cos(phi), z: -RADIUS * Math.sin(phi), phi };
}
// Preserve the original 60 Hz easing at every refresh rate.
export const ease = (rate: number, delta: number) => 1 - Math.pow(1 - rate, Math.min(delta, .05) * 60);
