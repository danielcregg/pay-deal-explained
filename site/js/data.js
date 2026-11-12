// Every fact the site uses lives in this file.
// When the official text is published or the ballot result is known, update this
// file, run `npm test`, and push. A few figures are also written into index.html so
// they show without JavaScript: the h1, the four hero figures, the chapter 4–6 intros,
// the status line and the <noscript> block. tests/static-figures.test.js and
// tests/noscript.test.js fail if those drift from this file.

export const SITE = {
  title: 'Pay Deal Explained',
  status: {
    state: 'draft',
    chip: 'Draft · ballot results due w/c 7 Dec',
    line: 'Draft agreed on 11 November 2026. Not final until union members vote; results are due in the week of 7 December 2026.',
  },
  lastUpdated: '2026-11-11',
  includeLBDefault: false,
  // Whether the 1% owed since 1 September 2025 (see the `owed` entry of a sector in SCALES) is counted from the start.
  // It is unconfirmed for TU lecturers and for gardaí, so it is off; readers can switch it on under the opening chart.
  includeOwedDefault: false,
  repoUrl: 'https://github.com/danielcregg/pay-deal-2026',
  issuesUrl: 'https://github.com/danielcregg/pay-deal-2026/issues',
};

const step = (id, date, pct, min = 0, kind = 'general') => ({ id, date, pct, min, kind });

export const DEAL = {
  id: '2026-29',
  name: 'Draft public service pay agreement 2026–2029',
  start: '2026-07-01',
  end: '2029-03-31',
  months: 33,
  costBn: 5.2,
  budgets: 5,
  threshold: 60000,
  headlinePct: 10.75,
  generalPct: 9.75,
  lbPct: 1,
  lowestPaidMaxPct: 18.3,
  minCumulativePct: 11.3,
  steps: [
    step('s1', '2026-09-01', 2, 1200),
    step('s2', '2027-04-01', 1),
    step('s3', '2027-08-01', 1, 600),
    step('s4', '2027-11-01', 1.5, 900),
    step('s5', '2028-03-01', 1),
    step('s6', '2028-06-01', 1, 600),
    step('s7', '2028-10-01', 1),
    step('lb2', '2029-03-01', 1, 0, 'lb'),
    step('s8', '2029-03-02', 1.25, 750),
  ],
  publishedExamples: [
    { role: 'Cleaner', pct: 18.3 },
    { role: 'Special needs assistant', pct: 17.2 },
    { role: 'Clerical officer (civil service)', pct: 17.1 },
    { role: 'General operative or healthcare assistant', pct: 15.4 },
    { role: 'Garda', pct: 14.6 },
    { role: 'Enhanced nurse', pct: 13.3 },
    { role: 'Primary teacher', pct: 13.1 },
    { role: 'Secondary teacher', pct: 12.8 },
  ],
  reviewClause: 'Either side can trigger a review if the assumptions behind the agreement, including on inflation, change significantly. A review must finish within six weeks (section 3.2.1).',
  sourceIds: ['psa-2026-text', 'ictu-psc-release', 'rte-deal', 'it-whats-in-it', 'indo-explainer'],
};

export const PREVIOUS_DEAL = {
  id: '2024-26',
  name: 'Public Service Agreement 2024–2026',
  start: '2024-01-01',
  end: '2026-06-30',
  months: 30,
  costBn: 3.6,
  threshold: 50000,
  headlinePct: 10.25,
  generalPct: 9.25,
  lbPct: 1,
  steps: [
    step('p1', '2024-01-01', 2.25, 1125),
    step('p2', '2024-06-01', 1),
    step('p3', '2024-10-01', 1, 500),
    step('p4', '2025-03-01', 2, 1000),
    step('p5', '2025-08-01', 1),
    step('lb1', '2025-09-01', 1, 0, 'lb'),
    step('p6', '2026-02-01', 1, 500),
    step('p7', '2026-06-01', 1),
  ],
  reviewClause: 'General only: pay terms were not to be revisited unless the assumptions underlying the agreement needed to be (section 5.7).',
  sourceIds: ['psa-2024', 'rte-analysis', 'tui-lb-dec2025', 'circular-001-2026', 'circular-002-2026'],
};

const pts = (values, extras = []) => [
  ...values.map((value, i) => ({ label: `Point ${i + 1}`, value })),
  ...extras,
];

/** Mark the points that nobody stops on: people move straight past them on their increment date. */
const skipping = (points, numbers) => points.map((p, i) => (numbers.includes(i + 1) ? { ...p, label: `${p.label}, a skipped point`, skipped: true } : p));
// Teachers who started in 2011 or later go from point 3 to 5, 7 to 9 and 11 to 13 (Circular 0037/2021).
const TEACHER_SKIPS = [4, 8, 12];

const ENHANCED_NOTE = 'Two official documents give different figures for the Enhanced scale from 1 June 2026: the Department of Health’s consolidated salary scales (version 4, published by the HSE) and the Department’s Circular 10/2026. They differ by about 2%. Both are listed under Grade: pick the one that matches your payslip.';

const GARDA_NOTE = 'An Garda Síochána’s pay table has three scales for garda rank: the 2015 scale, where new recruits start, and the older A and B scales. Sergeants and inspectors have A and B scales. Pick the one that matches your payslip.';

const repeat = (value, times) => Array(times).fill(value);
// An Garda Síochána, "All Garda Member Pay Rates Date effective 1 August 2025": one figure for each point.
const GARDA_AUG_2025 = {
  garda2015: [38694, 40453, 43730, 45502, 48107, 52051, 54758, 57285, ...repeat(59736, 5), ...repeat(61885, 6), 64303],
  gardaA: [40769, 43730, 45502, 48107, 52051, 54758, 57285, ...repeat(59736, 5), ...repeat(61885, 6), ...repeat(64303, 4)],
  gardaB: [39797, 42491, 44224, 46755, 50561, 53112, 55504, ...repeat(57863, 5), ...repeat(59926, 6), ...repeat(62268, 4)],
  sergeantA: [64849, 66235, 67679, ...repeat(69257, 3), ...repeat(70857, 6), ...repeat(73460, 4)],
  sergeantB: [62799, 64135, 65540, ...repeat(67056, 3), ...repeat(68600, 6), ...repeat(71122, 4)],
  inspectorA: [73816, 74944, 76805, ...repeat(78914, 3), 81033],
  inspectorB: [71466, 72555, 74360, ...repeat(76397, 3), 78443],
};
/** The rises since that table: 1 February 2026 (1% or €500) and 1 June 2026 (1%), each rounded to the euro. */
const since2025 = (values) => values.map((v) => {
  const feb = PREVIOUS_DEAL.steps.find((s) => s.id === 'p6');
  const june = PREVIOUS_DEAL.steps.find((s) => s.id === 'p7');
  const afterFeb = Math.round(v + Math.max((v * feb.pct) / 100, feb.min));
  return Math.round(afterFeb * (1 + june.pct / 100));
});

export const SCALES = {
  effective: '2026-06-01',
  sourceId: 'circular-002-2026',
  hourlyDivisor: 630,
  // Each occupation: where its scales come from, and what is particular to it.
  sectors: [
    {
      id: 'tu',
      name: 'Lecturer (technological university or institute of technology)',
      short: 'TU or IoT lecturer',
      low: 'lowest lecturing point',
      effective: '2026-06-01',
      sourceId: 'circular-002-2026',
      sourceIds: ['circular-002-2026'],
      hourly: true, // hourly-paid Assistant Lecturers: point 1 of the annual scale ÷ hourlyDivisor
      caveat: null,
      lastDealLB: false, // the 1% of September 2025 is not in these scales; the `owed` entry below lets readers count it
      lastDealNote: 'For TU academic staff, the first local bargaining instalment (1%, due 1 September 2025) was still being sought by TUI in December 2025, and it does not appear in the February or June 2026 pay scales. This comparison leaves it out unless you count it under the chart at the top of the page.',
      // The 1% local bargaining due from 1 September 2025 under the 2024–2026 agreement is not
      // in these scales. While this entry exists, readers can choose to count it (sections 1 and 6)
      // and the page shows pay with and without it. Delete the entry once a circular applies
      // the 1% and the figures below include it.
      owed: {
        pct: 1,
        since: '2025-09-01',
        note: 'Local bargaining money is used as each sector negotiates, so neither 1% is certain to reach you as a rise. The 1% due from 1 September 2025 under the last agreement was not in the lecturer pay scales of 1 June 2026. TUI has claimed it for academic staff from that date, and a circular of 1 October 2026 sanctioned it, backdated, for post-primary teachers. The proposed agreement says claims like this must be resolved by 24 November 2026. If it is paid to lecturers, the new rises build on it, which is why some calculations come out about 1% higher.',
        status: 'It has not been agreed or paid for lecturers, and it is not in the pay scales.',
        sourceIds: ['tui-lb-dec2025', 'tui-senior-cycle-1pc', 'psa-2026-text'],
      },
    },
    {
      id: 'primary',
      name: 'Primary school teacher',
      short: 'primary teacher',
      low: 'starting point for new primary teachers',
      lowGrade: 'pt-new',
      effective: '2026-06-01',
      sourceId: 'circular-0055-2026',
      sourceIds: ['circular-0055-2026', 'circular-0054-2026'],
      hourly: false,
      caveat: 'Basic scale only: qualification allowances, posts of responsibility and other allowances are not included.',
      lastDealLB: false,
      lastDealNote: 'For primary teachers, the first local bargaining instalment (from 1 September 2025) has been used so far for allowances for certain posts and a higher principal’s allowance (Circular 0054/2026, which settles some of the INTO’s claims). The salary scale did not change, so this comparison leaves it out.',
    },
    {
      id: 'postprimary',
      name: 'Post-primary (secondary) school teacher',
      short: 'post-primary teacher',
      low: 'starting point for new post-primary teachers',
      lowGrade: 'ppt-new',
      effective: '2026-06-01',
      sourceId: 'circular-0074-2026',
      sourceIds: ['circular-0074-2026', 'psa-2026-text'],
      hourly: false,
      caveat: 'Basic scale only: qualification allowances, posts of responsibility and other allowances are not included. These are the scales in Circular 0074/2026 of 1 October 2026, which include the 1% local bargaining from 1 September 2025. The circular says the payroll changes and back pay will take time, so your payslip may not show these rates yet.',
      lastDealLB: true,
      lastDealNote: 'For post-primary teachers, the first local bargaining instalment was a 1% rise in the salary scale from 1 September 2025, under Circular 0074/2026, so this comparison counts it. The proposed agreement says its new rules do not affect the full implementation of the post-primary teachers’ 3% local bargaining agreement for cooperation with senior cycle reform (section 4.2.4), so the draft’s figure is also given with its 1%.',
      // The reported "Secondary teacher 12.8%" was worked out on the scale before Circular 0074/2026.
      exampleNote: 'The reported secondary teacher figure matches the scale as it was before Circular 0074/2026 raised it. On today’s scale the same sum gives 12.7%.',
    },
    {
      id: 'nurse',
      name: 'Nurse or midwife',
      short: 'nurse or midwife',
      low: 'starting point for new nurses and midwives',
      lowGrade: 'nm-enhanced', // the Staff Nurse scale starts lower, but has taken no new staff since 1 September 2025
      effective: '2026-06-01',
      sourceId: 'hse-scales-june-2026',
      sourceIds: ['hse-scales-june-2026', 'doh-circular-9-2026', 'doh-circular-10-2026'],
      hourly: false,
      caveat: 'Basic scale only: location and qualification allowances, premium pay for nights, weekends and public holidays, and overtime are not included. These are the general scales; mental health nurses have some scales of their own.',
      lastDealLB: false,
      lastDealNote: 'For nurses and midwives, the first local bargaining instalment was used for particular changes from 1 September 2025, such as a new Enhanced entry scale and a long service increment for Clinical Nurse Managers 1 (Department of Health Circulars 9/2026 and 10/2026). It was not a 1% rise on every scale, so this comparison leaves it out.',
    },
    {
      id: 'garda',
      name: 'Garda, sergeant or inspector',
      short: 'garda',
      low: 'starting point for new gardaí',
      lowGrade: 'garda-2015',
      effective: '2026-06-01',
      sourceId: 'garda-scales-aug-2025',
      sourceIds: ['garda-scales-aug-2025', 'garda-why-join-2026', 'gra-update-sep2026'],
      hourly: false,
      // No Garda table dated 1 June 2026 could be found. GARDA_AUG_2025 below is the official
      // table of 1 August 2025; `since2025` applies the two rises since. Replace both with the
      // official figures when a newer table is published.
      caveat: 'Basic pay only: allowances, unsocial hours payments and overtime are not included. We could not find a Garda pay table for 1 June 2026, so these figures are An Garda Síochána’s table of 1 August 2025 with the rises of 1 February 2026 (1% or €500) and 1 June 2026 (1%) applied. They may differ from your payslip by a euro or two.',
      lastDealLB: false,
      lastDealNote: 'For garda rank, the first local bargaining instalment (1%, due 1 September 2025) had not been agreed when the GRA last reported on it, on 29 September 2026. We found no statement from AGSI for sergeants and inspectors. This comparison leaves it out unless you count it under the chart at the top of the page.',
      owed: {
        pct: 1,
        since: '2025-09-01',
        note: 'Local bargaining money is used as each sector negotiates, so neither 1% is certain to reach you as a rise. For garda rank, the GRA said on 29 September 2026 that all but one of its eight claims for the 1% due from 1 September 2025 had been rejected and were before the WRC, and that it had been told the 1% could instead be used as a general rise for all members. We found no statement from AGSI for sergeants and inspectors. The proposed agreement says claims like this must be resolved by 24 November 2026. If it is paid as a 1% rise, the new rises build on it.',
        status: 'For garda rank it had not been agreed or paid when the GRA last reported on it, on 29 September 2026. We found no statement from AGSI for sergeants and inspectors.',
        sourceIds: ['gra-update-sep2026', 'gra-adc-2026', 'psa-2026-text'],
      },
    },
  ],
  grades: [
    {
      id: 'al-ne', sector: 'tu', name: 'Assistant Lecturer (joined 2011 or later)', group: 'current', hourly: 75.51,
      points: pts([47572, 50099, 52181, 54097, 56109, 57728, 59383, 61045, 62717, 64372]),
    },
    {
      id: 'al-pre', sector: 'tu', name: 'Assistant Lecturer (joined before 2011)', group: 'current', hourly: 82.83,
      points: pts([52181, 54097, 56109, 57728, 59383, 61045, 62717, 64372]),
    },
    {
      id: 'lect', sector: 'tu', name: 'Lecturer', group: 'current',
      points: pts([69625, 72831, 84009, 86936, 89894, 92865, 95852, 98817, 101780, 104757, 107727]),
    },
    {
      id: 'sl1', sector: 'tu', name: 'Senior Lecturer I (Teaching)', group: 'current',
      points: pts([94736, 97963, 101175, 104409, 107625, 110838, 114068, 117279]),
    },
    {
      id: 'sl2', sector: 'tu', name: 'Senior Lecturer II', group: 'current',
      points: pts([97917, 100997, 104070, 107149, 110230, 113304, 116378, 119458, 122529, 125890]),
    },
    {
      id: 'sl3', sector: 'tu', name: 'Senior Lecturer III', group: 'current',
      points: pts([105346, 109042, 112741, 116441, 120140, 123838, 127814, 131543, 135494]),
    },
    {
      id: 'ct', sector: 'tu', name: 'College Teacher', group: 'legacy',
      points: pts([49046, 50945, 52876, 54847, 56912, 58971, 61050, 63154, 65827, 67975, 70126, 72943, 75760, 77976, 82943, 83943]),
    },
    {
      id: 'ls1', sector: 'tu', name: 'Lecturer Scale I', group: 'legacy',
      points: pts([61991, 64939, 67351, 69796, 72859, 82064, 83471, 86138, 88849, 91566, 94290]),
    },
    {
      // TUI: "Long Service Increments (Lecturer 2 scale only - appointees before September 1998)".
      id: 'ls2', sector: 'tu', name: 'Lecturer 2 (appointed before September 1998, with long service increments)', group: 'legacy',
      points: pts([69625, 72831, 84009, 86936, 89894, 92865, 95852, 98817, 101780, 104757, 107727],
        [{ label: 'LSI 1', value: 110594, lsi: true }, { label: 'LSI 2', value: 113460, lsi: true }]),
    },
    // Primary teachers: Circular 0055/2026, Appendix 1 (a) and (b), from 1 June 2026.
    {
      id: 'pt-new', sector: 'primary', name: 'Primary teacher (started in 2011 or later)', group: 'current',
      points: skipping(pts([45833, 47503, 49409, 50280, 51510, 53015, 54742, 56534, 58051, 60785, 62495, 64537, 66567, 68618,
        70329, 72596, 72596, 72596, 75721, 75721, 75721, 75721, 79854, 79854, 79854, 79854, 84412]), TEACHER_SKIPS),
    },
    {
      id: 'pt-pre2011', sector: 'primary', name: 'Primary teacher (started before 2011)', group: 'current',
      points: pts([43774, 44644, 45868, 47097, 49002, 50237, 51476, 54669, 56327, 58341, 60362, 62407, 64118, 66386,
        66386, 66386, 69511, 69511, 69511, 69511, 73644, 73644, 73644, 73644, 78205]),
    },
    // Post-primary teachers: Circular 0074/2026, Appendix 1 (a) and (b), the column "Rate from 01/06/2026".
    {
      id: 'ppt-new', sector: 'postprimary', name: 'Post-primary teacher (started in 2011 or later)', group: 'current',
      points: skipping(pts([47886, 49578, 51515, 52407, 53668, 55226, 57023, 58862, 60406, 63177, 64907, 66980, 69040, 71114,
        72850, 75149, 75149, 75149, 78316, 78316, 78316, 78316, 82501, 82501, 82501, 82501, 87128]), TEACHER_SKIPS),
    },
    {
      id: 'ppt-pre2011', sector: 'postprimary', name: 'Post-primary teacher (started before 2011)', group: 'current',
      points: pts([44359, 45240, 46480, 47727, 49658, 50908, 52169, 55407, 57087, 59128, 61177, 63249, 64983, 67283,
        67283, 67283, 70451, 70451, 70451, 70451, 74638, 74638, 74638, 74638, 79261]),
    },
    // Nurses and midwives: HSE consolidated salary scales, 1 June 2026 (version 4, September 2026).
    {
      // Two official documents disagree on this scale. The consolidated scales (listed first) take the
      // figures in Circular 10/2026 as the rates from 1 September 2025 and adds the rises of
      // February and June 2026; the circular labels the same figures "01/06/2026". The 13.3%
      // reported for an Enhanced nurse on 11 November matches the HSE's starting figure.
      id: 'nm-enhanced', sector: 'nurse', name: 'Enhanced Nurse or Midwife (consolidated scales, version 4)', group: 'current',
      note: ENHANCED_NOTE,
      points: pts([44832, 46217, 48775, 50141, 51194, 52364, 53944, 55522, 57903], [{ label: 'Long service increment', value: 60194, lsi: true }]),
    },
    {
      id: 'nm-enhanced-c10', sector: 'nurse', name: 'Enhanced Nurse or Midwife (Circular 10/2026)', group: 'current',
      note: ENHANCED_NOTE,
      points: pts([43888, 45259, 47792, 49145, 50185, 51333, 52881, 54428, 56762], [{ label: 'Long service increment', value: 59008, lsi: true }]),
    },
    {
      id: 'nm-enhanced-senior', sector: 'nurse', name: 'Senior Enhanced Nurse or Midwife', group: 'current',
      points: [{ label: 'Single rate', value: 62047 }],
    },
    {
      id: 'nm-staff', sector: 'nurse', name: 'Staff Nurse or Midwife', group: 'current',
      // Staff nurses and midwives skip point 2 (Circular 10/2026, questions and answers).
      points: skipping(pts([38166, 40158, 41175, 42519, 44213, 45907, 47591, 49049, 50509, 51973, 53466, 54956], [{ label: 'Long service increment', value: 56592, lsi: true }]), [2]),
    },
    {
      id: 'nm-staff-senior', sector: 'nurse', name: 'Senior Staff Nurse or Midwife', group: 'current',
      points: [{ label: 'Single rate', value: 59278 }],
    },
    {
      // Point 1 is skipped from 1 September 2025 on both manager scales (Circular 9/2026).
      id: 'cnm1', sector: 'nurse', name: 'Clinical Nurse or Midwife Manager 1', group: 'current',
      points: skipping(pts([57780, 58828, 60306, 61810, 63305, 64809, 66484, 68046], [{ label: 'Long service increment', value: 70087, lsi: true }]), [1]),
    },
    {
      id: 'cnm2', sector: 'nurse', name: 'Clinical Nurse or Midwife Manager 2', group: 'current',
      points: skipping(pts([62699, 63737, 64615, 66048, 67633, 69189, 70745, 72497, 74123, 76921], [{ label: 'Long service increment', value: 79227, lsi: true }]), [1]),
    },
    {
      id: 'cnm3', sector: 'nurse', name: 'Clinical Nurse or Midwife Manager 3', group: 'current',
      points: pts([72146, 73573, 77183, 78603, 80031, 81478]),
    },
    // Gardaí: "All Garda Member Pay Rates Date effective 1 August 2025", moved on by the two rises since.
    { id: 'garda-2015', sector: 'garda', name: 'Garda (the 2015 scale, where new recruits start)', group: 'current', note: GARDA_NOTE, points: pts(since2025(GARDA_AUG_2025.garda2015)) },
    { id: 'garda-a', sector: 'garda', name: 'Garda (scale A)', group: 'current', note: GARDA_NOTE, points: pts(since2025(GARDA_AUG_2025.gardaA)) },
    { id: 'sergeant-a', sector: 'garda', name: 'Sergeant (scale A)', group: 'current', note: GARDA_NOTE, points: pts(since2025(GARDA_AUG_2025.sergeantA)) },
    { id: 'inspector-a', sector: 'garda', name: 'Inspector (scale A)', group: 'current', note: GARDA_NOTE, points: pts(since2025(GARDA_AUG_2025.inspectorA)) },
    { id: 'garda-b', sector: 'garda', name: 'Garda (scale B)', group: 'legacy', note: GARDA_NOTE, points: pts(since2025(GARDA_AUG_2025.gardaB)) },
    { id: 'sergeant-b', sector: 'garda', name: 'Sergeant (scale B)', group: 'legacy', note: GARDA_NOTE, points: pts(since2025(GARDA_AUG_2025.sergeantB)) },
    { id: 'inspector-b', sector: 'garda', name: 'Inspector (scale B)', group: 'legacy', note: GARDA_NOTE, points: pts(since2025(GARDA_AUG_2025.inspectorB)) },
  ],
};

// Prices. The Central Bank's forecast is the default. Published forecasts sit close
// together (see `others`), so the lower and higher paths are round-number illustrations,
// labelled as such wherever they are shown. Each scenario carries its own wording:
// `phrase` goes in the pay panel and in what the opening chart tells a screen reader, `note` under that chart.
const CENTRAL_RATES = { 2026: 3.4, 2027: 3.1, 2028: 2, 2029: 2 };
export const INFLATION = {
  from: '2026-07',
  to: '2029-03',
  rates: CENTRAL_RATES,
  assumedYears: [2029], // the Central Bank gives no figure for 2029
  current: 4, // % in the year to October 2026 (CSO flash estimate of the HICP)
  sourceId: 'cbi-qb3-2026',
  defaultScenario: 'central',
  // `kind` is shown beside the figures: only the Central Bank's path is a forecast.
  scenarios: [
    {
      id: 'lower', kind: 'illustration', label: 'Optimistic: 2%', rates: { 2026: 3.4, 2027: 2, 2028: 2, 2029: 2 },
      phrase: 'on the optimistic path (2% a year from 2027, an illustration)',
      note: 'Inflation here is an illustration, not a forecast: the Central Bank’s 3.4% for 2026, then 2% a year, the European Central Bank’s target.',
      sourceIds: ['cbi-qb3-2026', 'ecb-target'],
    },
    {
      id: 'central', kind: 'forecast', label: 'Central Bank', rates: CENTRAL_RATES,
      phrase: 'on the Central Bank’s forecasts (2029 assumed at 2%)',
      note: 'Inflation follows the Central Bank of Ireland’s forecasts of September 2026: 3.4% in 2026, 3.1% in 2027 and 2% in 2028, with 2029 assumed at 2%.',
      sourceIds: ['cbi-qb3-2026'],
    },
    {
      id: 'higher', kind: 'illustration', label: 'Pessimistic: 4%', rates: { 2026: 4, 2027: 4, 2028: 4, 2029: 4 },
      phrase: 'on the pessimistic path (4% a year, an illustration)',
      note: 'Inflation here is an illustration, not a forecast: it stays at 4% a year, the rate in the year to October 2026 (CSO flash estimate).',
      sourceIds: ['cso-hicp-oct2026'],
    },
  ],
  // What other institutions forecast for Ireland, for context. Years they do not cover are left out.
  others: [
    { who: 'IMF', what: 'World Economic Outlook, October 2026', rates: { 2026: 3.4, 2027: 2.8, 2028: 1.9, 2029: 2 }, sourceId: 'imf-weo-oct2026' },
    { who: 'ESRI', what: 'Quarterly Economic Commentary, Autumn 2026 (CPI)', rates: { 2026: 3.6, 2027: 3.3 }, sourceId: 'esri-qec-autumn2026' },
    { who: 'European Commission', what: 'Spring 2026 forecast', rates: { 2026: 3.5, 2027: 2.6 }, sourceId: 'ec-spring2026' },
  ],
};

export const TIMELINE = [
  { date: '2026-06-30', when: '30 June 2026', label: 'The Public Service Agreement 2024–2026 expires.', sourceId: 'psa-2024' },
  { date: '2026-07-03', when: '3 July 2026', label: 'Unions begin preparing for possible industrial action ballots over pay talks.', sourceId: 'it-ballots-july' },
  { date: '2026-09-30', when: '30 September 2026', label: 'Work-to-rule action begins across public services.', sourceId: 'ictu-psc-release' },
  { date: '2026-10-14', when: '14 October 2026', label: 'Public service-wide strike action.', sourceId: 'ictu-psc-release' },
  { date: '2026-10-21', when: '21 October 2026', label: 'Another planned strike is suspended to allow talks.', sourceId: 'indo-explainer' },
  { date: '2026-10-22', when: 'After 21 October 2026', label: 'Talks break down and unions plan a public service strike for Thursday 12 November.', sourceId: 'indo-explainer' },
  { date: '2026-11-08', when: '8 November 2026', label: 'The Government offers increases reported to be worth 10.5%.', sourceId: 'it-offer' },
  { date: '2026-11-09', when: '9 November 2026, late evening', label: 'The Government Appointed Group proposes a pay formula to overcome the impasse in the talks.', sourceId: 'ictu-psc-release' },
  { date: '2026-11-10', when: '10 November 2026', label: 'Unions consider a revised offer.', sourceId: 'rte-revised' },
  { date: '2026-11-11', when: '11 November 2026, about 3.30am', label: 'The draft deal is agreed at the Workplace Relations Commission and the strike is suspended.', sourceId: 'rte-deal' },
  { date: '2026-11-12', when: 'In the following days', label: 'Union executives consider the full terms before their members ballot.', sourceId: 'ictu-psc-release' },
  { date: '2026-11-24', when: '24 November 2026', label: 'The date by which the proposed agreement says outstanding first-phase local bargaining claims (the 1% due from 1 September 2025) must be resolved.', sourceId: 'psa-2026-text' },
  { date: '2026-12-07', when: 'Week of 7 December 2026', label: 'Union ballot results are due.', sourceId: 'rte-deal' },
  { date: '2027-01-01', when: 'January 2027', label: 'If the deal is accepted, the first increases and back pay are likely to be paid.', sourceId: 'it-whats-in-it' },
];

export const GLOSSARY = [
  { id: 'general-round', term: 'General round increase', text: 'A pay rise for everyone covered by the agreement, set as a percentage of basic salary and sometimes with a minimum euro amount. The draft deal has eight of them.' },
  { id: 'local-bargaining', term: 'Local bargaining', text: 'Money set aside for issues in particular sectors or grades, worth 1% of each bargaining unit’s pay bill per phase. How it is used is negotiated separately, so it may not reach every person as a 1% rise.' },
  { id: 'lower-pay-threshold', term: 'Lower-pay threshold', text: 'The salary below which the flat minimum amounts are bigger than the percentage rises. It rises from €50,000 in the last deal to €60,000 in this one.' },
  { id: 'minimum-payment', term: 'Minimum payment', text: 'The floor on some rises: you get the percentage or the euro amount, whichever is greater. For example, 2% or €1,200 on 1 September 2026.' },
  { id: 'compounding', term: 'Compounding', text: 'Each rise is calculated on pay that has already gone up, so together the rises come to more than the percentages added up: 10.75% becomes about 11.3%.' },
  { id: 'back-pay', term: 'Back pay (arrears)', text: 'Money owed for a rise that applies from an earlier date. The first rise is backdated to 1 September 2026, so if the deal is accepted the amount owed since then is paid as a lump sum.' },
  { id: 'review-clause', term: 'Review clause', text: 'A term that lets the parties reopen the agreement if circumstances change. The draft deal lets either side trigger a review if the assumptions behind it, including on inflation, change significantly.' },
  { id: 'ballot', term: 'Ballot', text: 'A vote of union members on whether to accept the draft deal. Each union runs its own ballot.' },
  { id: 'ratification', term: 'Ratification', text: 'Formal acceptance of the deal by the unions after their members have voted. Until then, it is a draft.' },
  { id: 'wrc', term: 'WRC', text: 'The Workplace Relations Commission, the State body that hosted the talks where the draft deal was agreed.' },
  { id: 'ictu-psc', term: 'ICTU Public Services Committee', text: 'The committee of the Irish Congress of Trade Unions that brings the public service unions together to negotiate pay agreements and decide on them.' },
  { id: 'increment', term: 'Increment', text: 'The yearly step up your pay scale for service. Increments are separate from this deal and are not included in the figures on this site. The one exception is the opening chart, if you add your increment month to it: your own pay is then drawn as a second line, and the deal’s rises alone are compared with inflation.' },
  { id: 'scale-point', term: 'Scale point', text: 'One step on your grade’s pay scale. The figures here are each scale’s point values for 1 June 2026; for gardaí they are worked out from the last published table.' },
];

export const BEYOND_PAY = [
  {
    id: 'local-bargaining', title: 'Local bargaining', status: 'known',
    text: 'The 1% on 1 March 2029 is the second phase of local bargaining that began under the 2024–2026 agreement, which allowed up to 3% of the basic pay cost in all. The proposed text calls it a payment of up to 1% of basic pay costs (section 3.1.2), and says local bargaining was not meant, as a rule, to deliver a general pay rise (section 4.1.3). What the money is spent on is negotiated for each grade or group, so it may not arrive as a 1% rise for each person. Bargaining units that settled the first phase in the way that was envisaged (the text’s Category One) may opt to take either the second or the third 1% as a general pay rise; units whose first phase included a general rise (Category Two) will not have that option (section 4.2.4). The final phase is left to the next agreement. The text says first-phase matters still outstanding (the 1% due from 1 September 2025) must be resolved by 24 November 2026 (section 4.2.3).',
    sourceIds: ['psa-2026-text', 'psa-2024'],
  },
  {
    id: 'review-clause', title: 'Review clause', status: 'known',
    text: 'Either side can trigger a review if the assumptions behind the agreement, including on inflation, change significantly. The review is to start as soon as possible and finish within six weeks (section 3.2.1).',
    sourceIds: ['psa-2026-text'],
  },
  {
    id: 'ai-hybrid', title: 'AI and blended working', status: 'known',
    text: 'On artificial intelligence, the parties agree to work together on how it is used in the public service, in line with the Guidelines for the Responsible Use of Artificial Intelligence in the Public Service, and restate that compulsory redundancy will not apply in the public service, save for the limited exceptions in earlier agreements (section 2.5). Blended working continues under the existing policy frameworks and stays under review, with issues dealt with locally where possible (section 2.7).',
    sourceIds: ['psa-2026-text'],
  },
  {
    id: 'education', title: 'Education measures', status: 'reported',
    text: 'Measures on recruitment and retention, workload and class sizes in schools were mentioned in reports when the deal was agreed. The agreement’s text does not set class sizes. Its appendix lists education reforms already under way, such as senior cycle reform, and section 4.2.4 says its new rules on local bargaining do not affect the full implementation of the post-primary teachers’ 3% local bargaining agreement for cooperation with senior cycle reform.',
    sourceIds: ['rte-deal', 'psa-2026-text'],
  },
  {
    id: 'reform', title: 'Reform commitments', status: 'known',
    text: 'Chapter 2 of the agreement sets out commitments on workplace change: digital services, skills, flexible ways of working and action plans for each sector. An appendix lists the Government’s reform programmes sector by sector.',
    sourceIds: ['psa-2026-text'],
  },
  {
    id: 'coverage', title: 'Who the agreement covers', status: 'known',
    text: 'The benefits of the agreement are confined to staff represented by unions in the Irish Congress of Trade Unions, or by other unions and representative associations that tell the Workplace Relations Commission they will comply with it (section 5.7.1).',
    sourceIds: ['psa-2026-text'],
  },
];

export const ASSUMPTIONS = [
  'Everything is based on the proposed Public Service Agreement 2026–2029, issued through the Workplace Relations Commission on 11 November 2026. Its section 3.1.2 sets out the nine pay adjustments used here. It is a proposal until union members have voted.',
  'Until you choose a job, grade and point, every chapter shows an example salary of €60,000, the level at which the deal’s flat minimums stop applying.',
  'Figures are gross pay, before tax, USC, PRSI and pension deductions.',
  'Annual increments are not included: the figures show only what the deal adds to your current scale point. The one exception is the opening chart: if you add your increment month, it draws your own pay with increments as a second line. Only the deal’s rises are compared with inflation, because an increment is normal progression up a scale and not part of the deal.',
  'Where you add increments to the opening chart, each is counted from the 1st of the month you choose: one point a year, worked out from the point you are on now. Skipped points are passed over, and long service increments and promotions are left out.',
  'Local bargaining (1% on 1 March 2029) is left out of totals unless you switch it on. It is 1% of a bargaining unit’s pay bill, used as negotiated, so it may not reach you as a 1% rise.',
  'Lecturer, teacher and nurse figures are the pay scales in force from 1 June 2026. Garda figures are the official table of 1 August 2025 with the two rises since applied, because no later table could be found.',
  'For teachers, nurses, midwives and gardaí the figures are basic pay only: allowances, premium pay and overtime are not included.',
  'The 1% local bargaining due from 1 September 2025 under the last agreement is in the post-primary teachers’ scale. For primary teachers, nurses and midwives it has been used so far for allowances and changes to particular grades. It is not in the lecturer or Garda figures, so for those jobs it is left out unless you switch it on under the chart at the top of the page. Counting it adds 1% to your current point before the new rises, and adds its back pay: 1% of the pay scale in force in each month since then, assuming it is backdated in full.',
  'Amounts are worked out to the cent and shown in whole euros. Official pay scales may differ by about €1 because of rounding.',
  'Part-time pay is your full-time scale point times your FTE, so the flat minimums are pro-rated.',
  'Hourly rates for Assistant Lecturers are point 1 of the annual scale divided by 630 hours, which matches the 2026 pay circulars exactly.',
  'Back pay assumes the first rise is paid in the January 2027 payroll, with arrears from 1 September 2026. You can change the month.',
  'For hourly-paid lecturers, back pay assumes your teaching hours are spread evenly across the year.',
  'Inflation follows the Central Bank of Ireland’s forecasts for 2026 to 2028 (Quarterly Bulletin, September 2026), with 2029 assumed to be 2%. The optimistic and pessimistic buttons under the opening chart are illustrations, not forecasts: 2% a year from 2027, and 4% a year throughout. You can also set a figure of your own there.',
  'TU Dublin academic staff are assumed to be on the same scales as staff in the former institutes of technology.',
];

export const SOURCES = [
  { id: 'psa-2026-text', publisher: 'Workplace Relations Commission and the parties to the talks (copy hosted by ASTI)', title: 'Strengthening Public Services: proposed Public Service Agreement 2026–2029', date: '2026-11-11', url: 'https://www.asti.ie/document-library/public-service-agreement-2026--2029/strengthening-public-services-public-service-agreement-2026-2029.pdf' },
  { id: 'ictu-psc-release', publisher: 'ICTU Public Services Committee (published by Fórsa)', title: 'Unions and Government representatives reach draft public sector pay agreement', date: '2026-11-11', url: 'https://www.forsa.ie/draft-public-sector-pay-agreement/' },
  { id: 'rte-deal', publisher: 'RTÉ News', title: 'Public sector strike suspended as unions agree pay deal', date: '2026-11-11', url: 'https://www.rte.ie/news/ireland/2026/1111/1598773-public-sector-pay-deal/' },
  { id: 'cbi-qb3-2026', publisher: 'Central Bank of Ireland', title: 'Quarterly Bulletin No. 3 2026', date: '2026-09-16', url: 'https://www.centralbank.ie/publication/quarterly-bulletins/quarterly-bulletin-q3-2026' },
  { id: 'cso-hicp-oct2026', publisher: 'Central Statistics Office', title: 'Flash estimate for the Harmonised Index of Consumer Prices, October 2026', date: '2026-11-03', url: 'https://www.cso.ie/en/csolatestnews/pressreleases/2026pressreleases/pressstatementflashestimatefortheharmonisedindexofconsumerpricesoctober2026/' },
  { id: 'ecb-target', publisher: 'European Central Bank', title: 'Two per cent inflation target', date: '2026', url: 'https://www.ecb.europa.eu/mopo/strategy/pricestab/html/index.en.html' },
  { id: 'imf-weo-oct2026', publisher: 'International Monetary Fund', title: 'World Economic Outlook, October 2026: inflation rate, average consumer prices, Ireland', date: '2026-10', url: 'https://www.imf.org/external/datamapper/PCPIPCH@WEO/IRL' },
  { id: 'esri-qec-autumn2026', publisher: 'Economic and Social Research Institute', title: 'Quarterly Economic Commentary, Autumn 2026', date: '2026-09-29', url: 'https://www.esri.ie/publications/quarterly-economic-commentary-autumn-2026' },
  { id: 'ec-spring2026', publisher: 'European Commission', title: 'Economic forecast for Ireland, Spring 2026', date: '2026-05-21', url: 'https://economy-finance.ec.europa.eu/economic-surveillance-eu-member-states/country-pages-including-country-reports/ireland/economic-forecast-ireland_en' },
  { id: 'rte-analysis', publisher: 'RTÉ News', title: 'Inside the €5bn pay offer to public servants', date: '2026-11-10', url: 'https://www.rte.ie/news/2026/1110/1598605-public-pay-deal-analysis/' },
  { id: 'rte-revised', publisher: 'RTÉ News', title: 'Public sector unions are considering a revised pay deal offer', date: '2026-11-10', url: 'https://www.rte.ie/news/ireland/2026/1110/1598619-pay-talks/' },
  { id: 'it-whats-in-it', publisher: 'The Irish Times', title: 'Public sector pay deal: What’s in it for me?', date: '2026-11-11', url: 'https://www.irishtimes.com/ireland/2026/11/11/public-sector-pay-deal-whats-in-it-for-me/' },
  { id: 'it-offer', publisher: 'The Irish Times', title: 'Public sector workers offered pay increases worth 10.5% ahead of planned strikes', date: '2026-11-08', url: 'https://www.irishtimes.com/politics/2026/11/08/public-sector-workers-offered-pay-increases-worth-105-ahead-of-planned-strikes/' },
  { id: 'it-ballots-july', publisher: 'The Irish Times', title: 'Public sector unions preparing for possible industrial action ballots over pay talks', date: '2026-07-03', url: 'https://www.irishtimes.com/business/work/2026/07/03/public-sector-unions-preparing-for-possible-industrial-action-ballots-over-pay-talks/' },
  { id: 'indo-explainer', publisher: 'Irish Independent', title: 'Explainer: Public sector reaches pay deal, so what are some of the key measures agreed?', date: '2026-11-11', url: null },
  { id: 'psa-2024', publisher: 'Government of Ireland', title: 'Public Service Agreement 2024–2026 (copy hosted by MTU)', date: '2024', url: 'https://finance.mtu.ie/contentFiles/circulars/Public_Service_Pay_Agreement_2024-2026.pdf' },
  { id: 'circular-002-2026', publisher: 'Department of Further and Higher Education', title: 'TU-IOT Circular 002/2026: revision of pay from 1 June 2026, appendix (copy hosted by DkIT)', date: '2026', url: 'https://www.dkit.ie/system/files/2026-06/TU-IOT-Circular-002_2026-Revision-of-Pay-for-the-Higher-Education-Sector-with-effect-from-1st-June-2026-Appendix.pdf' },
  { id: 'circular-001-2026', publisher: 'Department of Further and Higher Education', title: 'TU-IOT Circular 001/2026: revision of pay from 1 February 2026 (copy hosted by TUI)', date: '2026', url: 'https://www.tui.ie/_fileupload/tu-iot-circular-001-2026-revision-of-pay-for-the-higher-education-sector-with-effect-from-1st-february-2026.pdf' },
  { id: 'tui-scales', publisher: 'TUI', title: 'Third level salary scales', date: '2026', url: 'https://www.tui.ie/third-level-pay-pensions/third-level-salary-scales-.2167.html' },
  { id: 'tui-senior-cycle-1pc', publisher: 'TUI', title: 'Department issues circular for payment of overdue 1% after over 98% of TUI members vote for industrial action', date: '2026-10', url: 'https://www.tui.ie/news/department-issues-circular-for-payment-of-overdue-1-after-over-98-of-tui-members-vote-for-industrial-action.15569.html' },
  { id: 'circular-0055-2026', publisher: 'Department of Education and Youth', title: 'Circular 0055/2026: revision of salaries for primary teachers from 1 June 2026 (copy hosted by INTO)', date: '2026-05-27', url: 'https://www.into.ie/app/uploads/2026/05/Circular_0055-2026_Primary_Teacher_Salaries_effective_from_1st_June_2026.pdf' },
  { id: 'circular-0054-2026', publisher: 'Department of Education and Youth', title: 'Circular 0054/2026: implementation of local bargaining for primary teachers from 1 September 2025 (copy hosted by INTO)', date: '2026-05-21', url: 'https://www.into.ie/app/uploads/2026/05/circular-54-2026.pdf' },
  { id: 'circular-0074-2026', publisher: 'Department of Education and Youth', title: 'Circular 0074/2026: implementation of local bargaining for post-primary teachers from 1 September 2025, with revised salary scales (copy hosted by TUI)', date: '2026-10-01', url: 'https://www.tui.ie/_fileupload/circular74-2026.pdf' },
  { id: 'hse-scales-june-2026', publisher: 'Department of Health (published by the HSE)', title: 'Health sector consolidated salary scales, 1 June 2026 (version 4)', date: '2026-09', url: 'https://assets.hse.ie/media/documents/1_June_2026_pay_scales_yVg87LQ.pdf' },
  { id: 'doh-circular-9-2026', publisher: 'Department of Health', title: 'Circular 9/2026: amendments to nurse and midwife grades under the local bargaining clause', date: '2026-09-16', url: 'https://assets.hse.ie/media/documents/Department_of_Health_circular_009_2026_Amendments_to_Nurse_and_Midwife_Grades.pdf' },
  { id: 'doh-circular-10-2026', publisher: 'Department of Health', title: 'Circular 10/2026: amendments to entry grade for nursing staff under the local bargaining clause', date: '2026-09-16', url: 'https://assets.hse.ie/media/documents/Department_of_Health_circular_010_2026_Amendments_to_entry_grade_for_nursing_staff.pdf' },
  { id: 'garda-scales-aug-2025', publisher: 'An Garda Síochána', title: 'All Garda member pay rates, effective 1 August 2025 (archived copy)', date: '2025-08-01', url: 'https://web.archive.org/web/20260318190946/https://www.garda.ie/en/careers/career-opportunities-for-an-garda-siochana/garda-pay-scales-august-2025.pdf' },
  { id: 'garda-why-join-2026', publisher: 'An Garda Síochána', title: 'Why join An Garda Síochána? Pay as of 1 February 2026', date: '2026-05', url: 'https://www.garda.ie/en/careers/garda-trainee-recruitment-it-s-a-job-worth-doing-campaign/why-join-an-garda-siochana-may-2026.pdf' },
  { id: 'gra-update-sep2026', publisher: 'Garda Representative Association', title: 'GRA update, 29 September', date: '2026-09-29', url: 'https://www.gra.ie/latest-news/gra-update-29th-september' },
  { id: 'gra-adc-2026', publisher: 'Garda Representative Association', title: 'Annual Delegate Conference 2026', date: '2026-04-28', url: 'https://www.gra.ie/latest-news/annual-delegate-conference-2026' },
  { id: 'tui-lb-dec2025', publisher: 'TUI', title: 'Consultation, parity of esteem and application of pay agreement increase required for professorships', date: '2025-12-16', url: 'https://www.tui.ie/press-releases/consultation-parity-of-esteem-and-application-of-pay-agreement-increase-required-for-professorships%E2%80%99.15414.html' },
];

export const UNION_LINKS = [
  { name: 'TUI', url: 'https://www.tui.ie/', note: 'The Teachers’ Union of Ireland represents academic staff in the technological universities, and teachers in post-primary schools and further education.' },
  { name: 'INTO', url: 'https://www.into.ie/', note: 'The Irish National Teachers’ Organisation represents primary teachers.' },
  { name: 'ASTI', url: 'https://www.asti.ie/', note: 'The Association of Secondary Teachers, Ireland represents post-primary teachers.' },
  { name: 'INMO', url: 'https://inmo.ie/', note: 'The Irish Nurses and Midwives Organisation represents nurses and midwives.' },
  { name: 'GRA', url: 'https://www.gra.ie/', note: 'The Garda Representative Association represents members of garda rank.' },
  { name: 'AGSI', url: 'https://www.agsi.ie/', note: 'The Association of Garda Sergeants and Inspectors represents sergeants and inspectors.' },
  { name: 'ICTU Public Services Committee', url: 'https://www.ictu.ie/', note: 'The Irish Congress of Trade Unions brings together the public service unions.' },
];
