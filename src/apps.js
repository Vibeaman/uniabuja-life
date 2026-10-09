import { fmtMoney } from './game.js';

function seeded(n) {
  let x = Math.abs(n) * 9301 + 49297;
  return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
}
const hash = (t) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const CHOW_FEE = 300;
export const CHOW = [
  ['Jollof rice & turkey', 2500, 55], ['Fried rice & chicken', 2300, 50], ['Shawarma (double sausage)', 2800, 45],
  ['Amala, ewedu & gbegiri', 1500, 45], ['Pounded yam & egusi', 2000, 55], ['Suya wrap', 1000, 25],
  ['Indomie & egg', 900, 30], ['Chicken & chips combo', 3200, 55],
];
export function chowAction(i) {
  const [name, price, food] = CHOW[i];
  return { label: `Chow: ${name}`, mins: 40, hours: [8, 23], cost: price + CHOW_FEE, fx: { hunger: food }, msg: `Your ${name} arrived. The rider called you five times.` };
}

export const GIGS = [
  { id: 'type', label: 'Type a final-year project', mins: 120, earn: 2500, fx: { energy: -10 }, msg: 'Chapter four typed and formatted.' },
  { id: 'flyer', label: 'Design flyers for departmental week', mins: 120, earn: 3000, fx: { energy: -8, social: 3 } },
  { id: 'braid', label: 'Make hair for a hostel mate', mins: 180, earn: 3500, fx: { energy: -12, social: 6 } },
  { id: 'errand', label: 'Run errands for a lecturer', mins: 60, earn: 1500, fx: { energy: -6, social: 2 } },
  { id: 'data', label: 'Sell data bundles to coursemates', mins: 60, earn: 1200, fx: { social: 4 } },
  { id: 'laundry', label: 'Wash clothes for a big boy', mins: 120, earn: 2000, fx: { energy: -10, hygiene: -5 } },
  { id: 'photo', label: 'Shoot pictures at a birthday', mins: 120, earn: 4000, fx: { energy: -8, social: 8 } },
  { id: 'jamb', label: 'Online lessons for JAMB candidates', mins: 90, earn: 2500, fx: { knowledge: 2, energy: -6 } },
].map((g) => ({
  ...g, gig: g.id, hours: [8, 22],
  msg: `${g.msg || g.label + ': done.'} +${fmtMoney(g.earn)}`,
  cond: (s) => !(s.gigsDay === s.day && s.gigsDone?.includes(g.id)),
  condMsg: () => 'Done for today. Check back tomorrow.',
}));
export function todaysGigs(s) {
  const r = seeded(s.day * 13 + 5);
  return [...GIGS].sort(() => r() - 0.5).slice(0, 4);
}

const POSTS = [
  ['@uniabuja_gist', 'Library generator went off in the middle of reading again. Who else was there?'],
  ['@campus_konnect', 'Mama put behind the cafeteria has increased the price of meat to ₦500. Sapa is real.'],
  ['@abj_freshers', 'Freshers, no be every senior wey call you "my guy" be your guy. Protect your money.'],
  ['@gwags_nightlife', 'Shawarma spot in Gwagwalada is giving two for one tonight. Keke drivers are already smiling.'],
  ['@uniabuja_gist', 'Somebody slept off in the GST hall and the lecturer locked the door. We are praying for him.'],
  ['@hostel_updates', 'Light came back in Old Boys Hostel after 3 days. Everyone is ironing at the same time.'],
  ['@course_rep_csc', 'Reminder: departmental dues deadline is Friday. Pay before they publish names.'],
  ['@iddo_lodges', 'Self-contain available in Iddo. ₦150k per year, water dey, landlord no dey disturb.'],
  ['@giri_updates', 'Keke from Giri to campus is now ₦300. Just know.'],
  ['@uniabuja_sports', 'Inter-faculty football this weekend at the Sports Complex. Engineering vs Law, who you got?'],
  ['@campus_konnect', 'Lost: blue file with course form and passport photos. Last seen at the Senate Building.'],
  ['@uniabuja_gist', 'Lecturer said attendance is 10 marks. The class that was 40 people is now 300.'],
  ['@new_girls_hostel', 'Whoever is using the iron at 2am, the whole floor can hear you.'],
  ['@abj_freshers', 'Matric gown rental is ₦3,000 at the SUG. Do not pay anyone outside.'],
];
export function gistFeed(s) {
  const out = [];
  if (s.strike > 0) out.push(['@asuu_watch', `The ASUU warning strike is still on. ${s.strike} day${s.strike > 1 ? 's' : ''} left. Lecturers are not on seat.`, true]);
  if (s.day % 14 >= 10 && s.day % 14 <= 13) out.push(['@sug_uniabuja', 'SUG elections this week! Vote at the SUG Building. Say no to vote buying.', true]);
  if (s.noWaterDay === s.day) out.push(['@hostel_updates', 'No water in the hostels today. The borehole queue is from here to Gwagwalada.', true]);
  if ((s.day + 1) % 5 === 0) out.push(['@uniabuja_gist', 'Tests are tomorrow. The library is already full by 7am.', true]);
  const r = seeded(s.day * 17 + 3);
  [...POSTS].sort(() => r() - 0.5).slice(0, 6).forEach((p) => out.push(p));
  return out.map(([u, t, hot]) => [u, t, hot, 12 + Math.floor(r() * 480)]);
}

export const matricNo = (s) => `UJ/2026/${s.deptCode}/${String(hash(s.name) % 9000 + 1000)}`;
export const degreeClass = (g) => (g >= 4.5 ? 'First Class' : g >= 3.5 ? 'Second Class Upper' : g >= 2.4 ? 'Second Class Lower' : g >= 1.5 ? 'Third Class' : 'Pass');
