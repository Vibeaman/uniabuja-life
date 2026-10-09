// A bounded visibility-checked A* grid. The same outdoor colliders as manual
// walking are expanded by the avatar radius plus a small safety margin.
export function createNavigator(boxes = [], circles = [], { bound = 108, step = 2, radius = 0.65 } = {}) {
  const bs = boxes.map(b => ({ minX: b.minX - radius, maxX: b.maxX + radius, minZ: b.minZ - radius, maxZ: b.maxZ + radius }));
  const cs = circles.map(c => ({ ...c, r: c.r + radius }));
  const free = p => Math.abs(p.x) <= bound && Math.abs(p.z) <= bound &&
    !bs.some(b => p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ) &&
    !cs.some(c => Math.hypot(p.x - c.x, p.z - c.z) <= c.r);
  function clear(a, b) {
    if (!free(a) || !free(b)) return false;
    const dx = b.x - a.x, dz = b.z - a.z;
    for (const r of bs) {
      let lo = 0, hi = 1;
      for (const [v, d, min, max] of [[a.x, dx, r.minX, r.maxX], [a.z, dz, r.minZ, r.maxZ]]) {
        if (Math.abs(d) < 1e-10) { if (v < min || v > max) { hi = -1; break; } }
        else { const t1 = (min - v) / d, t2 = (max - v) / d; lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); }
      }
      if (lo <= hi) return false;
    }
    const len2 = dx * dx + dz * dz;
    for (const c of cs) {
      const t = len2 ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / len2)) : 0;
      if (Math.hypot(a.x + t * dx - c.x, a.z + t * dz - c.z) <= c.r) return false;
    }
    return true;
  }
  const size = Math.floor(2 * bound / step) + 1;
  const point = i => ({ x: -bound + (i % size) * step, z: -bound + Math.floor(i / size) * step });
  const walkable = new Uint8Array(size * size);
  for (let i = 0; i < walkable.length; i++) walkable[i] = +free(point(i));
  function anchor(p) {
    let best = -1, dist = Infinity;
    const gx = Math.round((p.x + bound) / step), gz = Math.round((p.z + bound) / step);
    for (let z = Math.max(0, gz - 3); z <= Math.min(size - 1, gz + 3); z++) {
      for (let x = Math.max(0, gx - 3); x <= Math.min(size - 1, gx + 3); x++) {
        const i = z * size + x, q = point(i), d = Math.hypot(q.x - p.x, q.z - p.z);
        if (walkable[i] && d < dist && clear(p, q)) { best = i; dist = d; }
      }
    }
    return best;
  }
  function route(from, to) {
    if (!free(from) || !free(to)) return null;
    if (clear(from, to)) return [{ ...to }];
    const start = anchor(from), goal = anchor(to);
    if (start < 0 || goal < 0) return null;
    const cost = new Float64Array(walkable.length).fill(Infinity), prev = new Int32Array(walkable.length).fill(-1), closed = new Uint8Array(walkable.length);
    const heap = [];
    const push = (i, f) => { heap.push({ i, f }); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (heap[p].f <= f) break; [heap[p], heap[n]] = [heap[n], heap[p]]; n = p; } };
    const pop = () => { const first = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let n = 0; while (true) { let k = n, l = n * 2 + 1, r = l + 1; if (l < heap.length && heap[l].f < heap[k].f) k = l; if (r < heap.length && heap[r].f < heap[k].f) k = r; if (k === n) break; [heap[n], heap[k]] = [heap[k], heap[n]]; n = k; } } return first.i; };
    cost[start] = 0; push(start, 0);
    while (heap.length) {
      const i = pop(); if (closed[i]) continue;
      if (i === goal) {
        const raw = [{ ...to }]; let n = i;
        while (n !== -1) { raw.push(point(n)); n = prev[n]; }
        raw.push({ ...from }); raw.reverse();
        const result = []; let k = 0;
        while (k < raw.length - 1) { let j = raw.length - 1; while (j > k + 1 && !clear(raw[k], raw[j])) j--; result.push(raw[j]); k = j; }
        return result;
      }
      closed[i] = 1; const a = point(i), x = i % size, z = Math.floor(i / size);
      for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
        if ((!ox && !oz) || x + ox < 0 || z + oz < 0 || x + ox >= size || z + oz >= size) continue;
        const j = i + oz * size + ox, b = point(j);
        if (!walkable[j] || closed[j] || !clear(a, b)) continue;
        const next = cost[i] + Math.hypot(ox, oz) * step;
        if (next < cost[j]) { cost[j] = next; prev[j] = i; push(j, next + Math.hypot(b.x - to.x, b.z - to.z)); }
      }
    }
    return null;
  }
  return { free, clear, route };
}
