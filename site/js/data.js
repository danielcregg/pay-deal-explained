// Every fact the site uses lives in this file.
// When the official text is published or the ballot result is known, update this
// file (and the matching <noscript> lines in index.html), run `npm test`, and push.

export const SITE = {
  title: 'Pay Deal Explained',
  status: {
    state: 'draft',
    chip: 'Draft · ballot results due w/c 7 Dec',
    line: 'Draft agreed on 11 November 2026. Not final until union members vote; results are due in the week of 7 December 2026.',
  },
  lastUpdated: '2026-11-11',
  includeLBDefault: false,
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
  reviewClause: 'Reported to include a review clause that either side can invoke if inflation rises to unexpected levels or other unforeseen economic factors arise.',
  sourceIds: ['rte-deal', 'it-whats-in-it', 'indo-explainer'],
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
  tuLbNote: 'For TU academic staff, the first local bargaining instalment (1%, due 1 September 2025) was still being sought by TUI in December 2025, and it does not appear in the February or June 2026 pay scales. This comparison leaves it out unless you count local bargaining as a rise.',
  sourceIds: ['psa-2024', 'rte-analysis', 'tui-lb-dec2025', 'circular-001-2026', 'circular-002-2026'],
};

const pts = (values, extras = []) => [
  ...values.map((value, i) => ({ label: `Point ${i + 1}`, value })),
  ...extras,
];

export const SCALES = {
  effective: '2026-06-01',
  sourceId: 'circular-002-2026',
  hourlyDivisor: 630,
  grades: [
    {
      id: 'al-ne', name: 'Assistant Lecturer (joined 2011 or later)', group: 'current', hourly: 75.51,
      points: pts([47572, 50099, 52181, 54097, 56109, 57728, 59383, 61045, 62717, 64372]),
    },
    {
      id: 'al-pre', name: 'Assistant Lecturer (joined before 2011)', group: 'current', hourly: 82.83,
      points: pts([52181, 54097, 56109, 57728, 59383, 61045, 62717, 64372]),
    },
    {
      id: 'lect', name: 'Lecturer', group: 'current',
      points: pts([69625, 72831, 84009, 86936, 89894, 92865, 95852, 98817, 101780, 104757, 107727]),
    },
    {
      id: 'sl1', name: 'Senior Lecturer I (Teaching)', group: 'current',
      points: pts([94736, 97963, 101175, 104409, 107625, 110838, 114068, 117279]),
    },
    {
      id: 'sl2', name: 'Senior Lecturer II', group: 'current',
      points: pts([97917, 100997, 104070, 107149, 110230, 113304, 116378, 119458, 122529, 125890]),
    },
    {
      id: 'sl3', name: 'Senior Lecturer III', group: 'current',
      points: pts([105346, 109042, 112741, 116441, 120140, 123838, 127814, 131543, 135494]),
    },
    {
      id: 'ct', name: 'College Teacher', group: 'legacy',
      points: pts([49046, 50945, 52876, 54847, 56912, 58971, 61050, 63154, 65827, 67975, 70126, 72943, 75760, 77976, 82943, 83943]),
    },
    {
      id: 'ls1', name: 'Lecturer Scale I', group: 'legacy',
      points: pts([61991, 64939, 67351, 69796, 72859, 82064, 83471, 86138, 88849, 91566, 94290]),
    },
    {
      id: 'ls2', name: 'Lecturer Scale II (L2 grade)', group: 'legacy',
      points: pts([69625, 72831, 84009, 86936, 89894, 92865, 95852, 98817, 101780, 104757, 107727],
        [{ label: 'LSI 1', value: 110594 }, { label: 'LSI 2', value: 113460 }]),
    },
  ],
};

export const INFLATION = {
  from: '2026-07',
  to: '2029-03',
  rates: { 2026: 3.4, 2027: 3.1, 2028: 2, 2029: 2 },
  assumedYears: [2029],
  current: 4,
  sourceId: 'rte-analysis',
};

export const TIMELINE = [
  { date: '2026-06-30', when: '30 June 2026', label: 'The Public Service Agreement 2024–2026 expires.', sourceId: 'psa-2024' },
  { date: '2026-07-03', when: '3 July 2026', label: 'Unions begin preparing for possible industrial action ballots over pay talks.', sourceId: 'it-ballots-july' },
  { date: '2026-09-30', when: '30 September 2026', label: 'A coordinated work-to-rule begins across the public service.', sourceId: 'indo-explainer' },
  { date: '2026-10-14', when: '14 October 2026', label: 'A 24-hour national strike involving teachers, nurses, doctors and civil servants.', sourceId: 'indo-explainer' },
  { date: '2026-10-21', when: '21 October 2026', label: 'A second planned strike is suspended to allow talks.', sourceId: 'indo-explainer' },
  { date: '2026-10-22', when: 'After 21 October 2026', label: 'Talks break down and unions call a national strike for Thursday 12 November.', sourceId: 'indo-explainer' },
  { date: '2026-11-08', when: '8 November 2026', label: 'The Government offers increases reported to be worth 10.5%.', sourceId: 'it-offer' },
  { date: '2026-11-10', when: '10 November 2026', label: 'Unions consider a revised offer.', sourceId: 'rte-revised' },
  { date: '2026-11-11', when: '11 November 2026, about 3.30am', label: 'The draft deal is agreed at the Workplace Relations Commission and the strike is suspended.', sourceId: 'rte-deal' },
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
  { id: 'review-clause', term: 'Review clause', text: 'A term that lets the parties reopen the agreement if circumstances change. The draft deal is reported to include one that either side can invoke if inflation rises to unexpected levels.' },
  { id: 'ballot', term: 'Ballot', text: 'A vote of union members on whether to accept the draft deal. Each union runs its own ballot.' },
  { id: 'ratification', term: 'Ratification', text: 'Formal acceptance of the deal. After each union’s members have voted, the ICTU Public Services Committee meets to accept or reject the deal on the combined result. Until then, it is a draft.' },
  { id: 'wrc', term: 'WRC', text: 'The Workplace Relations Commission, the State body that hosted the talks where the draft deal was agreed.' },
  { id: 'ictu-psc', term: 'ICTU Public Services Committee', text: 'The committee of the Irish Congress of Trade Unions that brings the public service unions together to negotiate pay agreements and decide on them.' },
  { id: 'increment', term: 'Increment', text: 'The yearly step up your pay scale for service. Increments are separate from this deal and are not included in the figures on this site.' },
  { id: 'scale-point', term: 'Scale point', text: 'One step on your grade’s pay scale. The figures here use the point values in force from 1 June 2026.' },
];

export const BEYOND_PAY = [
  {
    id: 'local-bargaining', title: 'Local bargaining', status: 'reported',
    text: 'The 1% on 1 March 2029 is the second phase of local bargaining that began under the 2024–2026 agreement, which allowed up to 3% of the basic pay cost in all. The final phase is left to the next agreement. Each phase is worth 1% of a sector’s or grade’s pay bill and is used as negotiated locally, so it may not arrive as a 1% rise for each person.',
    sourceIds: ['rte-deal', 'psa-2024'],
  },
  {
    id: 'review-clause', title: 'Inflation review clause', status: 'reported',
    text: 'The draft is reported to include a review clause that either side can invoke if inflation rises to unexpected levels or other unforeseen economic factors arise. The exact wording has not been published.',
    sourceIds: ['rte-deal'],
  },
  {
    id: 'ai-hybrid', title: 'AI and hybrid working', status: 'reported',
    text: 'Arrangements on artificial intelligence and hybrid working are reported to be part of the draft. The details have not been published.',
    sourceIds: ['rte-deal'],
  },
  {
    id: 'education', title: 'Education measures', status: 'reported',
    text: 'Measures on recruitment and retention, workload and class sizes in schools were mentioned when the deal was agreed. Whether any apply to technological universities is not yet known.',
    sourceIds: ['rte-deal'],
  },
  {
    id: 'reform', title: 'Reform commitments', status: 'not-yet-published',
    text: 'The draft is reported to include commitments on reform and modernisation, including digital transformation and more flexibility in how services are delivered. The detail will be in the official text.',
    sourceIds: ['rte-deal'],
  },
];

export const ASSUMPTIONS = [
  'Everything is based on the draft deal as reported on 11 November 2026. The official text had not been published.',
  'Figures are gross pay, before tax, USC, PRSI and pension deductions.',
  'Annual increments are not included: the figures show only what the deal adds to your current scale point.',
  'Local bargaining (1% on 1 March 2029) is left out of totals unless you switch it on. It is 1% of a bargaining unit’s pay bill, used as negotiated, so it may not reach you as a 1% rise.',
  'Amounts are worked out to the cent and shown in whole euros. Official pay scales may differ by about €1 because of rounding.',
  'Part-time pay is your full-time scale point times your FTE, so the flat minimums are pro-rated.',
  'Hourly rates for Assistant Lecturers are point 1 of the annual scale divided by 630 hours, which matches the 2026 pay circulars exactly.',
  'Back pay assumes the first rise is paid in the January 2027 payroll, with arrears from 1 September 2026. You can change the month.',
  'Prices use the Central Bank’s inflation forecasts for 2026 to 2028, as reported by RTÉ. 2029 is assumed to be 2%.',
  'TU Dublin academic staff are assumed to be on the same scales as staff in the former institutes of technology.',
];

export const SOURCES = [
  { id: 'rte-deal', publisher: 'RTÉ News', title: 'Public sector strike suspended as unions agree pay deal', date: '2026-11-11', url: 'https://www.rte.ie/news/ireland/2026/1111/1598773-public-sector-pay-deal/' },
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
  { id: 'tui-lb-dec2025', publisher: 'TUI', title: 'Consultation, parity of esteem and application of pay agreement increase required for professorships', date: '2025-12-16', url: 'https://www.tui.ie/press-releases/consultation-parity-of-esteem-and-application-of-pay-agreement-increase-required-for-professorships%E2%80%99.15414.html' },
];

export const UNION_LINKS = [
  { name: 'TUI', url: 'https://www.tui.ie/', note: 'The Teachers’ Union of Ireland represents academic staff in the technological universities.' },
  { name: 'ICTU Public Services Committee', url: 'https://www.ictu.ie/', note: 'The Irish Congress of Trade Unions brings together the public service unions.' },
];
