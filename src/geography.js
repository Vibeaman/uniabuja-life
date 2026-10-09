// Local, north-up geographic map. No tile server or tracking requests required.
import geometry from './map-geometry.json';
import places from './map-places.json';

export const GEO_PLACES = places;
export const GEO_VIEWS = [
  { id: 'region', name: 'Region', bounds: [8.94, 7.052, 9.018, 7.224] },
  { id: 'main', name: 'Main Campus', bounds: [8.967, 7.163, 8.989, 7.19] },
  { id: 'giri', name: 'Giri Junction', bounds: [8.99, 7.132, 9.016, 7.173] },
  { id: 'iddo', name: 'Iddo Sarki', bounds: [8.97, 7.19, 8.997, 7.222] },
  { id: 'gwagwalada', name: 'Gwagwalada', bounds: [8.943, 7.054, 8.965, 7.085] },
];
export function projector(bounds, width = 320, height = 320) {
  const [south, west, north, east] = bounds;
  const cos = Math.cos((south + north) / 2 * Math.PI / 180);
  const scale = Math.min((width - 32) / ((east - west) * cos), (height - 32) / (north - south));
  const mx = (east + west) / 2, my = (north + south) / 2;
  return {
    point: ([lat, lon]) => [width / 2 + (lon - mx) * cos * scale, height / 2 - (lat - my) * scale],
    pixelsPerKm: scale / 111.32,
  };
}
export function distanceKm(a, b) {
  const rad = Math.PI / 180, dlat = (b[0] - a[0]) * rad, dlon = (b[1] - a[1]) * rad;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function inBounds(point, bounds) {
  return point[0] >= bounds[0] && point[0] <= bounds[2] && point[1] >= bounds[1] && point[1] <= bounds[3];
}
export function geographicMap(viewId, selectedId, away) {
  const view = GEO_VIEWS.find((v) => v.id === viewId) || GEO_VIEWS[0];
  const projection = projector(view.bounds), p = projection.point;
  const path = (points) => points.map((pt, i) => `${i ? 'L' : 'M'}${p(pt).map((n) => n.toFixed(1)).join(',')}`).join('');
  let svg = '<svg class="geo-map" viewBox="0 0 320 320" role="img" aria-label="Geographic roads and landmarks, north at top"><defs><clipPath id="geo-clip"><rect width="320" height="320"/></clipPath></defs><rect width="320" height="320" fill="#e7eedf"/><g clip-path="url(#geo-clip)">';
  for (const shape of [...geometry.polygons].sort((a, b) => Number(b.kind === 'university') - Number(a.kind === 'university'))) {
    if (!shape.points.some((pt) => inBounds(pt, view.bounds))) continue;
    svg += `<path d="${path(shape.points)}Z" fill="${shape.kind === 'university' ? '#b9d7a8' : '#c7cbbb'}" stroke="#a4b595" stroke-width=".4"/>`;
  }
  for (const road of geometry.roads) {
    if (!road.points.some((pt) => inBounds(pt, view.bounds))) continue;
    const major = ['trunk', 'primary', 'secondary'].includes(road.kind);
    svg += `<path d="${path(road.points)}" fill="none" stroke="${major ? '#d4984c' : '#fff'}" stroke-width="${major ? 2.8 : 1.2}" stroke-linejoin="round"><title>${esc(road.name || road.kind)}</title></path>`;
  }
  // At regional zoom, town/campus markers only; close views expose buildings.
  const visible = places.filter((place) => inBounds(place.point, view.bounds) && (view.id !== 'region' || place.overview));
  visible.forEach((place, index) => {
    const [x, y] = p(place.point), selected = selectedId === place.id;
    const label = view.id === 'region' ? `${index + 1}. ${place.id === 'main' ? 'Main Campus' : place.id === 'mini' ? 'Mini Campus' : place.name}` : index + 1;
    svg += `<g data-geo-place="${place.id}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${selected ? 7 : 5}" fill="${selected ? '#f59e0b' : '#176b4c'}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y - 9}" text-anchor="middle" font-size="10" font-weight="bold" fill="#142d25" stroke="#e7eedf" stroke-width="3" paint-order="stroke">${esc(label)}</text></g>`;
  });
  const current = places.find((place) => away ? place.travelId === away && place.overview : place.id === 'main');
  if (current && inBounds(current.point, view.bounds)) {
    const [x, y] = p(current.point);
    svg += `<circle cx="${x + 9}" cy="${y}" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"><title>Current area (not GPS)</title></circle>`;
  }
  const km = view.id === 'region' ? 2 : 0.5;
  svg += `</g><text x="295" y="20" font-size="12" fill="#142d25">N ↑</text><path d="M16,300h${(km * projection.pixelsPerKm).toFixed(1)}" stroke="#142d25" stroke-width="3"/><text x="16" y="290" font-size="11" fill="#142d25">${km < 1 ? km * 1000 + ' m' : km + ' km'}</text></svg>`;
  return { svg, visible, view, current };
}
export function mapPanel(viewId, selectedId, state, areas) {
  const { svg, visible, current } = geographicMap(viewId, selectedId, state.away);
  const selected = places.find((place) => place.id === selectedId) || visible[0];
  let detail = '';
  if (selected) {
    const area = areas.find((a) => a.id === selected.travelId);
    const trip = area && !state.away ? `<button class="ph-row ph-btn" data-ride="${area.id}"><span>Keke to ${esc(area.name)}<small>Game estimate · ${area.mins} min</small></span><b>₦${area.fare}</b></button>`
      : state.away ? '<button class="ph-row ph-btn" data-ride="keke"><span>Return to Main Campus</span><b>›</b></button>'
      : selected.gameId ? `<button class="ph-row ph-btn" data-guide="${selected.gameId}"><span>Walk there in the 3D game</span><b>›</b></button>` : '';
    detail = `<section class="geo-detail"><b>${esc(selected.name)}</b><p>${esc(selected.note)}</p><small>${selected.point.map((n) => n.toFixed(5)).join(', ')} · mapped reference point</small>${current && current.id !== selected.id ? `<p>${distanceKm(current.point, selected.point).toFixed(1)} km straight-line from your current area; not a road route.</p>` : ''}${trip}<a href="${esc(selected.source)}" target="_blank" rel="noopener noreferrer">Location source ↗</a></section>`;
  }
  return `<div class="ph-chips">${GEO_VIEWS.map((v) => `<button data-geo-view="${v.id}" class="${viewId === v.id ? 'on' : ''}">${v.name}</button>`).join('')}</div>${svg}<p class="ph-sub geo-caption">Blue: current area, not live GPS. Roads are mapped outlines; blank areas have no imported coverage.</p><div class="geo-places">${visible.map((place, i) => `<button data-geo-place="${place.id}" class="${place.id === selectedId ? 'on' : ''}">${i + 1}. ${esc(place.name)}</button>`).join('')}</div>${detail}<p class="ph-sub">Giri is represented by Giri Junction; Iddo by Iddo Sarki. These do not cover every neighbourhood with those names. 3D buildings and keke times remain gameplay approximations, not a surveyed reconstruction.</p><p class="geo-credit"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL 1.0</a></p>`;
}
