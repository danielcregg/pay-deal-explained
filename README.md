# Pay Deal Explained

An unofficial, neutral explainer of the November 2026 draft Irish public service pay
deal. It was written first for lecturers in the technological universities and now also
has the pay scales of primary and post-primary teachers, nurses and midwives, and gardaí.
It uses animated and interactive demos so you can see what the draft does to your own pay.

**Live site:** https://publicpaydeal2026.tech/ (the GitHub Pages addresses,
danielcregg.github.io/pay-deal-2026 and danielcregg.is-a.dev/pay-deal-2026, redirect there)

The domain is registered at Namify (get.tech). Its DNS has four `A` records for the bare
domain, pointing at GitHub Pages (185.199.108.153 to 185.199.111.153), and a `CNAME` for
`www` pointing at `danielcregg.github.io`. The custom domain itself is set in the
repository's Pages settings, not by a `CNAME` file.

- Static HTML, CSS and JavaScript modules: no build step, no dependencies, no tracking,
  no cookies.
- Your salary never leaves your browser. Your choices are kept in local storage on your
  own device.
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
5. Run `npm test`, then commit and push to `main`. The site redeploys in a minute or two.

### When the official text is published

1. Update the facts in `DEAL`, `BEYOND_PAY` and `ASSUMPTIONS`, and add the document to
   `SOURCES`.
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
chart and chapter 7 (`lowGrade`).

- **Lecturers, teachers, nurses and midwives** use the scales in force from 1 June 2026.
- **Nurses:** two official documents disagree on the Enhanced scale, so both versions are
  listed and a note says so. Remove one when the difference is settled.
- **Gardaí:** no table for 1 June 2026 could be found, so `GARDA_AUG_2025` holds the
  official table of 1 August 2025 and `since2025` applies the rises of February and June
  2026. When a newer table is published, replace the figures and drop `since2025` and the
  sentence about it in the sector's `caveat`.

To add a job: add the sector and its grades, add its sources to `SOURCES`, and add a
test with the scale figures to `tests/sectors.test.js`.

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
  3. Update `PREVIOUS_DEAL.tuLbNote`, and the matching sentence in `ASSUMPTIONS`.
  4. Update the reference values in the tests, then run `npm test`.

## How it is organised

| Path | What it holds |
|------|---------------|
| `site/index.html` | The page skeleton, one mount per section, and the no-JavaScript facts |
| `site/js/data.js` | Every fact, pay scale, date and source |
| `site/js/pay.js` | The pay maths: pure functions, no data or DOM |
| `site/js/selection.js` | The reader's grade, point and contract, saved on their device |
| `site/js/sections/` | One module per section, each with a testable `model()` and a `render()` |
| `site/js/present.js` | Present mode for projectors |
| `tests/` | Node's built-in test runner; `tests/helpers/` has a CSS reader and a small stand-in DOM, so tests can run the real render code |
| `docs/superpowers/` | The design and the implementation plan |

## Sources

Every source is listed and linked on the site, in section 11, "Sources and assumptions".
