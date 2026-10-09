import test from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/game.js';
import { FURNITURE, ROOM_CATEGORIES, ROOM_LAYOUTS, WALL_COLOURS, RESIDENCE_IDS, ensureRoom, decorateRoom } from '../src/rooms.js';

test('old saves get a starter room in every supported hostel or lodge', () => {
  for (const residence of RESIDENCE_IDS) {
    const s = newState('Mayor', { residence }); s.day = 20;
    const r = ensureRoom(s); assert.equal(r.equipped.bed, 'mattress'); assert.equal(r.equipped.desk, 'starterdesk');
    assert.equal(r.equipped.seat, 'plasticchair'); assert.equal(r.wall, 'cream'); assert.equal(r.layout, 'cosy');
    assert.equal(s.money, 5000); assert.equal(s.day, 20);
    assert.deepEqual(ensureRoom(s), r);
  }
});
test('edits and purchases blocked away from your own home', () => {
  const s = newState('Mayor'); ensureRoom(s); const before = JSON.stringify(s);
  for (const [op, id] of [['furniture', 'bedframe'], ['wall', 'blue'], ['layout', 'study'], ['store', 'bed']]) {
    assert.equal(decorateRoom(s, op, id, false).ok, false);
    assert.equal(JSON.stringify(s), before);
  }
});
test('every furniture item charges once and equips the correct spot', () => {
  for (const item of FURNITURE) {
    const s = newState('Mayor'); s.money = item.price;
    assert.equal(decorateRoom(s, 'furniture', item.id, true).cost, item.price);
    assert.equal(s.money, 0); assert.equal(ensureRoom(s).equipped[item.kind], item.id);
    assert.equal(decorateRoom(s, 'furniture', item.id, true).cost, 0);
    assert.equal(s.money, 0); assert.equal(ensureRoom(s).owned.filter((id) => id === item.id).length, 1);
  }
});
test('cannot overspend or buy invalid furniture', () => {
  const s = newState('Mayor'); s.money = 10; ensureRoom(s); const before = JSON.stringify(s);
  assert.equal(decorateRoom(s, 'furniture', 'bunk', true).ok, false);
  for (const op of ['furniture', 'wall', 'layout', 'store', '__proto__']) assert.equal(decorateRoom(s, op, 'invalid', true).ok, false);
  assert.equal(JSON.stringify(s), before);
});
test('storing retains ownership, gives no refund, and free placing restores item', () => {
  const s = newState('Mayor'); decorateRoom(s, 'furniture', 'armchair', true);
  const money = s.money;
  decorateRoom(s, 'store', 'seat', true); assert.equal(ensureRoom(s).equipped.seat, null);
  assert.ok(ensureRoom(s).owned.includes('armchair')); assert.equal(s.money, money);
  assert.equal(decorateRoom(s, 'furniture', 'armchair', true).cost, 0);
  assert.equal(ensureRoom(s).equipped.seat, 'armchair'); assert.equal(s.money, money);
});
test('all colours and layouts are free and survive reload, including stored empty spots', () => {
  const s = newState('Mayor');
  for (const w of WALL_COLOURS) assert.equal(decorateRoom(s, 'wall', w.id, true).cost, 0);
  for (const l of ROOM_LAYOUTS) assert.equal(decorateRoom(s, 'layout', l.id, true).cost, 0);
  for (const [kind] of ROOM_CATEGORIES) decorateRoom(s, 'store', kind, true);
  const copy = JSON.parse(JSON.stringify(s)); assert.deepEqual(ensureRoom(copy), ensureRoom(s));
  assert.equal(s.money, 5000); assert.ok(Object.values(ensureRoom(copy).equipped).every((v) => v === null));
});
test('room designs stay separate per residence', () => {
  const s = newState('Mayor'); decorateRoom(s, 'furniture', 'bedframe', true); decorateRoom(s, 'wall', 'sage', true);
  s.residence = 'giri'; assert.equal(ensureRoom(s).wall, 'cream'); assert.equal(ensureRoom(s).equipped.bed, 'mattress');
  decorateRoom(s, 'wall', 'rose', true);
  s.residence = 'hostel-ob'; assert.equal(ensureRoom(s).wall, 'sage'); assert.equal(ensureRoom(s).equipped.bed, 'bedframe');
});
test('bad room data is normalised without changing gameplay', () => {
  const s = newState('Mayor'); s.rooms = { 'hostel-ob': { owned: ['bogus', 'armchair', 'armchair'], equipped: { bed: 'bunk', desk: 'armchair' }, wall: 'bad', layout: 'bad' }, 'not-a-residence': {} };
  const room = ensureRoom(s);
  assert.deepEqual(room.owned, ['mattress', 'starterdesk', 'plasticchair', 'armchair']);
  assert.equal(room.equipped.bed, 'mattress'); assert.equal(room.equipped.desk, 'starterdesk');
  assert.equal(room.wall, 'cream'); assert.equal(room.layout, 'cosy'); assert.equal(Object.keys(s.rooms).length, 1);
  assert.equal(s.money, 5000); assert.equal(s.energy, 85);
  s.rooms = null; assert.equal(ensureRoom(s).equipped.bed, 'mattress');
});
