export type Point = { x: number; y: number };
export const HOUR_HEIGHT = 64;
export const DAY_HEIGHT = 24 * HOUR_HEIGHT;
export const SNAP_MINUTES = 15;

// Inverse projective mapping: an ordinary bounding rect is incorrect for a
// calendar rendered in the label's actual 3D plane.
export function pointInQuad(point: Point, corners: Point[]): Point {
  const target = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const rows: number[][] = [];
  corners.forEach(({ x, y }, i) => {
    const { x: u, y: v } = target[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    if (Math.abs(divisor) < 1e-10) return { x: 0, y: 0 };
    for (let j = col; j <= 8; j++) rows[col][j] /= divisor;
    for (let row = 0; row < 8; row++) if (row !== col) {
      const factor = rows[row][col];
      for (let j = col; j <= 8; j++) rows[row][j] -= factor * rows[col][j];
    }
  }
  const h = rows.map(row => row[8]), denominator = h[6] * point.x + h[7] * point.y + 1;
  return { x: (h[0] * point.x + h[1] * point.y + h[2]) / denominator, y: (h[3] * point.x + h[4] * point.y + h[5]) / denominator };
}
export function localPoint(element: HTMLElement, point: Point): Point {
  const corners = Array.from(element.querySelectorAll<HTMLElement>(':scope > .plane-corner')).map(marker => {
    const rect = marker.getBoundingClientRect(); return { x: rect.left, y: rect.top };
  });
  if (corners.length !== 4) return { x: 0, y: 0 };
  const normalized = pointInQuad(point, corners);
  return { x: normalized.x * element.clientWidth, y: normalized.y * element.clientHeight };
}
export function minuteDate(day: Date, minutes: number): Date {
  const result = new Date(day); result.setHours(0, Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES, 0, 0); return result;
}
export function dragRange(anchor: Date, focus: Date): { start: Date; end: Date } {
  const start = new Date(Math.min(anchor.getTime(), focus.getTime()));
  const end = new Date(Math.max(anchor.getTime(), focus.getTime()));
  if (start.getTime() === end.getTime()) end.setMinutes(end.getMinutes() + SNAP_MINUTES);
  return { start, end };
}
