import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Import JSON normally through Vite; Node 22+ requires import attributes, so use a temporary module copy.
const code = readFileSync(new URL('../src/geography.js', import.meta.url), 'utf8')
  .replace("import geometry from './map-geometry.json';", `const geometry=${readFileSync(new URL('../src/map-geometry.json', import.meta.url), 'utf8')};`)
  .replace("import places from './map-places.json';", `const places=${readFileSync(new URL('../src/map-places.json', import.meta.url), 'utf8')};`);
const geo = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
test('projection is north-up, east-right, with correct geographic scale', () => {
  const p = geo.projector([8.94, 7.05, 9.02, 7.23]);
  assert.ok(p.point([9, 7.1])[1] < p.point([8.95, 7.1])[1]);
  assert.ok(p.point([9, 7.2])[0] > p.point([9, 7.1])[0]);
  assert.ok(Math.abs(geo.distanceKm([0,0], [0,1]) - 111.195) < .01);
});
test('main campus and mini campus are distinct, Law is not falsely on Main Campus', () => {
  const main = geo.GEO_PLACES.find(p => p.id === 'main'), mini = geo.GEO_PLACES.find(p => p.id === 'mini');
  assert.ok(geo.distanceKm(main.point, mini.point) > 10);
  assert.equal(mini.travelId, 'gwagwalada');
  assert.equal(geo.GEO_PLACES.find(p => p.id === 'law-mini').gameId, undefined);
});
test('all views render offline geometry, sourced markers, north and scale', () => {
  for (const v of geo.GEO_VIEWS) {
    const result = geo.geographicMap(v.id, '', null);
    assert.ok(result.visible.length);
    assert.ok(result.svg.includes('N ↑'));
    assert.ok(!result.svg.includes('NaN'));
    assert.ok(!result.svg.includes('iframe'));
  }
});
test('travel options respect away state and disclose approximations and licensing', () => {
  const areas = [{id:'giri',name:'Giri',fare:300,mins:15}];
  const panel = geo.mapPanel('giri', 'giri', {away:null}, areas);
  assert.ok(panel.includes('data-ride="giri"'));
  assert.ok(panel.includes('ODbL'));
  assert.ok(panel.includes('not a road route'));
  const away = geo.mapPanel('giri', 'giri', {away:'iddo'}, areas);
  assert.ok(!away.includes('data-ride="giri"'));
  assert.ok(away.includes('data-ride="keke"'));
});
