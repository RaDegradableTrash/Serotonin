import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraPose, screenAction, ROOM_VIEWS } from '../src/roomNavigation.ts';
test('all room poses remain inside the enclosure, including extreme touch input', () => {
  for (const view of ROOM_VIEWS) for (const mobile of [true, false]) for (const close of [true, false]) for (const pan of [-100, -1, 0, 1, 100]) {
    const { position: [x, y, z], fov } = cameraPose(view, pan, close, mobile);
    assert.ok(x > -1.4 && x < 1.4 && z > -1.75 && z < 1.75 && y > 1 && y < 2.5);
    assert.ok(fov >= 40 && fov <= 80);
  }
});
test('CRT icon hit regions map to the correct routes and ignore the desktop background', () => {
  const actions = ['/portfolio', '/terminal', '/insight', '/productivity/', 'room', 'power'];
  actions.forEach((action, i) => assert.equal(screenAction((90 + i % 2 * 180) / 1024, (100 + Math.floor(i / 2) * 150) / 768), action));
  for (const [u, v] of [[.8, .7], [-.1, .1], [.2, 1.1]]) assert.equal(screenAction(u, v), null);
});
