export const LEVELS = [[0, 'JJC'], [100, 'Fresher'], [300, 'Stalite'], [650, 'Big Boy / Big Girl'], [1100, 'Correct Person'], [1800, 'Final Year Legend']];
export const STREAK_REWARDS = [500, 700, 1000, 1200, 1500, 2000, 5000];
export const BONUS = { money: 3000, rep: 50 };

const isAct = (e) => e.type === 'action';
const POOL = [
  { id: 'eat', label: 'Chop two good meals', desc: 'Cafeteria, mama put or cook', goal: 2, money: 1000, rep: 20, on: (e) => isAct(e) && e.fx?.hunger > 0 },
  { id: 'lecture', label: 'Attend a lecture', desc: 'Your department or GST', goal: 1, money: 1500, rep: 30, on: (e) => isAct(e) && (e.lecture || /lecture/i.test(e.label)) },
  { id: 'study', label: 'Study for 2 hours', desc: 'Library, faculty or hostel', goal: 120, unit: 'm', money: 1500, rep: 30, on: (e) => isAct(e) && !e.lecture && !/lecture/i.test(e.label) && e.fx?.knowledge > 0 && e.mins },
  { id: 'chat', label: 'Gist with 3 students', desc: 'Walk up to anyone and press E', goal: 3, money: 800, rep: 20, on: (e) => e.type === 'chat' },
  { id: 'keke', label: 'Take 2 keke rides', desc: 'On campus or off campus', goal: 2, money: 600, rep: 15, on: (e) => e.type === 'ride' },
  { id: 'earn', label: 'Make ₦3,000 hustling', desc: 'Any side hustle', goal: 3000, unit: '₦', money: 2000, rep: 40, on: (e) => isAct(e) && e.earn },
  { id: 'bath', label: 'Stay fresh', desc: 'Take a bath', goal: 1, money: 500, rep: 10, on: (e) => isAct(e) && e.bath },
  { id: 'sport', label: 'Get active', desc: 'Football or the gym', goal: 1, money: 800, rep: 20, on: (e) => isAct(e) && e.here === 'sports' && e.fx?.energy < 0 },
  { id: 'hang', label: 'Hang out with friends', desc: 'Cafeteria, SUG or off campus', goal: 1, money: 800, rep: 20, on: (e) => isAct(e) && /hang out|gist/i.test(e.label) },
];

function seeded(n) {
  let x = n * 9301 + 49297;
  return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
}

export function level(rep = 0) {
  let i = 0;
  while (i + 1 < LEVELS.length && rep >= LEVELS[i + 1][0]) i++;
  const [base, name] = LEVELS[i];
  const next = LEVELS[i + 1]?.[0] ?? null;
  return { idx: i + 1, name, base, next, pct: next ? (rep - base) / (next - base) : 1 };
}

export const missionDef = (id) => POOL.find((m) => m.id === id);

// Returns messages for a new day: fresh missions and the daily check-in reward.
export function ensureDay(s) {
  s.rep ??= 0;
  s.streak ??= 0;
  const out = [];
  if (s.ms?.day !== s.day) {
    const r = seeded(s.day * 7 + s.deptCode.charCodeAt(0));
    const ids = POOL.map((m) => m.id).sort(() => r() - 0.5).slice(0, 3);
    s.ms = { day: s.day, list: ids.map((id) => ({ id, prog: 0, done: false })), bonus: false };
  }
  if (s.lastCheckin !== s.day) {
    s.streak = s.lastCheckin === s.day - 1 ? s.streak + 1 : 1;
    s.lastCheckin = s.day;
    const money = STREAK_REWARDS[(s.streak - 1) % 7];
    s.money += money;
    out.push({ msg: `Daily check-in: day ${s.streak} streak! +₦${money.toLocaleString()}`, money, label: 'Daily check-in' });
  }
  return out;
}

// Feed a game event; returns rewards earned (missions completed, level ups).
export function track(s, e) {
  if (!s.ms) return [];
  const out = [];
  const before = level(s.rep).idx;
  for (const m of s.ms.list) {
    if (m.done) continue;
    const d = missionDef(m.id);
    const inc = d.on(e);
    if (!inc) continue;
    m.prog = Math.min(d.goal, m.prog + (typeof inc === 'number' ? inc : 1));
    if (m.prog >= d.goal) {
      m.done = true;
      s.money += d.money;
      s.rep += d.rep;
      out.push({ msg: `Mission complete: ${d.label}! +₦${d.money.toLocaleString()} · +${d.rep} Rep`, money: d.money, label: `Mission: ${d.label}` });
    }
  }
  if (!s.ms.bonus && s.ms.list.every((m) => m.done)) {
    s.ms.bonus = true;
    s.money += BONUS.money;
    s.rep += BONUS.rep;
    out.push({ msg: `All 3 missions done! Bonus +₦${BONUS.money.toLocaleString()} · +${BONUS.rep} Rep`, money: BONUS.money, label: 'Mission bonus' });
  }
  const after = level(s.rep);
  if (after.idx > before) out.push({ msg: `Level up! You are now "${after.name}" (Level ${after.idx}).`, levelUp: true });
  return out;
}
