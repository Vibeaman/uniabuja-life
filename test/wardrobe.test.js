import test from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/game.js';
import { OUTFITS, HAIRSTYLES, SKIN_TONES, ensureWardrobe, changeAppearance } from '../src/wardrobe.js';
import { makeCharacter, applyCharacterAppearance, animateWalk } from '../src/character.js';

test('old saves get free starters without losing progress', () => {
  const s = newState('Mayor'); s.money = 1234; s.day = 12;
  ensureWardrobe(s); ensureWardrobe(s);
  assert.deepEqual(s.ownedOutfits, ['campus', 'casual']);
  assert.deepEqual(s.appearance, { outfit: 'campus', hair: 'short', skin: 'brown' });
  assert.equal(s.money, 1234); assert.equal(s.day, 12);
});
test('buy once, equip immediately, switch later without paying again', () => {
  const s = newState('Mayor');
  assert.equal(changeAppearance(s, 'outfit', 'ankara').cost, 2500);
  assert.equal(s.money, 2500); assert.equal(s.appearance.outfit, 'ankara');
  changeAppearance(s, 'outfit', 'casual');
  assert.equal(changeAppearance(s, 'outfit', 'ankara').cost, 0);
  assert.equal(s.money, 2500);
  assert.equal(changeAppearance(s, 'outfit', 'ankara').changed, false);
  assert.equal(s.ownedOutfits.filter((id) => id === 'ankara').length, 1);
});
test('insufficient funds and invalid selections do not charge or equip', () => {
  const s = newState('Mayor'); s.money = 200;
  ensureWardrobe(s);
  const before = JSON.stringify(s);
  assert.equal(changeAppearance(s, 'outfit', 'asooke').ok, false);
  assert.equal(changeAppearance(s, 'outfit', 'nope').ok, false);
  assert.equal(changeAppearance(s, 'hair', 'nope').ok, false);
  assert.equal(changeAppearance(s, '__proto__', 'nope').ok, false);
  assert.equal(JSON.stringify(s), before);
});
test('all outfits can be purchased; exact balance is allowed', () => {
  for (const o of OUTFITS) {
    const s = newState('Mayor'); s.money = o.price;
    assert.equal(changeAppearance(s, 'outfit', o.id).ok, true);
    assert.equal(s.appearance.outfit, o.id); assert.equal(s.money, 0);
  }
});
test('hair and skin are free and saved with ownership after JSON reload', () => {
  const s = newState('Mayor');
  changeAppearance(s, 'outfit', 'adire');
  for (const h of HAIRSTYLES) assert.equal(changeAppearance(s, 'hair', h.id).cost, 0);
  for (const t of SKIN_TONES) assert.equal(changeAppearance(s, 'skin', t.id).cost, 0);
  const reloaded = JSON.parse(JSON.stringify(s)); ensureWardrobe(reloaded);
  assert.deepEqual(reloaded.appearance, s.appearance);
  assert.deepEqual(reloaded.ownedOutfits, s.ownedOutfits); assert.equal(reloaded.money, 2800);
});
test('invalid appearance fields are repaired and unowned outfits not equipped', () => {
  const s = newState('Mayor'); s.appearance = { outfit: 'asooke', hair: 'unknown', skin: 'unknown' };
  s.ownedOutfits = ['invalid', 'casual', 'casual']; ensureWardrobe(s);
  assert.deepEqual(s.appearance, { outfit: 'campus', hair: 'short', skin: 'brown' });
  assert.deepEqual(s.ownedOutfits, ['campus', 'casual']);
  s.appearance = null; ensureWardrobe(s); assert.equal(s.appearance.outfit, 'campus');
});
test('rendered character updates hair, skin and clothes without replacing movement limbs', () => {
  const ch = makeCharacter(); const limbs = ch.userData.limbs;
  for (const h of HAIRSTYLES) {
    applyCharacterAppearance(ch, { outfit: 'casual', hair: h.id, skin: 'deep' });
    assert.equal(ch.userData.appearanceParts.hairId, h.id);
    assert.ok(ch.userData.appearanceParts.hairGroup.children.length > 0);
    animateWalk(ch, 1, 1); assert.equal(ch.userData.limbs, limbs);
  }
  assert.equal(ch.userData.appearanceParts.skinM.color.getHexString(), '5a3418');
  assert.equal(ch.userData.appearanceParts.shirtM.color.getHexString(), '2563eb');
});
