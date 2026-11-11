# Pay Deal Explained: design

*Written 11 November 2026. Status: awaiting owner approval.*

## 1. Intent and why

In the early hours of 11 November 2026 (about 3.30am, at the Workplace Relations
Commission), the Irish Government and the public service unions agreed a **draft**
public service pay agreement. A national strike planned for 12 November was
suspended. Union members will now ballot, and results are expected early in the week
beginning 7 December 2026.

News coverage leads with the headline 10.75% and with the biggest gains for the lowest
paid (up to 18.3%). Lecturers in Ireland's technological universities (TUs) want
something narrower: what the deal does to *their* pay, when, and whether they should
trust the figures. For most of them the honest answer is less dramatic than the
headlines. Everyone on the Lecturer and Senior Lecturer scales earns more than €60,000,
so they get the plain percentages, about 11.3% compounded. Assistant Lecturers on the
lower points and hourly-paid staff gain more, because the flat minimum payments apply
to them.

**What we're building:** a public website that explains the deal clearly through
animated and interactive demos. It is aimed first at academic staff in TUs and may
later widen to every public servant. It is hosted on a new GitHub Pages site.

**Who it serves:**
- Assistant Lecturers (pre-2011 and post-2011 new-entrant scales), including part-time
  and hourly-paid staff
- Lecturers
- Senior Lecturers I, II and III
- the legacy grades still in payment

The owner is a TU lecturer.

**What success looks like:** a lecturer opens a link on their phone, picks their grade
and point, and within a minute knows:
- how much more they will earn, and when
- roughly how much back pay is coming
- whether the rises beat inflation

They trust the numbers because every assumption and source is visible. The same page
works on a projector at a staff or union branch meeting.

## 2. Goals, non-goals, anti-goals

**Goals**
- Explain the draft deal accurately, using the user's own pay wherever possible.
- Include all nine demos in section 5, with "Your pay" near the top.
- Provide a Present mode for meetings.
- Work well on phones first, then desktop and projector.
- Be accessible and fast.
- Make updates easy: all facts live in one data module, so the site is simple to revise
  when the official text is published or the ballot result lands.
- Accept any salary, not just TU scale points, so it can expand to the wider public
  service later.

**Non-goals (v1)**
- Net pay (tax, USC, PRSI, pension contributions). Gross pay only, stated clearly.
- Annual increments. Results show only what the deal adds. Wording such as "your
  point's pay" must make this clear.
- Pay scales for non-TU grades. A typed salary covers anyone else.
- Shareable personalised links. Salary must not end up in URLs.
- An Irish-language version.

**Anti-goals (failure even if everything works)**
- **Taking a side in the ballot.** No campaigning for Yes or No, no persuasive
  framing, no union or Government logos or branding. **Owner decision (11 Nov):** the
  site reports no union voting recommendations, no political or union positions and
  no quotes. Readers are pointed to TUI, and to ICTU for the full list of unions, for
  their union's view.
- **Wrong numbers, or false precision presented as fact.** Assumptions must never be
  hidden.
- **Collecting or transmitting anyone's salary.** No analytics, cookies, third-party
  scripts or fonts, or any other runtime request to another server.
- **Copying news articles.** Facts are summarised in our own words and sources are
  linked.
- **Animation that gets in the way.** Nothing blocks reading, everything can be
  replayed or skipped, and `prefers-reduced-motion` turns motion off.

## 3. Facts the site is built from

Each fact below carries its source, and the site's sources section links every one.

### 3.1 The draft agreement, 2026–2029 (as reported 11 Nov 2026)

Sources: RTÉ News, Brian O'Donovan, 11 Nov 2026; The Irish Times, "What's in it for
me?", 11 Nov 2026; Irish Independent explainer, 11 Nov 2026. The official text had not
been published when this was written.

- **Term:** 1 July 2026 to 31 March 2029, which is 33 months.
- **Cost:** €5.2bn, spread across five budgets.
- **Coverage:** "more than 400,000" workers. RTÉ counts 424,000 public servants in 2026.
- **Pay steps** (each one is "the percentage or the minimum, whichever is greater"):

| # | Date | Rise | Minimum |
|---|------|------|---------|
| 1 | 1 Sep 2026 | 2% | €1,200 |
| 2 | 1 Apr 2027 | 1% | none |
| 3 | 1 Aug 2027 | 1% | €600 |
| 4 | 1 Nov 2027 | 1.5% | €900 |
| 5 | 1 Mar 2028 | 1% | none |
| 6 | 1 Jun 2028 | 1% | €600 |
| 7 | 1 Oct 2028 | 1% | none |
| 8 | 1 Mar 2029 | local bargaining, phase 2: 1% of basic pay cost | none |
| 9 | 2 Mar 2029 | 1.25% | €750 |

- **Headline 10.75%:** general round increases of 9.75% plus 1% local bargaining. Step 1
  is backdated to 1 September 2026.
- **Lower-pay threshold:** rises from €50,000 to €60,000. Every minimum divided by its
  percentage comes to exactly €60,000. Below that salary the flat sum is bigger; above
  it the percentage is.
- **Lowest paid:** up to 18.3% over the deal, including local bargaining. The minimum
  cumulative increase is 11.3% (Irish Times).
- **Published examples (rise in starting pay):**

| Role | Rise |
|------|------|
| Cleaner | 18.3% |
| Special needs assistant | 17.2% |
| Clerical officer | 17.1% |
| General operative or healthcare assistant | 15.4% |
| Garda | 14.6% |
| Enhanced nurse | 13.3% |
| Primary teacher | 13.1% |
| Secondary teacher | 12.8% |

- **Local bargaining:** 1 March 2029 is the *second* phase. The final phase falls to the
  next agreement after this one.
- **Not yet public in detail:**
  - a review clause either side can invoke if inflation spikes or other unforeseen
    economic factors arise
  - arrangements on AI and hybrid working
  - education measures on recruitment, retention and class sizes, mentioned by INTO
  - reform and modernisation commitments
- **Process:** the ICTU Public Services Committee recommended suspending all industrial
  action, including work-to-rule. The executives of the 19 unions are considering the
  draft. Ballots conclude early in the week beginning 7 December 2026. If the deal is
  accepted, the first increases, with back pay, would most likely be paid in January
  2027 (Irish Times).
- **Positions and recommendations: not reported (owner decision).** The Government
  and the union negotiators have both spoken in favour of the draft, and the 19 union
  executives will make their own recommendations during the ballot. To stay neutral,
  the site carries none of these. Where a reader would look for "what does my union
  think?", the site shows a short "Your union's view" pointer instead:
  - TUI's website, for TU academic staff
  - the ICTU Public Services Committee, for the list of public service unions

  The review clause is described from the reports as a fact (§5, section 8), not as
  anyone's argument.

### 3.2 How we got here (timeline)

| Date | Event |
|------|-------|
| 30 Jun 2026 | Public Service Agreement 2024–2026 expires |
| Early Jul 2026 | Unions prepare industrial action ballots (Irish Times, 3 Jul) |
| 30 Sep 2026 | Coordinated work-to-rule begins |
| 14 Oct 2026 | 24-hour national strike, about 300,000 workers |
| 21 Oct 2026 | Planned strike suspended to allow talks |
| Late Oct 2026 | Talks break down; national strike called for Thu 12 Nov, the day ~50 leaders meet in Dublin for the European Political Community |
| 8–9 Nov 2026 | Government offers increases worth 10.5% (Irish Times) |
| 10 Nov 2026 | Unions consider a revised offer (RTÉ) |
| 11 Nov 2026, about 3.30am | Draft deal agreed at the WRC; strike suspended |
| Week of 7 Dec 2026 | Ballot results due |
| Jan 2027 | If accepted, first increases and back pay likely |

### 3.3 Previous agreement: Public Service Agreement 2024–2026 (official text)

Source: *Public Service Agreement 2024–2026*, sections 3.1.2 and 4.

- **Term:** 1 January 2024 to 30 June 2026, which is 30 months.
- **Cost:** €3.6bn (RTÉ).
- **Pay steps:**

| Date | Rise | Minimum |
|------|------|---------|
| 1 Jan 2024 | 2.25% | €1,125 |
| 1 Jun 2024 | 1% | none |
| 1 Oct 2024 | 1% | €500 |
| 1 Mar 2025 | 2% | €1,000 |
| 1 Aug 2025 | 1% | none |
| 1 Feb 2026 | 1% | €500 |
| 1 Jun 2026 | 1% | none |

- **Local bargaining:** first instalment of 1% of basic pay cost on 1 September 2025.
  Local bargaining overall was "up to a maximum of 3% of the basic pay cost", with the
  balance left to successor agreements.
- **Local bargaining for TU academic staff specifically:** on 16 December 2025, TUI
  was still demanding that the 1% be applied to all academic, teaching and researcher
  grades in TUs and IoTs from 1 September 2025, in return for cooperating with the
  introduction of professorships (TUI press release, 16 Dec 2025). The scales in the
  February and June 2026 circulars show only the 1% general rises, with no local
  bargaining uplift. The owner was asked whether it has since been paid and has not
  yet said. The site states the evidence: "as of the June 2026 pay scales". In the
  comparison (§4, rule 9), the old deal's 1 September 2025 local bargaining step
  follows the same global switch, off by default. The note explains why.
- **Headline:** 9.25% general plus 1% local bargaining, so **10.25%**.
- **Threshold:** €50,000. Every minimum divided by its percentage comes to €50,000.
- **Review clause:** the 2024–26 deal had only a general one (section 5.7): terms are
  not revisited unless the underlying assumptions need to be.

### 3.4 Inflation context

Central Bank forecasts, as reported by RTÉ on 10–11 Nov 2026: 3.4% in 2026, 3.1% in
2027 and 2.0% in 2028. Inflation is currently about 4%. No 2029 forecast was reported,
so the site assumes 2.0% for 2029 and labels it as an assumption.

### 3.5 TU academic pay scales from 1 June 2026

Source: TU-IOT Circular 002/2026, *Revision of Pay in the Higher Education Sector with
effect from 1st June 2026*, appendix (hosted by DkIT). The figures match TUI's salary
scales page. These are the starting salaries before the new deal.

**Current grades**

| Grade | Points (€) |
|-------|------------|
| Assistant Lecturer, post-2011 new entrant | 47,572 · 50,099 · 52,181 · 54,097 · 56,109 · 57,728 · 59,383 · 61,045 · 62,717 · 64,372 |
| Assistant Lecturer, pre-2011 | 52,181 · 54,097 · 56,109 · 57,728 · 59,383 · 61,045 · 62,717 · 64,372 |
| Lecturer | 69,625 · 72,831 · 84,009 · 86,936 · 89,894 · 92,865 · 95,852 · 98,817 · 101,780 · 104,757 · 107,727 |
| Senior Lecturer I (Teaching) | 94,736 · 97,963 · 101,175 · 104,409 · 107,625 · 110,838 · 114,068 · 117,279 |
| Senior Lecturer II | 97,917 · 100,997 · 104,070 · 107,149 · 110,230 · 113,304 · 116,378 · 119,458 · 122,529 · 125,890 |
| Senior Lecturer III | 105,346 · 109,042 · 112,741 · 116,441 · 120,140 · 123,838 · 127,814 · 131,543 · 135,494 |

TUI notes that post-2011 entrants skip points 4 and 8 when progressing. That only
affects increments, which are out of scope, so the picker lists every point.

**Assistant Lecturer part-time hourly rates:** €75.51 for new entrants, €82.83 for
pre-2011 staff. These equal point 1 of the matching annual scale divided by 630 hours.
The rule holds in both 2026 circulars to the cent:
- 47,572 / 630 = 75.51
- 52,181 / 630 = 82.83
- 47,101 / 630 = 74.76 in February 2026, when point 1 got the €500 minimum and the
  hourly rate rose by the same 1.07%.

**Legacy grades ("existing structure", in the picker under "Other / legacy scales")**

| Grade | Points (€) |
|-------|------------|
| College Teacher | 49,046 · 50,945 · 52,876 · 54,847 · 56,912 · 58,971 · 61,050 · 63,154 · 65,827 · 67,975 · 70,126 · 72,943 · 75,760 · 77,976 · 82,943 · 83,943 |
| Lecturer Scale I | 61,991 · 64,939 · 67,351 · 69,796 · 72,859 · 82,064 · 83,471 · 86,138 · 88,849 · 91,566 · 94,290 |
| Lecturer Scale II (L2 grade, pre-Sept 1998) | 69,625 · 72,831 · 84,009 · 86,936 · 89,894 · 92,865 · 95,852 · 98,817 · 101,780 · 104,757 · 107,727, plus long-service increments LSI 1 €110,594 and LSI 2 €113,460 |

The circular covers former IoT and former DIT grades and has no separate DIT academic
scale. **Assumption, stated on the site:** TU Dublin academic staff are on the same
scales.

## 4. Calculation rules

All the maths lives in one small pure module. The browser and the tests use the same
module.

1. **Steps.** Apply the steps in date order to the full-time annual basic salary:
   `rise = max(salary × pct, minimum)`, with `minimum = 0` where none applies. Each
   step uses the salary as already increased by the earlier steps. A salary can
   therefore cross €60,000 partway through the deal and switch from flat sums to
   percentages.
2. **Local bargaining.** The 1 March 2029 step is modelled, *when included*, as a 1%
   rise for the individual. In reality it is 1% of the *bargaining unit's* pay cost,
   used however that unit negotiates. **My call, from the builder check and the TUI
   evidence in §3.3:**
   - It is **excluded from totals by default**. The first 1% (due September 2025) had
     not reached TU academic scales by June 2026.
   - It is always *shown*: a separate "possible" step with a hatched bar and its euro
     value, never hidden.
   - "Your pay" states both totals: "from the general rises" (certain if the deal is
     accepted) and "plus local bargaining, if it reaches you as a pay rise".
   - One global switch, "Count local bargaining as a 1% rise for me", includes it
     everywhere.
   - **Exception:** the compounding demo (§5, section 4) explains the *headline*, so it
     always uses 10.75% → 11.27% and also shows 9.75% → 10.17% without local
     bargaining.

   The owner can reverse the default with one data setting.
3. **Precision.** Keep full precision internally and display whole euros. Circulars
   round each scale point to the euro, so official figures may differ by about €1. The
   footnote says so.
4. **Part-time salaried staff.** Compute on the full-time scale value, then multiply by
   the FTE fraction. Part-time pay is a proportion of the full-time point, so the flat
   minimums are pro-rated in effect. This is stated as an assumption.
5. **Hourly-paid Assistant Lecturers.** Apply the steps to point 1 of the chosen
   Assistant Lecturer scale and divide by 630 to get each new hourly rate. Optionally
   multiply by the hours worked per year to show annual earnings. State this as "based
   on how hourly rates have been set in 2026 circulars".
6. **Back pay.** Step 1 is effective 1 September 2026. If it is first paid in the
   January 2027 payroll, the arrears for September to December 2026 come to
   `(annual rise ÷ 12) × 4`, gross. The payment month is adjustable (January, February
   or March 2027, adding one month of arrears each) and defaults to January.
7. **Compounding.** For any salary that stays at or above €60,000, the factor is
   1.02 × 1.01 × 1.01 × 1.015 × 1.01 × 1.01 × 1.01 × 1.01 × 1.0125 = 1.112729, which is
   **+11.27%**. The headline 10.75% is the simple sum of the percentages. The demo
   explains the difference.
8. **Pay vs prices.** Both indices start at 100 on 1 July 2026.
   - The pay index steps up on each effective date.
   - The price index grows monthly at `(1 + annual rate)^(1/12)`, using the Central Bank
     forecast for each calendar year (2029 assumed at 2.0%).
   - A slider replaces the forecasts with one flat rate between 0% and 6%.
   - The output is the real change in pay by 31 March 2029, plus the months, if any,
     when prices ran ahead of pay.
9. **This deal vs the last one.** Run the same engine on both schedules for a chosen
   starting salary, defaulting to the user's. For each deal show:
   - the compounded total
   - the months it covers
   - the number of steps
   - the threshold
   - the largest rise in percentage terms (at a low salary)
   - the cost

   Pace is shown only as a chart: both deals' cumulative rise plotted against months
   since each deal began. **No single "annualised rate" figure (my call, from the
   builder check).** Spread over the term, the old deal looks faster; spread over the
   months when rises land, the new deal does. Any one number would lean one way. The
   copy draws no "better" or "worse" conclusion.

**Reference values without local bargaining (the site's default):**
- **Lecturer point 5:** €89,894 → €99,037.31 (+10.17%).
- **New-entrant Assistant Lecturer point 1:** €47,572 → €53,135.99 (+11.70%).
- **Any salary ≥ €60,000:** × 1.101712.

**Reference values (automated tests must pass these):**
- **Lecturer point 5:** €89,894 → €100,027.68 (shown €100,028), +11.27%.
- **New-entrant Assistant Lecturer point 1:** €47,572 → €53,659.85 (shown €53,660),
  +12.80%. Back pay for September to December is €1,200 ÷ 12 × 4 = €400.
- **€58,000:** → €64,584.15 at full precision (+11.35%). Rounding each step to the cent
  gives €64,584.16, so tests allow ±1 cent. The flat sum wins at steps 1 and 3 and
  loses at steps 4, 6 and 9.
- **€60,000:** step 1 gives exactly €1,200 either way.
- **Any salary ≥ €60,000:** × 1.112729 (± rounding).
- **2024–26 engine check against the February 2026 circular:**
  - €46,601 → +€500 → €47,101
  - €51,153 × 1.01 = €51,664.53; the circular prints €51,664
  - €47,101 × 1.01 = €47,572.01; the circular prints €47,572 (June 2026)

  Circulars appear to work from unrounded bases, so compare to them within ±€1.
- **Hourly rates:** €47,572 / 630 = €75.51; €52,181 / 630 = €82.83.

## 5. Page structure and demos (agreed with the owner)

One page with three uses:
1. **A scrolling story.** Sections animate when scrolled into view.
2. **Your pay first.** The calculator sits right under the headline.
3. **Present mode.** A ▶ Present button turns each section into a full-screen chapter.

The user's grade and point, set in section 1, flow into every demo after it. If they
skip that step, an example is used (Lecturer, point 5), clearly labelled.

**0. Header and hero**
- **Header:** site name, a status chip ("Draft · ballot results due w/c 7 Dec"), the ▶
  Present button and a last-updated date.
- **Hero:** "10.75% over 33 months: what the draft deal means for TU lecturers".
- **Four stat tiles** that count up on load: 10.75% · 33 months · 9 rises · €60k
  threshold.
- **A one-line status:** draft agreed 11 Nov; not final until members vote.

**1. Your pay** (interactive)
- **Contract picker:** full-time, part-time (FTE %), or hourly.
- **Grade picker:** grade, then scale point, with the euro amount shown on each point.
  Also a "type my salary" option.
- **Outputs:**
  - salary now → salary after 2 March 2029, with the euro and percentage gain. This
    is shown two ways: from the general rises alone, and plus local bargaining if it
    reaches the user as a 1% rise (§4, rule 2).
  - the next rise and its date
  - a back-pay estimate (links to section 5)
  - a one-line explanation of which rule applied ("all nine rises are percentages for
    you" or "the flat minimum beat the percentage at steps 1 and 3")
- **A visible privacy note:** "Your salary stays on this device."

**2. The nine pay rises** (animated)

A staircase or step chart of the user's salary from September 2026 to March 2029.
- The bars grow one by one, each step coloured by type: teal for a percentage, amber
  for a flat minimum, a separate marker for local bargaining.
- Hover or tap shows the date, the rule and the euro amount.
- There is a Replay control.

**3. Flat sum or percentage?** (interactive)
- A salary slider from €30k to €140k, starting at the user's salary, with the €60k
  threshold marked.
- A table of the nine steps updates live, tagging each step "flat sum" or "percentage".
- It explains why lower-paid staff gain more and puts the published 18.3%, 17.1% and
  12.8% examples in context.
- It explains why most lecturers get the plain percentage while Assistant Lecturers on
  the lower points, and hourly-paid staff, gain more.

**4. Why 10.75% comes to about 11.3%** (animated)

Shows each rise landing on pay that has already risen. One possible treatment:
stacked blocks where each new block is sized on the current total. A side-by-side
counter shows the sum of the percentages against the compounded total.

**5. Your back pay** (animated)

The months September to December 2026 fill up one at a time, then become one lump sum
in the chosen payment month. The arrears total updates if the payment month changes.
Everything is labelled gross and "if accepted".

**6. Pay vs prices** (interactive chart)

Two lines, pay index and price index, from July 2026 to March 2029.
- The default uses the Central Bank forecasts; a slider sets a flat inflation figure
  instead.
- A readout gives the real change in pay by March 2029.
- The sources and the 2029 assumption are shown with the chart.

**7. This deal vs the last one** (interactive)

The 2024–26 and 2026–29 deals side by side for a chosen salary, defaulting to the
user's. Show months, steps, the headline, the compounded total, the threshold, the
review clause and the cost. Pace appears only as the cumulative-rise chart described
in §4, rule 9. Neutral wording only.

**8. Beyond pay** (explainer)
- local bargaining, including the three phases
- the inflation review clause
- AI and hybrid working
- education-sector measures

Each item is marked as known, reported or not yet published.

**9. How we got here, what happens next** (animated timeline)

The events in section 3.2 reveal one by one as the user scrolls, with the "now" marker
at 11 November and the future steps shown as ahead.

The section ends with the neutral "Your union's view" pointer (§3.1): TUI and ICTU
links only, with no recommendation stated.

**10. Plain-English glossary**

Covers general round, local bargaining, lower-pay threshold, minimum payment,
compounding, back pay/arrears, review clause, ballot, ratification, WRC, ICTU Public
Services Committee, increment and scale point. Terms elsewhere on the page link to
their entry, as tap-to-explain.

**11. Sources and assumptions**

Every source, linked, with its date. Then:
- the full list of assumptions
- "Unofficial and independent: not affiliated with any union, university or Government
  body. Not financial advice."
- the last-updated date
- how to report an error: a link to the repository's issues

**Present mode**

Each numbered section becomes a full-viewport chapter, with:
- Next and Back buttons
- arrow keys, Page Up/Down and the space bar
- progress dots and "Chapter n of 11"
- larger type and high contrast for projectors
- Esc to exit

Interactive controls keep working in this mode.

## 6. Visual direction

Calm, editorial and neutral, like a quality newspaper's interactive explainer.

- **Background:** warm off-white "paper" with dark ink text.
- **Type:** a serif for headlines and a clean sans for body text and numbers, with
  tabular figures for money.
- **Colour meanings:**

| Colour | Means |
|--------|-------|
| Teal | percentage rises |
| Amber | flat minimums |
| Muted red | prices and inflation |
| Grey | the starting point |

- **Dark mode:** supported.
- **Mobile:** a single column, with large tap targets on phones.
- **No imagery** of workers, unions or Government.

The mockups shown on 11 Nov set the direction. They are saved as standalone pages:
- [`mockups/2026-11-11-site-direction.html`](mockups/2026-11-11-site-direction.html):
  the three layouts and two working demo sketches
- [`mockups/2026-11-11-page-structure.html`](mockups/2026-11-11-page-structure.html):
  the agreed structure, Present mode and the phone view

The exact design is the builder's call.

## 7. How it is made (owner-approved defaults)

- **Stack:** static HTML, CSS and vanilla JavaScript (ES modules). No framework and no
  build step. Charts are hand-written SVG.
- **Repository:** new public repo `danielcregg/pay-deal-2026`.
  - The published site lives in `site/`.
  - Docs (`docs/`) and tests (`tests/`) are not published.
  - Deployment is by a GitHub Actions Pages workflow from `site/`.
  - The site's address is `https://danielcregg.github.io/pay-deal-2026/`.
- **Data:** a single data module (for example `site/js/data.js`) holds:
  - deal steps and the previous deal's steps
  - scales
  - timeline
  - inflation figures
  - sources
  - status text and the last-updated date

  Updating the site after the official text or the ballot should mean editing only
  this file.
- **Engine:** pure functions in `site/js/pay.js`, imported by the page and by Node's
  built-in test runner (`node --test`). No dependencies.
- **Privacy:** no external requests at runtime. Fonts are self-hosted with licences
  included, or system font stacks are used. Optional local storage remembers the
  user's picks on their own device only.
- **Accessibility:**
  - WCAG 2.2 AA contrast
  - full keyboard use
  - text equivalents for every chart, such as a summary sentence and a data table
  - `prefers-reduced-motion` respected
  - the key facts readable even if JavaScript fails. **My call, from the builder
    check:** the page is rendered from `data.js`. `index.html` also carries a
    `<noscript>` block with the status line and the nine-step table. A Node test
    fails if that block disagrees with `data.js`, so ballot-day updates stay a
    one-file edit and the test catches anything missed.
- **Performance:** the whole site should be well under 500 KB.

### Delivery (my call, from the builder check)

Build everything now, in priority order, so a usable version exists early:
1. engine, data module and tests
2. hero, "Your pay" and the `<noscript>` facts
3. the demos in section order
4. Present mode, dark mode and the glossary links
5. polish

Publish once the tests pass and the page has been checked at phone and desktop widths.
The aim is to be live well before ballots close in the week of 7 December.

## 8. Content rules

- Neutral, plain English, written for lecturers, with no jargon left unexplained.
- Facts that come from news reports say so ("as reported"). Facts from official
  documents cite them.
- Assumptions appear next to the results they affect, not only in the footer.
- No reproduced article text, and no quotes over a short phrase. Positions are
  paraphrased, with both sides represented equally.
- Irish/UK spelling. Euro formatted €1,200. Dates as "1 September 2026".

## 9. Left to the builder

- Exact copy, layout and typography within section 6.
- Animation and chart construction details.
- How Present mode is implemented.
- Glossary wording.
- File structure beyond the fixed points in section 7.

## 10. Known unknowns

- **The official text has not been published.** Details may differ from the news
  reports, for example how local bargaining is applied or the exact rules for
  part-time staff. The site labels everything "draft, as reported" and is built to be
  updated quickly.
- **Ballot result:** due the week of 7 December. The status chip and hero line must be
  easy to change.
- **TU Dublin academic scales** are assumed to be the same (section 3.5).
- **How TU lecturers' local bargaining money is used** is unknown. Neither phase is
  assumed to reach individual pay by default (§4, rule 2), and a switch includes it.
  If the owner confirms that the September 2025 1% *was* paid to TU academic staff,
  flip the default and update the old-deal note in §3.3.
- **Union recommendations** will be made during the ballot and are deliberately not
  reported (§2).
