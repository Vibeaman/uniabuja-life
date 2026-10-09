import * as THREE from 'three';
import { buildWorld, makeLabel } from './world.js';
import { makeCharacter, animateWalk } from './character.js';
import { ACTIONS, newState, advance, perform, actionStatus, isExamDay, gpa, fmtMoney, fmtTime, fmtDur, DAY_NAMES, clamp } from './game.js';

const $ = (id) => document.getElementById(id);
const GAME_MIN_PER_SEC = 1.5;
const SAVE_KEY = 'uniabuja-life-v1';
const isTouch = matchMedia('(pointer: coarse)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8ecae6, 90, 240);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 600);

const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a5a2a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

const world = buildWorld(scene);

const player = makeCharacter({ shirt: '#15803d', pants: '#1f2937', bag: '#f8fafc' });
player.position.set(0, 0, 84);
player.rotation.y = Math.PI;
scene.add(player);
let playerLabel = null;

const NPC_NAMES = ['Chidi', 'Aisha', 'Tunde', 'Zainab', 'Emeka', 'Fatima', 'Bola', 'Musa', 'Ngozi', 'Ibrahim', 'Kemi', 'Yusuf', 'Amaka', 'Sani', 'Hauwa', 'Segun'];
const SHIRTS = ['#c0392b', '#2980b9', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#2c3e50', '#e84393', '#00b894', '#fdcb6e', '#6c5ce7', '#e17055'];
const SKINS = ['#8d5524', '#6b3e1f', '#a0672f', '#5a3418', '#c68642'];
const LINES = [
  'Have you seen the new timetable?', 'Abeg, do you have the past questions?', 'The cafeteria jollof is on point today.',
  'NEPA took light in our block again.', 'Are you going for the SUG meeting?', 'This lecturer no dey play with attendance o.',
  "Let's do group study at the library later.", 'Keke fare to Gwagwalada don increase again!', 'Test is coming and I never read anything.',
  'Football at the sports complex by 5pm?',
];

const npcs = NPC_NAMES.map((name, i) => {
  const mesh = makeCharacter({ shirt: SHIRTS[i % SHIRTS.length], skin: SKINS[i % SKINS.length], pants: i % 3 ? '#1e293b' : '#475569', bag: SHIRTS[(i + 5) % SHIRTS.length] });
  const label = makeLabel(name, { size: 40, scale: 0.4, depthTest: true });
  label.position.y = 2.7;
  mesh.add(label);
  const loc = world.locations[i % world.locations.length];
  mesh.position.set(loc.doorPoint.x + (Math.random() - 0.5) * 3, 0, loc.doorPoint.z + (Math.random() - 0.5) * 3);
  scene.add(mesh);
  return { name, mesh, label, loc, route: [], idx: 0, wait: Math.random() * 3, pause: 0, inside: false, off: (Math.random() - 0.5) * 4, phase: 0, chatCooldown: 0, speed: 2 + Math.random() * 0.8 };
});

function lerpAngle(a, b, t) {
  const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return a + d * t;
}

function planRoute(n) {
  const from = n.loc;
  let to = from;
  while (to === from) to = world.locations[Math.floor(Math.random() * world.locations.length)];
  const o = n.off, fr = from.roadPoint, tr = to.roadPoint;
  n.route = [
    { x: fr.x + o, z: fr.z + o }, { x: o, z: fr.z + o }, { x: o, z: tr.z + o }, { x: tr.x + o, z: tr.z + o }, { ...to.doorPoint },
  ];
  n.idx = 0;
  n.loc = to;
}

function updateNpc(n, dt) {
  if (n.chatCooldown > 0) n.chatCooldown -= dt;
  n.label.visible = n.mesh.position.distanceTo(player.position) < 18 && n.mesh.position.distanceTo(camera.position) > 6;
  if (n.pause > 0) { n.pause -= dt; animateWalk(n.mesh, n.phase, 0); return; }
  if (n.wait > 0) {
    n.wait -= dt;
    animateWalk(n.mesh, n.phase, 0);
    if (n.wait <= 0) {
      if (n.inside) { n.inside = false; n.mesh.visible = true; }
      planRoute(n);
    }
    return;
  }
  const t = n.route[n.idx];
  if (!t) { n.wait = 1; return; }
  const p = n.mesh.position;
  const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
  if (d < 0.2) {
    n.idx++;
    if (n.idx >= n.route.length) {
      if (Math.random() < 0.5) { n.inside = true; n.mesh.visible = false; n.wait = 6 + Math.random() * 14; }
      else n.wait = 1 + Math.random() * 4;
    }
    return;
  }
  const step = Math.min(d, n.speed * dt);
  p.x += (dx / d) * step;
  p.z += (dz / d) * step;
  n.mesh.rotation.y = lerpAngle(n.mesh.rotation.y, Math.atan2(dx, dz), 0.15);
  n.phase += dt * n.speed * 3.2;
  animateWalk(n.mesh, n.phase, 1);
}

// ---------- input ----------
const keys = new Set();
const cam = { yaw: 0, pitch: 0.38, dist: 10 };
const joy = { x: 0, y: 0, id: null };
let drag = null;

addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') { if (e.code === 'Enter') $('start').click(); return; }
  keys.add(e.code);
  if (!state) return;
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'Escape') closePanel();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  cam.yaw -= (e.clientX - drag.x) * 0.006;
  cam.pitch = clamp(cam.pitch + (e.clientY - drag.y) * 0.004, 0.08, 1.25);
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
cv.addEventListener('wheel', (e) => { cam.dist = clamp(cam.dist + e.deltaY * 0.01, 4, 24); }, { passive: true });

const jEl = $('joystick'), stick = $('stick');
function moveJoy(e) {
  const r = jEl.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const max = r.width / 2 - 10, d = Math.hypot(dx, dy);
  if (d > max) { dx *= max / d; dy *= max / d; }
  stick.style.transform = `translate(${dx}px, ${dy}px)`;
  joy.x = dx / max; joy.y = -dy / max;
}
jEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; jEl.setPointerCapture(e.pointerId); moveJoy(e); });
jEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) moveJoy(e); });
const endJoy = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; stick.style.transform = ''; } };
jEl.addEventListener('pointerup', endJoy);
jEl.addEventListener('pointercancel', endJoy);
$('interact-btn').addEventListener('click', () => tryInteract());
$('prompt').addEventListener('click', () => tryInteract());
$('panel-close').addEventListener('click', () => closePanel());

// ---------- game state ----------
let state = null;
let panelOpen = false, panelLoc = null, busy = false, collapsing = false;
let moving = false, isRunning = false, walkPhase = 0;
let nearby = null, promptKey = '';
const warned = { hunger: false, energy: false };

function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast glass ${kind}`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  setTimeout(() => el.remove(), 5000);
}
const notify = (msg, kind) => toast(msg, kind);

function fade(on, text = '') {
  $('fade-text').textContent = text;
  $('fade').classList.toggle('on', on);
}

function save() {
  if (!state) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ state, pos: [player.position.x, player.position.z], rot: player.rotation.y }));
}

function resolve(p) {
  const r = 0.45;
  for (const b of world.boxes) {
    if (p.x > b.minX - r && p.x < b.maxX + r && p.z > b.minZ - r && p.z < b.maxZ + r) {
      const dx1 = p.x - (b.minX - r), dx2 = b.maxX + r - p.x, dz1 = p.z - (b.minZ - r), dz2 = b.maxZ + r - p.z;
      const m = Math.min(dx1, dx2, dz1, dz2);
      if (m === dx1) p.x = b.minX - r; else if (m === dx2) p.x = b.maxX + r; else if (m === dz1) p.z = b.minZ - r; else p.z = b.maxZ + r;
    }
  }
  for (const c of world.circles) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + r;
    if (d < min && d > 1e-4) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
  }
  p.x = clamp(p.x, -108, 108);
  p.z = clamp(p.z, -108, 108);
}

function updatePlayer(dt) {
  let ix = 0, iy = 0;
  if (!panelOpen && !busy) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    ix += joy.x; iy += joy.y;
  }
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }
  isRunning = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(joy.x, joy.y) > 0.92;
  const speed = isRunning ? 8.5 : 4.5;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  const mx = fx * iy - fz * ix, mz = fz * iy + fx * ix;
  const mag = Math.hypot(mx, mz);
  moving = mag > 0.01;
  if (moving) {
    const p = player.position;
    p.x += mx * speed * dt;
    p.z += mz * speed * dt;
    resolve(p);
    player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(mx, mz), 0.2);
    walkPhase += dt * speed * 2.2;
    animateWalk(player, walkPhase, Math.min(1, mag));
  } else animateWalk(player, walkPhase, 0);
}

function updateNearby() {
  nearby = null;
  if (!panelOpen && !busy) {
    const p = player.position;
    for (const L of world.locations) if (Math.hypot(p.x - L.doorPoint.x, p.z - L.doorPoint.z) < 3.2) { nearby = { type: 'loc', loc: L, key: L.id }; break; }
    if (!nearby) for (const n of npcs) if (n.mesh.visible && n.mesh.position.distanceTo(p) < 2.6) { nearby = { type: 'npc', npc: n, key: n.name }; break; }
  }
  const key = nearby ? nearby.key : '';
  if (key === promptKey) return;
  promptKey = key;
  if (!nearby) { $('prompt').classList.add('hidden'); $('interact-btn').classList.add('hidden'); return; }
  const text = nearby.type === 'loc' ? `Enter ${nearby.loc.name}` : `Chat with ${nearby.npc.name}`;
  $('prompt').innerHTML = isTouch ? text : `<kbd>E</kbd>${text}`;
  $('prompt').classList.remove('hidden');
  if (isTouch) { $('interact-btn').textContent = nearby.type === 'loc' ? 'Enter' : 'Chat'; $('interact-btn').classList.remove('hidden'); }
}

function tryInteract() {
  if (busy) return;
  if (panelOpen) { closePanel(); return; }
  if (!nearby) return;
  if (nearby.type === 'loc') openPanel(nearby.loc);
  else chat(nearby.npc);
}

function chat(n) {
  if (n.chatCooldown > 0) { toast(`${n.name} is busy right now. Try again later.`, 'warn'); return; }
  n.chatCooldown = 40;
  n.pause = 3;
  n.mesh.lookAt(player.position.x, 0, player.position.z);
  advance(state, 10, {}, notify);
  state.social = clamp(state.social + 6, 0, 100);
  toast(`${n.name}: "${LINES[Math.floor(Math.random() * LINES.length)]}"  (+6 Social)`);
}

const FX_NAMES = { energy: 'Energy', hunger: 'Food', social: 'Social', knowledge: 'Test prep' };
function describe(a) {
  const parts = [fmtDur(a.mins)];
  if (a.cost) parts.push(`−${fmtMoney(a.cost)}`);
  if (a.earn) parts.push(`+${fmtMoney(a.earn)}`);
  for (const [k, v] of Object.entries(a.fx || {})) parts.push(`${v > 0 ? '+' : '−'}${Math.abs(v)} ${FX_NAMES[k]}`);
  if (a.pantry > 0) parts.push(`+${a.pantry} noodles`);
  if (a.pantry < 0) parts.push(`uses 1 noodle pack (have ${state.pantry})`);
  return parts.join(' · ');
}

let panelSig = '';
function renderPanel(force = false) {
  if (!panelOpen) return;
  const L = panelLoc;
  const list = ACTIONS[L.actions];
  const statuses = list.map((a) => actionStatus(state, a));
  const sig = statuses.map((s) => s.ok + (s.reason || '')).join('|') + state.pantry;
  if (!force && sig === panelSig) return;
  panelSig = sig;
  $('panel-title').textContent = L.name;
  $('panel-sub').textContent = L.blurb;
  const box = $('panel-actions');
  box.innerHTML = '';
  list.forEach((a, i) => {
    const st = statuses[i];
    const b = document.createElement('button');
    b.className = 'action';
    b.disabled = !st.ok;
    const strong = document.createElement('b');
    strong.textContent = a.label;
    const small = document.createElement('small');
    small.textContent = st.ok ? describe(a) : st.reason;
    b.append(strong, small);
    b.onclick = () => doAction(a);
    box.appendChild(b);
  });
}

function openPanel(L) {
  panelOpen = true;
  panelLoc = L;
  renderPanel(true);
  $('panel').classList.remove('hidden');
  promptKey = '__';
}
function closePanel() {
  if (busy) return;
  panelOpen = false;
  $('panel').classList.add('hidden');
}

async function doAction(a) {
  if (busy) return;
  busy = true;
  fade(true, `${a.label}…`);
  await sleep(850);
  const res = perform(state, a, notify);
  renderHud();
  renderPanel(true);
  await sleep(200);
  fade(false);
  toast(res.msg, res.kind);
  busy = false;
  save();
}

async function collapse() {
  collapsing = busy = true;
  panelOpen = false;
  $('panel').classList.add('hidden');
  fade(true, 'You collapsed from exhaustion…');
  await sleep(1500);
  const H = world.locations.find((l) => l.id === 'health');
  player.position.set(H.doorPoint.x + 1.5, 0, H.doorPoint.z);
  advance(state, 240, { sleeping: true }, notify);
  state.energy = 40;
  const fee = Math.min(state.money, 1000);
  state.money -= fee;
  fade(false);
  toast(`You woke up at the Health Centre. Treatment cost ${fmtMoney(fee)}. Get some proper sleep!`, 'bad');
  collapsing = busy = false;
  save();
}

function checkVitals() {
  if (state.energy <= 0 && !collapsing) { collapse(); return; }
  if (state.hunger <= 0 && !warned.hunger) { warned.hunger = true; toast("You're starving! Go and eat something.", 'bad'); }
  if (state.hunger > 10) warned.hunger = false;
  if (state.energy < 15 && !warned.energy) { warned.energy = true; toast("You're exhausted. Head to the hostel and sleep.", 'warn'); }
  if (state.energy > 25) warned.energy = false;
}

// ---------- HUD ----------
const NEEDS = [['energy', 'Energy', '#facc15'], ['hunger', 'Food', '#fb923c'], ['social', 'Social', '#34d399'], ['knowledge', 'Test prep', '#60a5fa']];
$('needs').innerHTML =
  NEEDS.map(([k, label, col]) => `<div class="need"><span class="dot" style="background:${col}"></span><span class="lbl">${label}</span><div class="bar"><div class="fill" id="f-${k}" style="background:${col}"></div></div><span class="val" id="v-${k}"></span></div>`).join('') +
  '<div id="gpa-row"><span id="gpa"></span><span id="pantry"></span></div><div id="exam-badge" class="hidden"></div>';

function renderHud() {
  if (!state) return;
  $('clock').textContent = `Day ${state.day} · ${DAY_NAMES[(state.day - 1) % 7]} ${fmtTime(state.minutes)}`;
  $('money').textContent = fmtMoney(state.money);
  for (const [k] of NEEDS) {
    const v = Math.round(state[k]);
    $(`f-${k}`).style.width = `${v}%`;
    $(`v-${k}`).textContent = v;
  }
  const g = gpa(state);
  $('gpa').textContent = `CGPA ${g === null ? '—' : g.toFixed(2)}`;
  $('pantry').textContent = `Noodles: ${state.pantry}`;
  const badge = $('exam-badge');
  if (isExamDay(state) && !state.examDone) { badge.textContent = 'TEST DAY · any faculty 09:00–15:00'; badge.classList.remove('hidden'); }
  else if ((state.day + 1) % 5 === 0) { badge.textContent = 'Test tomorrow'; badge.style.background = '#b45309'; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
  if (isExamDay(state)) badge.style.background = '#e63946';
}

const mm = $('minimap'), mctx = mm.getContext('2d');
const mapColor = (L) => (L.kind === 'gate' ? '#f8fafc' : `#${new THREE.Color(L.roof).getHexString()}`);
function drawMinimap() {
  const W = mm.width, S = W / 226, O = 113;
  const X = (x) => (x + O) * S, Z = (z) => (z + O) * S;
  mctx.fillStyle = '#5d8a3a'; mctx.fillRect(0, 0, W, W);
  mctx.fillStyle = '#3a3d42';
  mctx.fillRect(X(-4), Z(-100), 8 * S, 203 * S);
  for (const rz of [35, -10, -55]) mctx.fillRect(X(-92), Z(rz - 4), 184 * S, 8 * S);
  mctx.fillRect(0, Z(99), W, 8 * S);
  for (const L of world.locations) {
    mctx.fillStyle = mapColor(L);
    mctx.fillRect(X(L.x - L.w / 2), Z(L.z - L.d / 2), Math.max(2, L.w * S), Math.max(2, L.d * S));
    mctx.fillStyle = '#facc15';
    mctx.fillRect(X(L.doorPoint.x) - 1.5, Z(L.doorPoint.z) - 1.5, 3, 3);
  }
  mctx.fillStyle = '#fff';
  for (const n of npcs) if (n.mesh.visible) mctx.fillRect(X(n.mesh.position.x) - 1, Z(n.mesh.position.z) - 1, 2.5, 2.5);
  mctx.save();
  mctx.translate(X(player.position.x), Z(player.position.z));
  mctx.rotate(-player.rotation.y);
  mctx.fillStyle = '#ef4444'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5;
  mctx.beginPath(); mctx.moveTo(0, 7); mctx.lineTo(-5, -5); mctx.lineTo(5, -5); mctx.closePath(); mctx.fill(); mctx.stroke();
  mctx.restore();
}

// ---------- lighting ----------
const SKY = [[0, '#0b1026'], [5, '#0b1026'], [6.3, '#f4a261'], [8, '#8ecae6'], [17, '#8ecae6'], [18.6, '#f28c5b'], [20, '#0b1026'], [24, '#0b1026']].map(([h, c]) => [h, new THREE.Color(c)]);
const skyCol = new THREE.Color();
const sunDir = new THREE.Vector3();
function updateLighting(h) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, c0] = SKY[i], [h1, c1] = SKY[i + 1];
    if (h >= h0 && h <= h1) { skyCol.copy(c0).lerp(c1, (h - h0) / (h1 - h0)); break; }
  }
  scene.background = skyCol;
  scene.fog.color.copy(skyCol);
  const t = ((h - 6) / 12) * Math.PI, el = Math.sin(t);
  const day = clamp(el * 1.6, 0, 1);
  hemi.intensity = 0.35 + 0.65 * day;
  if (el > 0) {
    sun.intensity = 2.2 * clamp(el * 1.5, 0, 1);
    sun.color.set(el < 0.25 ? 0xffc38a : 0xffffff);
    sunDir.set(Math.cos(t), Math.max(el, 0.15), 0.45).normalize();
  } else {
    sun.intensity = 0.3;
    sun.color.set(0x8fa8ff);
    sunDir.set(0.3, 1, 0.5).normalize();
  }
  sun.position.copy(player.position).addScaledVector(sunDir, 110);
  sun.target.position.copy(player.position);
  world.lampMat.emissiveIntensity = day < 0.3 ? 3 : 0;
}

const camTarget = new THREE.Vector3(), camDesired = new THREE.Vector3();
function updateCamera(snap = false) {
  camTarget.copy(player.position).y += 1.7;
  const cp = Math.cos(cam.pitch);
  camDesired.set(camTarget.x + Math.sin(cam.yaw) * cp * cam.dist, camTarget.y + Math.sin(cam.pitch) * cam.dist, camTarget.z + Math.cos(cam.yaw) * cp * cam.dist);
  if (snap) camera.position.copy(camDesired); else camera.position.lerp(camDesired, 0.2);
  camera.lookAt(camTarget);
}

// ---------- start ----------
function startGame(s, pos, rot) {
  state = s;
  player.position.set(pos[0], 0, pos[1]);
  player.rotation.y = rot;
  cam.yaw = rot - Math.PI;
  cam.pitch = 0.38;
  cam.dist = 10;
  if (playerLabel) player.remove(playerLabel);
  playerLabel = makeLabel(state.name, { size: 40, scale: 0.45, depthTest: true, bg: 'rgba(21,128,61,0.8)' });
  playerLabel.position.y = 2.75;
  player.add(playerLabel);
  $('intro').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('minimap').classList.remove('hidden');
  if (isTouch) jEl.classList.remove('hidden');
  document.activeElement?.blur();
  updateCamera(true);
  renderHud();
  toast(`Welcome to UniAbuja, ${state.name}!`, 'good');
  setTimeout(() => toast('Walk onto a glowing yellow ring to enter a building. Lectures run 08:00–16:00.'), 1200);
  setTimeout(() => toast('Your first test is on Day 5. Study at the library and attend lectures!'), 2600);
}

const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
if (saved?.state) {
  $('continue').textContent = `Continue as ${saved.state.name} (Day ${saved.state.day})`;
  $('continue').classList.remove('hidden');
  $('name').value = saved.state.name;
  $('continue').onclick = () => startGame(saved.state, saved.pos, saved.rot);
}
$('start').onclick = () => startGame(newState(($('name').value.trim() || 'Fresher').slice(0, 16)), [0, 84], Math.PI);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const timer = new THREE.Timer();
let hudTimer = 0, saveTimer = 0, introSpin = 0;
updateCamera(true);
function loop() {
  requestAnimationFrame(loop);
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  if (state && !busy) {
    advance(state, dt * GAME_MIN_PER_SEC, { running: isRunning && moving }, notify);
    updatePlayer(dt);
    updateNearby();
    checkVitals();
  } else if (!state) {
    introSpin += dt * 0.05;
    cam.yaw = Math.PI + Math.sin(introSpin) * 0.6;
    cam.pitch = 0.32;
    cam.dist = 26;
  }
  for (const n of npcs) updateNpc(n, dt);
  const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.08;
  for (const r of world.rings) r.scale.setScalar(pulse);
  for (const l of world.labels) {
    const d = camera.position.distanceTo(l.position);
    l.scale.copy(l.userData.base).multiplyScalar(clamp(d / 45, 0.3, 1));
  }
  updateLighting(state ? state.minutes / 60 : 9.5);
  updateCamera();
  hudTimer += dt;
  if (hudTimer > 0.25 && state) { hudTimer = 0; renderHud(); renderPanel(); drawMinimap(); }
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); }
  renderer.render(scene, camera);
}
loop();

if (import.meta.env.DEV) window.__dbg = { player, world, get state() { return state; } };
