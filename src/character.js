import * as THREE from 'three';
import { normaliseAppearance, outfitById, SKIN_TONES } from './wardrobe.js';
import { fabricTexture } from './fabric.js';

const geoCache = new Map();
function box(w, h, d) {
  const k = `${w},${h},${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}

export function makeCharacter({ shirt = '#2e7d32', pants = '#263238', skin = '#8d5524', hair = '#1b1b1b', bag = '#c62828' } = {}) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const add = (parent, geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const shirtM = mat(shirt), skinM = mat(skin), pantsM = mat(pants), darkM = mat('#111'), hairM = mat(hair), bagM = mat(bag);

  add(g, box(0.72, 0.8, 0.42), shirtM, 0, 1.25, 0);
  add(g, box(0.48, 0.48, 0.48), skinM, 0, 1.92, 0);
  const hairGroup = new THREE.Group();
  g.add(hairGroup);
  add(hairGroup, box(0.5, 0.14, 0.5), hairM, 0, 2.18, 0);
  add(g, box(0.08, 0.08, 0.02), darkM, -0.11, 1.96, 0.245);
  add(g, box(0.08, 0.08, 0.02), darkM, 0.11, 1.96, 0.245);
  add(g, box(0.5, 0.55, 0.2), bagM, 0, 1.3, -0.31);

  const limb = (x, y, geo, m) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    g.add(pivot);
    add(pivot, geo, m, 0, -geo.parameters.height / 2, 0);
    return pivot;
  };
  const armL = limb(-0.48, 1.6, box(0.2, 0.72, 0.22), shirtM);
  const armR = limb(0.48, 1.6, box(0.2, 0.72, 0.22), shirtM);
  add(armL, box(0.18, 0.16, 0.2), skinM, 0, -0.8, 0);
  add(armR, box(0.18, 0.16, 0.2), skinM, 0, -0.8, 0);
  const legL = limb(-0.18, 0.85, box(0.26, 0.85, 0.3), pantsM);
  const legR = limb(0.18, 0.85, box(0.26, 0.85, 0.3), pantsM);
  add(legL, box(0.28, 0.12, 0.38), darkM, 0, -0.8, 0.04);
  add(legR, box(0.28, 0.12, 0.38), darkM, 0, -0.8, 0.04);

  g.userData.limbs = { armL, armR, legL, legR };
  g.userData.appearanceParts = { shirtM, skinM, pantsM, hairM, bagM, hairGroup, hairId: 'short' };
  return g;
}

const afroGeo = new THREE.IcosahedronGeometry(0.42, 1);
const strandGeo = new THREE.CylinderGeometry(0.035, 0.025, 0.48, 6);
export function applyCharacterAppearance(ch, input) {
  const a = normaliseAppearance(input), outfit = outfitById(a.outfit);
  const p = ch.userData.appearanceParts;
  if (!p) return;
  const texture = fabricTexture(outfit.pattern);
  p.shirtM.color.set(texture ? '#ffffff' : outfit.shirt);
  p.shirtM.map = texture;
  p.shirtM.needsUpdate = true;
  p.pantsM.color.set(outfit.pants);
  p.bagM.color.set(outfit.bag);
  p.skinM.color.set(SKIN_TONES.find((t) => t.id === a.skin).color);
  if (p.hairId === a.hair) return;
  p.hairId = a.hair;
  p.hairGroup.clear();
  const addHair = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, p.hairM);
    m.position.set(x, y, z); m.castShadow = true; p.hairGroup.add(m); return m;
  };
  if (a.hair === 'afro') {
    const m = addHair(afroGeo, 0, 2.2, -0.015);
    m.scale.set(1, 0.8, 1);
  } else {
    addHair(box(0.5, 0.14, 0.5), 0, 2.18, 0);
    if (a.hair === 'braids') {
      for (const x of [-0.23, -0.11, 0.01, 0.13, 0.23]) addHair(strandGeo, x, 1.93, -0.24);
      addHair(strandGeo, -0.26, 1.94, 0.03); addHair(strandGeo, 0.26, 1.94, 0.03);
    } else if (a.hair === 'locs') {
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        const m = addHair(strandGeo, Math.sin(angle) * 0.22, 2.12, Math.cos(angle) * 0.22);
        m.rotation.z = Math.sin(angle) * 0.25;
        m.scale.y = 0.65;
      }
    }
  }
}

export function animateWalk(ch, phase, amount) {
  const { armL, armR, legL, legR } = ch.userData.limbs;
  const s = Math.sin(phase) * 0.75 * amount;
  const ease = (o, t) => { o.rotation.x += (t - o.rotation.x) * 0.3; };
  ease(legL, s); ease(legR, -s); ease(armL, -s); ease(armR, s);
}
