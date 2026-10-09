// Stylized game rooms, not measured/surveyed university interiors.
// Furniture sits against the walls; a central aisle connects all stations.
export const INTERIORS = {
  hostel: [['bed', 'Bed', 'Sleep|nap'], ['kitchen', 'Kitchen', 'Cook|noodles'], ['bath', 'Bathroom', 'bath|toilet'], ['sofa', 'Common room', 'Gist']],
  faculty: [['board', 'Lecture hall', 'lecture|test'], ['desk', 'Lecturer office', 'lecturer'], ['bath', 'Toilet', 'toilet']],
  library: [['shelf', 'Book shelves', 'Study alone'], ['desk', 'Study tables', 'Group study'], ['desk', 'Copy desk', 'Photocopy'], ['bath', 'Toilet', 'toilet']],
  cafeteria: [['kitchen', 'Food counter', 'rice|Amala|Puff'], ['table', 'Dining tables', 'Hang out'], ['bath', 'Toilet', 'toilet']],
  health: [['bed', 'Treatment bay', 'nurse'], ['shelf', 'Pharmacy', 'vitamins']],
  senate: [['desk', 'Registry', 'registration|results'], ['shelf', 'Records office', 'Work-study']],
  sug: [['table', 'Meeting room', 'meeting|Vote'], ['table', 'Games room', 'tennis'], ['desk', 'Tutoring desks', 'Tutor'], ['bath', 'Toilet', 'toilet']],
};
export function interiorStations(type) {
  return (INTERIORS[type] || []).map(([kind, label, pattern], i) => ({ kind, label, pattern, x: i % 2 ? 300 : 45, y: i < 2 ? 58 : 166, w: 115, h: 70, approach: { x: i % 2 ? 278 : 182, y: i < 2 ? 122 : 195 } }));
}
export function mountInterior(host, type, { onStation, onExit, appearance } = {}) {
  const stations = interiorStations(type);
  host.replaceChildren();
  if (!stations.length) return { dispose() {} };
  const note = document.createElement('p'); note.className = 'interior-note';
  note.textContent = 'Inside · stylized cutaway. Tap furniture to walk to a station and see its actions. Tap the aisle to move.';
  const canvas = document.createElement('canvas'); canvas.width = 460; canvas.height = 300; canvas.id = 'interior-map';
  canvas.setAttribute('aria-label', 'Furnished interior with central walking aisle');
  const status = document.createElement('p'); status.className = 'interior-note'; status.setAttribute('aria-live', 'polite'); status.textContent = 'You entered through the door.';
  const controls = document.createElement('div'); controls.className = 'interior-stations';
  const avatar = { x: 230, y: 250 }; let target = null, selected = null, frame, last = performance.now(), disposed = false, isometric = true;
  const view = document.createElement('button'); view.textContent = 'Plan view'; view.onclick = () => { isometric = !isometric; view.textContent = isometric ? 'Plan view' : 'Isometric view'; }; controls.append(view);
  const projection = p => isometric ? { x: 182 + .6 * p.x - .6 * p.y, y: 33.4 + .32 * p.x + .32 * p.y } : p;
  function go(s) { selected = s; target = s.approach; status.textContent = `Walking to ${s.label}…`; }
  for (const s of stations) { const b = document.createElement('button'); b.textContent = s.label; b.onclick = () => go(s); controls.append(b); }
  const exit = document.createElement('button'); exit.textContent = 'Exit to campus'; exit.onclick = onExit; controls.append(exit);
  host.append(note, canvas, status, controls);
  canvas.onclick = e => {
    const r = canvas.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * 460, py = (e.clientY - r.top) / r.height * 300;
    const x = isometric ? ((px - 182) / .6 + (py - 33.4) / .32) / 2 : px;
    const y = isometric ? ((py - 33.4) / .32 - (px - 182) / .6) / 2 : py;
    if (y > 260 && x > 195 && x < 265) { onExit(); return; }
    const s = stations.find(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (s) go(s);
    else if (x >= 175 && x <= 285 && y >= 40 && y <= 250) { target = { x, y }; selected = null; status.textContent = 'Walking through the aisle…'; }
  };
  const g = canvas.getContext('2d');
  const box = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const transform = () => { if (isometric) g.setTransform(.6, .32, -.6, .32, 182, 33.4); else g.setTransform(1, 0, 0, 1, 0, 0); };
  const label = (text, x, y, col = '#162b33') => { const p = projection({ x, y }); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = col; g.font = 'bold 11px system-ui'; g.textAlign = 'center'; g.fillText(text, p.x, p.y); g.restore(); };
  const wall = (a, b, col) => { const p = projection(a), q = projection(b); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = col; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.lineTo(q.x, q.y - 25); g.lineTo(p.x, p.y - 25); g.closePath(); g.fill(); g.restore(); };
  function draw(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (target) { const dx = target.x - avatar.x, dy = target.y - avatar.y, d = Math.hypot(dx, dy), step = Math.min(d, dt * 190);
      if (d < 2) { target = null; status.textContent = selected ? `${selected.label} · choose an action below.` : 'In the aisle.'; if (selected) onStation(selected); }
      else { avatar.x += dx / d * step; avatar.y += dy / d * step; }
    }
    g.setTransform(1, 0, 0, 1, 0, 0); box(0, 0, 460, 300, '#0d1924'); transform(); box(20, 22, 420, 254, '#dcc6a4');
    for (let y = 22; y < 276; y += 24) for (let x = 20; x < 440; x += 24) { g.strokeStyle = '#c8b393'; g.strokeRect(x, y, 24, 24); }
    // Tall rear/side walls, open front and roof for the aerial cutaway.
    box(15, 10, 430, 22, '#95aaa8'); box(15, 10, 9, 267, '#78908c'); box(436, 10, 9, 267, '#78908c');
    if (isometric) { wall({ x: 20, y: 22 }, { x: 440, y: 22 }, '#6f948a'); wall({ x: 20, y: 22 }, { x: 20, y: 276 }, '#44695f'); }
    box(175, 35, 110, 221, '#e9d9bd');
    for (const s of stations) {
      box(s.x + 5, s.y + 7, s.w, s.h, '#9b896e');
      box(s.x, s.y, s.w, s.h, selected === s ? '#75aa95' : '#a47f59');
      if (s.kind === 'bed') { box(s.x + 12, s.y + 8, 90, 52, '#77a5c2'); box(s.x + 17, s.y + 13, 25, 42, '#f8f5ee'); }
      if (s.kind === 'shelf') for (let i = 0; i < 8; i++) box(s.x + 8 + i * 12, s.y + 8, 8, 37, ['#507e9b', '#bc6454', '#6b805a'][i % 3]);
      if (s.kind === 'bath') { box(s.x + 9, s.y + 8, 44, 36, '#dceef4'); g.fillStyle = '#f7fafc'; g.beginPath(); g.ellipse(s.x + 82, s.y + 29, 15, 21, 0, 0, 7); g.fill(); }
      if (s.kind === 'board') { box(s.x + 6, s.y + 5, 103, 23, '#214d40'); for (let i = 0; i < 3; i++) box(s.x + 8 + i * 34, s.y + 40, 25, 18, '#e1b573'); }
      if (s.kind === 'desk' || s.kind === 'table') { box(s.x + 12, s.y + 12, 88, 32, '#dfb476'); box(s.x + 42, s.y + 46, 28, 18, '#51716a'); }
      if (s.kind === 'kitchen') { box(s.x + 7, s.y + 7, 100, 34, '#ded9c9'); for (let i = 0; i < 3; i++) { g.fillStyle = '#43565c'; g.beginPath(); g.arc(s.x + 25 + i * 32, s.y + 24, 10, 0, 7); g.fill(); } }
      if (s.kind === 'sofa') { box(s.x + 8, s.y + 8, 99, 40, '#587f72'); for (let i = 0; i < 3; i++) box(s.x + 12 + i * 31, s.y + 14, 26, 28, '#85a898'); }
      label(s.label, s.x + s.w / 2, s.y + s.h + 20);
    }
    box(195, 267, 70, 21, '#287858'); label('EXIT ↓', 230, 282, '#fff');
    if (target) { g.strokeStyle = '#267b57'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(avatar.x, avatar.y); g.lineTo(target.x, target.y); g.stroke(); g.setLineDash([]); }
    const ap = projection(avatar); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#183f2d'; g.beginPath(); g.ellipse(ap.x, ap.y + 7, 12, 6, 0, 0, 7); g.fill();
    g.fillStyle = appearance?.shirt || '#15803d'; g.beginPath(); g.arc(ap.x, ap.y, 10, 0, 7); g.fill();
    g.fillStyle = '#a0672f'; g.beginPath(); g.arc(ap.x, ap.y - 9, 6, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(ap.x, ap.y, 13, 0, 7); g.stroke();
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  return { dispose() { disposed = true; cancelAnimationFrame(frame); host.replaceChildren(); } };
}
