import { fmtMoney } from './game.js';
import { level } from './missions.js';

export const STORIES = [
  { id: 'courseform', title: 'The Lost Course Form', blurb: 'Your course form vanished a week before registration closes.', steps: [
    { at: 'senate', hint: 'Go to the Senate Building and ask the registry.', options: [{ label: 'Ask the registry about your course form', mins: 30, fx: { social: -2 }, msg: '"Check the library lost and found," the clerk said without looking up.' }] },
    { at: 'library', hint: 'Check the lost and found at the University Library.', options: [{ label: 'Search the lost and found shelf', mins: 20, msg: 'Not there. The librarian saw a course rep carry a blue file to the SUG.' }] },
    { at: 'sug', hint: 'Find your course rep at the SUG Building.', options: [
      { label: 'Collect it and thank him with ₦500', mins: 20, cost: 500, fx: { social: 10 }, reward: { rep: 80 }, endMsg: 'Your course rep now calls you "my person".' },
      { label: 'Just collect your file', mins: 20, reward: { rep: 60 }, endMsg: 'Course form secured.' },
    ] },
  ] },
  { id: 'dinner', title: 'Departmental Dinner', blurb: 'Dinner night is here. You need a plus-one, a sharp outfit and a ticket.', steps: [
    { at: 'cafeteria', hint: 'Find a plus-one at the Cafeteria.', options: [{ label: 'Ask your crush to be your plus-one', mins: 30, cond: (s) => s.social >= 40, condMsg: () => 'You need at least 40 Social to shoot your shot', fx: { social: 5 }, msg: 'They said yes! Now sort out your outfit.' }] },
    { at: 'home', hint: 'Go home and iron your dinner outfit.', options: [{ label: 'Iron your dinner outfit', mins: 30, fx: { hygiene: 10 }, msg: 'Sharp creases. You are ready.' }] },
    { at: 'sug', hint: 'The dinner holds at the SUG Building, 18:00 to 23:00.', options: [{ label: 'Attend the departmental dinner (₦2,000 ticket)', mins: 180, hours: [18, 23], cost: 2000, fx: { social: 35, hunger: 40, energy: -10 }, reward: { rep: 100 }, endMsg: 'The best-dressed award went to you.' }] },
  ] },
  { id: 'campaign', title: 'SUG Campaign Manager', blurb: 'Election season. A candidate needs a sharp campaign manager.', steps: [
    { at: 'sug', hint: "Join a candidate's campaign at the SUG Building.", options: [{ label: "Join Comrade Ibrahim's campaign team", mins: 60, fx: { social: 8 }, msg: 'Welcome to the team. First job: canvass your faculty.' }] },
    { at: 'faculty', hint: 'Campaign at your faculty between 09:00 and 16:00.', options: [{ label: 'Campaign in the lecture halls', mins: 120, hours: [9, 16], fx: { energy: -10, social: 10 }, msg: 'Your coursemates promised their votes. Some of them even meant it.' }] },
    { at: 'cafeteria', hint: 'Share flyers and pure water at the Cafeteria.', options: [{ label: 'Share flyers and pure water (₦1,000)', mins: 60, cost: 1000, fx: { social: 8 }, msg: 'Everybody collected the water. Results come out at the SUG.' }] },
    { at: 'sug', hint: 'Wait for the election results at the SUG Building.', options: [{ label: 'Wait for the election results', mins: 120, chance: 0.6, reward: { money: 5000, rep: 120 }, endMsg: 'Comrade Ibrahim won! He gave you ₦5,000 and a role in his cabinet.', fail: { rep: 40 }, failMsg: 'Your candidate lost by 12 votes. At least people now know your name.' }] },
  ] },
  { id: 'lostbag', title: 'The Lost Bag', blurb: 'Somebody left a bag in a keke. Their day is about to be ruined, or saved.', steps: [
    { at: 'keke', hint: 'Something was left in a keke at the Keke Park.', options: [{ label: 'Check the bag left in a keke', mins: 15, msg: '₦20,000 cash and a staff ID card inside.' }] },
    { at: 'keke', hint: 'Decide what to do with the bag.', options: [
      { label: 'Take it to the Senate Building to return it', mins: 10, msg: 'Good choice. Head to the Senate Building.' },
      { label: 'Keep the money', mins: 10, end: true, fx: { social: -10 }, reward: { money: 20000 }, endMsg: 'You kept the money. Your conscience will not let you sleep.' },
    ] },
    { at: 'senate', hint: 'Return the bag at the Senate Building.', options: [{ label: 'Return the bag to its owner', mins: 30, fx: { social: 10 }, reward: { money: 3000, rep: 150 }, endMsg: 'It belonged to a Dean. She gave you ₦3,000 and promised not to forget you.' }] },
  ] },
  { id: 'match', title: 'Inter-faculty Final', blurb: 'Your faculty made the football final. They need one more player.', steps: [
    { at: 'sports', hint: 'Sign up for your faculty team at the Sports Complex.', options: [{ label: 'Sign up for your faculty team', mins: 30, fx: { social: 5 }, msg: 'Coach wants you at training today.' }] },
    { at: 'sports', hint: 'Train with the team at the Sports Complex (06:00 to 20:00).', options: [{ label: 'Train with the team', mins: 120, hours: [6, 20], fx: { energy: -20, hygiene: -30 }, msg: 'You can barely feel your legs. The final is next.' }] },
    { at: 'sports', hint: 'Play the final at the Sports Complex between 15:00 and 19:00.', options: [{ label: 'Play the inter-faculty final', mins: 120, hours: [15, 19], fx: { energy: -20, hygiene: -30, social: 15 }, chance: 0.5, reward: { money: 3000, rep: 100 }, endMsg: 'You scored the winner! The faculty gave each player ₦3,000.', fail: { rep: 40 }, failMsg: 'You lost on penalties. Your faculty still sang your name.' }] },
  ] },
];

export const storyById = (id) => STORIES.find((x) => x.id === id);
export const resolveAt = (s, at) => (at === 'home' ? s.residence : at === 'faculty' ? s.faculty : at);
export const storyStep = (s) => s.story && storyById(s.story.id)?.steps[s.story.step];

export function storyActions(s, locId) {
  const st = storyStep(s);
  if (!st || resolveAt(s, st.at) !== locId) return [];
  return st.options.map((o, i) => ({ ...o, label: `Story · ${o.label}`, storyOpt: i }));
}

export function storyAdvance(s, i) {
  const S = storyById(s.story?.id);
  if (!S) return [];
  const o = S.steps[s.story.step].options[i];
  if (!o.end && s.story.step + 1 < S.steps.length) {
    s.story.step += 1;
    return [{ msg: `${S.title}: ${S.steps[s.story.step].hint}` }];
  }
  const before = level(s.rep).idx;
  let r = o.reward || {}, msg = o.endMsg;
  if (o.chance && Math.random() > o.chance) { r = o.fail || {}; msg = o.failMsg; }
  s.money += r.money || 0;
  s.rep = (s.rep || 0) + (r.rep || 0);
  s.storiesDone = [...(s.storiesDone || []), S.id];
  s.story = null;
  const out = [{ msg: `${msg ? msg + ' ' : ''}Story complete: ${S.title}!${r.money ? ` +${fmtMoney(r.money)}` : ''}${r.rep ? ` · +${r.rep} Rep` : ''}`, money: r.money, label: `Story: ${S.title}` }];
  const after = level(s.rep);
  if (after.idx > before) out.push({ msg: `Level up! You are now "${after.name}" (Level ${after.idx}).` });
  return out;
}
