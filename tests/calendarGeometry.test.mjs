import test from 'node:test';
import assert from 'node:assert/strict';
import { pointInQuad, minuteDate, dragRange } from '../src/calendarGeometry.ts';

test('pointer mapping inverts perspective, rotation and translation', () => {
  const project = (x, y) => ({ x: (700 * x + 80 * y + 320) / (.2 * x + .1 * y + 1), y: (40 * x + 600 * y + 180) / (.2 * x + .1 * y + 1) });
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => project(x, y));
  for (const [x, y] of [[0, 0], [.5, .5], [.15, .92], [1, 1], [.7, 1.2]]) {
    const mapped = pointInQuad(project(x, y), corners);
    assert.ok(Math.abs(mapped.x - x) < 1e-8);
    assert.ok(Math.abs(mapped.y - y) < 1e-8);
  }
});

test('15 minute snapping continues through both midnight boundaries', () => {
  const day = new Date(2026, 8, 30);
  const next = minuteDate(day, 1470), previous = minuteDate(day, -30);
  assert.equal(next.getMonth(), 9); assert.equal(next.getDate(), 1); assert.equal(next.getMinutes(), 30);
  assert.equal(previous.getDate(), 29); assert.equal(previous.getHours(), 23);
  assert.equal(minuteDate(day, 568).getMinutes(), 30);
  assert.equal(minuteDate(day, 580).getMinutes(), 45);
});

test('forward and reverse overnight selections produce identical ranges', () => {
  const a = new Date(2026, 11, 31, 23, 30), b = new Date(2027, 0, 1, 0, 30);
  assert.deepEqual(dragRange(a, b), { start: a, end: b });
  assert.deepEqual(dragRange(b, a), { start: a, end: b });
  assert.equal(dragRange(a, a).end.getTime() - a.getTime(), 15 * 60_000);
});
