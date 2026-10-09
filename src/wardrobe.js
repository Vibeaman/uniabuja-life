// Saved appearance data and purchase rules. No rendering or browser dependencies.
export const OUTFITS = [
  { id: 'campus', name: 'Campus Green', price: 0, shirt: '#15803d', pants: '#1f2937', bag: '#f8fafc', pattern: null },
  { id: 'casual', name: 'Casual Navy', price: 0, shirt: '#2563eb', pants: '#475569', bag: '#f59e0b', pattern: null },
  { id: 'ankara', name: 'Ankara Friday', price: 2500, shirt: '#e87924', pants: '#312e81', bag: '#fef3c7', pattern: 'ankara' },
  { id: 'adire', name: 'Adire Indigo', price: 2200, shirt: '#3730a3', pants: '#0f172a', bag: '#cbd5e1', pattern: 'adire' },
  { id: 'asooke', name: 'Aso-oke Celebration', price: 4500, shirt: '#9f1239', pants: '#9f1239', bag: '#fbbf24', pattern: 'asooke' },
];
export const HAIRSTYLES = [
  { id: 'short', name: 'Low cut' }, { id: 'afro', name: 'Afro' },
  { id: 'braids', name: 'Braids' }, { id: 'locs', name: 'Locs' },
];
export const SKIN_TONES = [
  { id: 'deep', name: 'Deep', color: '#5a3418' }, { id: 'brown', name: 'Brown', color: '#8d5524' },
  { id: 'warm', name: 'Warm', color: '#a0672f' }, { id: 'golden', name: 'Golden', color: '#c68642' },
];
export const outfitById = (id) => OUTFITS.find((o) => o.id === id);
export function normaliseAppearance(a = {}) {
  return {
    outfit: outfitById(a?.outfit)?.id || 'campus',
    hair: HAIRSTYLES.some((h) => h.id === a?.hair) ? a.hair : 'short',
    skin: SKIN_TONES.some((t) => t.id === a?.skin) ? a.skin : 'brown',
  };
}
export function ensureWardrobe(s) {
  const owned = Array.isArray(s.ownedOutfits) ? s.ownedOutfits.filter((id) => outfitById(id)) : [];
  s.ownedOutfits = [...new Set([...OUTFITS.filter((o) => !o.price).map((o) => o.id), ...owned])];
  s.appearance = normaliseAppearance(s.appearance);
  if (!s.ownedOutfits.includes(s.appearance.outfit)) s.appearance.outfit = 'campus';
}
export function changeAppearance(s, category, id) {
  ensureWardrobe(s);
  if (category === 'outfit') {
    const outfit = outfitById(id);
    if (!outfit) return { ok: false, msg: 'That outfit is not available.' };
    if (s.appearance.outfit === id) return { ok: true, changed: false, cost: 0, msg: 'Already wearing this outfit.' };
    const cost = s.ownedOutfits.includes(id) ? 0 : outfit.price;
    if (cost > 0 && (!Number.isFinite(s.money) || s.money < cost)) return { ok: false, msg: 'Not enough money for this outfit.' };
    s.money -= cost;
    if (!s.ownedOutfits.includes(id)) s.ownedOutfits.push(id);
    s.appearance.outfit = id;
    return { ok: true, changed: true, cost, msg: cost ? `${outfit.name} bought and equipped. It is yours to keep.` : `${outfit.name} equipped.` };
  }
  const options = category === 'hair' ? HAIRSTYLES : category === 'skin' ? SKIN_TONES : [];
  const option = options.find((o) => o.id === id);
  if (!option) return { ok: false, msg: 'That style is not available.' };
  const changed = s.appearance[category] !== id;
  s.appearance[category] = id;
  return { ok: true, changed, cost: 0, msg: `${option.name} selected.` };
}
