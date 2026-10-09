import { FACULTIES, AREAS, lectureNow, nextLecture } from './campus.js';
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmtMoney = (n) => '₦' + Math.round(n).toLocaleString('en-NG');
const pad2 = (n) => String(n).padStart(2, '0');
export const fmtTime = (m) => `${pad2(Math.floor(m / 60) % 24)}:${pad2(Math.floor(m % 60))}`;
export const fmtDur = (m) => (m >= 60 ? `${+(m / 60).toFixed(1)}h` : `${m}m`);
export const isExamDay = (s) => s.day % 5 === 0 && !(s.strike > 0);

export function gpa(s) {
  if (!s.grades.length) return null;
  return s.grades.reduce((a, g) => a + g.points, 0) / s.grades.length;
}

export function newState(name, o = {}) {
  return { name, faculty: o.faculty || 'science', dept: o.dept || 'Computer Science', deptCode: o.deptCode || 'CSC', residence: o.residence || 'hostel-ob', away: null, inbox: [], tx: [], day: 1, minutes: 7 * 60, money: 5000, energy: 85, hunger: 75, savings: 0, hygiene: 80, bladder: 80, social: 60, knowledge: 0, pantry: 2, grades: [], examDone: false, lastAllowanceDay: 1, strike: 0 };
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
  if (s.strike > 0) {
    s.strike -= 1;
    if (!s.strike) notify('ASUU has called off the strike. Lectures resume today!', 'good');
  }
  if (s.day - s.lastAllowanceDay >= 7) {
    s.lastAllowanceDay = s.day;
    s.money += 10000;
    notify('Your parents sent your weekly allowance: +₦10,000', 'good');
  }
  if (s.savings > 0) s.savings += Math.round(s.savings * 0.01);
  campusEvent(s, notify);
  if (s.money < 1000) notify('Sapa don land! You have less than ₦1,000. Time to hustle.', 'bad');
  if (isExamDay(s)) notify(`Day ${s.day} is TEST DAY! Write it at any faculty between 09:00 and 15:00.`, 'warn');
  else if ((s.day + 1) % 5 === 0) notify('Test tomorrow! Hit the library.', 'warn');
}

function campusEvent(s, notify) {
  if (s.day === 3) {
    s.social = clamp(s.social + 10, 0, 100);
    return notify('Matriculation day! You took the oath as a bonafide UniAbuja student. +10 Social', 'good');
  }
  if (s.day % 14 === 10) return notify('SUG election week. Aspirants are campaigning in every lecture hall. Vote at the SUG Building.', 'warn');
  if (s.strike > 0) return;
  const r = Math.random();
  if (r < 0.06 && s.day > 5) {
    s.strike = 2;
    notify('ASUU has declared a 2-day warning strike. No lectures and no tests until it is called off.', 'warn');
  } else if (r < 0.2) {
    s.energy = clamp(s.energy - 5, 0, 100);
    s.money -= Math.min(s.money, 200);
    s.noWaterDay = s.day;
    notify('No water in the hostels today. You bought sachet water and queued at the borehole. −₦200, −5 Energy', 'bad');
  } else if (r < 0.3 && s.money >= 1000) {
    s.money -= 1000;
    notify('Your course rep is collecting departmental dues. −₦1,000', 'bad');
  } else if (r < 0.38) {
    s.social = clamp(s.social + 8, 0, 100);
    notify('Departmental week is on! Everyone is wearing their dinner outfits. +8 Social', 'good');
  }
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
    s.social = clamp(s.social - (s.hygiene < 20 ? 3.5 : 1.5) * hrs, 0, 100);
    s.hygiene = clamp((s.hygiene ?? 80) - (mode.sleeping ? 1 : mode.running ? 5 : 3) * hrs, 0, 100);
    s.bladder = clamp((s.bladder ?? 80) - (mode.sleeping ? 2 : 7) * hrs, 0, 100);
    if (s.bladder <= 0) {
      s.bladder = 100;
      s.hygiene = clamp(s.hygiene - 40, 0, 100);
      s.social = clamp(s.social - 15, 0, 100);
      notify('Ah! You could not hold it any longer. Embarrassing... −15 Social, −40 Hygiene', 'bad');
    }
    s.minutes += step;
    if (s.minutes >= 1440) {
      s.minutes -= 1440;
      newDay(s, notify);
    }
  }
}

const FACULTY = [
  { label: 'Attend your lecture', mins: 120, lecture: true, cond: (s) => !(s.strike > 0) && s.here === s.faculty && !!lectureNow(s) && s.attended !== s.day + '-' + lectureNow(s).start, condMsg: (s) => (s.strike > 0 ? 'ASUU strike: no lectures' : s.here !== s.faculty ? 'Your lectures hold at ' + FACULTIES[s.faculty].name : 'Next lecture: ' + nextLecture(s)), fx: { knowledge: 12, energy: -6, social: 4 } },
  { label: 'Write test', mins: 90, hours: [9, 15], test: true,
    cond: (s) => isExamDay(s) && !s.examDone && s.here === s.faculty, condMsg: (s) => (s.strike > 0 ? 'ASUU strike: no tests' : isExamDay(s) && s.here !== s.faculty ? 'Write it at ' + FACULTIES[s.faculty].name : isExamDay(s) ? 'Already written today' : 'Only on test days (every 5th day)') },
  { label: 'Attend GST lecture (Use of English)', mins: 90, hours: [8, 16], cond: (s) => !(s.strike > 0), condMsg: () => 'ASUU strike: no lectures', fx: { knowledge: 6, social: 6, energy: -4 }, msg: 'The GST hall was packed. You stood at the back but still took notes.' },
  { label: 'See your lecturer', mins: 30, hours: [9, 15], cond: (s) => !(s.strike > 0), condMsg: () => 'ASUU strike: no lectures', fx: { knowledge: 3, social: 2 }, msg: 'Your lecturer explained the tricky topic.' },
];

export const ACTIONS = {
  faculty: FACULTY,
  hostel: [
    { label: 'Sleep (8h)', home: true, mins: 480, sleep: true, nepa: true, fx: { energy: 75 } },
    { label: 'Take a nap', home: true, mins: 60, sleep: true, fx: { energy: 14 } },
    { label: 'Take a bath', home: true, bath: true, mins: 20, cond: (s) => s.noWaterDay !== s.day, condMsg: () => 'No water today. Buy water to bath.', fx: { hygiene: 70 }, msg: 'Fresh! Bucket bath done.' },
    { label: 'Bath with bought water', home: true, bath: true, mins: 20, cost: 300, fx: { hygiene: 70 }, msg: 'You bought two jerrycans of water and had a proper bath.' },
    { label: 'Use the toilet', home: true, mins: 10, fx: { bladder: 100 }, msg: 'Relief.' },
    { label: 'Cook noodles', home: true, mins: 30, pantry: -1, fx: { hunger: 30 }, msg: 'Noodles and egg. A classic.' },
    { label: 'Buy noodles at hostel shop', mins: 10, cost: 600, pantry: 1, msg: 'You bought a pack of noodles.' },
    { label: 'Gist with roommates', mins: 60, fx: { social: 15 }, msg: 'Your roommates had gist for days.' },
  ],
  cafeteria: [
    { label: 'Jollof rice & chicken', mins: 30, hours: [7, 21], cost: 1500, fx: { hunger: 50, social: 3 }, msg: 'That jollof hit different.' },
    { label: 'Rice & beans with dodo', mins: 30, hours: [7, 21], cost: 1000, fx: { hunger: 45 }, msg: 'Rice, beans and plantain. Correct combo.' },
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
    { label: 'Sort out course registration', reg: true, mins: 60, hours: [9, 15], fx: { knowledge: 2, social: -3 }, msg: 'The queue was long, but your courses are registered.' },
  ],
  sug: [
    { label: 'Attend SUG meeting', mins: 60, hours: [16, 20], fx: { social: 20 }, msg: 'Heated debate about hostel water supply.' },
    { label: 'Play table tennis', mins: 60, hours: [8, 22], fx: { social: 10, energy: -5 }, msg: 'You won two out of three games.' },
    { label: 'Vote in SUG elections', mins: 45, hours: [9, 17], cond: (s) => s.day % 14 === 10 && s.votedDay !== s.day, condMsg: () => 'Only during SUG election week (Day 10, 24, ...)', vote: true, fx: { social: 10 }, msg: 'You voted. Your candidate promised constant light and water.' },
    { label: 'Tutor junior students', mins: 120, hours: [10, 20], earn: 2500, fx: { knowledge: 3, energy: -10 }, msg: 'Teaching helps you learn too. +₦2,500' },
  ],
  sports: [
    { label: 'Play football', mins: 90, hours: [6, 20], fx: { energy: -18, hunger: -10, social: 18, hygiene: -25 }, msg: 'You scored a banger!' },
    { label: 'Jog round the track', mins: 45, hours: [6, 20], fx: { energy: -8, social: 2 }, msg: 'You feel fit.' },
    { label: 'Watch a match', mins: 60, hours: [16, 20], fx: { social: 12 }, msg: 'Faculty of Law vs Engineering. What a game!' },
  ],
  gate: [
    { label: 'Run POS business', mins: 180, hours: [8, 20], earn: 3500, fx: { energy: -12, social: 5 }, msg: 'Withdrawals all day. +₦3,500' },
    { label: 'Buy suya from the mallam', mins: 15, hours: [17, 23], cost: 700, fx: { hunger: 25 }, msg: 'Spicy and perfect.' },
  ],
  keke: AREAS.map((A) => ({ label: `Keke to ${A.name}`, mins: A.mins, cost: A.fare, ride: A.id })),
  health: [
    { label: 'See the nurse', mins: 45, cost: 500, fx: { energy: 12 }, msg: 'Checked out. Rest well.' },
    { label: 'Buy vitamins', mins: 10, cost: 300, fx: { energy: 5 }, msg: 'Small boost.' },
  ],
};

const PUBLIC_TOILET = { label: 'Use the public toilet', mins: 10, fx: { bladder: 100, hygiene: -3 }, msg: 'The toilet was not the cleanest, but you managed.' };
for (const k of ['cafeteria', 'library', 'faculty', 'sug', 'sports', 'keke']) ACTIONS[k]?.push(PUBLIC_TOILET);
const AREA_ACTIONS = [
  { label: 'Bath at your lodge', home: true, bath: true, mins: 20, cost: 100, fx: { hygiene: 70 }, msg: 'You bought water from the mai ruwa and had a bath.' },
  { label: 'Use the toilet at your lodge', home: true, mins: 10, fx: { bladder: 100 }, msg: 'Relief.' },
  { label: 'Use a public toilet', mins: 10, cost: 50, fx: { bladder: 100, hygiene: -3 }, msg: 'Paid ₦50 at the public convenience.' },
  { label: 'Sleep at your lodge (8h)', mins: 480, sleep: true, nepa: true, home: true, fx: { energy: 75 } },
  { label: 'Cook noodles at your lodge', mins: 30, home: true, pantry: -1, fx: { hunger: 30 }, msg: 'Noodles and egg. A classic.' },
  { label: 'Eat at a mama put', mins: 30, hours: [7, 22], cost: 700, fx: { hunger: 40, social: 3 }, msg: 'Cheap and filling.' },
  { label: 'Buy foodstuff (3 packs of noodles)', mins: 30, hours: [7, 20], cost: 1800, pantry: 3, msg: 'Foodstuff secured.' },
  { label: 'Hang out with friends', mins: 120, hours: [10, 23], cost: 500, fx: { social: 20, energy: -5 }, msg: 'Good vibes off campus.' },
];
const GWAGS = [
  { label: 'Visit friends at the mini campus', mins: 90, hours: [8, 18], fx: { social: 15, energy: -4 }, msg: 'You linked up with your guys at the mini campus.' },
  { label: 'Market run (4 packs of noodles)', mins: 90, hours: [6, 20], cost: 2400, pantry: 4, msg: 'Market run done.' },
];
for (const A of AREAS) ACTIONS['area-' + A.id] = [...AREA_ACTIONS, ...(A.id === 'gwagwalada' ? GWAGS : []), { label: 'Keke back to campus', mins: A.mins, cost: A.fare, ride: 'keke' }];

export function actionStatus(s, a) {
  const h = s.minutes / 60;
  if (a.hours && (h < a.hours[0] || h >= a.hours[1])) return { ok: false, reason: `Open ${pad2(a.hours[0])}:00–${pad2(a.hours[1])}:00` };
  if (a.cost && s.money < a.cost) return { ok: false, reason: `Not enough money (${fmtMoney(a.cost)})` };
  if (a.pantry < 0 && s.pantry <= 0) return { ok: false, reason: 'No noodles left. Buy some first.' };
  if (a.home && s.residence !== s.here) return { ok: false, reason: "You don't live here" };
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
  const lec = a.lecture ? lectureNow(s) : null;
  const queue = a.bath && h >= 6 && h < 9 ? 30 : 0;
  advance(s, a.mins + queue, { sleeping: !!a.sleep }, notify);
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
  if (a.vote) s.votedDay = s.day;
  if (a.reg) s.registered = true;
  if (a.gig) {
    if (s.gigsDay !== s.day) { s.gigsDay = s.day; s.gigsDone = []; }
    s.gigsDone.push(a.gig);
  }
  if (queue) msg += ' The morning bathroom queue cost you 30 extra minutes.';
  if (lec) { s.attended = s.day + '-' + lec.start; msg = `You attended ${lec.code}. Solid notes taken.`; }
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
