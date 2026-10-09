import * as THREE from 'three';
import { buildWorld, makeLabel } from './world.js';
import { makeCharacter, animateWalk, applyCharacterAppearance } from './character.js';
import { OUTFITS, HAIRSTYLES, SKIN_TONES, ensureWardrobe, changeAppearance, outfitById } from './wardrobe.js';
import { drawAvatarPreview } from './preview.js';
import { ROOM_CATEGORIES, FURNITURE, WALL_COLOURS, ROOM_LAYOUTS, ensureRoom, decorateRoom, furnitureById } from './rooms.js';
import { drawRoomPreview } from './room-view.js';
import { ACTIONS, newState, advance, perform, actionStatus, isExamDay, gpa, fmtMoney, fmtTime, fmtDur, DAY_NAMES, clamp } from './game.js';
import { STORIES, storyById, storyStep, resolveAt, storyActions, storyAdvance } from './stories.js';
import { CHOW, CHOW_FEE, chowAction, GIGS, todaysGigs, gistFeed, matricNo, degreeClass } from './apps.js';
import { FACULTIES, AREAS, CAMPUS_FARE, CAMPUS_RIDE_MINS, WEEKDAYS, timetable } from './campus.js';
import { ROADS_Z } from './world.js';
import { ensureDay, track, level, missionDef, STREAK_REWARDS, BONUS } from './missions.js';

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
  'Football at the sports complex by 5pm?', 'Omo, sapa has finished me this week.', 'Who get carryover for GST? Na me o.',
  'How far? Wetin dey happen for your department?', 'Our course rep don post another dues for the group chat.',
  'No water for hostel again. I don tire.', 'You be JJC? Freshers dey always lost for this campus.',
  'ASUU fit strike again this session, e no go surprise me.', 'Make we go chop for cafeteria, I dey hungry die.',
  'Departmental week dinner na this Friday, you don get outfit?', 'Keke guys don increase fare to Gwagwalada again.',
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
  if (e.code === 'KeyP' && state) { togglePhone(); return; }
  if (e.code === 'Escape') closePhone();
  if (phoneApp) return;
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
const warned = { hunger: false, energy: false, hygiene: false, bladder: false };

function toast(msg, kind = '') {
  if (state) {
    state.inbox ??= [];
    state.inbox.unshift({ t: `Day ${state.day} ${fmtTime(state.minutes)}`, msg });
    state.inbox.length = Math.min(state.inbox.length, 40);
  }
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
  if (!panelOpen && !busy && !phoneApp) {
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
  applyRewards(track(state, { type: 'chat' }));
}

const FX_NAMES = { energy: 'Energy', hunger: 'Food', social: 'Social', knowledge: 'Test prep', hygiene: 'Hygiene', bladder: 'Bladder' };
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
  const list = [...storyActions(state, L.id), ...ACTIONS[L.actions]];
  const statuses = list.map((a) => actionStatus(state, a));
  const sig = statuses.map((s) => s.ok + (s.reason || '')).join('|') + state.pantry + (state.story ? state.story.id + state.story.step : '');
  if (!force && sig === panelSig) return;
  panelSig = sig;
  $('panel-title').textContent = L.name;
  $('panel-sub').textContent = L.blurb;
  const box = $('panel-actions');
  box.innerHTML = '';
  list.forEach((a, i) => {
    const st = statuses[i];
    const b = document.createElement('button');
    b.className = 'action' + (a.storyOpt !== undefined ? ' story' : '');
    b.disabled = !st.ok;
    const strong = document.createElement('b');
    strong.textContent = a.label;
    const small = document.createElement('small');
    small.textContent = st.ok ? describe(a) : st.reason;
    b.append(strong, small);
    b.onclick = () => doAction(a);
    box.appendChild(b);
  });
  if (L.id === state.residence) {
    const b = document.createElement('button');
    b.className = 'action room-action'; b.textContent = 'Decorate my room';
    b.onclick = () => openPhone('room'); box.appendChild(b);
  }
}

function openPanel(L) {
  state.here = L.id;
  $('panel-close').classList.toggle('hidden', !!state.away);
  panelOpen = true;
  panelLoc = L;
  renderPanel(true);
  $('panel').classList.remove('hidden');
  promptKey = '__';
}
function closePanel() {
  if (busy || state?.away) return;
  panelOpen = false;
  $('panel').classList.add('hidden');
}

async function doAction(a) {
  if (a.ride) return rideKeke(a.ride);
  if (busy) return;
  const before = state.money, t0 = state.day * 1440 + state.minutes, here = state.here;
  busy = true;
  fade(true, `${a.label}…`);
  await sleep(850);
  const res = perform(state, a, notify);
  if (state.money !== before) logTx(a.label, state.money - before);
  renderHud();
  renderPanel(true);
  await sleep(200);
  fade(false);
  toast(res.msg, res.kind);
  busy = false;
  if (state.day * 1440 + state.minutes > t0) {
    applyRewards(track(state, { type: 'action', ...a, here }));
    if (a.storyOpt !== undefined) { applyRewards(storyAdvance(state, a.storyOpt)); renderPanel(true); }
  }
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
  if (state.bladder < 20 && !warned.bladder) { warned.bladder = true; toast('You need to ease yourself. Find a toilet fast!', 'warn'); }
  if (state.bladder > 30) warned.bladder = false;
  if (state.hygiene < 20 && !warned.hygiene) { warned.hygiene = true; toast('People are holding their nose around you. Go and bath!', 'warn'); }
  if (state.hygiene > 30) warned.hygiene = false;
}

// ---------- HUD ----------
const NEEDS = [['energy', 'Energy', '#facc15'], ['hunger', 'Food', '#fb923c'], ['social', 'Social', '#34d399'], ['hygiene', 'Hygiene', '#38bdf8'], ['bladder', 'Bladder', '#c084fc'], ['knowledge', 'Test prep', '#60a5fa']];
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
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const p2 = (n) => String(n).padStart(2, '0');
const locById = (id) => world.locations.find((L) => L.id === id);

function migrate(s) {
  s.faculty ??= 'science'; s.dept ??= 'Computer Science'; s.deptCode ??= 'CSC';
  if (!locById(s.residence) && !AREAS.some((A) => A.id === s.residence)) s.residence = 'hostel-ob';
  s.inbox ??= []; s.tx ??= []; s.away ??= null; s.hygiene ??= 80; s.bladder ??= 80; s.savings ??= 0;
  ensureWardrobe(s);
  ensureRoom(s);
}

function logTx(label, amt) {
  state.tx ??= [];
  state.tx.unshift({ t: `Day ${state.day} ${fmtTime(state.minutes)}`, label, amt });
  state.tx.length = Math.min(state.tx.length, 30);
}

function openArea(id) {
  const A = AREAS.find((x) => x.id === id);
  player.visible = false;
  openPanel({ id: A.id, name: A.name, blurb: A.blurb + (state.residence === A.id ? ' Your lodge is here.' : ''), actions: 'area-' + A.id });
}

async function rideKeke(dest) {
  if (busy) return;
  const A = AREAS.find((x) => x.id === dest), L = locById(dest);
  const from = state.away && AREAS.find((x) => x.id === state.away);
  if (A && from) return toast('Take a keke back to campus first.', 'warn');
  const fare = A ? A.fare : from ? from.fare : CAMPUS_FARE;
  const mins = A ? A.mins : from ? from.mins : CAMPUS_RIDE_MINS;
  const name = (A || L).name;
  if (state.money < fare) return toast(`Not enough money for the keke (${fmtMoney(fare)})`, 'bad');
  closePhone();
  guideTo(null);
  busy = true;
  fade(true, `Keke to ${name}… ${fmtMoney(fare)}`);
  await sleep(1100);
  advance(state, mins, {}, notify);
  state.money -= fare;
  logTx(`Keke to ${name}`, -fare);
  busy = false;
  if (A) {
    state.away = A.id;
    openArea(A.id);
  } else {
    state.away = null;
    player.visible = true;
    panelOpen = false;
    $('panel').classList.add('hidden');
    player.position.set(L.doorPoint.x, 0, L.doorPoint.z);
    updateCamera(true);
  }
  renderHud();
  fade(false);
  toast(`You arrived at ${name}.`, 'good');
  applyRewards(track(state, { type: 'ride' }));
  save();
}

const guideArrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfacc15, fog: false, depthTest: false }));
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.5, depthWrite: false, fog: false, side: THREE.DoubleSide }));
guideArrow.visible = beacon.visible = false;
guideArrow.renderOrder = 10;
scene.add(guideArrow, beacon);
let guide = null, guideText = '';
function guideTo(L) {
  guide = L;
  guideArrow.visible = beacon.visible = !!L;
  $('guide').classList.toggle('hidden', !L);
  if (L) beacon.position.set(L.doorPoint.x, 20, L.doorPoint.z);
}
function updateGuide() {
  if (!guide) return;
  const dx = guide.doorPoint.x - player.position.x, dz = guide.doorPoint.z - player.position.z, d = Math.hypot(dx, dz);
  if (d < 3) { toast(`You have arrived at ${guide.name}.`, 'good'); guideTo(null); return; }
  guideArrow.position.set(player.position.x + (dx / d) * 0.6, 3.5, player.position.z + (dz / d) * 0.6);
  guideArrow.rotation.y = Math.atan2(dx, dz);
  const t = `To ${guide.name} · ${Math.round(d)} m`;
  if (t !== guideText) $('guide').textContent = guideText = t;
}

const APPS = [['missions', 'Missions', '#ef4444'], ['stories', 'Stories', '#f59e0b'], ['map', 'Map', '#22c55e'], ['timetable', 'Timetable', '#3b82f6'], ['keke', 'Keke', '#facc15'], ['chow', 'Chow', '#f43f5e'], ['hustle', 'Hustle', '#84cc16'], ['bank', 'Bank', '#0ea5e9'], ['wallet', 'Wallet', '#a855f7'], ['gist', 'Gist', '#ec4899'], ['portal', 'Portal', '#6366f1'], ['messages', 'Messages', '#f97316'], ['online', 'Online', '#14b8a6']];
const REAL = [['Main campus', 'University of Abuja Main Campus, Airport Road, Abuja'], ['Gwagwalada', 'Gwagwalada, FCT, Nigeria'], ['Iddo', 'Iddo, Abuja, Nigeria'], ['Giri', 'Giri, Abuja, Nigeria']];
APPS.unshift(['wardrobe', 'Wardrobe', '#a78bfa']);
APPS.unshift(['room', 'My Room', '#f59e0b']);
let avatarRotation = 0;
let roomCategory = 'bed', roomAngle = Math.PI / 4;
function atOwnHome() {
  if (!state) return false;
  if (state.away) return state.away === state.residence;
  const home = locById(state.residence);
  return !!home && Math.hypot(player.position.x - home.doorPoint.x, player.position.z - home.doorPoint.z) < 3.2;
}
let phoneApp = null, mapTab = 'campus', realQ = REAL[0][1];
function togglePhone() { phoneApp ? closePhone() : openPhone(); }
function openPhone(app = 'home') {
  if (!state || busy) return;
  phoneApp = app;
  keys.clear(); joy.x = joy.y = 0; stick.style.transform = '';
  $('phone').classList.remove('hidden');
  renderPhone();
}
function closePhone() { phoneApp = null; $('phone').classList.add('hidden'); }
function renderPhone() {
  const scr = $('phone-screen');
  const head = (t) => `<div class="ph-head"><button class="ph-back" data-app="home" aria-label="Back">‹</button><b>${t}</b></div>`;
  const fac = FACULTIES[state.faculty].name;
  $('phone-time').textContent = fmtTime(state.minutes);
  let h = '';
  if (phoneApp === 'home') {
    h = `<div class="ph-greet">Hi ${esc(state.name)}<small>${esc(state.dept)} · ${fac}</small></div><div class="ph-grid">${APPS.map(([id, n, c]) => `<button class="ph-app" data-app="${id}"><i style="background:${c}">${n[0]}</i>${n}</button>`).join('')}</div>`;
  } else if (phoneApp === 'room') {
    const room = ensureRoom(state), home = atOwnHome(), L = locById(state.residence), A = AREAS.find((x) => x.id === state.residence);
    const name = L?.name || `${A?.name || 'Your'} lodge`;
    const disabled = home ? '' : 'disabled';
    h = head('My Room') + `<p class="ph-sub">${esc(name)} · Your own corner of campus life</p><div id="room-preview" class="custom-preview"></div>` +
      '<div class="ph-chips"><button data-room-turn="-1" aria-label="View room from left">↶ View</button><button data-room-turn="1" aria-label="View room from right">View ↷</button></div>' +
      `<p class="ph-sub room-status">${home ? 'You are home. Pick furniture for each spot and try a layout.' : 'Viewing only. Go to your own hostel or lodge to buy, place or decorate.'} Furniture is cosmetic; it does not change your needs.</p>` +
      (home ? '' : L ? `<button class="ph-row ph-btn" data-guide="${L.id}"><span>Directions home</span><b>›</b></button>` : state.away ? '<button class="ph-row ph-btn" data-ride="keke"><span>Keke back to campus first</span><b>›</b></button>' : `<button class="ph-row ph-btn" data-ride="${state.residence}"><span>Keke home to ${esc(A?.name || '')}</span><b>${fmtMoney(A?.fare || 0)}</b></button>`) +
      '<h3 class="ph-section">Wall colour · free</h3><div class="ph-chips">' +
      WALL_COLOURS.map((w) => `<button data-room-wall="${w.id}" class="${room.wall === w.id ? 'on' : ''}" aria-pressed="${room.wall === w.id}" ${disabled}><i class="skin-swatch" style="background:${w.color}"></i>${w.name}</button>`).join('') +
      '</div><h3 class="ph-section">Layout · free</h3><div class="ph-chips">' +
      ROOM_LAYOUTS.map((l) => `<button data-room-layout="${l.id}" class="${room.layout === l.id ? 'on' : ''}" aria-pressed="${room.layout === l.id}" ${disabled}>${l.name}</button>`).join('') +
      '</div><h3 class="ph-section">Furniture shop & storage</h3><div class="ph-chips room-tabs">' +
      ROOM_CATEGORIES.map(([id, label]) => `<button data-room-tab="${id}" class="${roomCategory === id ? 'on' : ''}" aria-pressed="${roomCategory === id}">${label}</button>`).join('') + '</div>' +
      FURNITURE.filter((f) => f.kind === roomCategory).map((f) => {
        const owned = room.owned.includes(f.id), placed = room.equipped[f.kind] === f.id;
        return `<button class="ph-row ph-btn ${placed ? 'selected' : ''}" data-room-furniture="${f.id}" ${!home || placed || (!owned && state.money < f.price) ? 'disabled' : ''}><span>${f.name}<small>${placed ? 'Placed' : owned ? 'Owned · place for free' : 'Buy & place · keep forever'}</small></span><b>${placed ? 'On' : owned ? 'Place' : fmtMoney(f.price)}</b></button>`;
      }).join('') +
      `<button class="ph-row ph-btn" data-room-store="${roomCategory}" ${!home || !room.equipped[roomCategory] ? 'disabled' : ''}><span>Store current item<small>Keep it in storage; no cash refund.</small></span><b>↗</b></button><p class="ph-sub">Your design saves automatically on this browser. No cloud saves or friend invitations yet.</p>`;
  } else if (phoneApp === 'wardrobe') {
    ensureWardrobe(state);
    const a = state.appearance;
    h = head('Wardrobe') + '<div id="avatar-preview" class="custom-preview"></div>' +
      '<div class="ph-chips"><button data-turn="-1" aria-label="Turn character left">↶ Turn</button><button data-turn="1" aria-label="Turn character right">Turn ↷</button></div>' +
      `<p class="ph-sub">${esc(outfitById(a.outfit).name)} · Changes appear on your campus character and save automatically.</p><h3 class="ph-section">Outfits</h3>` +
      OUTFITS.map((o) => {
        const owned = state.ownedOutfits.includes(o.id), wearing = a.outfit === o.id;
        return `<button class="ph-row ph-btn ${wearing ? 'selected' : ''}" data-outfit="${o.id}" aria-pressed="${wearing}" ${wearing || (!owned && state.money < o.price) ? 'disabled' : ''}><span><i class="fabric-swatch ${o.pattern || ''}" style="--fabric:${o.shirt}"></i>${o.name}<small>${wearing ? 'Wearing' : owned ? 'Owned · wear for free' : 'Buy once, keep forever'}</small></span><b>${wearing ? 'On' : owned ? 'Wear' : fmtMoney(o.price)}</b></button>`;
      }).join('') + '<h3 class="ph-section">Hair · free</h3><div class="ph-chips">' +
      HAIRSTYLES.map((o) => `<button data-hair="${o.id}" class="${a.hair === o.id ? 'on' : ''}" aria-pressed="${a.hair === o.id}">${o.name}</button>`).join('') +
      '</div><h3 class="ph-section">Skin tone · free</h3><div class="ph-chips">' +
      SKIN_TONES.map((o) => `<button data-skin="${o.id}" class="${a.skin === o.id ? 'on' : ''}" aria-pressed="${a.skin === o.id}"><i class="skin-swatch" style="background:${o.color}"></i>${o.name}</button>`).join('') + '</div>';
  } else if (phoneApp === 'timetable') {
    const today = (state.day - 1) % 7;
    h = head('Timetable') + `<p class="ph-sub">${esc(state.dept)} · 100 Level</p>` +
      timetable(state.deptCode).map((d, i) => `<div class="ph-row ${i === today ? 'today' : ''}"><b>${WEEKDAYS[i]}</b><span>${d.map((l) => `${p2(l.start)}:00 ${l.code}`).join(' · ')}</span></div>`).join('') +
      `<p class="ph-sub">Lectures hold at ${fac}. Arrive within 45 minutes of the start. No classes on weekends.</p>`;
  } else if (phoneApp === 'keke') {
    const from = state.away && AREAS.find((A) => A.id === state.away);
    const dests = [...(from ? [] : AREAS.map((A) => ({ id: A.id, name: `${A.name} (off campus)`, fare: A.fare }))),
      ...world.locations.filter((L) => L.kind !== 'gate').map((L) => ({ id: L.id, name: L.name, fare: from ? from.fare : CAMPUS_FARE }))];
    h = head('Keke') + `<p class="ph-sub">${from ? `You're in ${from.name}. Where on campus should the keke drop you?` : 'Pick a destination. Campus rides cost ₦100.'}</p>` +
      dests.map((d) => `<button class="ph-row ph-btn" data-ride="${d.id}"><span>${esc(d.name)}</span><b>${fmtMoney(d.fare)}</b></button>`).join('');
  } else if (phoneApp === 'wallet') {
    h = head('Wallet') + `<div class="ph-bal">${fmtMoney(state.money)}<small>Allowance: +₦10,000 every 7 days</small></div>` +
      (state.tx.length ? state.tx.map((t) => `<div class="ph-row"><span>${esc(t.label)}<small>${t.t}</small></span><b class="${t.amt < 0 ? 'neg' : 'pos'}">${t.amt < 0 ? '−' : '+'}${fmtMoney(Math.abs(t.amt))}</b></div>`).join('') : '<p class="ph-sub">No transactions yet.</p>');
  } else if (phoneApp === 'messages') {
    h = head('Messages') + (state.inbox.length ? state.inbox.map((m) => `<div class="ph-row"><span>${esc(m.msg)}<small>${m.t}</small></span></div>`).join('') : '<p class="ph-sub">No messages yet.</p>');
  } else if (phoneApp === 'missions') {
    const L = level(state.rep), lit = ((state.streak - 1) % 7) + 1;
    const bar = (f) => `<div class="ph-bar-p"><i style="width:${Math.round(Math.min(1, f) * 100)}%"></i></div>`;
    h = head('Missions') + `<div class="ph-bal">Lv ${L.idx} · ${L.name}<small>${state.rep} Rep${L.next ? ` · ${L.next - state.rep} to next level` : ' · max level'}</small>${bar(L.pct)}</div>` +
      `<p class="ph-sub">Check-in streak: ${state.streak} day${state.streak === 1 ? '' : 's'}. Come back every day.</p>` +
      `<div class="ph-streak">${STREAK_REWARDS.map((m, i) => `<span class="${i < lit ? 'on' : ''}">D${i + 1}<small>₦${m >= 1000 ? m / 1000 + 'k' : m}</small></span>`).join('')}</div>` +
      `<p class="ph-sub"><b>Today's missions</b> · new ones every day</p>` +
      state.ms.list.map((m) => {
        const d = missionDef(m.id);
        const prog = d.unit === '₦' ? `${fmtMoney(m.prog)}/${fmtMoney(d.goal)}` : d.unit === 'm' ? `${m.prog}/${d.goal} min` : `${m.prog}/${d.goal}`;
        return `<div class="ph-mission ${m.done ? 'done' : ''}"><div><b>${d.label}</b><small>${d.desc}</small>${bar(m.prog / d.goal)}</div><span>${m.done ? 'Done' : prog}<small>+${fmtMoney(d.money)} · +${d.rep} Rep</small></span></div>`;
      }).join('') +
      `<p class="ph-sub">Finish all three: +${fmtMoney(BONUS.money)} · +${BONUS.rep} Rep${state.ms.bonus ? ' (claimed)' : ''}</p>`;
  } else if (phoneApp === 'stories') {
    let cur = '<p class="ph-sub">Pick a story. You can follow one at a time.</p>';
    const st = storyStep(state);
    if (st) {
      const S = storyById(state.story.id), at = resolveAt(state, st.at), L = locById(at), A = AREAS.find((x) => x.id === at);
      cur = `<div class="ph-card"><b>${esc(S.title)}</b><small>Step ${state.story.step + 1} of ${S.steps.length}</small><small>${esc(st.hint)}</small></div>` +
        (L ? `<button class="ph-row ph-btn" data-guide="${L.id}"><span>Get directions to ${esc(L.name)}</span><b>›</b></button>` : `<p class="ph-sub">Take a keke to ${esc(A?.name || '')}.</p>`) +
        '<button class="ph-row ph-btn" data-story="quit"><span>Abandon this story</span><b>✕</b></button>';
    }
    h = head('Campus Stories') + cur + STORIES.map((S) => {
      const done = state.storiesDone?.includes(S.id), on = state.story?.id === S.id;
      return `<button class="ph-row ph-btn" data-story="${S.id}" ${done || state.story ? 'disabled' : ''}><span>${esc(S.title)}<small>${esc(S.blurb)}</small></span><b>${done ? 'Done' : on ? 'Active' : 'Start'}</b></button>`;
    }).join('');
  } else if (phoneApp === 'chow') {
    h = head('Chow') + `<p class="ph-sub">Food delivered to you anywhere on campus or at your lodge. Delivery fee ${fmtMoney(CHOW_FEE)}, about 40 minutes.</p>` +
      CHOW.map((c, i) => {
        const a = chowAction(i), st = actionStatus(state, a);
        return `<button class="ph-row ph-btn" data-chow="${i}" ${st.ok ? '' : 'disabled'}><span>${esc(c[0])}<small>${st.ok ? `+${c[2]} Food` : esc(st.reason)}</small></span><b>${fmtMoney(a.cost)}</b></button>`;
      }).join('');
  } else if (phoneApp === 'hustle') {
    h = head('Hustle') + '<p class="ph-sub">Today\'s gigs. Each one can be done once a day, from anywhere.</p>' +
      todaysGigs(state).map((g) => {
        const st = actionStatus(state, g);
        return `<button class="ph-row ph-btn" data-gig="${g.id}" ${st.ok ? '' : 'disabled'}><span>${esc(g.label)}<small>${st.ok ? (g.mins >= 60 ? g.mins / 60 + 'h' : g.mins + 'm') : esc(st.reason)}</small></span><b class="pos">+${fmtMoney(g.earn)}</b></button>`;
      }).join('');
  } else if (phoneApp === 'bank') {
    h = head('UniBank') + `<div class="ph-bal">${fmtMoney(state.money)}<small>Current account</small></div><div class="ph-bal sm">${fmtMoney(state.savings)}<small>Savings · earns 1% every day</small></div>` +
      `<div class="ph-chips">${[['dep:1000', 'Save ₦1k'], ['dep:5000', 'Save ₦5k'], ['wd:1000', 'Withdraw ₦1k'], ['wd:all', 'Withdraw all']].map(([k, n]) => `<button data-bank="${k}">${n}</button>`).join('')}</div>` +
      '<button class="ph-row ph-btn" data-bank="ask"><span>Ask home for money<small>Once every 3 days. No promises.</small></span><b>›</b></button>';
  } else if (phoneApp === 'gist') {
    h = head('Campus Gist') + gistFeed(state).map(([u, t, hot, likes]) => `<div class="ph-post ${hot ? 'hot' : ''}"><b>${u}</b><p>${esc(t)}</p><small>${likes} likes</small></div>`).join('');
  } else if (phoneApp === 'portal') {
    const g = gpa(state), res = (locById(state.residence) || AREAS.find((A) => A.id === state.residence))?.name || '';
    h = head('Student Portal') + `<div class="ph-card"><b>${esc(state.name)}</b><small>${matricNo(state)}</small><small>${esc(state.dept)} · ${fac} · 100 Level</small><small>Residence: ${esc(res)}</small></div>` +
      `<div class="ph-row"><span>Course registration</span><b class="${state.registered ? 'pos' : 'neg'}">${state.registered ? 'Registered' : 'Pending'}</b></div>` +
      (state.registered ? '' : '<p class="ph-sub">Go to the Senate Building to sort out your course registration.</p>') +
      `<div class="ph-bal">${g === null ? '—' : g.toFixed(2)}<small>CGPA / 5.00 · ${g === null ? 'No results yet' : degreeClass(g)}</small></div>` +
      (state.grades.length ? state.grades.map((r) => `<div class="ph-row"><span>Test · Day ${r.day}</span><b>${r.score}% · ${r.grade}</b></div>`).join('') : '<p class="ph-sub">No results yet. Tests hold every 5th day at your faculty.</p>');
  } else if (phoneApp === 'online') {
    h = head('Online') + `<div class="ph-bal">${online ?? 1}<small>${online ? 'players online now' : 'Offline mode: multiplayer server not connected yet'}</small></div><p class="ph-sub">Once the game is hosted with the presence server, this shows everyone playing UniAbuja Life.</p>`;
  } else if (phoneApp === 'map') {
    h = head('Map') + `<div class="ph-tabs"><button data-tab="campus" class="${mapTab === 'campus' ? 'on' : ''}">Campus</button><button data-tab="real" class="${mapTab === 'real' ? 'on' : ''}">Real map</button></div>` +
      (mapTab === 'campus'
        ? '<canvas id="ph-map" width="260" height="300"></canvas><p class="ph-sub">Tap a place to get directions. Follow the yellow arrow.</p>'
        : `<div class="ph-chips">${REAL.map(([n, q]) => `<button data-q="${esc(q)}" class="${q === realQ ? 'on' : ''}">${n}</button>`).join('')}</div><iframe class="ph-iframe" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(realQ)}&z=14&output=embed" title="Google Map"></iframe><p class="ph-sub">Real Google Map of the area. The 3D campus is not to scale yet.</p>`);
  }
  scr.innerHTML = h;
  if (phoneApp === 'wardrobe') drawAvatarPreview($('avatar-preview'), state.appearance, avatarRotation);
  if (phoneApp === 'room') drawRoomPreview($('room-preview'), ensureRoom(state), roomAngle);
  if (phoneApp === 'map' && mapTab === 'campus') drawPhoneMap();
}
function applyRewards(list) {
  for (const r of list) { if (r.money) logTx(r.label, r.money); notify(r.msg, 'good'); }
  if (list.length) { renderHud(); renderMissionChip(); if (phoneApp) renderPhone(); save(); }
}
function renderMissionChip() {
  const chip = $('mission-chip');
  chip.classList.toggle('hidden', !state?.ms);
  if (!state?.ms) return;
  const done = state.ms.list.filter((m) => m.done).length, L = level(state.rep);
  chip.innerHTML = `<b>Today's Missions ${done}/3</b><small>Lv ${L.idx} · ${L.name} · streak ${state.streak}</small>`;
}
$('mission-chip').onclick = () => openPhone('missions');
const MAP_R = 112;
function drawPhoneMap() {
  const c = $('ph-map');
  if (!c) return;
  const g = c.getContext('2d'), W = c.width, H = c.height;
  const X = (x) => ((x + MAP_R) / (2 * MAP_R)) * W, Z = (z) => ((z + MAP_R) / (2 * MAP_R)) * H;
  g.fillStyle = '#5f8f3e'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#374151';
  g.fillRect(X(-4), Z(-110), X(4) - X(-4), Z(95) - Z(-110));
  for (const rz of ROADS_Z) g.fillRect(X(-92), Z(rz - 4), X(92) - X(-92), Z(rz + 4) - Z(rz - 4));
  g.font = 'bold 7px system-ui'; g.textAlign = 'center';
  for (const L of world.locations) {
    g.fillStyle = guide === L ? '#facc15' : mapColor(L);
    g.fillRect(X(L.x - L.w / 2), Z(L.z - L.d / 2), X(L.x + L.w / 2) - X(L.x - L.w / 2), Z(L.z + L.d / 2) - Z(L.z - L.d / 2));
    g.fillStyle = '#fff';
    g.fillText(L.name.replace('Faculty of ', '').replace(' Hostel', '').replace('Old Girls', 'OG').replace('New Girls', 'NG').replace('Old Boys', 'OB').replace('International', 'Intl').replace('Postgraduate', 'PG').replace('Environmental Sciences', 'Env. Sci.').replace('Management Sciences', 'Mgt. Sci.').replace('University ', ''), X(L.x), Z(L.z) + 3);
  }
  g.fillStyle = '#ef4444'; g.beginPath(); g.arc(X(player.position.x), Z(player.position.z), 4, 0, 7); g.fill();
  c.onclick = (e) => {
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 * MAP_R - MAP_R, z = ((e.clientY - r.top) / r.height) * 2 * MAP_R - MAP_R;
    const L = world.locations.find((l) => Math.abs(x - l.x) < l.w / 2 + 4 && Math.abs(z - l.z) < l.d / 2 + 4);
    if (!L) return;
    if (state.away) return toast('Take a keke back to campus first.', 'warn');
    guideTo(L);
    closePhone();
    toast(`Directions set to ${L.name}. Follow the yellow arrow.`);
  };
}
$('phone-screen').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.disabled || busy) return;
  if (b.dataset.app) { phoneApp = b.dataset.app; renderPhone(); }
  else if (b.dataset.roomTab) { roomCategory = b.dataset.roomTab; renderPhone(); }
  else if (b.dataset.roomTurn) {
    roomAngle = clamp(roomAngle + Number(b.dataset.roomTurn) * Math.PI / 8, 0.12, Math.PI / 2 - 0.12);
    drawRoomPreview($('room-preview'), ensureRoom(state), roomAngle);
  }
  else if (b.dataset.roomFurniture || b.dataset.roomStore || b.dataset.roomWall || b.dataset.roomLayout) {
    const op = b.dataset.roomFurniture ? 'furniture' : b.dataset.roomStore ? 'store' : b.dataset.roomWall ? 'wall' : 'layout';
    const id = b.dataset['room' + op[0].toUpperCase() + op.slice(1)];
    const res = decorateRoom(state, op, id, atOwnHome());
    if (!res.ok) return toast(res.msg, 'bad');
    if (res.cost) logTx(`Room: ${furnitureById(id).name}`, -res.cost);
    renderHud(); renderPhone(); renderPanel(true); save();
    if (res.changed) toast(res.msg, 'good');
  }
  else if (b.dataset.outfit || b.dataset.hair || b.dataset.skin) {
    const category = b.dataset.outfit ? 'outfit' : b.dataset.hair ? 'hair' : 'skin';
    const id = b.dataset[category], res = changeAppearance(state, category, id);
    if (!res.ok) return toast(res.msg, 'bad');
    if (res.cost) logTx(`Outfit: ${outfitById(id).name}`, -res.cost);
    applyCharacterAppearance(player, state.appearance);
    renderHud(); renderPhone(); renderPanel(true); save();
    if (res.changed) toast(res.msg, 'good');
  }
  else if (b.dataset.turn) { avatarRotation += Number(b.dataset.turn) * Math.PI / 4; drawAvatarPreview($('avatar-preview'), state.appearance, avatarRotation); }
  else if (b.dataset.ride) rideKeke(b.dataset.ride);
  else if (b.dataset.chow) { closePhone(); doAction(chowAction(+b.dataset.chow)); }
  else if (b.dataset.gig) { closePhone(); doAction(GIGS.find((g) => g.id === b.dataset.gig)); }
  else if (b.dataset.bank) bank(b.dataset.bank);
  else if (b.dataset.guide) { const L = locById(b.dataset.guide); guideTo(L); closePhone(); toast(`Directions set to ${L.name}. Follow the yellow arrow.`); }
  else if (b.dataset.story) {
    if (b.dataset.story === 'quit') { state.story = null; toast('Story abandoned.', 'warn'); }
    else { const S = storyById(b.dataset.story); state.story = { id: S.id, step: 0 }; toast(`Story started: ${S.title}. ${S.steps[0].hint}`, 'good'); }
    renderPhone(); renderPanel(true); save();
  }
  else if (b.dataset.tab) { mapTab = b.dataset.tab; renderPhone(); }
  else if (b.dataset.q) { realQ = b.dataset.q; renderPhone(); }
});
function bank(k) {
  const [op, v] = k.split(':');
  if (op === 'dep') {
    const amt = Math.min(+v, state.money);
    if (amt <= 0) return toast('No money to save.', 'bad');
    state.money -= amt; state.savings += amt; logTx('Moved to savings', -amt);
  } else if (op === 'wd') {
    const amt = v === 'all' ? state.savings : Math.min(+v, state.savings);
    if (amt <= 0) return toast('Your savings are empty.', 'bad');
    state.savings -= amt; state.money += amt; logTx('From savings', amt);
  } else if (op === 'ask') {
    if (state.lastAsk && state.day - state.lastAsk < 3) return toast('You just asked. Wait a few days before begging again.', 'warn');
    state.lastAsk = state.day;
    if (Math.random() < 0.55) {
      const amt = 1000 * (2 + Math.floor(Math.random() * 4));
      state.money += amt; logTx('Money from home', amt);
      notify(`Mum sent ${fmtMoney(amt)}. "Spend it wisely o!"`, 'good');
    } else notify('Dad replied: "Did you not just collect allowance? Manage."', 'warn');
  }
  renderHud(); renderPhone(); save();
}
$('phone-close').onclick = closePhone;
$('phone-btn').onclick = togglePhone;

const PRESENCE_URL = import.meta.env.VITE_PRESENCE_URL || '/presence';
const clientId = Math.random().toString(36).slice(2);
let online = null;
async function pingPresence() {
  try {
    const r = await fetch(PRESENCE_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: clientId }) });
    if (!r.ok) throw new Error();
    online = (await r.json()).online || null;
  } catch { online = null; }
  $('online').textContent = online ? `${online} online` : 'Offline mode';
  $('online').classList.toggle('off', !online);
}
setInterval(() => state && pingPresence(), 20000);

function startGame(s, pos, rot) {
  state = s;
  migrate(state);
  applyCharacterAppearance(player, state.appearance);
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
  $('phone-btn').classList.remove('hidden');
  $('online').classList.remove('hidden');
  pingPresence();
  player.visible = !state.away;
  if (state.away) openArea(state.away);
  toast(`Welcome to UniAbuja, ${state.name}!`, 'good');
  setTimeout(() => toast('Walk onto a glowing yellow ring to enter a building. Press P for your phone: timetable, map and keke.'), 1200);
  setTimeout(() => toast('Your first test is on Day 5. Study at the library and attend lectures!'), 2600);
}

const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
if (saved?.state) {
  $('continue').textContent = `Continue as ${saved.state.name} (Day ${saved.state.day})`;
  $('continue').classList.remove('hidden');
  $('name').value = saved.state.name;
  $('continue').onclick = () => startGame(saved.state, saved.pos, saved.rot);
}
const facSel = $('faculty'), deptSel = $('dept'), resSel = $('residence');
facSel.innerHTML = Object.entries(FACULTIES).map(([id, f]) => `<option value="${id}">${f.name}</option>`).join('');
const fillDepts = () => { deptSel.innerHTML = FACULTIES[facSel.value].depts.map(([n, c]) => `<option value="${c}">${n}</option>`).join(''); };
facSel.onchange = fillDepts;
fillDepts();
resSel.innerHTML = '<optgroup label="On campus">' + world.locations.filter((L) => L.actions === 'hostel').map((L) => `<option value="${L.id}">${L.name}</option>`).join('') +
  '</optgroup><optgroup label="Off campus (keke daily)">' + AREAS.map((A) => `<option value="${A.id}">Lodge in ${A.name}</option>`).join('') + '</optgroup>';
$('start').onclick = () => {
  const f = facSel.value, code = deptSel.value, res = resSel.value;
  const s = newState(($('name').value.trim() || 'Fresher').slice(0, 16), { faculty: f, dept: FACULTIES[f].depts.find((d) => d[1] === code)[0], deptCode: code, residence: res });
  const home = locById(res);
  if (!home) s.away = res;
  const p = (home || locById('keke')).doorPoint;
  startGame(s, [p.x, p.z], Math.PI);
};

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
    updateGuide();
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
  if (hudTimer > 0.25 && state) {
    hudTimer = 0; renderHud(); renderPanel(); drawMinimap();
    applyRewards(ensureDay(state));
    renderMissionChip();
    if (phoneApp) { $('phone-time').textContent = fmtTime(state.minutes); if (phoneApp === 'map' && mapTab === 'campus') drawPhoneMap(); }
  }
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); }
  renderer.render(scene, camera);
}
loop();

if (import.meta.env.DEV) window.__dbg = { player, world, get state() { return state; } };
