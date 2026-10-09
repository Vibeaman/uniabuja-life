export const FACULTIES = {
  science: { name: 'Faculty of Science', depts: [['Computer Science', 'CSC'], ['Mathematics', 'MTH'], ['Physics', 'PHY'], ['Chemistry', 'CHM'], ['Biological Sciences', 'BIO'], ['Microbiology', 'MCB']] },
  engineering: { name: 'Faculty of Engineering', depts: [['Civil Engineering', 'CVE'], ['Electrical/Electronic Engineering', 'EEE'], ['Mechanical Engineering', 'MEE'], ['Chemical Engineering', 'CHE']] },
  law: { name: 'Faculty of Law', depts: [['Law', 'LAW']] },
  socsci: { name: 'Faculty of Social Sciences', depts: [['Economics', 'ECO'], ['Political Science', 'POL'], ['Sociology', 'SOC'], ['Psychology', 'PSY'], ['Geography', 'GEO']] },
  mgmt: { name: 'Faculty of Management Sciences', depts: [['Accounting', 'ACC'], ['Business Administration', 'BUS'], ['Banking & Finance', 'BFN'], ['Public Administration', 'PAD']] },
  arts: { name: 'Faculty of Arts', depts: [['English', 'ENG'], ['History', 'HIS'], ['Linguistics', 'LIN'], ['Theatre Arts', 'THA'], ['Religious Studies', 'REL']] },
  education: { name: 'Faculty of Education', depts: [['Science Education', 'SED'], ['Educational Management', 'EDM'], ['Guidance & Counselling', 'GCE']] },
  envsci: { name: 'Faculty of Environmental Sciences', depts: [['Architecture', 'ARC'], ['Urban & Regional Planning', 'URP'], ['Estate Management', 'ESM'], ['Quantity Surveying', 'QSV']] },
};

export const AREAS = [
  { id: 'giri', name: 'Giri', fare: 300, mins: 15, blurb: 'Off-campus Giri area. The geographic map uses Giri Junction as a reference; your lodge is fictional. Travel fare and time are game estimates.' },
  { id: 'iddo', name: 'Iddo', fare: 400, mins: 20, blurb: 'Off-campus Iddo area. The geographic map uses Iddo Sarki as a reference; your lodge is fictional. Travel fare and time are game estimates.' },
  { id: 'gwagwalada', name: 'Gwagwalada', fare: 600, mins: 35, blurb: 'The big town near campus: home of the mini campus, the market, shawarma spots and nightlife.' },
];

export const CAMPUS_FARE = 100;
export const CAMPUS_RIDE_MINS = 5;
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const ttCache = new Map();
export function timetable(code) {
  if (ttCache.has(code)) return ttCache.get(code);
  const r = seeded(code);
  const courses = [`${code} 101`, `${code} 103`, `${code} 105`, `${code} 107`, 'GST 111'];
  const tt = WEEKDAYS.map((_, d) => {
    const slots = [8, 10, 12, 14].sort(() => r() - 0.5).slice(0, 2).sort((a, b) => a - b);
    return slots.map((start, k) => ({ start, code: courses[(d * 2 + k + Math.floor(r() * 5)) % courses.length] }));
  });
  ttCache.set(code, tt);
  return tt;
}

export function lectureNow(s) {
  const d = (s.day - 1) % 7;
  if (d > 4) return null;
  const h = s.minutes / 60;
  return timetable(s.deptCode)[d].find((l) => h >= l.start - 0.25 && h < l.start + 0.75) || null;
}

export function nextLecture(s) {
  const h = s.minutes / 60;
  for (let i = 0; i < 8; i++) {
    const d = (s.day - 1 + i) % 7;
    if (d > 4) continue;
    const l = timetable(s.deptCode)[d].find((x) => i > 0 || x.start + 0.75 > h);
    if (l) return `${l.code} · ${i === 0 ? 'today' : WEEKDAYS[d]} ${String(l.start).padStart(2, '0')}:00`;
  }
  return 'none this week';
}
