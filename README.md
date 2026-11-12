# Pay Deal Explained

An unofficial, neutral explainer of the November 2026 draft Irish public service pay
deal. It was written first for lecturers in the technological universities and now also
has the pay scales of primary and post-primary teachers, nurses and midwives, and gardaí.
It uses animated and interactive demos so you can see what the draft does to your own pay.

**Live site:** https://publicpaydeal2026.tech/ (the GitHub Pages addresses,
danielcregg.github.io/pay-deal-2026 and danielcregg.is-a.dev/pay-deal-2026, redirect there)

**Second address:** https://danielcregg.is-a.dev/pay-deal-explained/ is the same site, for
networks that block the main one. Some workplace web filters block any newly registered
domain: ATU's blocked `publicpaydeal2026.tech` on 12 November 2026. The second address is
served from a second repository, `danielcregg/pay-deal-explained`, which is a copy of this
one with its own Pages deployment. Push every change to both, or the two addresses drift
apart. To make one push do both, run this once in a clone:

```bash
git remote set-url --add --push origin https://github.com/danielcregg/pay-deal-2026.git
git remote set-url --add --push origin https://github.com/danielcregg/pay-deal-explained.git
```

When the main address is no longer blocked, the second repository can be deleted.

The domain is registered at Namify (get.tech). Its DNS has four `A` records for the bare
domain, pointing at GitHub Pages (185.199.108.153 to 185.199.111.153), and a `CNAME` for
`www` pointing at `danielcregg.github.io`. The custom domain itself is set in the
repository's Pages settings, not by a `CNAME` file.

- Static HTML, CSS and JavaScript modules: no build step, no dependencies, no tracking,
  no cookies.
- Your salary never leaves your browser. The page opens the same way for everyone, on an
  example salary. Your choices are kept for a later visit only if you tick "Remember my
  choices on this device" under the calculator: they are then held in local storage on your own
  device, and unticking the box or pressing "Clear my choices" removes them.
- Not affiliated with any union, employer or Government body. Not financial advice.

## Run it locally

```bash
python -m http.server 8000 --directory site
```

Then open http://localhost:8000/.

## Tests

Run the tests with Node 22 or later:

```bash
npm test
```

The tests check:
- every reference figure the site shows, such as €89,894 → €99,037 for a Lecturer on
  point 5
- the pay scales of every job, figure by figure, and how the Garda figures are derived
- the hourly rates
- the data file's internal consistency
- that the figures written into `index.html` match the data: the `<noscript>` facts,
  the headline, the four hero figures and the chapter intros

GitHub Actions runs the same tests before every deployment.

## Updating the site

Every fact lives in [`site/js/data.js`](site/js/data.js).

### When the ballot result is known

1. In `site/js/data.js`, update `SITE.status`:
   - `state`, for example `'accepted'` or `'rejected'`
   - `chip`, the short text in the header
   - `line`, the full sentence
2. Also in `site/js/data.js`, set `SITE.lastUpdated` to today's date (`YYYY-MM-DD`).
3. Add an event to `TIMELINE`.
4. In `site/index.html`, make the same changes to the copies written into the page:
   - the hero's `data-bind="status-line"` text and the `<noscript>` block: the status
     sentence
   - the header's `data-bind="updated-short"` date (for example `11 Nov 2026`) and its
     `datetime` attribute
   - the footer's `data-bind="last-updated"` date (for example `11 November 2026`)

   `npm test` fails until the `<noscript>` sentence and both dates match.
5. If the deal is accepted, the items under "Beyond pay" that come from the agreement's text are no
   longer proposals: in `site/js/sections/beyond-pay.js`, change the `known` badge from
   "In the proposed text" to "In the agreement", and reword "the proposed agreement says"
   and "the proposed text" in `BEYOND_PAY`, `TIMELINE` and the sectors' notes in `data.js`.
6. Run `npm test`, then commit and push to `main`, in both repositories (see "Second
   address" at the top). Each site redeploys in a minute or two.

### If the agreement's text changes

The facts come from the proposed Public Service Agreement 2026–2029, issued through the
Workplace Relations Commission on 11 November 2026 (`psa-2026-text` in `SOURCES`). If a
revised or final text is published:

1. Update the facts in `DEAL`, `BEYOND_PAY` and `ASSUMPTIONS`, and the document's entry
   in `SOURCES`.
2. If the steps or headline figures change, update the copies in `index.html` too: the
   `<noscript>` table, the h1, the four hero figures and the chapter intros.
   `tests/static-figures.test.js` and `tests/noscript.test.js` point to anything you
   miss. Also update the reference values in `tests/pay.test.js`.

### Jobs and their pay scales

Each job is an entry in `SCALES.sectors` and its grades are the entries of
`SCALES.grades` with that `sector`. A sector says where its figures come from
(`sourceId`), what they leave out (`caveat`), whether the 1% local bargaining of
1 September 2025 is already in its scale (`lastDealLB`, explained to readers by
`lastDealNote`), and which grade's first point is the "low point" used in the opening
chart and in "This deal vs the last one" (`lowGrade`).

- **Lecturers, teachers, nurses and midwives** use the scales in force from 1 June 2026.
- **Nurses:** two official documents disagree on the Enhanced scale, so both versions are
  listed and a note says so. Remove one when the difference is settled.
- **Gardaí:** no table for 1 June 2026 could be found, so `GARDA_AUG_2025` holds the
  official table of 1 August 2025 and `since2025` applies the rises of February and June
  2026. When a newer table is published, replace the figures and drop `since2025` and the
  sentence about it in the sector's `caveat`.

To add a job: add the sector and its grades, add its sources to `SOURCES`, and add a
test with the scale figures to `tests/sectors.test.js`.

### Inflation paths

The opening chart and the pay panel use one inflation path, chosen with the buttons under
the opening chart. Three are published in `INFLATION.scenarios` in `data.js`; the fourth is
a figure of the reader's own, set with a slider (`OWN_PATH` and `ownRate` in
`site/js/selection.js`, where `scenarioOf` gives it the same shape as the others).

Each path has a `kind`, `forecast` or `illustration`, which the opening chart shows under
the price figure and uses in its key ("are ahead" or "would be ahead").

- **Central Bank** is the default: the Central Bank of Ireland's forecasts, with 2029
  assumed. When a new Quarterly Bulletin comes out, update `CENTRAL_RATES`, the
  scenario's `note`, the `cbi-qb3-2026` source and the reference values in the tests.
- **Optimistic** and **Pessimistic** are round-number illustrations (2% a year from
  2027, and 4% a year). They are labelled "an illustration, not a forecast" wherever
  they are used. The 4% is the rate in the year to October 2026 (`INFLATION.current`);
  if inflation moves a long way from it, choose a new round figure and say where it
  comes from.
- `INFLATION.others` lists what other institutions forecast, for the table under the
  opening chart. Only add figures you have read at the source.

There used to be a second pay-against-inflation chart, as its own chapter. It was folded
into the opening chart: the reader's own figure, the month-by-month table and the
forecasters' table are all under that chart now, and `payAgainstPrices` in
`site/js/pay.js` keeps the month-by-month sums that the tests check the chart against.
The page says "inflation" for the line, the tile and the key; the code still calls the
series `price`.

### How the page opens

The page opens the same way for everyone: no job, grade or point is chosen, and every
chapter works from an example salary of €60,000 (`DEAL.threshold`, the salary from which
every rise is a percentage). That state is `DEFAULT_SELECTION` in
`site/js/selection.js`, and "no job" is `ANY_JOB`.

- The opening chart has four pickers: job, grade, the point the reader is on now and,
  optionally, the month their increment falls in. Nothing changes until job, grade and
  point have all been chosen; after that each change applies at once.
- That card is the page's one calculator. Under the pickers a fold-out holds the less
  common cases (part-time, hourly-paid, a salary typed in for a job that is not listed);
  under the chart come its controls, then the pay in detail (first rise, back pay, every
  way of counting). `site/js/sections/your-pay.js` supplies those parts and the sums
  behind them (`model`); `hero.js` places them. There is no separate "Your pay" chapter.
- Choices are kept between visits only for a reader who ticks "Remember my choices on
  this device" (`remember` in the selection). `rememberChoices` keeps the browser's storage in step: a
  tab that is not remembering leaves storage alone, and unticking the box in one tab
  unticks it in the others.
  `tests/generic.test.js` and `tests/remember.test.js` cover both.

### Increments in the opening chart

Every figure on the site shows what the deal adds to one scale point. Only those rises
are compared with inflation, because an increment is normal progression up a scale and
not part of the deal.

A reader who picks an increment month in the opening chart also sees their own pay, as a
second dashed line that climbs one point a year on top of the deal's rises. It has its
own key and its own sentence, and it is never compared with inflation.

- The rules are in `positionIn` and `careerEvents` (`site/js/pay.js`) and `careerOf`
  (`site/js/selection.js`); `tests/increments.test.js` works examples through.
- A point marked `skipped: true` in `data.js` is passed over, and a point marked
  `lsi: true` (a long service increment) is never climbed to, because it depends on
  years spent at the top. Mark new scales the same way.
- The point a reader picks is held with the month it was picked in (`pointMonth`), so
  that a remembered choice is read the same way on a later visit.

### If local bargaining turns out to reach staff as a pay rise

Set `SITE.includeLBDefault` to `true` and update the sector's `lastDealNote`.

### If the 1% from 1 September 2025 is paid to lecturers or gardaí

That 1% (local bargaining under the 2024–2026 agreement) is not in the lecturer scales
of 1 June 2026 or in the Garda figures. While a sector has an `owed` entry, section 1
has a switch to count it and shows pay with and without it.

- **To count it for everyone by default** (still labelled, and readers can switch it
  off): set `SITE.includeOwedDefault` to `true`, and update the reference values in the
  tests that use the default selection.
- **When a circular applies it:**
  1. Replace that sector's figures in `SCALES` with the new circular's, and update
     the sector's `effective` date and source.
  2. Delete the sector's `owed` entry and set its `lastDealLB` to `true`. The switch
     and the extra column disappear for that job.
  3. Update the sector’s `lastDealNote`, and the matching sentence in `ASSUMPTIONS`.
  4. Update the reference values in the tests, then run `npm test`.

### Present mode

The opening has to fit one screen, at any projector size. Three things do that, in this
order: rules in `site/css/present.css` that hide the tick boxes below 1060 lines and trim
the card on narrow or 720-line screens; `chartHeight` in `site/js/sections/hero.js`, which
starts the chart shorter on a short screen; and `fittedHeight`, which takes whatever the
page still runs over by off the chart, down to 120px. After a change to the opening,
check Present mode at 1024 by 768, 1280 by 720, 1366 by 768 and 1920 by 1080, with an
increment month chosen.

## How it is organised

| Path | What it holds |
|------|---------------|
| `site/index.html` | The page skeleton, one mount per section, and the no-JavaScript facts |
| `site/js/data.js` | Every fact, pay scale, date and source |
| `site/js/pay.js` | The pay maths: pure functions, no data or DOM |
| `site/js/selection.js` | The reader's job, grade, point, contract and switches; kept on their device only if they ask |
| `site/js/switches.js` | The tick boxes and inflation buttons that several charts share |
| `site/js/sections/` | One module per section, each with a testable `model()` and a `render()`. `hero.js` is the opening calculator; `your-pay.js` supplies its parts about the reader's own pay |
| `site/js/present.js` | Present mode for projectors |
| `tests/` | Node's built-in test runner; `tests/helpers/` has a CSS reader and a small stand-in DOM, so tests can run the real render code |
| `docs/superpowers/` | The design and the implementation plan |

## Sources

Every source is listed and linked on the site, in section 11, "Sources and assumptions".
