import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dateKey, dayEvents, startOfWeek, overlaps, safeUrl } from '../src/model.ts';
import { fetchCalendar, fetchUnread } from '../src/google.ts';
const event = (id, start, end, extra = {}) => ({ id, start, end, title: id, allDay: false, source: 'local', color: 'teal', notes: '', ...extra });

test('week begins Monday even across a month/year boundary', () => {
  assert.equal(dateKey(startOfWeek(new Date(2027, 0, 3))), '2026-12-28');
  assert.equal(dateKey(addDays(new Date(2026, 11, 31), 1)), '2027-01-01');
});
test('all-day end is exclusive and overnight events appear on both days', () => {
  const items = [event('all', '2026-09-25T00:00', '2026-09-26T00:00', { allDay: true }), event('night', '2026-09-25T23:30', '2026-09-26T01:00')];
  assert.deepEqual(dayEvents(items, new Date(2026, 8, 25)).map(e => e.id), ['all', 'night']);
  assert.deepEqual(dayEvents(items, new Date(2026, 8, 26)).map(e => e.id), ['night']);
});
test('timezone offsets sort by real time; back-to-back events do not conflict', () => {
  const a = event('a', '2026-09-25T09:00:00-07:00', '2026-09-25T10:00:00-07:00');
  const b = event('b', '2026-09-25T15:00:00Z', '2026-09-25T16:00:00Z');
  assert.deepEqual(dayEvents([a, b], new Date(2026, 8, 25)).map(e => e.id), ['b', 'a']);
  assert.equal(overlaps(a, b), false);
  assert.equal(overlaps(a, a), false);
  assert.equal(overlaps(a, event('c', '2026-09-25T16:30:00Z', '2026-09-25T18:00:00Z')), true);
});
test('day navigation retains local midnight through daylight saving', () => {
  const original = new Date(2026, 2, 8); const next = addDays(original, 1);
  assert.equal(next.getHours(), 0); assert.equal(dateKey(next), '2026-03-09');
});
test('shortcut protocols reject script and local file execution', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///C:/secret', 'not a url']) assert.equal(safeUrl(url), false);
  for (const url of ['https://example.com', 'weixin://', 'unityhub://project/example', 'vscode://file/project']) assert.equal(safeUrl(url), true);
});
test('Google events follow pagination, ignore cancelled items, and preserve all-day exclusive ends', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push([url, options]);
    return { ok: true, json: async () => calls.length === 1 ? { items: [{ id: 'one', summary: '全天', status: 'confirmed', start: { date: '2026-09-25' }, end: { date: '2026-09-26' } }], nextPageToken: 'second' } : { items: [{ id: 'cancel', status: 'cancelled' }, { id: 'two', status: 'confirmed', start: { dateTime: '2026-09-25T10:00:00-07:00' }, end: { dateTime: '2026-09-25T11:00:00-07:00' } }] } };
  });
  const result = await fetchCalendar('test-token', new Date(2026, 8, 1), new Date(2026, 9, 1));
  assert.equal(result.length, 2); assert.equal(result[0].allDay, true); assert.equal(result[0].end, '2026-09-26T00:00:00');
  assert.ok(calls[1][0].includes('pageToken=second')); assert.equal(calls[0][1].headers.Authorization, 'Bearer test-token');
  assert.ok(!calls[0][0].includes('test-token'));
});
test('Google errors propagate and Gmail uses actual unread count', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 401 }));
  await assert.rejects(fetchUnread('test'), /授权已过期/);
  globalThis.fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ messagesUnread: 7 }) }));
  assert.equal(await fetchUnread('test'), 7);
});
