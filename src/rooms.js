// Furniture is cosmetic: purchases never change needs, grades or story rewards.
export const RESIDENCE_IDS = ['hostel-ob', 'hostel-og', 'hostel-ng', 'hostel-int', 'hostel-pg', 'giri', 'iddo', 'gwagwalada'];
export const ROOM_CATEGORIES = [
  ['bed', 'Bed'], ['desk', 'Desk'], ['seat', 'Seat'], ['rug', 'Rug'],
  ['light', 'Light'], ['plant', 'Plant'], ['shelf', 'Shelf'], ['decor', 'Wall art'],
];
export const FURNITURE = [
  { id: 'mattress', kind: 'bed', name: 'Starter mattress', price: 0, color: '#60a5fa' },
  { id: 'bedframe', kind: 'bed', name: 'Wooden bed frame', price: 2500, color: '#a16207' },
  { id: 'bunk', kind: 'bed', name: 'Hostel bunk bed', price: 4500, color: '#475569' },
  { id: 'starterdesk', kind: 'desk', name: 'Starter study table', price: 0, color: '#a16207' },
  { id: 'studydesk', kind: 'desk', name: 'Study desk with drawers', price: 2000, color: '#e7cba9' },
  { id: 'plasticchair', kind: 'seat', name: 'Starter plastic chair', price: 0, color: '#16a34a' },
  { id: 'armchair', kind: 'seat', name: 'Comfy armchair', price: 1800, color: '#fb923c' },
  { id: 'wovenrug', kind: 'rug', name: 'Woven rug', price: 900, color: '#d97706' },
  { id: 'adirerug', kind: 'rug', name: 'Adire-inspired rug', price: 1800, color: '#3730a3' },
  { id: 'lamp', kind: 'light', name: 'Reading lamp', price: 1200, color: '#fbbf24' },
  { id: 'floorlamp', kind: 'light', name: 'Tall floor lamp', price: 2200, color: '#f8fafc' },
  { id: 'pottedplant', kind: 'plant', name: 'Small potted plant', price: 650, color: '#22c55e' },
  { id: 'bookshelf', kind: 'shelf', name: 'Bookshelf', price: 2200, color: '#92400e' },
  { id: 'campusposter', kind: 'decor', name: 'Campus colours poster', price: 400, color: '#16a34a' },
  { id: 'ankaratapestry', kind: 'decor', name: 'Ankara-inspired wall hanging', price: 1600, color: '#e87924' },
];
export const WALL_COLOURS = [
  { id: 'cream', name: 'Cream', color: '#eee2ce' }, { id: 'sage', name: 'Sage', color: '#b8c9ad' },
  { id: 'blue', name: 'Sky', color: '#bfdbfe' }, { id: 'rose', name: 'Rose', color: '#fecdd3' },
];
export const ROOM_LAYOUTS = [
  { id: 'cosy', name: 'Cosy corner' }, { id: 'study', name: 'Study zone' }, { id: 'open', name: 'Open centre' },
];
export const furnitureById = (id) => FURNITURE.find((f) => f.id === id);
const STARTERS = ['mattress', 'starterdesk', 'plasticchair'];

function normaliseRoom(input = {}) {
  const r = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const owned = Array.isArray(r.owned) ? r.owned.filter((id) => furnitureById(id)) : [];
  const out = {
    owned: [...new Set([...STARTERS, ...owned])],
    wall: WALL_COLOURS.some((w) => w.id === r.wall) ? r.wall : 'cream',
    layout: ROOM_LAYOUTS.some((l) => l.id === r.layout) ? r.layout : 'cosy',
    equipped: {},
  };
  for (const [kind] of ROOM_CATEGORIES) {
    const id = r.equipped?.[kind];
    const fallback = STARTERS.find((x) => furnitureById(x).kind === kind) || null;
    out.equipped[kind] = id === null ? null : out.owned.includes(id) && furnitureById(id)?.kind === kind ? id : fallback;
  }
  return out;
}
export function ensureRoom(s) {
  const raw = s.rooms && typeof s.rooms === 'object' && !Array.isArray(s.rooms) ? s.rooms : {};
  s.rooms = Object.fromEntries(RESIDENCE_IDS.filter((id) => Object.hasOwn(raw, id)).map((id) => [id, normaliseRoom(raw[id])]));
  const home = RESIDENCE_IDS.includes(s.residence) ? s.residence : 'hostel-ob';
  s.rooms[home] ??= normaliseRoom();
  return s.rooms[home];
}
export function decorateRoom(s, op, id, atHome = false) {
  const room = ensureRoom(s);
  if (!atHome) return { ok: false, msg: 'Go to your own hostel or lodge to decorate.' };
  if (op === 'furniture') {
    const item = furnitureById(id);
    if (!item) return { ok: false, msg: 'That furniture is not available.' };
    const cost = room.owned.includes(id) ? 0 : item.price;
    if (cost > 0 && (!Number.isFinite(s.money) || s.money < cost)) return { ok: false, msg: 'Not enough money for this furniture.' };
    const changed = room.equipped[item.kind] !== id;
    if (cost) s.money -= cost;
    if (!room.owned.includes(id)) room.owned.push(id);
    room.equipped[item.kind] = id;
    return { ok: true, cost, changed, msg: cost ? `${item.name} bought and placed. Yours to keep.` : `${item.name} placed.` };
  }
  if (op === 'store') {
    if (!ROOM_CATEGORIES.some(([kind]) => kind === id)) return { ok: false, msg: 'That furniture spot is not available.' };
    const changed = room.equipped[id] !== null;
    room.equipped[id] = null;
    return { ok: true, cost: 0, changed, msg: 'Stored safely. Place it again for free whenever you like.' };
  }
  const choices = op === 'wall' ? WALL_COLOURS : op === 'layout' ? ROOM_LAYOUTS : [];
  const choice = choices.find((x) => x.id === id);
  if (!choice) return { ok: false, msg: 'That room style is not available.' };
  const changed = room[op] !== id;
  room[op] = id;
  return { ok: true, cost: 0, changed, msg: `${choice.name} selected.` };
}
