export type RoomView = 'window' | 'desk' | 'bed';
export type Vec3 = [number, number, number];
export const ROOM_VIEWS: RoomView[] = ['window', 'desk', 'bed'];
export const clampPan = (value: number) => Math.max(-1, Math.min(1, value));
export function cameraPose(view: RoomView, pan: number, close: boolean, mobile: boolean): { position: Vec3; target: Vec3; fov: number } {
  const p = clampPan(pan);
  if (view === 'desk') return {
    position: [close ? (mobile ? .13 : .60) : (mobile ? -.52 : .12), close ? 1.236 : (mobile ? 1.62 : 1.40), -.12 + (close ? 0 : p * .35)],
    target: [1.05, 1.236, -.12 + (close ? 0 : p * .08)],
    fov: mobile ? 64 : close ? 48 : 52,
  };
  if (view === 'window') return { position: [.05 + p * .18, 1.36, -.08], target: [.05 + p * .28, 1.36, -1.72], fov: mobile ? 74 : 66 };
  return { position: [.12, 1.40, -.08 + p * .12], target: [-1.04, 1.10, 1.12 + p * .18], fov: mobile ? 76 : 67 };
}
export const SCREEN_ITEMS = [
  { name: 'WORK', path: '/portfolio', kind: 'folder' },
  { name: 'TERMINAL', path: '/terminal', kind: 'document' },
  { name: 'INSIGHT', path: '/insight', kind: 'document' },
  { name: 'FOCUS', path: '/productivity/', kind: 'folder' },
  { name: 'ROOM', path: 'room', kind: 'window' },
  { name: 'POWER', path: 'power', kind: 'power' },
] as const;
export function screenAction(u: number, v: number) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  const x = u * 1024, y = v * 768;
  const index = SCREEN_ITEMS.findIndex((_, i) => {
    const left = 48 + (i % 2) * 180, top = 56 + Math.floor(i / 2) * 150;
    return x >= left && x <= left + 134 && y >= top && y <= top + 123;
  });
  return index < 0 ? null : SCREEN_ITEMS[index].path;
}
