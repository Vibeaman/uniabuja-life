import * as THREE from 'three';

export const ROADS_Z = [35, -10, -55];
const CROSS_HALF = 92;

const FAC_BLURB = 'Lectures run 08:00–16:00. Every 5th day is test day: write it here between 09:00 and 15:00.';

export const LOCATIONS = [
  { id: 'gate', name: 'Main Gate', actions: 'gate', x: 0, z: 95, w: 18, d: 3, h: 7, door: [0, -1], kind: 'gate', roof: 0x15803d,
    blurb: 'Main gate of the permanent site on Airport Road. It was renamed Yakubu Gowon University in 2024, but everyone still says UniAbuja. POS stands by day, suya mallams at night.' },
  { id: 'keke', name: 'Keke Park', actions: 'keke', x: 18, z: 85, w: 10, d: 8, h: 4, door: [-1, 0], kind: 'shed', roof: 0x222222,
    blurb: 'Grab a keke to Gwagwalada for the market, the mini campus, or a night out in town.' },
  { id: 'health', name: 'Health Centre', actions: 'health', x: -22, z: 80, w: 14, d: 10, h: 6, door: [1, 0], color: '#f4f8fb', roof: 0xc62828,
    blurb: 'Feeling run down? The nurses will patch you up.' },
  { id: 'cafeteria', name: 'Cafeteria', actions: 'cafeteria', x: -25, z: 55, w: 18, d: 12, h: 6, door: [0, -1], color: '#fff3d6', roof: 0xe07a1f,
    blurb: 'Jollof, amala, rice and beans, puff-puff and plenty gist. Open 07:00–21:00.' },
  { id: 'sug', name: 'SUG Building', actions: 'sug', x: 25, z: 55, w: 18, d: 12, h: 8, door: [0, -1], color: '#e3f0fb', roof: 0x2e7d32,
    blurb: 'Students\' Union Government. Meetings, games and side hustles.' },
  { id: 'education', name: 'Faculty of Education', actions: 'faculty', x: -65, z: 55, w: 20, d: 12, h: 9, door: [0, -1], color: '#fef9e7', roof: 0x00838f, blurb: FAC_BLURB },
  { id: 'envsci', name: 'Faculty of Environmental Sciences', actions: 'faculty', x: 65, z: 55, w: 20, d: 12, h: 9, door: [0, -1], color: '#f1f8e9', roof: 0x558b2f, blurb: FAC_BLURB },
  { id: 'senate', name: 'Senate Building', actions: 'senate', x: -28, z: 15, w: 22, d: 14, h: 14, door: [0, 1], color: '#efe4cf', roof: 0x7a5a45, kind: 'senate',
    blurb: 'University administration. Check your results, register courses or find a work-study job.' },
  { id: 'library', name: 'University Library', actions: 'library', x: 28, z: 15, w: 22, d: 14, h: 12, door: [0, 1], color: '#e7ddd5', roof: 0x5d4037,
    blurb: 'The main library on the permanent site. Quiet (mostly). Study here to prepare for tests. Open 08:00–22:00.' },
  { id: 'science', name: 'Faculty of Science', actions: 'faculty', x: -65, z: 15, w: 20, d: 14, h: 10, door: [0, 1], color: '#fff3e0', roof: 0x1565c0, blurb: FAC_BLURB },
  { id: 'engineering', name: 'Faculty of Engineering', actions: 'faculty', x: 65, z: 15, w: 20, d: 14, h: 10, door: [0, 1], color: '#eceff1', roof: 0x37474f, blurb: FAC_BLURB },
  { id: 'mgmt', name: 'Faculty of Management Sciences', actions: 'faculty', x: -65, z: -30, w: 20, d: 14, h: 10, door: [0, 1], color: '#e8eaf6', roof: 0x283593, blurb: FAC_BLURB },
  { id: 'law', name: 'Faculty of Law', actions: 'faculty', x: -28, z: -30, w: 20, d: 14, h: 10, door: [0, 1], color: '#fdecea', roof: 0x8e0000, blurb: FAC_BLURB },
  { id: 'socsci', name: 'Faculty of Social Sciences', actions: 'faculty', x: 28, z: -30, w: 20, d: 14, h: 10, door: [0, 1], color: '#eef6ee', roof: 0x6a1b9a, blurb: FAC_BLURB },
  { id: 'arts', name: 'Faculty of Arts', actions: 'faculty', x: 65, z: -30, w: 20, d: 14, h: 10, door: [0, 1], color: '#fce4ec', roof: 0xad1457, blurb: FAC_BLURB },
  { id: 'hostel', name: 'Female Hostels', actions: 'hostel', x: -72, z: -80, w: 28, d: 14, h: 12, door: [0, 1], color: '#f8e1e7', roof: 0x6d4c41,
    blurb: 'Three female hostel blocks. Sleep, cook and gist with your roommates. Water and light are not guaranteed.' },
  { id: 'hostel-m', name: 'Male Hostels', actions: 'hostel', x: -30, z: -80, w: 24, d: 14, h: 12, door: [0, 1], color: '#f0e0c0', roof: 0x4e342e,
    blurb: 'Two male hostel blocks. Sleep, cook and gist with your roommates. Water and light are not guaranteed.' },
  { id: 'sports', name: 'Sports Complex', actions: 'sports', x: 45, z: -82, w: 40, d: 26, h: 3, door: [0, 1], kind: 'field', roof: 0x2e7d32,
    blurb: 'Football, jogging and inter-faculty matches.' },
];

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeLabel(text, { size = 48, color = '#fff', bg = 'rgba(0,0,0,0.55)', scale = 1, depthTest = false } = {}) {
  const font = `bold ${size}px system-ui, sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + size;
  const h = Math.ceil(size * 1.6);
  const tex = canvasTex(w, h, (g) => {
    g.font = font;
    g.fillStyle = bg;
    g.beginPath(); g.roundRect(0, 0, w, h, h / 2); g.fill();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  }, false);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest, transparent: true }));
  const k = (scale / size) * 0.9;
  s.scale.set(w * k, h * k, 1);
  s.renderOrder = 10;
  return s;
}

const wallCanvasCache = new Map();
function wallMaterials(color, w, d, h) {
  if (!wallCanvasCache.has(color)) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 2; r++) {
      g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(0, r * 128 + 120, 256, 8);
      for (let col = 0; col < 4; col++) {
        g.fillStyle = '#5b6b78'; g.fillRect(14 + col * 64, 26 + r * 128, 36, 64);
        g.fillStyle = '#2f3b46'; g.fillRect(18 + col * 64, 30 + r * 128, 28, 56);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(18 + col * 64, 30 + r * 128, 10, 56);
      }
    }
    wallCanvasCache.set(color, c);
  }
  const mk = (len) => {
    const t = new THREE.CanvasTexture(wallCanvasCache.get(color));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, Math.round(len / 8)), Math.max(1, Math.round(h / 6)));
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  };
  const plain = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  return [mk(d), mk(d), plain, plain, mk(w), mk(w)];
}

function mesh(geo, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

function addBuilding(scene, L, out) {
  const { x, z, w, d, h } = L;
  scene.add(mesh(new THREE.BoxGeometry(w, h, d), wallMaterials(L.color, w, d, h), x, h / 2, z));
  const roofM = std(L.roof, { roughness: 0.7 });
  scene.add(mesh(new THREE.BoxGeometry(w + 1.2, 0.7, d + 1.2), roofM, x, h + 0.35, z));
  const [dx, dz] = L.door;
  const fx = x + dx * (w / 2), fz = z + dz * (d / 2);
  scene.add(mesh(new THREE.BoxGeometry(dx ? 0.3 : 3, 3.4, dz ? 0.3 : 3), std(0x4e342e), fx + dx * 0.05, 1.7, fz + dz * 0.05));
  scene.add(mesh(new THREE.BoxGeometry(dx ? 1.8 : 4.6, 0.25, dz ? 1.8 : 4.6), roofM, fx + dx * 0.9, 3.9, fz + dz * 0.9));
  let top = h + 0.7;
  if (L.kind === 'senate') {
    scene.add(mesh(new THREE.BoxGeometry(8, 6, 8), wallMaterials(L.color, 8, 8, 6), x, h + 3.7, z));
    scene.add(mesh(new THREE.BoxGeometry(9, 0.6, 9), roofM, x, h + 7, z));
    top = h + 7.3;
    const colGeo = new THREE.CylinderGeometry(0.4, 0.45, 7, 10);
    for (let i = 0; i < 6; i++) {
      const cx = x - 7.5 + i * 3;
      if (Math.abs(cx - x) < 1.6) continue;
      scene.add(mesh(colGeo, std(0xf7f1e3), cx, 3.5, fz + 2.2));
    }
    scene.add(mesh(new THREE.BoxGeometry(18, 0.6, 3.4), roofM, x, 7.2, fz + 1.7));
    out.circles.push(...[0, 1, 2, 3, 4, 5].map((i) => ({ x: x - 7.5 + i * 3, z: fz + 2.2, r: 0.45 })).filter((c) => Math.abs(c.x - x) >= 1.6));
  }
  out.boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return top;
}

function addGate(scene, L, out) {
  const pillarM = std(0x15803d);
  const capM = std(0xf8fafc);
  for (const sx of [-8, 8]) {
    scene.add(mesh(new THREE.BoxGeometry(2, L.h, 2), pillarM, sx, L.h / 2, L.z));
    scene.add(mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), capM, sx, L.h + 0.3, L.z));
    out.boxes.push({ minX: sx - 1, maxX: sx + 1, minZ: L.z - 1, maxZ: L.z + 1 });
  }
  const sign = canvasTex(1024, 160, (g, w, h) => {
    g.fillStyle = '#f8fafc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#15803d'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 70px system-ui, sans-serif'; g.fillText('UNIVERSITY OF ABUJA', w / 2, 62);
    g.font = 'bold 30px system-ui, sans-serif'; g.fillText('YAKUBU GOWON UNIVERSITY', w / 2, 122);
  }, false);
  const signM = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 });
  scene.add(mesh(new THREE.BoxGeometry(18, 2.6, 1.2), [capM, capM, capM, capM, signM, signM], 0, L.h - 1, L.z));
}

function addField(scene, L, out) {
  const { x, z, w, d } = L;
  const pitch = canvasTex(800, 520, (g, W, H) => {
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#3f8f3a' : '#4a9e43'; g.fillRect((i * W) / 10, 0, W / 10, H); }
    g.strokeStyle = '#fff'; g.lineWidth = 6;
    g.strokeRect(30, 30, W - 60, H - 60);
    g.beginPath(); g.moveTo(W / 2, 30); g.lineTo(W / 2, H - 30); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, 70, 0, Math.PI * 2); g.stroke();
    g.strokeRect(30, H / 2 - 110, 110, 220); g.strokeRect(W - 140, H / 2 - 110, 110, 220);
  }, false);
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  scene.add(mesh(geo, new THREE.MeshStandardMaterial({ map: pitch, roughness: 1 }), x, 0.035, z, { cast: false }));
  const white = std(0xffffff);
  for (const sx of [-1, 1]) {
    const gx = x + sx * (w / 2 - 1.2);
    for (const oz of [-2.4, 2.4]) scene.add(mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), white, gx, 1.2, z + oz));
    scene.add(mesh(new THREE.BoxGeometry(0.15, 0.15, 4.95), white, gx, 2.4, z));
  }
  const sz = z - d / 2 - 2.5;
  for (let i = 0; i < 3; i++) scene.add(mesh(new THREE.BoxGeometry(w, 1, 1.2), std(i % 2 ? 0x15803d : 0xe5e7eb), x, 0.5 + i, sz - 1 + i * 0.9 - 0.9));
  out.boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: sz - 2.5, maxZ: sz + 0.4 });
}

function makeKeke() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.3, 1.1, 2.2), std(0xfacc15), 0, 0.9, 0));
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.12, 2.1), std(0x111111), 0, 2.05, 0));
  for (const [px, pz] of [[-0.6, -1], [0.6, -1], [-0.6, 1], [0.6, 1]]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), std(0x111111), px, 1.7, pz));
  const wheel = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
  wheel.rotateZ(Math.PI / 2);
  for (const [px, pz] of [[0, 1.0], [-0.65, -0.7], [0.65, -0.7]]) g.add(mesh(wheel, std(0x1f1f1f), px, 0.3, pz));
  return g;
}

function addShed(scene, L, out) {
  const { x, z, w, d, h } = L;
  scene.add(mesh(new THREE.BoxGeometry(w + 1, 0.3, d + 1), std(L.roof), x, h, z));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) scene.add(mesh(new THREE.BoxGeometry(0.25, h, 0.25), std(0x9ca3af), x + sx * w / 2, h / 2, z + sz * d / 2));
  for (let i = 0; i < 3; i++) {
    const k = makeKeke();
    k.position.set(x + 2.5, 0, z - 2.6 + i * 2.6);
    k.rotation.y = Math.PI / 2;
    scene.add(k);
    out.circles.push({ x: x + 2.5, z: z - 2.6 + i * 2.6, r: 1.2 });
  }
}

export function buildWorld(scene) {
  const out = { boxes: [], circles: [], locations: LOCATIONS, rings: [], labels: [], lampMat: null };
  const noTree = [];
  const pad = (b, p) => ({ minX: b.minX - p, maxX: b.maxX + p, minZ: b.minZ - p, maxZ: b.maxZ + p });

  const grass = canvasTex(128, 128, (g) => {
    g.fillStyle = '#7aa64a'; g.fillRect(0, 0, 128, 128);
    const r = rng(3);
    for (let i = 0; i < 900; i++) { g.fillStyle = r() > 0.5 ? 'rgba(40,80,20,0.18)' : 'rgba(200,220,120,0.15)'; g.fillRect(r() * 128, r() * 128, 2, 2); }
  });
  grass.repeat.set(80, 80);
  const groundGeo = new THREE.PlaneGeometry(500, 500);
  groundGeo.rotateX(-Math.PI / 2);
  scene.add(mesh(groundGeo, new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }), 0, 0, 0, { cast: false }));

  const roadCanvas = (g) => {
    g.fillStyle = '#3a3d42'; g.fillRect(0, 0, 64, 128);
    g.fillStyle = '#e9c46a'; g.fillRect(30, 0, 4, 64);
    g.fillStyle = '#d1d5db'; g.fillRect(3, 0, 2, 128); g.fillRect(59, 0, 2, 128);
  };
  const addRoad = (cx, cz, len, alongX, y, width = 8) => {
    const geo = new THREE.PlaneGeometry(width, len);
    geo.rotateX(-Math.PI / 2);
    if (alongX) geo.rotateY(Math.PI / 2);
    const t = canvasTex(64, 128, roadCanvas);
    t.repeat.set(1, len / 8);
    scene.add(mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), cx, y, cz, { cast: false }));
  };
  addRoad(0, 1.5, 203, false, 0.02);
  for (const rz of ROADS_Z) addRoad(0, rz, CROSS_HALF * 2, true, 0.03);
  addRoad(0, 103, 260, true, 0.03);
  const airport = makeLabel('Airport Road', { size: 44, scale: 1.4 });
  airport.position.set(30, 3, 103);
  scene.add(airport);

  const pathM = std(0xc8bca6, { roughness: 1 });
  for (const L of LOCATIONS) {
    const [dx, dz] = L.door;
    L.doorPoint = { x: L.x + dx * (L.w / 2 + 2.5), z: L.z + dz * (L.d / 2 + 2.5) };
    const dp = L.doorPoint;
    if (Math.abs(dp.x) < 4.5 || dx !== 0) L.roadPoint = { x: 0, z: dp.z };
    else L.roadPoint = { x: dp.x, z: ROADS_Z.reduce((a, b) => (Math.abs(b - dp.z) < Math.abs(a - dp.z) ? b : a)) };
    if (L.kind !== 'gate') {
      const faceX = L.x + dx * (L.w / 2), faceZ = L.z + dz * (L.d / 2);
      let rect;
      if (dz) rect = { minX: dp.x - 1.5, maxX: dp.x + 1.5, minZ: Math.min(faceZ, L.roadPoint.z), maxZ: Math.max(faceZ, L.roadPoint.z) };
      else rect = { minX: Math.min(faceX, 0), maxX: Math.max(faceX, 0), minZ: dp.z - 1.5, maxZ: dp.z + 1.5 };
      const geo = new THREE.PlaneGeometry(rect.maxX - rect.minX, rect.maxZ - rect.minZ);
      geo.rotateX(-Math.PI / 2);
      scene.add(mesh(geo, pathM, (rect.minX + rect.maxX) / 2, 0.012, (rect.minZ + rect.maxZ) / 2, { cast: false }));
      noTree.push(pad(rect, 1.5));
    }

    let top;
    if (L.kind === 'gate') { addGate(scene, L, out); top = L.h + 2; }
    else if (L.kind === 'field') { addField(scene, L, out); top = 5; }
    else if (L.kind === 'shed') { addShed(scene, L, out); top = L.h + 0.5; }
    else top = addBuilding(scene, L, out);
    noTree.push(pad({ minX: L.x - L.w / 2, maxX: L.x + L.w / 2, minZ: L.z - L.d / 2, maxZ: L.z + L.d / 2 }, 4));

    const label = makeLabel(L.name, { size: 56, scale: 2, depthTest: true });
    label.position.set(L.x, top + 2.5, L.z);
    label.userData.base = label.scale.clone();
    out.labels.push(label);
    scene.add(label);

    const ringGeo = new THREE.RingGeometry(1.3, 1.8, 40);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 }));
    ring.position.set(dp.x, 0.06, dp.z);
    scene.add(ring);
    out.rings.push(ring);
  }

  const wallM = std(0xe8dcc0);
  const walls = [
    { minX: -110, maxX: -9, minZ: 94.5, maxZ: 95.5 }, { minX: 9, maxX: 110, minZ: 94.5, maxZ: 95.5 },
    { minX: -110.5, maxX: -109.5, minZ: -110, maxZ: 95 }, { minX: 109.5, maxX: 110.5, minZ: -110, maxZ: 95 },
    { minX: -110, maxX: 110, minZ: -110.5, maxZ: -109.5 },
  ];
  for (const b of walls) {
    scene.add(mesh(new THREE.BoxGeometry(b.maxX - b.minX, 2.4, b.maxZ - b.minZ), wallM, (b.minX + b.maxX) / 2, 1.2, (b.minZ + b.maxZ) / 2));
    out.boxes.push(b);
  }

  const flagTex = canvasTex(96, 48, (g) => {
    g.fillStyle = '#008751'; g.fillRect(0, 0, 96, 48);
    g.fillStyle = '#fff'; g.fillRect(32, 0, 32, 48);
  }, false);
  scene.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 9, 8), std(0xcbd5e1), -12, 4.5, 27));
  const flag = mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }), -10.65, 8.2, 27);
  scene.add(flag);
  out.circles.push({ x: -12, z: 27, r: 0.3 });
  noTree.push({ minX: -15, maxX: -9, minZ: 24, maxZ: 30 });

  const lampPos = [];
  for (let z = -95; z <= 90; z += 18) if (!ROADS_Z.some((rz) => Math.abs(z - rz) < 6)) lampPos.push([5.5, z], [-5.5, z]);
  for (const rz of ROADS_Z) for (let x = -85; x <= 85; x += 18) if (Math.abs(x) > 8) lampPos.push([x, rz - 5.5]);
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.6, 6);
  poleGeo.translate(0, 2.3, 0);
  const bulbGeo = new THREE.SphereGeometry(0.32, 10, 8);
  bulbGeo.translate(0, 4.7, 0);
  out.lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffd27a, emissiveIntensity: 0 });
  const poles = new THREE.InstancedMesh(poleGeo, std(0x4b5563), lampPos.length);
  const bulbs = new THREE.InstancedMesh(bulbGeo, out.lampMat, lampPos.length);
  const m4 = new THREE.Matrix4();
  lampPos.forEach(([x, z], i) => {
    m4.makeTranslation(x, 0, z);
    poles.setMatrixAt(i, m4);
    bulbs.setMatrixAt(i, m4);
    out.circles.push({ x, z, r: 0.15 });
  });
  poles.castShadow = true;
  scene.add(poles, bulbs);

  const inRect = (x, z, b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
  const treeOk = (x, z) => {
    if (Math.abs(x) < 7 && z > -104) return false;
    if (ROADS_Z.some((rz) => Math.abs(z - rz) < 7 && Math.abs(x) < CROSS_HALF + 4)) return false;
    if (z > 91 || z < -106 || Math.abs(x) > 106) return false;
    if (Math.abs(x) < 10 && z > 76) return false;
    return !noTree.some((b) => inRect(x, z, b));
  };
  const trees = [];
  for (let z = -100; z <= 88; z += 10) for (const x of [-9.5, 9.5]) if (treeOk(x, z)) trees.push([x, z]);
  const r = rng(7);
  for (let tries = 0; tries < 2000 && trees.length < 260; tries++) {
    const x = -106 + r() * 212, z = -106 + r() * 197;
    if (treeOk(x, z) && !trees.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 4)) trees.push([x, z]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 2.4, 6);
  trunkGeo.translate(0, 1.2, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1.7, 0);
  crownGeo.translate(0, 3.4, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, std(0x6b4a2b), trees.length);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), trees.length);
  const greens = [0x3f7d2c, 0x4f8f34, 0x2f6b25, 0x5f9a3a, 0x6b8e23].map((c) => new THREE.Color(c));
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  trees.forEach(([x, z], i) => {
    const k = 0.8 + r() * 0.6;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
    m4.compose(p.set(x, 0, z), q, s.set(k, k * (0.9 + r() * 0.3), k));
    trunks.setMatrixAt(i, m4);
    crowns.setMatrixAt(i, m4);
    crowns.setColorAt(i, greens[i % greens.length]);
    out.circles.push({ x, z, r: 0.45 * k });
  });
  trunks.castShadow = crowns.castShadow = true;
  scene.add(trunks, crowns);

  return out;
}
