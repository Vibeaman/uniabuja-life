import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigator } from '../src/navigation.js';
import { LOCATIONS } from '../src/world.js';
import { interiorStations, INTERIORS } from '../src/interiors.js';

test('direct paths preserve exact tapped destination', () => {
  const nav = createNavigator();
  assert.deepEqual(nav.route({ x: 0, z: 0 }, { x: 9.3, z: -7.2 }), [{ x: 9.3, z: -7.2 }]);
});
test('routes around buildings and circle obstacles; every simplified segment is safe', () => {
  const nav = createNavigator([{ minX: -5, maxX: 5, minZ: -8, maxZ: 8 }], [{ x: -10, z: 12, r: 3 }]);
  const from = { x: -14, z: 0 }, to = { x: 14, z: 0 }, path = nav.route(from, to);
  assert.ok(path.length > 1); let p = from;
  for (const q of path) { assert.ok(nav.clear(p, q)); p = q; }
  assert.deepEqual(path.at(-1), to);
  assert.equal(nav.clear({ x: -10, z: 0 }, { x: 10, z: 0 }), false);
});
test('diagonal corner cuts and thin obstacles are rejected analytically', () => {
  const nav = createNavigator([{ minX: 0.9, maxX: 1.1, minZ: -10, maxZ: 10 }], []);
  assert.equal(nav.clear({ x: 0, z: 0 }, { x: 2, z: 2 }), false);
  assert.equal(nav.clear({ x: 0, z: 0 }, { x: 2, z: 0 }), false);
});
test('blocked, out of bounds and unreachable targets fail instead of teleporting', () => {
  const nav = createNavigator([{ minX: -1, maxX: 1, minZ: -110, maxZ: 110 }]);
  assert.equal(nav.route({ x: -8, z: 0 }, { x: 8, z: 0 }), null);
  assert.equal(nav.route({ x: -8, z: 0 }, { x: 0, z: 0 }), null);
  assert.equal(nav.route({ x: -8, z: 0 }, { x: 120, z: 0 }), null);
});
test('all solid campus buildings have accessible exterior entrance routes', () => {
  const boxes = LOCATIONS.filter(l => !l.kind || l.kind === 'senate').map(l => ({ minX: l.x - l.w / 2, maxX: l.x + l.w / 2, minZ: l.z - l.d / 2, maxZ: l.z + l.d / 2 }));
  const nav = createNavigator(boxes);
  for (const l of LOCATIONS) {
    const destination = { x: l.x + l.door[0] * (l.w / 2 + 2.5), z: l.z + l.door[1] * (l.d / 2 + 2.5) };
    const path = nav.route({ x: 0, z: 90 }, destination);
    assert.ok(path, l.id); let from = { x: 0, z: 90 };
    for (const to of path) { assert.ok(nav.clear(from, to), l.id); from = to; }
  }
});
test('interiors cover every solid building type and keep approach points in clear aisle', () => {
  for (const l of LOCATIONS.filter(l => !l.kind || l.kind === 'senate')) assert.ok(INTERIORS[l.actions], l.id);
  for (const type of Object.keys(INTERIORS)) {
    const stations = interiorStations(type); assert.ok(stations.length >= 2);
    for (const s of stations) { assert.ok(s.approach.x >= 175 && s.approach.x <= 285); assert.doesNotThrow(() => new RegExp(s.pattern, 'i')); }
  }
});
