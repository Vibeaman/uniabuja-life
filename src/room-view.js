import * as THREE from 'three';
import { ROOM_CATEGORIES, WALL_COLOURS, furnitureById } from './rooms.js';
import { fabricTexture } from './fabric.js';
import { renderPreview } from './preview.js';

const SPOTS = {
  cosy: { bed: [-1.9, -0.5, 0], desk: [1.8, -1.7, 0], seat: [1.8, -0.65, 0], rug: [0, 0.5, 0], light: [-0.6, -1.8, 0], plant: [2.4, 1.6, 0], shelf: [-2, -2.2, 0] },
  study: { bed: [1.8, 0.45, 0], desk: [-1.8, -1.7, 0], seat: [-1.8, -0.6, 0], rug: [0, 0.7, 0], light: [-0.55, -1.8, 0], plant: [-2.5, 1.6, 0], shelf: [1.8, -2.2, 0] },
  open: { bed: [-1.3, -1.65, Math.PI / 2], desk: [2.1, -0.2, Math.PI / 2], seat: [1.05, -0.2, Math.PI / 2], rug: [0, 1.3, 0], light: [2.5, -2, 0], plant: [-2.5, 1.7, 0], shelf: [0.9, -2.2, 0] },
};
let scene;
function disposeScene() {
  if (!scene) return;
  const geometries = new Set(), materials = new Set();
  scene.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
  });
  geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
  // Fabric textures are shared with the wardrobe; do not dispose them here.
}
function model(item) {
  const g = new THREE.Group();
  const materials = new Map();
  const mat = (color) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    return materials.get(color);
  };
  const box = (w, h, d, x, y, z, color = item.color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z); g.add(m); return m;
  };
  if (item.kind === 'bed') {
    const frame = item.id !== 'mattress';
    box(1.25, 0.24, 2.15, 0, frame ? 0.52 : 0.18, 0, '#60a5fa');
    box(1.05, 0.12, 0.4, 0, frame ? 0.7 : 0.36, -0.7, '#f8fafc');
    if (frame) {
      box(1.35, 0.18, 2.3, 0, 0.3, 0);
      for (const x of [-0.6, 0.6]) for (const z of [-1, 1]) box(0.1, item.id === 'bunk' ? 2.2 : 0.9, 0.1, x, item.id === 'bunk' ? 1.1 : 0.45, z);
      if (item.id === 'bunk') {
        box(1.35, 0.15, 2.3, 0, 1.65, 0); box(1.25, 0.22, 2.15, 0, 1.85, 0, '#f472b6');
        box(1.05, 0.12, 0.4, 0, 2.02, -0.7, '#f8fafc');
        for (let y = 0.2; y < 1.6; y += 0.3) box(0.5, 0.06, 0.08, 0.45, y, 1.16);
      }
    }
  } else if (item.kind === 'desk') {
    box(1.4, 0.12, 0.7, 0, 0.9, 0);
    for (const x of [-0.6, 0.6]) for (const z of [-0.25, 0.25]) box(0.08, 0.85, 0.08, x, 0.425, z);
    if (item.id === 'studydesk') for (const y of [0.25, 0.5, 0.75]) box(0.4, 0.2, 0.58, 0.45, y, 0);
    box(0.32, 0.06, 0.24, -0.15, 1, 0, '#3b82f6'); box(0.3, 0.05, 0.22, -0.14, 1.055, 0, '#f8fafc');
  } else if (item.kind === 'seat') {
    const cosy = item.id === 'armchair';
    box(cosy ? 0.8 : 0.52, 0.18, 0.55, 0, 0.48, 0);
    box(cosy ? 0.8 : 0.52, 0.6, 0.14, 0, 0.83, 0.24);
    if (cosy) for (const x of [-0.37, 0.37]) box(0.16, 0.35, 0.6, x, 0.7, 0);
    for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) box(0.08, 0.4, 0.08, x, 0.2, z, '#475569');
  } else if (item.kind === 'rug') {
    const m = box(1.7, 0.035, 1.35, 0, 0.035, 0);
    if (item.id === 'adirerug') { m.material.color.set('#ffffff'); m.material.map = fabricTexture('adire'); }
    else for (const z of [-0.5, 0, 0.5]) box(1.6, 0.008, 0.09, 0, 0.06, z, '#fef3c7');
  } else if (item.kind === 'light') {
    const tall = item.id === 'floorlamp', h = tall ? 1.6 : 0.9;
    box(0.35, 0.06, 0.35, 0, 0.03, 0, '#475569'); box(0.06, h, 0.06, 0, h / 2, 0, '#475569');
    const shade = new THREE.Mesh(new THREE.ConeGeometry(tall ? 0.32 : 0.23, 0.35, 12, 1, true), mat(item.color));
    shade.position.y = h; g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#fde68a' }));
    bulb.position.y = h - 0.1; g.add(bulb);
  } else if (item.kind === 'plant') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.32, 10), mat('#b45309')); pot.position.y = 0.16; g.add(pot);
    for (const [x, y, z] of [[0, 0.65, 0], [-0.18, 0.55, 0.06], [0.16, 0.58, -0.08]]) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat(item.color)); leaf.position.set(x, y, z); leaf.scale.y = 1.7; g.add(leaf);
    }
  } else if (item.kind === 'shelf') {
    for (const x of [-0.5, 0.5]) box(0.08, 1.8, 0.4, x, 0.9, 0);
    for (const y of [0.1, 0.65, 1.2, 1.75]) box(1.08, 0.08, 0.4, 0, y, 0);
    for (let i = 0; i < 6; i++) box(0.11, 0.32, 0.26, -0.35 + i * 0.14, 0.85, 0, ['#3b82f6', '#f97316', '#16a34a'][i % 3]);
  } else if (item.kind === 'decor') {
    box(1.1, 0.9, 0.08, 0, 1.65, -2.46, '#92400e');
    const m = box(1, 0.8, 0.085, 0, 1.65, -2.41);
    if (item.id === 'ankaratapestry') { m.material.color.set('#ffffff'); m.material.map = fabricTexture('ankara'); }
    else { box(0.33, 0.74, 0.01, 0, 1.65, -2.36, '#f8fafc'); }
  }
  return g;
}
export function drawRoomPreview(container, room, angle = Math.PI / 4) {
  if (!container) return;
  disposeScene(); scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(3, 6, 5); scene.add(light);
  const wall = WALL_COLOURS.find((w) => w.id === room.wall)?.color || '#eee2ce';
  const shell = (w, h, d, x, y, z, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    m.position.set(x, y, z); scene.add(m);
  };
  shell(6, 0.12, 5, 0, -0.08, 0, '#b59b7b');
  shell(6, 2.7, 0.1, 0, 1.3, -2.55, wall); shell(0.1, 2.7, 5, -3.05, 1.3, 0, wall);
  shell(0.025, 1, 1.1, -2.98, 1.65, -0.2, '#60a5fa');
  shell(0.03, 0.05, 1.12, -2.95, 1.65, -0.2, '#f8fafc');
  const spots = SPOTS[room.layout] || SPOTS.cosy;
  for (const [kind] of ROOM_CATEGORIES) {
    const item = furnitureById(room.equipped[kind]); if (!item) continue;
    const group = model(item), [x, z, rot] = spots[kind] || [0, 0, 0];
    group.position.set(x, 0, z); group.rotation.y = rot; scene.add(group);
  }
  const camera = new THREE.PerspectiveCamera(42, Math.max(120, container.clientWidth) / 190, 0.1, 50);
  camera.position.set(Math.sin(angle) * 9.5, 7, Math.cos(angle) * 9.5); camera.lookAt(0, 0.8, 0);
  renderPreview(container, scene, camera);
}
