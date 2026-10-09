export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmtMoney = (n) => '₦' + Math.round(n).toLocaleString('en-NG');
const pad2 = (n) => String(n).padStart(2, '0');
export const fmtTime = (m) => `${pad2(Math.floor(m / 60) % 24)}:${pad2(Math.floor(m % 60))}`;
export const fmtDur = (m) => (m >= 60 ? `${+(m / 60).toFixed(1)}h` : `${m}m`);
export const isExamDay = (s) => s.day % 5 === 0;

export function gpa(s) {
  if (!s.grades.length) return null;
  return s.grades.reduce((a, g) => a + g.points, 0) / s.grades.length;
}

export function newState(name) {
  return { name, day: 1, minutes: 7 * 60, money: 5000, energy: 85, hunger: 75, social: 60, knowledge: 0, pantry: 2, grades: [], examDone: false, lastAllowanceDay: 1 };
}

function gradeFor(score) {
  if (score >= 70) return ['A', 5];
  if (score >= 60) return ['B', 4];
  if (score >= 50) return ['C', 3];
  if (score >= 45) return ['D', 2];
  if (score >= 40) return ['E', 1];
  return ['F', 0];
}

function newDay(s, notify) {
  if (isExamDay(s) && !s.examDone) {
    s.grades.push({ day: s.day, score: 0, grade: 'F', points: 0 });
    notify(`You missed the test on Day ${s.day}. That's an F!`, 'bad');
  }
  s.day += 1;
  s.examDone = false;
  if (s.day - s.lastAllowanceDay >= 7) {
    s.lastAllowanceDay = s.day;
    s.money += 10000;
    notify('Your parents sent your weekly allowance: +₦10,000', 'good');
  }
  if (isExamDay(s)) notify(`Day ${s.day} is TEST DAY! Write it at any faculty between 09:00 and 15:00.`, 'warn');
  else if ((s.day + 1) % 5 === 0) notify('Test tomorrow! Hit the library.', 'warn');
}

export function advance(s, mins, mode = {}, notify = () => {}) {
  let rem = mins;
  while (rem > 1e-6) {
    const step = Math.min(rem, 15);
    rem -= step;
    const hrs = step / 60;
    const eRate = mode.sleeping ? 0 : mode.running ? 7 : 4;
    s.energy = clamp(s.energy - (eRate + (s.hunger <= 0 ? 6 : 0)) * hrs, 0, 100);
    s.hunger = clamp(s.hunger - (mode.sleeping ? 2.5 : 5) * hrs, 0, 100);
    s.social = clamp(s.social - 1.5 * hrs, 0, 100);
    s.minutes += step;
    if (s.minutes >= 1440) {
      s.minutes -= 1440;
      newDay(s, notify);
    }
  }
}

const FACULTY = [
  { label: 'Attend lecture', mins: 120, hours: [8, 16], fx: { knowledge: 10, energy: -6, social: 4 }, msg: 'You sat through the lecture and took solid notes.' },
  { label: 'Write test', mins: 90, hours: [9, 15], test: true,
    cond: (s) => isExamDay(s) && !s.examDone, condMsg: (s) => (isExamDay(s) ? 'Already written today' : 'Only on test days (every 5th day)') },
  { label: 'See your lecturer', mins: 30, hours: [9, 15], fx: { knowledge: 3, social: 2 }, msg: 'Your lecturer explained the tricky topic.' },
];

export const ACTIONS = {
  faculty: FACULTY,
  hostel: [
    { label: 'Sleep (8h)', mins: 480, sleep: true, nepa: true, fx: { energy: 75 } },
    { label: 'Take a nap', mins: 60, sleep: true, fx: { energy: 14 } },
    { label: 'Cook noodles', mins: 30, pantry: -1, fx: { hunger: 30 }, msg: 'Noodles and egg. A classic.' },
    { label: 'Buy noodles at hostel shop', mins: 10, cost: 600, pantry: 1, msg: 'You bought a pack of noodles.' },
    { label: 'Gist with roommates', mins: 60, fx: { social: 15 }, msg: 'Your roommates had gist for days.' },
  ],
  cafeteria: [
    { label: 'Jollof rice & chicken', mins: 30, hours: [7, 21], cost: 1500, fx: { hunger: 50, social: 3 }, msg: 'That jollof hit different.' },
    { label: 'Amala & ewedu', mins: 30, hours: [7, 21], cost: 900, fx: { hunger: 40 }, msg: 'Filling and sweet.' },
    { label: 'Puff-puff & zobo', mins: 15, hours: [7, 21], cost: 400, fx: { hunger: 15, social: 3 }, msg: 'Quick snack, small gist.' },
    { label: 'Hang out with friends', mins: 60, hours: [7, 21], cost: 300, fx: { social: 15 }, msg: 'Good vibes at the cafeteria.' },
  ],
  library: [
    { label: 'Study alone', mins: 120, hours: [8, 22], fx: { knowledge: 12, energy: -8 }, msg: 'Deep focus. You covered two topics.' },
    { label: 'Group study', mins: 120, hours: [8, 22], fx: { knowledge: 8, social: 10, energy: -6 }, msg: 'Your study group carried you a bit.' },
    { label: 'Photocopy handouts', mins: 15, hours: [8, 22], cost: 300, fx: { knowledge: 4 }, msg: 'Handouts secured.' },
  ],
  senate: [
    { label: 'Check your results', mins: 5, results: true },
    { label: 'Work-study job', mins: 180, hours: [8, 16], earn: 3000, fx: { energy: -15 }, msg: 'Filing and errands at the registry. +₦3,000' },
    { label: 'Sort out course registration', mins: 60, hours: [9, 15], fx: { knowledge: 2, social: -3 }, msg: 'The queue was long, but your courses are registered.' },
  ],
  sug: [
    { label: 'Attend SUG meeting', mins: 60, hours: [16, 20], fx: { social: 20 }, msg: 'Heated debate about hostel water supply.' },
    { label: 'Play table tennis', mins: 60, hours: [8, 22], fx: { social: 10, energy: -5 }, msg: 'You won two out of three games.' },
    { label: 'Tutor junior students', mins: 120, hours: [10, 20], earn: 2500, fx: { knowledge: 3, energy: -10 }, msg: 'Teaching helps you learn too. +₦2,500' },
  ],
  sports: [
    { label: 'Play football', mins: 90, hours: [6, 20], fx: { energy: -18, hunger: -10, social: 18 }, msg: 'You scored a banger!' },
    { label: 'Jog round the track', mins: 45, hours: [6, 20], fx: { energy: -8, social: 2 }, msg: 'You feel fit.' },
    { label: 'Watch a match', mins: 60, hours: [16, 20], fx: { social: 12 }, msg: 'Faculty of Law vs Engineering. What a game!' },
  ],
  gate: [
    { label: 'Run POS business', mins: 180, hours: [8, 20], earn: 3500, fx: { energy: -12, social: 5 }, msg: 'Withdrawals all day. +₦3,500' },
    { label: 'Buy suya from the mallam', mins: 15, hours: [17, 23], cost: 700, fx: { hunger: 25 }, msg: 'Spicy and perfect.' },
  ],
  keke: [
    { label: 'Market run to Gwagwalada', mins: 120, hours: [6, 20], cost: 2400, pantry: 4, fx: { social: 5 }, msg: 'You stocked up on 4 packs of noodles.' },
    { label: 'Hang out in town', mins: 180, hours: [10, 22], cost: 1500, fx: { social: 25, energy: -8 }, msg: 'Shawarma and gist in town.' },
  ],
  health: [
    { label: 'See the nurse', mins: 45, cost: 500, fx: { energy: 12 }, msg: 'Checked out. Rest well.' },
    { label: 'Buy vitamins', mins: 10, cost: 300, fx: { energy: 5 }, msg: 'Small boost.' },
  ],
};

export function actionStatus(s, a) {
  const h = s.minutes / 60;
  if (a.hours && (h < a.hours[0] || h >= a.hours[1])) return { ok: false, reason: `Open ${pad2(a.hours[0])}:00–${pad2(a.hours[1])}:00` };
  if (a.cost && s.money < a.cost) return { ok: false, reason: `Not enough money (${fmtMoney(a.cost)})` };
  if (a.pantry < 0 && s.pantry <= 0) return { ok: false, reason: 'No noodles left. Buy some first.' };
  if (a.cond && !a.cond(s)) return { ok: false, reason: a.condMsg(s) };
  if (a.fx?.energy < 0 && s.energy < 8) return { ok: false, reason: 'Too tired. Rest first.' };
  return { ok: true };
}

function resultsText(s) {
  const g = gpa(s);
  if (g === null) return 'No results yet. Your first test is on Day 5.';
  const last = s.grades[s.grades.length - 1];
  return `CGPA ${g.toFixed(2)} / 5.00 · Last test: ${last.score}% (${last.grade})`;
}

export function perform(s, a, notify) {
  const st = actionStatus(s, a);
  if (!st.ok) return { msg: st.reason, kind: 'bad' };
  const h = s.minutes / 60;
  const night = h >= 20 || h < 5;
  advance(s, a.mins, { sleeping: !!a.sleep }, notify);
  const fx = { ...(a.fx || {}) };
  let msg = a.msg || (a.sleep ? 'You feel rested.' : `${a.label}: done.`);
  let kind = 'good';
  if (a.nepa && night && Math.random() < 0.35) {
    fx.energy = Math.round(fx.energy * 0.6);
    msg = 'NEPA took light! It was too hot to sleep well.';
    kind = 'warn';
  }
  for (const [k, v] of Object.entries(fx)) s[k] = clamp(s[k] + v, 0, 100);
  if (a.cost) s.money -= a.cost;
  if (a.earn) s.money += a.earn;
  if (a.pantry) s.pantry += a.pantry;
  if (a.test) {
    const score = clamp(Math.round(30 + s.knowledge * 0.6 + (s.energy - 50) * 0.15 + (Math.random() * 16 - 8)), 0, 100);
    const [grade, points] = gradeFor(score);
    s.grades.push({ day: s.day, score, grade, points });
    s.knowledge = 0;
    s.examDone = true;
    kind = points >= 3 ? 'good' : 'bad';
    msg = `You scored ${score}% (${grade}). CGPA now ${gpa(s).toFixed(2)}`;
  }
  if (a.results) { msg = resultsText(s); kind = 'warn'; }
  return { msg, kind };
}
