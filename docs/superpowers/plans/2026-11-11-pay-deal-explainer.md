# Pay Deal Explained Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a static, neutral explainer for the November 2026 draft Irish
public service pay deal, personalised for TU academic staff. It has nine animated or
interactive demos and a Present mode, and is designed for phones first. It is hosted
on GitHub Pages.

**Architecture:**
- The site is static and lives in `site/`: HTML, CSS, vanilla ES modules and
  hand-written SVG.
- Every fact lives in `site/js/data.js`. Every calculation lives in the pure module
  `site/js/pay.js`, which has no data or DOM imports.
- Each page section is a module that exports a pure `model(...)`, tested in Node, and
  a `render(root, ctx)`, checked in the browser.
- A tiny store shares the user's selection between sections.
- GitHub Actions runs the tests and deploys `site/` to Pages.

**Tech Stack:**
- HTML5 and CSS (custom properties, `prefers-color-scheme`, `prefers-reduced-motion`)
- JavaScript (ES2022 modules) and SVG
- Node ≥ 22 built-in test runner
- GitHub Actions and Pages

No npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-pay-deal-explainer-design.md`. Read it
before starting: §3 is the source of every fact and §4 of every rule.

## Global Constraints

- Static HTML, CSS and vanilla JavaScript (ES modules). No framework, no build step,
  no npm dependencies. Charts are hand-written SVG.
- No external requests at runtime: no analytics, cookies, third-party scripts or fonts.
  Use system font stacks: serif headlines `"Iowan Old Style", "Palatino Linotype",
  Palatino, Georgia, serif`; body `system-ui, -apple-system, "Segoe UI", Roboto, Arial,
  sans-serif`; money in `font-variant-numeric: tabular-nums`.
- **Gross pay only, and increments are excluded.** Results show only what the deal adds.
- **Neutral.**
  - No union voting recommendations, political or union positions, or quotes.
  - No union or Government logos.
  - "Your union's view" links to TUI and ICTU only.
- **Local bargaining.**
  - Totals exclude it by default (`SITE.includeLBDefault = false`).
  - It always appears as a separate "possible" step with a hatched bar.
  - One global switch includes it everywhere.
  - Exception: the compounding demo always shows 10.75% → 11.27% and 9.75% → 10.17%.
- **One source of facts.** All facts live in `site/js/data.js`. The `<noscript>` block in
  `site/index.html` must agree with it, and a test enforces this.
- **Sources and wording.**
  - Facts from news reports say "as reported", and every source is listed in
    section 11.
  - Irish/UK spelling.
  - Euro as `€1,200`. Cents only for hourly rates (`€75.51`).
  - Dates as `1 September 2026`.
- **Accessibility.**
  - WCAG 2.2 AA contrast.
  - Full keyboard use.
  - Every chart has `role="img"`, an `aria-label` summary and a data table inside a
    `<details>`.
  - `prefers-reduced-motion: reduce` shows final states with no animation.
- **Phone-first.** No horizontal page scroll at 320 px. Wide tables scroll inside their
  own container.
- **Size.** The whole `site/` folder must be under 500 KB.
- **Publishing.** Only `site/` is published.
- **Commits.** Every commit message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Local preview.** Run `python -m http.server 8123 --directory site` in the
  background, then open `http://localhost:8123/` in the browser pane.

## Review Focus

These are failure modes the spec implies but that no task's tests would otherwise
catch. Each now has a test in the task that owns it.

1. **Odd typed salaries.** Inputs such as "€58,000", "58000.50", "abc", "", "-5" and
   "2,000,000" are parsed leniently. An invalid value shows an inline message, the
   results keep the last valid value, and the screen never shows NaN, undefined or
   Infinity. Test in Task 4.
2. **Part-time and hourly extremes.** FTE inputs of 0, 150 and "47.5" are clamped to
   1–100%. Zero or blank hours still show hourly rates and ask for hours before showing
   back pay. Tests in Tasks 4 and 6.
3. **A stale or tampered saved selection** (unknown grade, point out of range, broken
   JSON, an older version) falls back to the example without crashing. Test in Task 4.
4. **Keyboard in Present mode.** While a slider, select or input has focus, the arrow
   keys change the control, not the chapter. Test in Task 10.
5. **Salaries outside the slider's range** (for example a typed €28,000 or €180,000)
   are clamped for the flat-or-percentage slider, and a note says so. Test in Task 5.

---

**Before Task 1 (execution start):**
1. Run `git init -b main` in the workspace root.
2. Commit the existing `docs/` (spec, mockups, this plan) as the initial commit.
3. Agree the working branch with the owner.
4. Task 11 merges that branch into `main` before the first push.

**Section registry**, used by every task. `index.html` has one mount per row, and each
module lives in `site/js/sections/`.

| n | element id | module | heading (h2) |
|---|---|---|---|
| 0 | `top` | `hero.js` | (h1, see Task 3) |
| 1 | `your-pay` | `your-pay.js` | Your pay |
| 2 | `nine-rises` | `staircase.js` | The nine pay rises |
| 3 | `flat-or-percent` | `flat-or-percent.js` | Flat sum or percentage? |
| 4 | `compounding` | `compounding.js` | Why 10.75% comes to about 11.3% |
| 5 | `back-pay` | `back-pay.js` | Your back pay |
| 6 | `pay-vs-prices` | `pay-vs-prices.js` | Pay vs prices |
| 7 | `vs-last-deal` | `vs-last-deal.js` | This deal vs the last one |
| 8 | `beyond-pay` | `beyond-pay.js` | Beyond pay |
| 9 | `timeline` | `timeline.js` | How we got here, what happens next |
| 10 | `glossary` | `glossary.js` | Plain-English glossary |
| 11 | `sources` | `sources.js` | Sources and assumptions |

**Section contract:** every section module exports
`render(root: HTMLElement, ctx: { store, data }): void`. Here `data` is
`import * as data from './data.js'` and `store` is the Task 3 store holding the
selection. Modules touch the DOM only inside `render`, so Node can import their
`model` functions.

---

### Task 1: Repository scaffold and data module

**Files:**
- Create: `package.json`, `.gitignore`, `README.md`, `site/js/data.js`
- Test: `tests/data.test.js`

**Interfaces:**
- Produces: `site/js/data.js` named exports:
  - `SITE`: `{ title: 'Pay Deal Explained', status: { state: 'draft', chip: 'Draft · ballot results due w/c 7 Dec', line: string }, lastUpdated: '2026-11-11', includeLBDefault: false, repoUrl: 'https://github.com/danielcregg/pay-deal-2026', issuesUrl: 'https://github.com/danielcregg/pay-deal-2026/issues' }`
  - `DEAL` and `PREVIOUS_DEAL`: `{ id, name, start, end, months, costBn, threshold, headlinePct, generalPct, lbPct, steps: Step[], sourceIds: string[], reviewClause: string }`
    - `DEAL` adds `{ budgets: 5, lowestPaidMaxPct: 18.3, minCumulativePct: 11.3, publishedExamples: { role: string, pct: number }[] }`, with the eight examples from spec §3.1.
    - `PREVIOUS_DEAL` adds `tuLbNote: string`, the TUI and June-2026-scales fact from spec §3.3.
  - `Step`: `{ id: string, date: 'YYYY-MM-DD', pct: number, min: number, kind: 'general' | 'lb' }`
  - `SCALES`: `{ effective: '2026-06-01', sourceId, hourlyDivisor: 630, grades: Grade[] }`
  - `Grade`: `{ id, name, group: 'current' | 'legacy', points: { label: string, value: number }[], hourly?: number }`
  - `INFLATION`: `{ from: '2026-07', to: '2029-03', rates: { 2026: 3.4, 2027: 3.1, 2028: 2, 2029: 2 }, assumedYears: [2029], current: 4, sourceId }`
  - `TIMELINE`: `{ date: 'YYYY-MM-DD', when: string, label: string, sourceId: string }[]`, sorted by date
  - `GLOSSARY`: `{ id, term, text }[]`
  - `BEYOND_PAY`: `{ id, title, status: 'known' | 'reported' | 'not-yet-published', text, sourceIds }[]`
  - `ASSUMPTIONS`: `string[]`
  - `SOURCES`: `{ id, publisher, title, date: 'YYYY-MM-DD' | 'YYYY', url: string | null }[]`
  - `UNION_LINKS`: `{ name, url, note }[]`

- [ ] **Step 1: Scaffold.**
  - Create `package.json`:
    `{ "name": "pay-deal-2026", "private": true, "type": "module", "engines": { "node": ">=22" }, "scripts": { "test": "node --test \"tests/**/*.test.js\"" } }`.
  - Create `.gitignore` listing `.superpowers/`, `.claude/`, `node_modules/` and
    `.DS_Store`.
  - Create `README.md` with a one-paragraph description and "Run tests: `npm test`".

- [ ] **Step 2: Write the failing test** `tests/data.test.js`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../site/js/data.js';
const g = (id) => D.SCALES.grades.find((x) => x.id === id);
const vals = (id) => g(id).points.map((p) => p.value);

test('draft deal steps match the reported schedule', () => {
  assert.deepEqual(D.DEAL.steps.map((s) => [s.date, s.pct, s.min, s.kind]), [
    ['2026-09-01', 2, 1200, 'general'], ['2027-04-01', 1, 0, 'general'],
    ['2027-08-01', 1, 600, 'general'], ['2027-11-01', 1.5, 900, 'general'],
    ['2028-03-01', 1, 0, 'general'], ['2028-06-01', 1, 600, 'general'],
    ['2028-10-01', 1, 0, 'general'], ['2029-03-01', 1, 0, 'lb'],
    ['2029-03-02', 1.25, 750, 'general']]);
  assert.deepEqual([D.DEAL.start, D.DEAL.end, D.DEAL.months, D.DEAL.costBn, D.DEAL.threshold],
    ['2026-07-01', '2029-03-31', 33, 5.2, 60000]);
});

test('previous deal steps match the official 2024–2026 text', () => {
  assert.deepEqual(D.PREVIOUS_DEAL.steps.map((s) => [s.date, s.pct, s.min, s.kind]), [
    ['2024-01-01', 2.25, 1125, 'general'], ['2024-06-01', 1, 0, 'general'],
    ['2024-10-01', 1, 500, 'general'], ['2025-03-01', 2, 1000, 'general'],
    ['2025-08-01', 1, 0, 'general'], ['2025-09-01', 1, 0, 'lb'],
    ['2026-02-01', 1, 500, 'general'], ['2026-06-01', 1, 0, 'general']]);
  assert.deepEqual([D.PREVIOUS_DEAL.months, D.PREVIOUS_DEAL.costBn, D.PREVIOUS_DEAL.threshold], [30, 3.6, 50000]);
});

test('percentages add up to the headlines', () => {
  const sum = (deal, kind) => deal.steps.filter((s) => s.kind === kind).reduce((a, s) => a + s.pct, 0);
  assert.deepEqual([sum(D.DEAL, 'general'), sum(D.DEAL, 'lb'), D.DEAL.headlinePct], [9.75, 1, 10.75]);
  assert.deepEqual([sum(D.PREVIOUS_DEAL, 'general'), sum(D.PREVIOUS_DEAL, 'lb'), D.PREVIOUS_DEAL.headlinePct], [9.25, 1, 10.25]);
});

test('every minimum breaks even exactly at its deal threshold', () => {
  for (const s of D.DEAL.steps.filter((s) => s.min)) assert.equal((s.min * 100) / s.pct, 60000);
  for (const s of D.PREVIOUS_DEAL.steps.filter((s) => s.min)) assert.equal((s.min * 100) / s.pct, 50000);
});

test('TU scales from Circular 002/2026 (1 June 2026)', () => {
  assert.deepEqual(D.SCALES.grades.map((x) => x.id), ['al-ne', 'al-pre', 'lect', 'sl1', 'sl2', 'sl3', 'ct', 'ls1', 'ls2']);
  assert.deepEqual(D.SCALES.grades.map((x) => x.group), ['current', 'current', 'current', 'current', 'current', 'current', 'legacy', 'legacy', 'legacy']);
  assert.deepEqual(vals('al-ne'), [47572, 50099, 52181, 54097, 56109, 57728, 59383, 61045, 62717, 64372]);
  assert.deepEqual(vals('al-pre'), [52181, 54097, 56109, 57728, 59383, 61045, 62717, 64372]);
  assert.deepEqual(vals('lect'), [69625, 72831, 84009, 86936, 89894, 92865, 95852, 98817, 101780, 104757, 107727]);
  assert.deepEqual(vals('sl1'), [94736, 97963, 101175, 104409, 107625, 110838, 114068, 117279]);
  assert.deepEqual(vals('sl2'), [97917, 100997, 104070, 107149, 110230, 113304, 116378, 119458, 122529, 125890]);
  assert.deepEqual(vals('sl3'), [105346, 109042, 112741, 116441, 120140, 123838, 127814, 131543, 135494]);
  assert.deepEqual(vals('ct'), [49046, 50945, 52876, 54847, 56912, 58971, 61050, 63154, 65827, 67975, 70126, 72943, 75760, 77976, 82943, 83943]);
  assert.deepEqual(vals('ls1'), [61991, 64939, 67351, 69796, 72859, 82064, 83471, 86138, 88849, 91566, 94290]);
  assert.deepEqual(vals('ls2'), [69625, 72831, 84009, 86936, 89894, 92865, 95852, 98817, 101780, 104757, 107727, 110594, 113460]);
  assert.deepEqual(g('ls2').points.slice(-2).map((p) => p.label), ['LSI 1', 'LSI 2']);
  assert.equal(g('lect').points[4].label, 'Point 5');
  for (const gr of D.SCALES.grades) gr.points.forEach((p, i, a) => i && assert.ok(p.value > a[i - 1].value, gr.id));
});

test('hourly rates equal point 1 ÷ 630 to the cent', () => {
  assert.equal(D.SCALES.hourlyDivisor, 630);
  assert.deepEqual([g('al-ne').hourly, g('al-pre').hourly], [75.51, 82.83]);
  for (const id of ['al-ne', 'al-pre']) assert.equal(Math.round((vals(id)[0] / 630) * 100) / 100, g(id).hourly);
});

test('inflation inputs, settings and union links', () => {
  assert.deepEqual(D.INFLATION.rates, { 2026: 3.4, 2027: 3.1, 2028: 2, 2029: 2 });
  assert.deepEqual([D.INFLATION.from, D.INFLATION.to, D.INFLATION.assumedYears], ['2026-07', '2029-03', [2029]]);
  assert.equal(D.SITE.includeLBDefault, false);
  assert.deepEqual(D.UNION_LINKS.map((u) => u.name), ['TUI', 'ICTU Public Services Committee']);
});

test('glossary, timeline and beyond-pay content is complete', () => {
  assert.deepEqual(D.GLOSSARY.map((x) => x.id), ['general-round', 'local-bargaining', 'lower-pay-threshold', 'minimum-payment', 'compounding', 'back-pay', 'review-clause', 'ballot', 'ratification', 'wrc', 'ictu-psc', 'increment', 'scale-point']);
  for (const x of D.GLOSSARY) assert.ok(x.text.length > 20, x.id);
  const dates = D.TIMELINE.map((e) => e.date);
  assert.deepEqual([...dates].sort(), dates);
  for (const d of ['2026-06-30', '2026-09-30', '2026-10-14', '2026-10-21', '2026-11-08', '2026-11-11', '2026-12-07']) assert.ok(dates.includes(d), d);
  assert.deepEqual(D.BEYOND_PAY.map((b) => b.id), ['local-bargaining', 'review-clause', 'ai-hybrid', 'education', 'reform']);
  for (const b of D.BEYOND_PAY) assert.ok(['known', 'reported', 'not-yet-published'].includes(b.status));
});

test('every referenced source exists', () => {
  const ids = new Set(D.SOURCES.map((s) => s.id));
  assert.equal(ids.size, D.SOURCES.length);
  const used = [...D.DEAL.sourceIds, ...D.PREVIOUS_DEAL.sourceIds, D.SCALES.sourceId, D.INFLATION.sourceId,
    ...D.TIMELINE.map((e) => e.sourceId), ...D.BEYOND_PAY.flatMap((b) => b.sourceIds)];
  for (const id of used) assert.ok(ids.has(id), id);
  for (const s of D.SOURCES) assert.ok(s.url === null || s.url.startsWith('https://'), s.id);
});
```

- [ ] **Step 3: Run the test to confirm it fails.**
  Run `npm test`. Expected: FAIL, with "Cannot find module" for `site/js/data.js`.

- [ ] **Step 4: Implement `site/js/data.js`.**
  - **Values.** Copy every value from spec §3 and §4: the steps, scales and point
    labels (`Point 1`…; the `ls2` extras are `LSI 1`/`LSI 2`), the timeline (spec
    §3.2) and the inflation figures.
  - **Grade names:**
    - `al-ne`: "Assistant Lecturer (joined 2011 or later)"
    - `al-pre`: "Assistant Lecturer (joined before 2011)"
    - `lect`: "Lecturer"
    - `sl1`: "Senior Lecturer I (Teaching)"
    - `sl2`: "Senior Lecturer II"
    - `sl3`: "Senior Lecturer III"
    - `ct`: "College Teacher"
    - `ls1`: "Lecturer Scale I"
    - `ls2`: "Lecturer Scale II (L2 grade)"
  - **`SOURCES`** must be exactly these. `date` is `YYYY-MM-DD`, or `YYYY` where only
    the year is known.

| id | publisher · title · date | url |
|---|---|---|
| `rte-deal` | RTÉ News · Public sector strike suspended as unions agree pay deal · 2026-11-11 | `https://www.rte.ie/news/ireland/2026/1111/1598773-public-sector-pay-deal/` |
| `rte-analysis` | RTÉ News · Inside the €5bn pay offer to public servants · 2026-11-10 | `https://www.rte.ie/news/2026/1110/1598605-public-pay-deal-analysis/` |
| `rte-revised` | RTÉ News · Public sector unions are considering a revised pay deal offer · 2026-11-10 | `https://www.rte.ie/news/ireland/2026/1110/1598619-pay-talks/` |
| `it-whats-in-it` | The Irish Times · Public sector pay deal: What's in it for me? · 2026-11-11 | `https://www.irishtimes.com/ireland/2026/11/11/public-sector-pay-deal-whats-in-it-for-me/` |
| `it-offer` | The Irish Times · Public sector workers offered pay increases worth 10.5% ahead of planned strikes · 2026-11-08 | `https://www.irishtimes.com/politics/2026/11/08/public-sector-workers-offered-pay-increases-worth-105-ahead-of-planned-strikes/` |
| `it-ballots-july` | The Irish Times · Public sector unions preparing for possible industrial action ballots over pay talks · 2026-07-03 | `https://www.irishtimes.com/business/work/2026/07/03/public-sector-unions-preparing-for-possible-industrial-action-ballots-over-pay-talks/` |
| `indo-explainer` | Irish Independent · Explainer: Public sector reaches pay deal, so what are some of the key measures agreed? · 2026-11-11 | `null` (owner may add later) |
| `psa-2024` | Government of Ireland · Public Service Agreement 2024–2026 (copy hosted by MTU) · 2024 | `https://finance.mtu.ie/contentFiles/circulars/Public_Service_Pay_Agreement_2024-2026.pdf` |
| `circular-002-2026` | Dept. of Further and Higher Education · TU-IOT Circular 002/2026, pay from 1 June 2026, appendix (copy hosted by DkIT) · 2026 | `https://www.dkit.ie/system/files/2026-06/TU-IOT-Circular-002_2026-Revision-of-Pay-for-the-Higher-Education-Sector-with-effect-from-1st-June-2026-Appendix.pdf` |
| `circular-001-2026` | Dept. of Further and Higher Education · TU-IOT Circular 001/2026, pay from 1 February 2026 (copy hosted by TUI) · 2026 | `https://www.tui.ie/_fileupload/tu-iot-circular-001-2026-revision-of-pay-for-the-higher-education-sector-with-effect-from-1st-february-2026.pdf` |
| `tui-scales` | TUI · Third level salary scales · 2026 | `https://www.tui.ie/third-level-pay-pensions/third-level-salary-scales-.2167.html` |
| `tui-lb-dec2025` | TUI · Consultation, parity of esteem and application of pay agreement increase required for professorships · 2025-12-16 | `https://www.tui.ie/press-releases/consultation-parity-of-esteem-and-application-of-pay-agreement-increase-required-for-professorships%E2%80%99.15414.html` |

  - **`sourceIds` and `sourceId`:**
    - `DEAL`: `rte-deal`, `it-whats-in-it`, `indo-explainer`
    - `PREVIOUS_DEAL`: `psa-2024`, `rte-analysis`, `tui-lb-dec2025`, `circular-001-2026`,
      `circular-002-2026`
    - `SCALES`: `circular-002-2026`
    - `INFLATION`: `rte-analysis`
    - `BEYOND_PAY`: every entry includes `rte-deal`; local bargaining also cites
      `psa-2024`.
    - **Timeline:**
      - 30 Jun: `psa-2024`
      - 3 Jul (when "3 July 2026"): `it-ballots-july`
      - 30 Sep, 14 Oct, 21 Oct: `indo-explainer`
      - talks breaking down: `date: '2026-10-22'`, when "After 21 October 2026",
        `indo-explainer`
      - 8 Nov: `it-offer`
      - 10 Nov: `rte-revised`
      - 11 Nov and 7 Dec: `rte-deal`
      - `2027-01-01` (when "January 2027"): `it-whats-in-it`
  - **`SITE.status.line`:** "Draft agreed on 11 November 2026. Not final until union
    members vote; results are due in the week of 7 December 2026."
  - **`UNION_LINKS`:**
    - `{ name: 'TUI', url: 'https://www.tui.ie/' }`
    - `{ name: 'ICTU Public Services Committee', url: 'https://www.ictu.ie/' }`
  - **`ASSUMPTIONS`:** one plain sentence each, from spec §4 rules 2–8 and §3.5 (TU
    Dublin).
  - **Copy for the glossary, timeline and beyond-pay entries:** your wording, written to
    spec §8.

- [ ] **Step 5: Run the test to confirm it passes.**
  Run `npm test`. Expected: all 9 tests pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore README.md site/js/data.js tests/data.test.js
git commit -m "feat: add data module with deal, scales and sources" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pay engine

**Files:**
- Create: `site/js/pay.js` (pure; imports nothing)
- Test: `tests/pay.test.js`

**Interfaces:**
- Consumes: `Step` shape (Task 1).
- Produces (all named exports):
  - `applySteps(start: number, steps: Step[], opts?: { includeLB?: boolean = false, upTo?: 'YYYY-MM-DD' }): Row[]`
    - `Row = { n: number /* 1-based position in steps */, step, before, rise, after, flat: boolean, included: boolean, potential: number }`
    - Steps dated after `upTo` (inclusive bound) are omitted.
    - An excluded `lb` step has `included: false`, `rise: 0`, `after = before`, `potential = before × pct / 100`.
    - Otherwise `rise = max(before × pct / 100, min)`, `flat = min > before × pct / 100`, and `potential = rise`.
  - `finalSalary(start, steps, opts): number`
  - `summarise(start, steps, opts): { start, end, euro, pct, flatSteps: number[], floorSteps: number[] }`. Here `pct` is a percent (10.17 means 10.17%); `floorSteps` are the included steps with `min > 0`; `flatSteps` are those where the minimum won.
  - `compoundFactor(steps, { includeLB = false } = {}): number`: the product of `(1 + pct/100)`, ignoring minimums.
  - `headlinePct(steps, { includeLB = false } = {}): number`: the sum of the included `pct`.
  - `thresholdOf(step): number | null`: `min × 100 / pct`, or `null` when `min` is 0.
  - `backPay(start, steps, { payMonth = '2027-01', includeLB = false } = {}): { items: { month: 'YYYY-MM', amount: number }[], total: number }`
  - `payIndexSeries(start, steps, { from: 'YYYY-MM', to: 'YYYY-MM', includeLB = false }): { month: 'YYYY-MM', value: number }[]`
  - `priceIndexSeries({ from, to, rates?: Record<number, number>, flatRate?: number | null }): { month, value }[]`
  - `monthsPricesAhead(pay, price): string[]`

- [ ] **Step 1: Write the failing test** `tests/pay.test.js`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL, PREVIOUS_DEAL, INFLATION } from '../site/js/data.js';
import { applySteps, finalSalary, summarise, compoundFactor, headlinePct, thresholdOf, backPay,
  payIndexSeries, priceIndexSeries, monthsPricesAhead } from '../site/js/pay.js';
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const S = DEAL.steps;

test('reference salaries, with and without local bargaining', () => {
  near(finalSalary(89894, S, { includeLB: true }), 100027.68);
  near(finalSalary(89894, S), 99037.31);
  near(finalSalary(47572, S, { includeLB: true }), 53659.85);
  near(finalSalary(47572, S), 53135.99);
  near(finalSalary(58000, S, { includeLB: true }), 64584.15);
  near(finalSalary(58000, S), 63944.71);
  near(finalSalary(30000, S), 35031.54);
});

test('flat minimum vs percentage at each step', () => {
  assert.deepEqual(summarise(58000, S).flatSteps, [1, 3]);
  assert.deepEqual(summarise(58000, S).floorSteps, [1, 3, 4, 6, 9]);
  assert.deepEqual(summarise(47572, S).flatSteps, [1, 3, 4, 6, 9]);
  assert.deepEqual(summarise(89894, S).flatSteps, []);
  const r = applySteps(60000, S)[0];
  assert.deepEqual([r.rise, r.flat], [1200, false]);
});

test('excluded local bargaining is reported as a possible step', () => {
  const lb = applySteps(89894, S)[7];
  assert.deepEqual([lb.n, lb.included, lb.rise, lb.after === lb.before], [8, false, 0, true]);
  near(lb.potential, 978.15);
  assert.equal(applySteps(89894, S, { upTo: '2026-09-01' }).length, 1);
});

test('compounding and headline sums', () => {
  near(compoundFactor(S, { includeLB: true }), 1.112729, 1e-6);
  near(compoundFactor(S), 1.101712, 1e-6);
  near(compoundFactor(PREVIOUS_DEAL.steps), 1.096151, 1e-6);
  near(compoundFactor(PREVIOUS_DEAL.steps, { includeLB: true }), 1.107112, 1e-6);
  assert.deepEqual([headlinePct(S, { includeLB: true }), headlinePct(S)], [10.75, 9.75]);
  assert.deepEqual(S.map(thresholdOf), [60000, null, 60000, 60000, null, 60000, null, null, 60000]);
});

test('previous deal reproduces the 2026 circulars within €1', () => {
  const only = (date) => PREVIOUS_DEAL.steps.filter((s) => s.date === date);
  assert.equal(applySteps(46601, only('2026-02-01'))[0].rise, 500);
  near(applySteps(51153, only('2026-02-01'))[0].after, 51664, 1);
  near(applySteps(47101, only('2026-06-01'))[0].after, 47572, 1);
  near(finalSalary(89894, PREVIOUS_DEAL.steps), 98537.39);
  near(finalSalary(89894, PREVIOUS_DEAL.steps, { includeLB: true }), 99522.77);
});

test('back pay accrues from September to the pay month', () => {
  const jan = backPay(89894, S);
  assert.deepEqual(jan.items.map((i) => i.month), ['2026-09', '2026-10', '2026-11', '2026-12']);
  near(jan.total, 599.29);
  near(backPay(89894, S, { payMonth: '2027-02' }).total, 749.12);
  near(backPay(89894, S, { payMonth: '2027-03' }).total, 898.94);
  near(backPay(47572, S).total, 400);
});

test('pay vs prices from July 2026 to March 2029', () => {
  const span = { from: INFLATION.from, to: INFLATION.to };
  const pay = payIndexSeries(100000, S, span);
  const price = priceIndexSeries({ ...span, rates: INFLATION.rates });
  assert.equal(pay.length, 33);
  assert.deepEqual([pay[0].month, pay[0].value, pay[2].value], ['2026-07', 100, 102]);
  near(pay.at(-1).value, 110.1712, 1e-4);
  near(price.at(-1).value, 107.4655, 1e-4);
  assert.deepEqual(monthsPricesAhead(pay, price), ['2026-07', '2026-08', '2027-02', '2027-03', '2027-06', '2027-07', '2027-10']);
  assert.deepEqual(monthsPricesAhead(payIndexSeries(47572, S, span), price), ['2026-07', '2026-08']);
  near(payIndexSeries(100000, S, { ...span, includeLB: true }).at(-1).value, 111.2729, 1e-4);
  near(priceIndexSeries({ ...span, flatRate: 6 }).at(-1).value, 117.3792, 1e-4);
  near(priceIndexSeries({ ...span, flatRate: 0 }).at(-1).value, 100, 1e-9);
});
```

- [ ] **Step 2: Run the test to confirm it fails.**
  Run `npm test`. Expected: `tests/pay.test.js` FAILs with "Cannot find module", and
  `tests/data.test.js` still passes.

- [ ] **Step 3: Implement the exports in `site/js/pay.js`.**
  - **Series values** are measured at the end of each month: the salary in effect on
    the last day of month M, divided by `start`, times 100. So March 2029 includes both
    1 March and 2 March.
  - **Price index:** month M is
    `100 × Π (1 + r(year(m)) / 100)^(1/12)` over the months m from `from` to M
    inclusive. `flatRate` replaces `r` whenever it is a number.
  - **Back pay:** for each included step dated before the first day of `payMonth`, each
    month from the step's month up to, but not including, `payMonth` accrues
    `rise / 12`. Sum the amounts by month.

- [ ] **Step 4: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add site/js/pay.js tests/pay.test.js
git commit -m "feat: add pure pay engine with reference-value tests" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Page shell, styles, hero and no-JavaScript facts

**Files:**
- Create:
  - `site/index.html`
  - `site/css/base.css`
  - `site/js/format.js`
  - `site/js/state.js`
  - `site/js/motion.js`
  - `site/js/svg.js`
  - `site/js/main.js`
  - `site/js/sections/hero.js`
- Test:
  - `tests/format.test.js`
  - `tests/state.test.js`
  - `tests/svg.test.js`
  - `tests/noscript.test.js`

**Interfaces:**
- Consumes: `data.js` (Task 1).
- Produces:
  - `format.js`:
    - `eur(n, { cents = false } = {}): string`
    - `signedEur(n, opts): string`
    - `pct(n, dp = 1): string`
    - `longDate('YYYY-MM-DD'): string`
    - `monthLabel('YYYY-MM'): string`
    - `listSteps(ns: number[]): string`
  - `state.js`: `createStore(initial: object): { get(): object, set(patch: object): void, subscribe(fn: (state) => void): () => void }`
  - `motion.js`:
    - `prefersReducedMotion(): boolean`, which returns false when `matchMedia` is missing
    - `onFirstView(el, fn): void`, using IntersectionObserver at threshold 0.35, or calling `fn` at once when IntersectionObserver is unavailable
  - `svg.js`:
    - `svgEl(tag, attrs = {}, children = []): SVGElement`
    - `scaleLinear([d0, d1], [r0, r1]): (x) => number`
  - `index.html`: a mount `<div data-mount="{id}">` inside each registry section; every chapter section has `class="chapter"` and `data-chapter="{n}"`.
  - `main.js`:
    - creates `store = createStore(selection)`, with `selection = {}` until Task 4
    - calls each registered section's `render(root, { store, data })`
    - each later task adds one import and one registry entry

- [ ] **Step 1: Write the failing tests**

```js
// tests/format.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { eur, signedEur, pct, longDate, monthLabel, listSteps } from '../site/js/format.js';
test('formatting', () => {
  assert.deepEqual([eur(1200), eur(99037.31), eur(75.5111, { cents: true }), signedEur(1797.88)], ['€1,200', '€99,037', '€75.51', '+€1,798']);
  assert.deepEqual([pct(11.2729), pct(10.1712, 2), longDate('2029-03-02'), monthLabel('2026-09')], ['11.3%', '10.17%', '2 March 2029', 'Sep 2026']);
  assert.deepEqual([listSteps([1]), listSteps([1, 3]), listSteps([1, 3, 4, 6, 9])], ['step 1', 'steps 1 and 3', 'steps 1, 3, 4, 6 and 9']);
});

// tests/state.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../site/js/state.js';
test('store merges patches and notifies subscribers until unsubscribed', () => {
  const s = createStore({ a: 1, b: 2 }); const seen = [];
  const off = s.subscribe((st) => seen.push(st.a));
  s.set({ a: 5 }); off(); s.set({ a: 9 });
  assert.deepEqual([seen, s.get()], [[5], { a: 9, b: 2 }]);
});

// tests/svg.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleLinear } from '../site/js/svg.js';
test('linear scale maps and inverts direction', () => {
  const y = scaleLinear([100, 110], [200, 0]);
  assert.deepEqual([y(100), y(105), y(110)], [200, 100, 0]);
});

// tests/noscript.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SITE, DEAL } from '../site/js/data.js';
import { longDate, eur } from '../site/js/format.js';
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const block = html.split('<noscript>')[1]?.split('</noscript>')[0] ?? '';
test('noscript facts match data.js', () => {
  assert.ok(block.includes(SITE.status.line));
  for (const s of DEAL.steps) {
    assert.ok(block.includes(longDate(s.date)), s.date);
    assert.ok(block.includes(s.kind === 'lb' ? 'Local bargaining (1%)' : `${s.pct}%`), s.id);
    if (s.min) assert.ok(block.includes(eur(s.min)), s.id);
  }
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  Run `npm test`. Expected: the four new files FAIL, with "Cannot find module" or a
  missing `index.html`.

- [ ] **Step 3: Implement the five modules** `format.js`, `state.js`, `motion.js`,
  `svg.js` and `sections/hero.js`, with the signatures above. `eur` rounds to whole
  euros unless `cents` is set.

- [ ] **Step 4: Create `site/index.html`.**
  - **Head:** `lang="en-IE"`; meta description and viewport; `<title>`
    "Pay Deal Explained: the draft public service pay deal for TU lecturers"; link
    `css/base.css`; `<script type="module" src="js/main.js">`.
  - **Header:** the site name, `<span data-bind="status-chip">`, a
    `<button data-action="present">▶ Present</button>` (wired in Task 10) and
    `<span data-bind="last-updated">`.
  - **Hero section** `id="top"`: h1 "10.75% over 33 months: what the draft deal means
    for TU lecturers", four stat tiles (10.75% · 33 months · 9 rises · €60k threshold)
    and `<p data-bind="status-line">`.
  - **The 11 chapter sections** from the registry, each with a small chapter number,
    the h2 and an empty `data-mount`.
  - **`<noscript>`:** `SITE.status.line`, a table of the nine steps (date, rise,
    minimum or "—"), and "Turn on JavaScript to use the calculator and demos."
  - **Footer:** "Unofficial and independent explainer" and the last-updated date.

- [ ] **Step 5: Create `site/css/base.css`.**
  - **Tokens on `:root`:**

| Token | Light | Dark |
|---|---|---|
| `--paper` | `#fbfaf7` | `#12161f` |
| `--ink` | `#1d2433` | `#ecebe6` |
| `--muted` | `#5b6475` | `#a3aab8` |
| `--line` | `#e4e1d8` | `#2a3140` |
| `--card` | `#ffffff` | `#1a2030` |
| `--teal` | `#0f766e` | `#3fb3a2` |
| `--teal-soft` | `#d1efe9` | `#12322e` |
| `--amber` | `#b45309` | `#f0b46a` |
| `--amber-soft` | `#fdecc8` | `#3a2a12` |
| `--red` | `#b42318` | `#f28b82` |

  - Dark values go under `@media (prefers-color-scheme: dark)`.
  - **Layout and type:** a 720 px reading column, with demos up to 960 px. A 16 px side
    gutter on phones. The fonts from Global Constraints. `.visually-hidden`. Focus
    rings. The `.table-scroll` wrapper.
  - **Reduced motion:** inside `@media (prefers-reduced-motion: reduce)`, set
    animations and transitions to `none`.

- [ ] **Step 6: Implement `site/js/main.js`.**
  - Bind `SITE` to the status chip, status line and last-updated elements, the last
    as `longDate`.
  - Render the hero, whose tiles count up once via `onFirstView` with no animation when
    `prefersReducedMotion()`.
  - Keep a `SECTIONS` registry array for later tasks.

- [ ] **Step 7: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 8: Check in the browser.**
  - Start the local preview (Global Constraints) and open it.
  - **Expected:**
    - the header shows "Pay Deal Explained" and "Draft · ballot results due w/c 7 Dec"
    - the hero tiles show 10.75%, 33, 9 and €60k
    - the 11 h2 headings appear in registry order
    - there are no console errors
    - at 320 px width there is no horizontal scroll
    - dark mode (browser pane `colorScheme: dark`) is readable

- [ ] **Step 9: Commit**

```bash
git add site/index.html site/css/base.css site/js tests
git commit -m "feat: page shell, hero, formatting, store and noscript facts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Your pay (section 1)

**Files:**
- Create:
  - `site/js/selection.js`
  - `site/js/sections/your-pay.js`
  - `site/css/demos.css`, linked from `index.html`
- Modify: `site/js/main.js`, which now builds the store from `restoreSelection(localStorage)` and calls `saveSelection` on change
- Test: `tests/selection.test.js`, `tests/your-pay.test.js`

**Interfaces:**
- Consumes:
  - `SCALES`, `DEAL` and `SITE` (Task 1)
  - `finalSalary`, `applySteps`, `summarise` and `backPay` (Task 2)
  - `format.js` and `createStore` (Task 3)
- Produces:
  - `selection.js`:
    - `STORAGE_KEY = 'pde:selection:v1'`
    - `DEFAULT_SELECTION = { touched: false, contract: 'full', gradeId: 'lect', pointIndex: 4, typed: null, fte: 1, alScale: 'al-ne', hoursPerYear: 0, includeLB: false, payMonth: '2027-01' }`
    - `parseSalary(input: string): { ok: true, value: number } | { ok: false, error: string }`
    - `clampFte(input: number | string): number`, a fraction from 0.01 to 1
    - `resolvePay(sel, scales): { base, factor, annualFactor, unit: 'year' | 'hour', label, isExample }`
    - `restoreSelection(raw: string | null, scales): selection`
      - It merges the parsed object over `DEFAULT_SELECTION`, then validates the
        contract, grade, point range, FTE and `payMonth` (one of `2027-01`, `2027-02`,
        `2027-03`).
      - A valid result gets `touched: true`. Anything invalid or unparseable returns
        `DEFAULT_SELECTION`. It never throws.
    - `saveSelection(sel): void`, which wraps localStorage in try/catch
  - The `contract` and `gradeId` options:
    - `contract`: `'full' | 'part' | 'hourly'`
    - `gradeId`: a grade id, or `'typed'`
  - The `resolvePay` fields:
    - `base`: the full-time annual salary the deal is applied to
    - `factor`: multiplies engine euros into displayed amounts. It is 1 for full-time,
      `fte` for part-time and `1/630` for hourly, so the display is an hourly rate.
    - `annualFactor`: 1, `fte`, or `hoursPerYear/630`
  - `sections/your-pay.js`: `model(sel, data): { unit, label, isExample, now, endGeneral, endWithLB, pctGeneral, pctWithLB, firstRise: { date, amount }, backPay: number | null, flatSteps: number[], explanation: string }` and `render`.
    - `backPay` is `null` when `annualFactor === 0`.
    - `pctGeneral` and `pctWithLB` are percents.

- [ ] **Step 1: Write the failing tests**

```js
// tests/selection.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCALES } from '../site/js/data.js';
import { DEFAULT_SELECTION, parseSalary, clampFte, resolvePay, restoreSelection } from '../site/js/selection.js';
test('salary parsing is lenient but safe (Review Focus 1)', () => {
  assert.deepEqual(parseSalary('€58,000'), { ok: true, value: 58000 });
  assert.deepEqual(parseSalary(' 58000.50 '), { ok: true, value: 58000.5 });
  for (const bad of ['abc', '', '-5', '0', '2,000,000']) assert.equal(parseSalary(bad).ok, false, bad);
});
test('FTE is clamped to 1–100% (Review Focus 2)', () => {
  assert.deepEqual([clampFte(0), clampFte(150), clampFte('47.5'), clampFte('x')], [0.01, 1, 0.475, 1]);
});
test('saved selections are validated (Review Focus 3)', () => {
  for (const raw of [null, 'not json', '{"gradeId":"nope"}', '{"gradeId":"lect","pointIndex":99}', '{"contract":"weird"}'])
    assert.deepEqual(restoreSelection(raw, SCALES), DEFAULT_SELECTION, String(raw));
  const ok = restoreSelection(JSON.stringify({ ...DEFAULT_SELECTION, gradeId: 'al-ne', pointIndex: 0 }), SCALES);
  assert.deepEqual([ok.gradeId, ok.touched], ['al-ne', true]);
});
test('resolvePay covers full-time, part-time, typed and hourly', () => {
  assert.deepEqual(resolvePay(DEFAULT_SELECTION, SCALES), { base: 89894, factor: 1, annualFactor: 1, unit: 'year', label: 'Lecturer, point 5', isExample: true });
  const pt = resolvePay({ ...DEFAULT_SELECTION, touched: true, contract: 'part', fte: 0.5 }, SCALES);
  assert.deepEqual([pt.base, pt.factor, pt.isExample], [89894, 0.5, false]);
  assert.equal(resolvePay({ ...DEFAULT_SELECTION, gradeId: 'typed', typed: 58000 }, SCALES).base, 58000);
  const h = resolvePay({ ...DEFAULT_SELECTION, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 315 }, SCALES);
  assert.deepEqual([h.base, h.unit, h.factor, h.annualFactor], [47572, 'hour', 1 / 630, 0.5]);
});

// tests/your-pay.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { DEFAULT_SELECTION as D0 } from '../site/js/selection.js';
import { model } from '../site/js/sections/your-pay.js';
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
test('example lecturer, local bargaining off by default', () => {
  const m = model(D0, data);
  near(m.now, 89894); near(m.endGeneral, 99037.31); near(m.endWithLB, 100027.68);
  near(m.pctGeneral, 10.17); near(m.pctWithLB, 11.27); near(m.firstRise.amount, 1797.88); near(m.backPay, 599.29);
  assert.deepEqual([m.isExample, m.flatSteps, m.firstRise.date], [true, [], '2026-09-01']);
  assert.match(m.explanation, /percentages/);
});
test('assistant lecturer, typed, part-time and hourly', () => {
  assert.deepEqual(model({ ...D0, gradeId: 'al-ne', pointIndex: 0 }, data).flatSteps, [1, 3, 4, 6, 9]);
  assert.match(model({ ...D0, gradeId: 'typed', typed: 58000 }, data).explanation, /steps 1 and 3/);
  near(model({ ...D0, contract: 'part', fte: 0.5 }, data).endGeneral, 49518.65);
  const h = model({ ...D0, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 0 }, data);
  near(h.now, 75.5111, 1e-4); near(h.endGeneral, 84.3428, 1e-4);
  assert.deepEqual([h.unit, h.backPay], ['hour', null]);
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  Run `npm test`. Expected: the two new files FAIL with "Cannot find module".

- [ ] **Step 3: Implement `selection.js` and `your-pay.js`** with the signatures above.
  - **Labels:**
    - `"{grade name}, point {n}"`
    - `"Typed salary"`
    - `"Hourly-paid {grade name}"`
    - LSI points use their own label, for example `"Lecturer Scale II (L2 grade), LSI 1"`.
  - **Explanation:**
    - With no flat steps: "All the rises are percentages for you: your salary is above
      €60,000 at every step."
    - Otherwise: "The flat minimum beat the percentage at {listSteps}, because your pay
      was below €60,000 at the time."
  - **`parseSalary`:**
    - strips `€`, commas and spaces
    - rejects values that are not numbers, are 0 or below, or exceed 500,000

- [ ] **Step 4: Render the section.**
  - **Controls, all labelled:**
    - a contract radio group (Full-time / Part-time / Hourly-paid)
    - a grade `<select>` with optgroups "Current grades" and "Other or legacy scales",
      plus "Type my salary"
    - a point `<select>` whose options read "Point 1 · €47,572"
    - a typed input with an inline error message
    - an FTE % input, shown for part-time
    - an AL-scale radio and an hours-per-year input, shown for hourly
    - the switch "Count local bargaining (1% on 1 March 2029) as a rise for me"
  - **Outputs:**
    - now → end, for the active totals
    - a second line with the alternative total, "+€991 more if local bargaining
      reaches you as a 1% rise", or the reverse when the switch is on
    - the first rise
    - back pay, labelled gross and "if accepted"
    - the explanation
    - an "Example: pick your own above" badge when `isExample`
    - "Your salary stays on this device"
    - a "Reset" link
  - **State:** every change calls `store.set({ ...patch, touched: true })`.

- [ ] **Step 5: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 6: Check in the browser.** Expected results:
  - the default shows "€89,894 → €99,037" and the "+€991 more" line
  - choosing Assistant Lecturer (joined 2011 or later), point 1, shows €53,136 and
    "steps 1, 3, 4, 6 and 9"
  - typing "abc" shows the error and leaves the figures unchanged
  - after a reload the choice is restored
  - there are no console errors

- [ ] **Step 7: Commit**

```bash
git add site tests
git commit -m "feat: your-pay calculator with grades, part-time and hourly" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The nine pay rises and Flat sum or percentage? (sections 2 and 3)

**Files:**
- Create: `site/js/sections/staircase.js`, `site/js/sections/flat-or-percent.js`
- Modify: `site/css/demos.css`, `site/js/main.js`
- Test: `tests/staircase.test.js`, `tests/flat-or-percent.test.js`

**Interfaces:**
- Consumes:
  - `applySteps` and `summarise` (Task 2)
  - `resolvePay` (Task 4)
  - `format.js`, `motion.js` and `svg.js` (Task 3)
- Produces:
  - `staircase.js`:
    - `model(base, steps, { includeLB }): { bars: { n, month, rise, cumulative, potential, kind: 'pct' | 'flat' | 'lb' | 'lb-possible' }[], total, totalWithLB }`
    - `render`
  - `flat-or-percent.js`:
    - `SLIDER = { min: 30000, max: 140000, step: 500 }`
    - `sliderStart(salary): number`
    - `model(salary, steps, { includeLB }): { rows: { n, date, rule, rise, tag: 'flat' | 'pct' | null, included }[], end, pct, flatCount, floorCount }`
    - `render`

- [ ] **Step 1: Write the failing tests**

```js
// tests/staircase.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL } from '../site/js/data.js';
import { model } from '../site/js/sections/staircase.js';
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
test('lecturer bars, local bargaining shown as possible', () => {
  const m = model(89894, DEAL.steps, { includeLB: false });
  assert.deepEqual(m.bars.map((b) => b.kind), ['pct', 'pct', 'pct', 'pct', 'pct', 'pct', 'pct', 'lb-possible', 'pct']);
  near(m.bars[7].potential, 978.15); near(m.total, 9143.31); near(m.totalWithLB, 10133.68);
  assert.equal(m.bars[0].month, '2026-09');
});
test('assistant lecturer bars show the flat minimums', () => {
  assert.deepEqual(model(47572, DEAL.steps, { includeLB: true }).bars.map((b) => b.kind),
    ['flat', 'pct', 'flat', 'flat', 'pct', 'flat', 'pct', 'lb', 'flat']);
});

// tests/flat-or-percent.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL } from '../site/js/data.js';
import { model, sliderStart } from '../site/js/sections/flat-or-percent.js';
test('€58,000: flat sums win at two of five steps', () => {
  const m = model(58000, DEAL.steps, { includeLB: false });
  assert.deepEqual([m.flatCount, m.floorCount], [2, 5]);
  assert.deepEqual(m.rows.map((r) => r.tag), ['flat', null, 'flat', 'pct', null, 'pct', null, null, 'pct']);
  assert.deepEqual([m.rows[0].rule, m.rows[1].rule, m.rows[7].rule, m.rows[7].included], ['2% or €1,200', '1%', 'Local bargaining (1%)', false]);
  assert.ok(Math.abs(m.end - 63944.71) <= 0.01);
});
test('slider start is clamped and rounded (Review Focus 5)', () => {
  assert.deepEqual([sliderStart(28000), sliderStart(180000), sliderStart(89894)], [30000, 140000, 90000]);
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  Run `npm test`. Expected: the two new files FAIL.

- [ ] **Step 3: Implement both models** with the signatures above. `bars[i].month` is
  the step date's `YYYY-MM`. `cumulative` is the running sum of included rises.

- [ ] **Step 4: Render both sections.**
  - **Staircase:**
    - an SVG of nine bars, each `cumulative` high, with the new rise in teal (pct) or
      amber (flat)
    - a possible local-bargaining step drawn hatched, at its `potential`, on top of the
      previous bar
    - bars grow in sequence, 200 ms apart, on `onFirstView`
    - a Replay button
    - tap or hover shows the date, the rule and the euros
    - a `<details>` data table
  - **Flat sum or percentage?:**
    - a range input using `SLIDER`, starting at `sliderStart(resolvePay(...).base)`,
      with a note when the user's salary was clamped
    - a €60k marker
    - the live nine-row table
    - the published examples from `DEAL.publishedExamples`, as reported
  - **Both** re-render on store change.

- [ ] **Step 5: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 6: Check in the browser.** Expected results:
  - the staircase animates once on scroll, and Replay works
  - the hatched bar 8 turns solid when the switch is on
  - at the default €89,894 the slider starts at €90,000
  - dragging to €58,000 shows 2 flat and 3 percentage tags
  - there are no console errors

- [ ] **Step 7: Commit**

```bash
git add site tests
git commit -m "feat: nine-rises staircase and flat-or-percentage demo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Compounding and Your back pay (sections 4 and 5)

**Files:**
- Create: `site/js/sections/compounding.js`, `site/js/sections/back-pay.js`
- Modify: `site/css/demos.css`, `site/js/main.js`
- Test: `tests/compounding.test.js`, `tests/back-pay.test.js`

**Interfaces:**
- Consumes:
  - `compoundFactor`, `headlinePct` and `backPay` (Task 2)
  - `resolvePay` (Task 4)
- Produces:
  - `compounding.js`: `model(steps): { withLB: { sum, compounded, blocks: { n, pct, add, total }[] }, general: { sum, compounded } }`, with everything on a base of 100 and minimums ignored. `compounded` is a percent.
  - `back-pay.js`: `model(sel, data): { items: { month, amount }[], total, payMonth, needsHours: boolean }`. Amounts are multiplied by `annualFactor`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/compounding.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL } from '../site/js/data.js';
import { model } from '../site/js/sections/compounding.js';
const near = (a, b, t = 1e-4) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
test('headline sums vs compounded totals', () => {
  const m = model(DEAL.steps);
  assert.deepEqual([m.withLB.sum, m.general.sum], [10.75, 9.75]);
  near(m.withLB.compounded, 11.2729); near(m.general.compounded, 10.1712);
  near(m.withLB.blocks[0].add, 2); near(m.withLB.blocks[1].add, 1.02); near(m.withLB.blocks[8].total, 111.2729);
});

// tests/back-pay.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { DEFAULT_SELECTION as D0 } from '../site/js/selection.js';
import { model } from '../site/js/sections/back-pay.js';
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
test('back pay by pay month, part-time and hourly (Review Focus 2)', () => {
  const m = model(D0, data);
  assert.deepEqual(m.items.map((i) => i.month), ['2026-09', '2026-10', '2026-11', '2026-12']);
  near(m.total, 599.29);
  near(model({ ...D0, payMonth: '2027-03' }, data).total, 898.94);
  near(model({ ...D0, contract: 'part', fte: 0.5 }, data).total, 299.65);
  assert.deepEqual([model({ ...D0, contract: 'hourly', hoursPerYear: 0 }, data).needsHours, model({ ...D0, contract: 'hourly', hoursPerYear: 0 }, data).total], [true, 0]);
  near(model({ ...D0, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 315 }, data).total, 200);
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  Run `npm test`. Expected: the two new files FAIL.

- [ ] **Step 3: Implement both models** with the signatures above.

- [ ] **Step 4: Render both sections.**
  - **Compounding:**
    - nine blocks stack one at a time, each sized to `add`
    - two counters run side by side: "Adding up the percentages: 10.75%" and
      "What your pay actually gains: 11.27%"
    - a line beneath gives the without-local-bargaining pair (9.75% → 10.17%)
    - a Replay button
  - **Back pay:**
    - four month tiles, September to December 2026, fill in turn, then merge into one
      lump-sum tile in the chosen month
    - a pay-month select (January, February or March 2027)
    - the copy says "gross" and "if the deal is accepted"
    - with `needsHours`, the tiles are replaced by a prompt to enter hours in section 1

- [ ] **Step 5: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 6: Check in the browser.** Expected results:
  - the counters end on 10.75% and 11.27%
  - back pay shows €599 for January and €899 for March
  - there are no console errors

- [ ] **Step 7: Commit**

```bash
git add site tests
git commit -m "feat: compounding and back-pay demos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Pay vs prices (section 6)

**Files:**
- Create: `site/js/sections/pay-vs-prices.js`
- Modify: `site/css/demos.css`, `site/js/main.js`
- Test: `tests/pay-vs-prices.test.js`

**Interfaces:**
- Consumes:
  - `payIndexSeries`, `priceIndexSeries` and `monthsPricesAhead` (Task 2)
  - `INFLATION` (Task 1)
  - `resolvePay` (Task 4)
  - `svg.js` (Task 3)
- Produces: `model(base, steps, inflation, { includeLB, flatRate = null }): { pay, price, real, ahead: string[] }`, where `real` is the percent change in real pay at March 2029.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL, INFLATION } from '../site/js/data.js';
import { model } from '../site/js/sections/pay-vs-prices.js';
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
test('real pay by March 2029 under forecasts and flat rates', () => {
  const m = model(100000, DEAL.steps, INFLATION, { includeLB: false });
  near(m.real, 2.52);
  assert.deepEqual(m.ahead, ['2026-07', '2026-08', '2027-02', '2027-03', '2027-06', '2027-07', '2027-10']);
  near(model(100000, DEAL.steps, INFLATION, { includeLB: true }).real, 3.54);
  near(model(100000, DEAL.steps, INFLATION, { includeLB: false, flatRate: 0 }).real, 10.17);
  near(model(100000, DEAL.steps, INFLATION, { includeLB: false, flatRate: 6 }).real, -6.14);
});
```

- [ ] **Step 2: Run the test to confirm it fails.**
  Run `npm test`. Expected: `tests/pay-vs-prices.test.js` FAILs.

- [ ] **Step 3: Implement `model`.**

- [ ] **Step 4: Render the section.**
  - **Chart:** an SVG line chart from July 2026 to March 2029, with a pay line (teal)
    and a prices line (red). Months in `ahead` are shaded. The y axis is labelled
    "Index, July 2026 = 100".
  - **Inflation control:**
    - two options: "Central Bank forecasts" (the default) and "Try your own: x% a year",
      a slider from 0 to 6 in steps of 0.1
    - the 2029 assumption is labelled as an assumption
  - **Readout:** "By March 2029 your pay buys about 2.5% more than in July 2026", or
    "less" when negative, followed by the count of months in which prices ran ahead.
  - **Data table:** in a `<details>`.

- [ ] **Step 5: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 6: Check in the browser.** Expected results:
  - the default readout is about 2.5% for the example lecturer
  - at a 6% slider setting it reads "less"
  - there are no console errors

- [ ] **Step 7: Commit**

```bash
git add site tests
git commit -m "feat: pay vs prices chart" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: This deal vs the last one (section 7)

**Files:**
- Create: `site/js/sections/vs-last-deal.js`
- Modify: `site/css/demos.css`, `site/js/main.js`
- Test: `tests/vs-last-deal.test.js`

**Interfaces:**
- Consumes:
  - `DEAL` and `PREVIOUS_DEAL` (Task 1)
  - `finalSalary` and `payIndexSeries` (Task 2)
- Produces: `model(base, data, { includeLB }): { deals: { id, name, months, stepCount, headline, compoundedPct, end, threshold, costBn }[], series: { previous: { m, value }[], draft: { m, value }[] } }`
  - `deals[0]` is the previous deal and `deals[1]` the draft.
  - Each series starts at `{ m: 0, value: 100 }`, then has one point per month of the
    deal at its end-of-month value, with `m` numbered from 1.
  - There is deliberately no "annualised rate" field (spec §4, rule 9).

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { model } from '../site/js/sections/vs-last-deal.js';
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
test('side by side for the example lecturer', () => {
  const off = model(89894, data, { includeLB: false });
  const on = model(89894, data, { includeLB: true });
  assert.deepEqual(off.deals.map((d) => [d.months, d.stepCount, d.headline, d.threshold]), [[30, 8, 10.25, 50000], [33, 9, 10.75, 60000]]);
  near(off.deals[0].compoundedPct, 9.62); near(off.deals[1].compoundedPct, 10.17);
  near(on.deals[0].compoundedPct, 10.71); near(on.deals[1].compoundedPct, 11.27);
  assert.deepEqual([off.series.previous.length, off.series.draft.length, off.series.previous[0].value], [31, 34, 100]);
  near(off.series.previous[1].value, 102.25); near(off.series.previous.at(-1).value, 109.6151, 1e-4);
  near(off.series.draft.at(-1).value, 110.1712, 1e-4);
  assert.ok(!('annualised' in off.deals[0]));
});
```

- [ ] **Step 2: Run the test to confirm it fails.**
  Run `npm test`. Expected: `tests/vs-last-deal.test.js` FAILs.

- [ ] **Step 3: Implement `model`.**

- [ ] **Step 4: Render the section.**
  - **Two cards side by side** (stacked on phones), each showing months, steps,
    headline, the compounded total for your salary, threshold, cost and review clause.
    The review clause reads "General only" for the old deal and "Inflation review
    clause, as reported" for the new.
  - **Note on the old deal:** `PREVIOUS_DEAL.tuLbNote`.
  - **Chart:** an SVG cumulative chart with two lines on an x axis of "months since the
    deal began".
  - **Wording:** no "better" or "worse", no "faster" or "slower".
  - **Data table:** in a `<details>`.

- [ ] **Step 5: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 6: Check in the browser.** Expected results:
  - the cards show 9.6% and 10.2% by default, changing to 10.7% and 11.3% with the
    switch on
  - there are no console errors

- [ ] **Step 7: Commit**

```bash
git add site tests
git commit -m "feat: comparison with the 2024-26 agreement" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Beyond pay, timeline, glossary, sources (sections 8–11)

**Files:**
- Create:
  - `site/js/sections/beyond-pay.js`
  - `site/js/sections/timeline.js`
  - `site/js/sections/glossary.js`
  - `site/js/sections/sources.js`
- Modify: `site/css/demos.css`, `site/js/main.js`
- Test: `tests/timeline.test.js`, `tests/glossary.test.js`

**Interfaces:**
- Consumes:
  - `TIMELINE`, `GLOSSARY`, `BEYOND_PAY`, `ASSUMPTIONS`, `SOURCES`, `UNION_LINKS` and
    `SITE` (Task 1)
  - `motion.js` (Task 3)
- Produces:
  - `timeline.js`: `model(events, todayISO): (event & { state: 'past' | 'now' | 'future' })[]`. The `now` event is the last one dated on or before today.
  - `glossary.js`:
    - `termHref(id): string`, which returns `'#term-' + id`
    - `render`, which enhances every `[data-term]` element on the page into a button
      that opens that term's definition in place

- [ ] **Step 1: Write the failing tests**

```js
// tests/timeline.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { TIMELINE } from '../site/js/data.js';
import { model } from '../site/js/sections/timeline.js';
const stateOn = (today, date) => model(TIMELINE, today).find((e) => e.date === date).state;
test('the now marker follows the date', () => {
  assert.deepEqual([stateOn('2026-11-11', '2026-11-11'), stateOn('2026-11-11', '2026-12-07'), stateOn('2026-11-11', '2026-06-30')], ['now', 'future', 'past']);
  assert.equal(stateOn('2026-12-08', '2026-12-07'), 'now');
  assert.ok(model(TIMELINE, '2025-01-01').every((e) => e.state === 'future'));
});

// tests/glossary.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { GLOSSARY } from '../site/js/data.js';
import { termHref } from '../site/js/sections/glossary.js';
test('every data-term on the site has a glossary entry', () => {
  const root = new URL('../site/', import.meta.url);
  const files = ['index.html', ...readdirSync(new URL('js/sections/', root)).map((f) => `js/sections/${f}`)];
  const ids = new Set(GLOSSARY.map((g) => g.id));
  const used = files.flatMap((f) => [...readFileSync(new URL(f, root), 'utf8').matchAll(/data-term="([a-z-]+)"/g)].map((m) => m[1]));
  assert.ok(used.length >= 5);
  for (const id of used) assert.ok(ids.has(id), id);
  assert.equal(termHref('local-bargaining'), '#term-local-bargaining');
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  Run `npm test`. Expected: the two new files FAIL.

- [ ] **Step 3: Implement the models, then render the four sections.**
  - **Beyond pay:** cards from `BEYOND_PAY`, each with a status badge reading
    "Confirmed", "As reported" or "Not yet published".
  - **Timeline:**
    - a vertical timeline, with events revealed one by one via `onFirstView`
    - a "Now" marker, with future events shown muted
    - it ends with a neutral **"Your union's view"** box linking `UNION_LINKS` and
      stating no recommendation
  - **Glossary:** a `<dl>` with `id="term-{id}"` on each entry.
  - **Sources:**
    - `SOURCES` with publisher, title and date; entries with `url: null` appear
      unlinked
    - `ASSUMPTIONS`
    - "Unofficial and independent: not affiliated with any union, university or
      Government body. Not financial advice."
    - the last-updated date
    - "Report an error" linking `SITE.issuesUrl`
  - **Glossary links:** add `data-term` markup for at least five first mentions across
    the static HTML and section copy. Examples: local bargaining, lower-pay threshold,
    general round, ballot, review clause.

- [ ] **Step 4: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 5: Check in the browser.** Expected results:
  - tapping a glossary-linked term opens its definition, and Esc closes it
  - the "Now" marker sits at 11 November 2026
  - every source with a URL opens
  - there are no console errors

- [ ] **Step 6: Commit**

```bash
git add site tests
git commit -m "feat: beyond pay, timeline, glossary and sources" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Present mode and finishing pass

**Files:**
- Create: `site/js/present.js`, `site/css/present.css`, `tests/present.test.js`, `tests/size.test.js`
- Modify: `site/index.html` (link `present.css`), `site/js/main.js`

**Interfaces:**
- Consumes: the `.chapter[data-chapter]` sections and the `data-action="present"`
  button (Task 3).
- Produces:
  - `nextChapter(current: number, key: string, count: number, inFormControl: boolean): number`
  - `enterPresent(start = 0)`, `exitPresent()` and `goTo(i)`

- [ ] **Step 1: Write the failing tests**

```js
// tests/present.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextChapter } from '../site/js/present.js';
test('keyboard navigation, ignored inside form controls (Review Focus 4)', () => {
  assert.deepEqual([nextChapter(0, 'ArrowRight', 11, false), nextChapter(11, 'ArrowRight', 11, false), nextChapter(5, ' ', 11, false), nextChapter(5, 'PageUp', 11, false)], [1, 11, 6, 4]);
  assert.deepEqual([nextChapter(5, 'Home', 11, false), nextChapter(5, 'End', 11, false), nextChapter(3, 'ArrowLeft', 11, true), nextChapter(3, 'x', 11, false)], [0, 11, 3, 3]);
});

// tests/size.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [statSync(join(d, f)).size]));
test('whole site is under 500 KB', () => {
  const total = walk(fileURLToPath(new URL('../site/', import.meta.url))).reduce((a, b) => a + b, 0);
  assert.ok(total < 500 * 1024, `${total} bytes`);
});
```

- [ ] **Step 2: Run the tests to confirm the present test fails.**
  Run `npm test`. Expected: `tests/present.test.js` FAILs; the size test passes.

- [ ] **Step 3: Implement Present mode.**
  - **Entering:** `enterPresent` adds `body.present`. Each `.chapter` and the hero fill
    the viewport, only the current one is visible, and the type is about 1.25× larger.
    It also adds a fixed nav: Back, "Chapter n of 11" (no number on the hero), progress
    dots, Next and Exit.
  - **Keys:** handled with `nextChapter`. `inFormControl` is true when
    `document.activeElement` matches `input, select, textarea, [contenteditable]`.
  - **Leaving:** Esc calls `exitPresent`, which returns to the same section in
    scrolling mode.
  - **Interactive controls** keep working in this mode.

- [ ] **Step 4: Finishing pass, each item checked in the browser.**
  - **Phone width:** at 320 px there is no horizontal scroll, and tables scroll inside
    `.table-scroll`.
  - **Dark mode:** every section is readable with `colorScheme: dark`.
  - **Keyboard:** Tab reaches every control in order with a visible focus ring.
  - **Charts:** each has `role="img"`, an `aria-label` and a `<details>` table.
  - **Console:** no errors, from a full scroll through and a full Present-mode run.

- [ ] **Step 5: Run the tests to confirm they pass.**
  Run `npm test`. Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add site tests
git commit -m "feat: present mode and accessibility pass" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Publish to GitHub Pages

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: the complete `site/` folder and `npm test`.
- Produces: the public repo `danielcregg/pay-deal-2026` and the live site
  `https://danielcregg.github.io/pay-deal-2026/`.

- [ ] **Step 1: Check the name is free.**
  Run `gh repo view danielcregg/pay-deal-2026`. Expected: "Could not resolve to a
  Repository". If the repo exists, stop and ask the owner.

- [ ] **Step 2: Look up each action's current major version.**
  Run `gh api repos/actions/<name>/releases/latest --jq .tag_name` for `checkout`,
  `setup-node`, `configure-pages`, `upload-pages-artifact` and `deploy-pages`.

- [ ] **Step 3: Write `.github/workflows/pages.yml`.**
  - **Triggers:** `push` to `main`, and `workflow_dispatch`.
  - **Permissions:** `contents: read`, `pages: write`, `id-token: write`.
  - **Concurrency group:** `pages`.
  - **Job `test`:** checkout, setup-node with Node 22, then `npm test`.
  - **Job `deploy`:** `needs: test`, environment `github-pages`. It runs checkout,
    configure-pages, upload-pages-artifact with `path: site`, then deploy-pages.
  - **Versions:** use the majors found in Step 2.

- [ ] **Step 4: Finish `README.md`.**
  - what the site is and that it's unofficial
  - local preview and `npm test`
  - **how to update after the official text or the ballot result:** edit
    `site/js/data.js` (`SITE.status`, `SITE.lastUpdated`, and any facts), update the
    matching `<noscript>` lines in `index.html`, run `npm test`, and push
  - the live URL

  Then run `npm test` and confirm all tests pass. Commit:

```bash
git add .github README.md
git commit -m "ci: deploy site/ to GitHub Pages after tests pass" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Create the repo, enable Pages, push.**
  1. Merge the working branch into `main` with a fast-forward.
  2. Run `gh repo create danielcregg/pay-deal-2026 --public --source=. --remote=origin --description "Unofficial, neutral explainer of the November 2026 draft public service pay deal, for TU lecturers"`.
  3. Run `gh api -X POST repos/danielcregg/pay-deal-2026/pages -f build_type=workflow`.
     If that fails on the empty repo, push first and repeat it.
  4. Run `git push -u origin main`.
  5. Run `gh repo edit danielcregg/pay-deal-2026 --homepage https://danielcregg.github.io/pay-deal-2026/`.

- [ ] **Step 6: Watch the deployment.**
  Run `gh run watch --exit-status $(gh run list --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')`.
  Expected: both jobs succeed. If the deploy job ran before Pages was enabled, run
  `gh workflow run pages.yml` and watch the new run.

- [ ] **Step 7: Verify the live site.**
  - Run `curl -s -o /dev/null -w "%{http_code}" https://danielcregg.github.io/pay-deal-2026/`.
    Expected: `200`.
  - Open the URL in the browser pane. Expected:
    - the hero and "Your pay" show €89,894 → €99,037
    - the CSS, JS and SVG load with no console errors
    - no network requests go to any host other than `danielcregg.github.io`
