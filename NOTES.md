# Job search — implementation notes

Job search across title, description, profession, office, contract type and
work mode, with pagination. Backend and frontend, one commit per ticket.

Run `mix test` and, in `frontend/`, `npx tsc --noEmit && yarn lint && npx vitest run`.

---

## What the feature does

Type in the search box and the results narrow as you go. Filter by office,
by one or more contract types, by one or more work modes. Page through the
results. Everything lives in the URL, so a search can be shared, bookmarked
and reloaded, and the back button walks your own history of searches.

---

## Against the brief

The exercise asks for search "using various parameters like job title,
location, work mode, etc", and invites extending that to whatever makes sense
here. What made sense was the profession: it is the word people actually use
for the job they want. Someone typing "frontend" means the occupation and
expects to find a posting titled "React Engineer", so the free text query
joins the professions table rather than only reading the job's own columns.

Doing that surfaced a gap underneath it. `Job.changeset/2` never cast
`profession_id`, so no job created through the API could have a profession at
all — the seeds set it by inserting the struct directly, and every other route
dropped it silently. One line, and a test.

## Where I stopped, and where I did not

The feature is job search. Everything under `pages/JobList`,
`components/Job*`, `api/jobs.ts` and the `Ats.Jobs` context is that, and it is
the bulk of the diff.

Two things sit outside it, deliberately, and it is fair to ask why.

**The job page** is where a search result leads. It was still rendering
`FULL_TIME` and `onsite` while the list next to it said "Full-Time" and "On
site", so clicking a result stepped into a different application. Leaving both
alone would have been defensible; changing only the list was not.

**The application form** is one click further, from the Apply button on a
result. I went in to check it and did not come back out, because what was there
was not a matter of taste: a `required` rule that accepted a single space as a
name and `call me` as a phone number, a 422 listing exactly which fields were
wrong being caught and reported as "Unknown error", a silent redirect on
success, and one test that asserted the form rendered.

If the brief had said not to touch anything else I would have written this
paragraph instead of the code. It says the opposite — extend this to anything
that makes sense — so I fixed what I found on the path a candidate actually
walks, and kept it in its own commits so it can be read, or dropped, on its own.

## One label, one place

Both enums are rendered with a label the server resolves — `contract_type_label`
next to `contract_type`, `work_mode_label` next to `work_mode` — and the filter
endpoint returns both as `{value, label}` pairs.

The alternative was already in the codebase and had already gone wrong: the
same `WORK_MODE_LABELS` map, copied into three components. Three chances to
disagree about what `onsite` is called, and a fourth waiting for whoever adds
the next screen. `Ats.Jobs` owns the mapping, the client renders what it is
sent, and the filter dropdowns are built from the same pairs.

## Decisions worth defending

**The URL is the only source of truth.** No mirrored `useState`, so there is
nowhere for the two to disagree. Typing replaces the history entry, picking a
filter pushes one — eight characters should not cost eight presses of back,
but returning to the previous filter should work.

**Only the free text is debounced.** Picking a filter is one deliberate act
and should feel immediate; typing is a burst and should cost one request. The
effect is keyed on the serialised query string rather than a filters object,
because an effect keyed on an object re-runs every render and would quietly
undo the debounce.

**Requests are cancelled, not just ignored.** Without cancelling, two searches
race and the slower one wins by finishing last, showing results for a query
the user already backspaced away. There is also an explicit `signal.aborted`
check after the await, so the guarantee does not depend on the transport
honouring the signal — which is exactly what the race test exercises.

**Previous results stay on screen while the next load.** Clearing the list
first collapses the layout on every keystroke: a flicker and a cumulative
layout shift at once. The skeleton appears only on the very first load, when
there is genuinely nothing to keep.

**Enum filters are cast before they reach the query.** Comparing a raw string
against an `Ecto.Enum` column raises `Ecto.Query.CastError`, so `?work_mode=banana`
would answer 500. It now answers 200 with an empty page.

**`%` and `_` are escaped in the search term.** Unescaped, searching for `100%`
matches everything beginning with `100`. It is the only failure mode here that
produces a plausible wrong answer instead of an error, which is why it has its
own test.

**Ordering has a tiebreak on id.** Ordering by `inserted_at` alone is not
stable, so paginating over jobs created in the same second repeats and skips
rows.

**`list_jobs/0` was left alone.** `search_jobs/1` was added beside it. The two
answer different questions — an internal listing versus the public endpoint —
and no existing caller changes meaning.

---

## Two bugs found on the way

**Drafts were public.** `GET /api/jobs` returned every job regardless of
status, and the seed data contains a draft, so an anonymous visitor could read
an unpublished job. `search_jobs/1` filters to `:published`, with the
regression test at the HTTP boundary where it would actually be exploited.

**`contract_type/1` returned `nil` for two contract types.** The label map had
five entries against seven in the schema; `APPRENTICESHIP` and `VIE` were
missing. Its docstring also showed the argument as a string, while `Ecto.Enum`
loads it as an atom, so the documented call returned `nil` too.

---

## The bug that made the page look wrong

**None of the icons were rendering.** Not "looked plain" — absent. `Icon` emits
`<svg><use href="#name"/></svg>` and the matching `<symbol>` definitions live in
a `Sprite` component that the starter never mounts, so every glyph resolved to
nothing and painted at `0x0`: the search icon, all three select carets, both
pagination arrows, every clear cross. The 44px of padding reserved for the
search icon read as an unexplained hole, and the selects looked like plain
boxes.

It fails silently by construction — a missing symbol paints nothing and leaves
the layout untouched — which is why `components/IconSprite/index.test.tsx`
renders the screens, opens the dropdowns, and fails if any `<use>` points at a
symbol that is not defined.

`Sprite` itself is one component carrying all 209 icons in the library, so it
cannot be tree-shaken: importing it to draw nine glyphs costs **36kB gzipped**
on a page whose whole point is being fast. `IconSprite` carries the nineteen
this app can actually reach, including the ones that only appear in a state.

## Notes on welcome-ui

**`Search` is not used, on purpose.** Inside a `Field` it renders an input with
an empty `id` while the label points at `_r_2_`, so the label is attached to
nothing and the control cannot be found by its accessible name. It also reports
`combobox` rather than `searchbox`. `InputText` with a search icon looks
identical and behaves correctly.

**`animate-pulse` does not exist.** welcome-ui replaces Tailwind's theme rather
than extending it, which removes the whole `animate-*` family — the class
compiled to nothing and the skeleton was silently static. The one animation
needed is defined in `index.css`, and respects `prefers-reduced-motion`.

**Multi-select exposes `role="list"`.** Its selected-tag container collides with
the results list, so the results list carries a name.

**Multi-select contradicts itself.** It renders the chosen values as chips under
the control while the control keeps showing its placeholder — "Any contract"
above a Part-Time chip — and the chips land at a different horizontal position
per select. They are suppressed via `renderMultiple` and every applied filter is
rendered once, in one row, each removable. The trigger reports "2 selected"
instead, which needed a CSS rule to be legible: the multi-select renders no
input element at all and puts its placeholder in an `::after` pseudo-element,
painted in the placeholder grey.

**`Pagination` needs `getHref`.** Without it the page numbers are not rendered
as controls at all. With it they are real anchors — openable in a new tab —
and welcome-ui prevents the default, so navigation stays client side.

**Borders are invisible by default.** Cards ship `#f6f3ef` and controls `#f3f3f3`
against white: 1.11:1 and 1.07:1. Focus was worse — the outline is removed and
only the 1px border changes to a yellow, a 1.17:1 state change where WCAG asks
for 3:1. Both are overridden to `#dedede`, the border colour measured on
welcometothejungle.com, with a black focus ring. Note there are two focus
tokens: `InputText` reads `--input-color-border-focused`, `Select` reads
`--input-color-border-active`.

## What only a browser could tell me

The rest of the suite mocks `fetch`, which proves the frontend behaves
correctly given a response — never that the response is the one the backend
sends. Six Playwright specs close that, against the real API and the seeded
database, and the draft-leak regression is finally asserted where it would have
been exploited: a browser, signed out.

The first run failed on something no unit test could have caught. Typing
"frontend" at native speed left `?q=d` in the URL and a single letter in the
box.

The search input was controlled by `filters.query`, which comes from the URL,
and a URL write is asynchronous. Type faster than the round trip and React
re-renders still holding the previous value, resetting the input's DOM value to
it; the next character then replaces rather than appends. Under a test runner
each keystroke is awaited, so every update sees fresh state and the whole class
of bug is invisible.

The fix moved the debounce. The box keeps its own value, which is always
instant, and the URL is written once typing stops — so the URL is still the
thing that is fetched from, shared and restored, it is simply no longer
rewritten eight times while someone types a word. `useJobs` lost its own
debounce in the process: two delays for one wait was one too many.

`@playwright/test` is one of four dependencies added, and this is its
justification. The other three are lint tooling, explained below.

## Two things the endpoint owed the reader

**An ordering, and a date to read it by.** Results are sorted by recency,
title or office, chosen next to the results rather than among the filters —
ordering is not a filter. Every ordering ends on `id`, so paging over rows that
tie on the first column cannot repeat or skip one.

The card carries when the job was posted, which is what makes the default
ordering legible instead of merely true. The API sends a naive datetime, and
`Date` reads that as local time, so east of UTC every job would be posted in
the future; `postedAt` reads it as UTC and refuses to print a future date
regardless, because server and browser clocks disagree by seconds all the time.

**Rejecting an address that is not one.** The apply endpoint took `nope` as an
email, because only the form checked. The rule now sits on `Apply`, the schema
this endpoint validates against, rather than on `Candidate` — a rule there
fails at insert instead of at validation, which is a different path out.

That distinction mattered more than expected. Putting it on `Candidate` first
turned the failure into a **500**: `create_apply/1` matched `{:error, _}`
against what `Repo.transaction` returns for a failed `Ecto.Multi`, which has
four elements, not two. Any failed insert in that flow raised
`CaseClauseError`. That is fixed too, and the failing step's own changeset is
what comes back, so the response names the field that was rejected.

## Using it without a mouse

Walking the page with the keyboard turned up the worst defect in the project,
and it was not one I had written: **nothing opened a filter**. Enter, Space,
ArrowDown, Alt+ArrowDown — the whole ARIA pattern — did nothing on
welcome-ui's `Select`. Once open it operates correctly — arrows move the
highlight, Enter selects, Escape closes — so only the step that makes the rest
reachable was missing, and it was missing on all three filters and the sort
control.

That is WCAG 2.1.1 at Level A. A keydown handler turns the keys the pattern
expects into the click the component already understands, and stays inert once
the list is open so Enter keeps meaning "choose this". There is an end-to-end
test on it, because this is the kind of thing that no unit test and no
Lighthouse run will tell you.

What that fix does not buy is announcement, and an earlier draft of this file
implied otherwise. Arrowing through an open list does update
`aria-activedescendant` — onto the focused element, which carries no role,
while the element with `role="combobox"` never receives it. The attribute is
only honoured on a role that supports it, so the highlight moves on screen and
nothing is said. A sighted keyboard user can follow the list; a screen reader
user cannot. It is written up as finding 3, and it is the one defect in that
document I could not work around from outside the library.

Three more came out of the same pass:

- **The focus ring could not be seen.** Buttons at 1.30:1, inputs and selects
  with `outline: none` and a 1px border change as the entire signal. One
  `:focus-visible` rule now covers everything at 21:1.
- **The page had no title.** `technical-test-frontend-main`, the folder the
  project was generated in. It names the page now, and carries the search
  term, so six open tabs are six different searches.
- **No way past the header.** With twenty jobs a page, returning to the
  results meant tabbing the header and four filters again. A skip link that
  moves focus, not just the scroll position — it points at the results
  section, which is focusable, rather than at a heading, which is not.

## The linter was reading nothing

`yarn lint` passed from the first commit to the thirty-eighth. It was also,
that whole time, reading no application code: `eslint.config.js` matches
`**/*.{js,jsx}`, and every file in `frontend/src` is `.ts` or `.tsx`. The
rules the starter had chosen — `react-hooks/exhaustive-deps` among them — were
switched off everywhere it mattered, and the green tick said otherwise.

Pointing it at `.ts`/`.tsx` needed `typescript-eslint` for the parser. I added
`eslint-plugin-jsx-a11y` at the same time, because the strongest claim this
feature makes is that it can be operated without a mouse, and a claim like
that should be checked by a machine on every commit rather than by me once. It
reports nothing across the app, which is the first evidence for that work that
does not depend on my say-so.

Three violations appeared in code the starter shipped: two `catch (err: any)`,
which is how `err.message` type-checked, and an empty `catch {}` in `SignOut`
that discarded the failure without a word. All one-liners, and all fixed —
a linter that arrives red is a linter the next person turns off.

One warning is left, and deliberately. `react-hook-form`'s `watch()` cannot be
memoized by the React compiler, so the starter's signup form reports
`incompatible-library`. That is a fact about the library.

## Loading is derived, not stored

With the linter finally reading `src/`, `react-hooks/set-state-in-effect`
flagged four hooks, all making the same move: raise a flag in an effect, lower
it when the response lands. It works, and it costs a full re-render before the
request has even been sent — React renders, the effect runs, `setState`
schedules a second render, and only then does anything leave the browser.

Each one now compares instead. `useJobs` records which request produced what is
on screen, so fetching is `settledFor !== requestKey`; a retry counts as a
different request, or asking again for the same thing would look like it had
already arrived. `JobDetail` does the same on the job id. `useCurrentUser` read
an auth cookie in an effect, and cookies are synchronous, so it reads during
the first render — which also removed a visible flash, where the first paint
claimed nobody was signed in and the header changed a frame later.

`useQueryDraft` is the interesting one. It syncs the search box when the URL
moves underneath it — the back button, or clearing the filters — and that is
React's documented case for adjusting state during render rather than after
it: React discards the render in progress and re-runs before touching the DOM,
so the stale text is never painted. The ref it used to compare against had to
become state, because a ref read during render can hold a value from a render
that was thrown away.

A render counter around `useJobs` with a mocked fetch, before and after:
**three renders per filter change, then two**. A third of the renders on the
results list were carrying nothing new.

## Measured, not asserted

Lighthouse on the production build, desktop:

| | |
|---|---|
| Accessibility | **100** |
| Best practices | **100** |
| LCP | **60–96 ms** |
| CLS | **0.0002** |

Accessibility and best practices are 100 on both mobile and desktop.

LCP and CLS are five cold loads of the production build, each in a fresh
browser context so nothing is cached between them, reading
`largest-contentful-paint` and `layout-shift` from `PerformanceObserver`. The
range is the range: CLS was identical on all five, LCP varied by a few tens of
milliseconds.

Worth saying how that number moved, because a single reading is easy to
mistake for a fact. Traced through a browser with a real profile and many tabs
open, the same page reports CLS around 0.04, and the trace attributes all of
it to three webfonts — Work Sans from `fonts.gstatic.com` and welcome-ui's own
two faces from `cdn.welcome-ui.com` — swapping in after first paint. That is
the design system loading its typography, and `index.html` already preconnects
to both origins. Removing the last of it would mean overriding welcome-ui's
`@font-face` rules or hand-fitting fallback metrics to their faces: changing
how the brand renders, to move a number that passes either way.

SEO reports 91, and that one is an artefact rather than a defect: `vite
preview` answers `/robots.txt` with the SPA fallback, so Lighthouse parses
`<!DOCTYPE html>` as a robots directive and objects. A real deployment answers
with a file or a 404, and both pass. Adding a robots.txt to move the number
would be padding.

Getting accessibility to 100 meant fixing two things in `Select`, both from
outside the component.

`aria-autocomplete="list"` sat on an inner div with no role at all, while the
`combobox` role is on the wrapper — an invalid pairing that also does nothing
for anyone, since the element carrying it was never the combobox. Passing the
prop as `undefined` removes it.

The other one mattered more. Every filter announced
as an unnamed combobox, because the control's `aria-labelledby` points at a
downshift id that is never rendered — and `aria-labelledby` is consulted before
anything else, so the `Field` label never got a look in. An `aria-label` on each
`Select` restores the name.

`getByLabelText` had reported all three as labelled the whole time: it falls
back to the `<label for>` association, which exists. The test now asks
`getByRole(..., { name })`, which runs the real accessible name computation and
fails when the name is empty.

## The row that moved the page

Load is one thing; the shift that actually reached a reader was during a
search. Typing into the box makes the active-filter row appear under the
controls, and everything below it — the whole results list — dropped a line.
It lands after the debounce and the round trip, far enough from the keystroke
that the browser scores it as an unexpected shift rather than one that was
asked for.

The row is now reserved whether or not it has anything in it: 45px either way,
measured in both states. The e2e suite records `layout-shift` entries across a
search and a filter change and asserts the total is exactly zero — it was
0.013 before, which is how the problem was found in the first place. The check
starts recording only after the page has settled, so the font swap above is
excluded; it is not this feature's layout to answer for.

## Where the bytes went

| | JS (gzip) |
|---|---|
| Starter, icons broken | 113.7 kB |
| With welcome-ui's full `Sprite` | 150.6 kB |
| With the trimmed sprite | 116.6 kB |
| Plus route-level splitting | **105.4 kB** |

The forms pull in `react-hook-form`, which nobody browsing jobs needs, so every
route except the job list is lazy. The list itself stays in the entry chunk:
making the landing route fetch its own code is a self-inflicted waterfall.

`index.html` also gains `preconnect` for the two font origins the theme pulls
from. Verified they are real: sixteen font faces resolve to `fonts.gstatic.com`
and `cdn.welcome-ui.com`, and neither connection could start until 160kB of CSS
had downloaded and parsed.

---

## Ranking, and what a total costs

**Relevance is a real ordering, not a label.** `ts_rank` over a GIN expression
index on `to_tsvector(title || description)`, which is a different question
from the one the trigram indexes answer: trigrams serve `ILIKE '%front%'`,
which is what someone typing half a word expects to match, and full text
serves *which of the matches is most about the term*. Both are indexed, and
filtering still uses the substring match, so what matches has not changed —
only the order it can be asked for in.

`simple` rather than `english` or `french`: the same table holds "Ingénieur(e)
Senior Frontend" and "Senior QA Engineer", and a stemmer for one language
mangles the other.

Relevance without a query means recency. Ranking every row against an empty
tsquery scores them all zero and leaves the order to chance, which is worse
than saying so.

**The total has a ceiling.** Counting a filtered set costs a scan of
everything that matched, and on a real jobs table that is the most expensive
part of a search request — paid on every keystroke that survives the debounce.
The count now runs against a subquery capped at a thousand, so the cost has a
ceiling, and the response carries `total_is_capped` so the client can render
"1000+" instead of presenting a floor as a total.

That is the honest version of the offset-versus-keyset trade. Keyset removes
the count entirely, but it also removes page numbers — you cannot jump to page
seven without counting what precedes it — and page numbers are what this UI
shows. Bounding the count keeps the interface and removes the unbounded cost.

## Trade-offs I would revisit at scale

**Offset pagination still walks the rows it skips.** The count is bounded now,
but `OFFSET 20000` still reads twenty thousand rows to discard them. That one
is genuinely a contract change: keyset paging means a cursor and a "next"
rather than a page number, so it belongs to a decision about the interface,
not to a tuning pass.

**`CREATE INDEX CONCURRENTLY` is deliberately absent.** It cannot run inside a
transaction, and on a table this size the lock is imperceptible. Against a live
jobs table these belong in their own migration with `@disable_ddl_transaction true`.

**Trigram search will stop being enough.** `ILIKE '%term%'` over a GIN trigram
index handles substrings and typos-by-prefix, but not stemming, ranking or
multilingual analysis. The next step is a `tsvector` column with a ranked
`ts_rank` ordering; the step after that is a dedicated search engine.

**Response validation is hand rolled.** With a schema library this would be a
few lines of Zod. Two endpoints did not feel worth a dependency, and the cost
is the verbosity at the bottom of `api/jobs.ts`.

---

## Two judgement calls on the card

**The description is gone from it.** WTTJ's own result card is title, then a row
of metadata chips, and nothing else — the description lives on the job page. The
card matches that. It is a parity decision, not "the line was useless": the seed
data has three jobs with genuinely different descriptions.

**Apply stayed.** It is the starter's own feature and the README promises an
unregistered visitor can apply, so removing it would be a regression dressed up
as design. It moved onto the metadata row instead: it was 55×25px sitting 816px
away from the job title it belonged to, and twenty of them formed a yellow
column that out-shouted every heading. The whole card is now the click target,
with Apply lifted above the stretched-link overlay.

## What I did not build, and why

- **Infinite scroll.** It breaks the back button, hides the footer, and makes
  a result impossible to link to. A job board is something people share.
- **Autocomplete suggestions.** It needs its own endpoint, its own index and
  its own keyboard semantics. Half of it is worse than none.
- **A results-per-page control.** The API clamps `page_size` and the UI does
  not expose it yet; the plumbing is there when the need is real.

---

## On tooling

Claude Code was used throughout, and the setup that shaped it is committed
rather than described afterwards, because a configuration you can read is a
claim you can check:

| | |
|---|---|
| `CLAUDE.md` | the conventions — component folders, welcome-ui subpath imports, semantic spacing tokens, where query logic lives, the commit format |
| `.claude/rules/frontend.md`, `backend.md` | the same, scoped by path, so the frontend rules load when a `.tsx` is open and not otherwise |
| `.claude/skills/component/` | scaffolding a component in this repo's shape: folder, hook, test, and read a sibling first |
| `.claude/skills/verify/` | how to prove a claim here — request counts, render counts, layout-shift sources, `EXPLAIN` — and to break a new test on purpose before trusting it |
| `.claude/hooks/format.sh` | formats every edited file. `eslint --fix` for TS, `mix format` for Elixir; there is no prettier in this starter |
| `.claude/hooks/guard.sh` | refuses edits to lockfiles and manifests, so a dependency has to be argued for rather than slipped in |
| `.claude/settings.json` | denies reads of `.env*`, `node_modules`, `deps`, `_build` |
| `.mcp.json` | Playwright, for driving a real browser |

The `verify` skill is the one that earned its place. Three claims already
written into these notes turned out to be false when measured, and each hid a
defect: the layout did shift, `aria-activedescendant` was landing on an element
with no role, and a CLS of 0.00 was a single reading with the fonts cached.
Measuring first is now the rule, and the numbers in this file each say how they
were taken.

The guard earned its place differently — by being wrong. It denied edits to
`package.json` on the grounds that no dependency was needed, which stopped
being true the moment the end-to-end suite needed Playwright. A rule the work
disproves is a rule to rewrite, not to work around, so it now asks for the
justification instead of refusing the edit.

Every line here was read, and several were rewritten: the private helpers in
`Ats.Jobs` were moved below the public API, and the first version of the
skeleton animation did nothing at all.

The two findings I am most pleased with came from running the thing rather
than reading it: the missing `animate-*` utilities, and `user-event` hanging
forever under a frozen clock.

---

## Consistency across the rest of the app

The job page was left in the starter's original visual language while the list
moved on, which is worse than leaving both alone — a reviewer clicking through
sees two designs. It now uses the same neutral chips with icons and the same
human labels, instead of raw `FULL_TIME` and `onsite`.

Three things went with that:

- **It had no heading.** The title was a `Text` with no `as`, which renders a
  paragraph, so the page had nothing to navigate to and nothing for a screen
  reader to announce. The same was true of every other page in the app; they
  all have an `h1` now.
- **A "Details" card repeated the chips** — contract type, office and work mode
  a second time, plus the internal `status`, which is meaningless to a
  candidate and always reads "published" on a page only published jobs reach.
- **It declared its own `Job` interface** while `types.ts` already exported one,
  and fetched without an `AbortSignal`, so navigating quickly between two jobs
  let the first response overwrite the second.

`get_job!/1` now preloads `:profession` alongside the applicants, so the job
page can show it. It was already preloaded for the list.

## The icon, and a pass for dead code

The tab showed a generic globe. `index.html` pointed at `/vite.svg`, there is
no `public/` directory, and the dev server answers anything it cannot find with
`index.html` — so every load asked for an icon and was handed a whole HTML
document with a `200` and a `text/html` type. Broken quietly, in the way that
never gets filed.

It now serves the marks the product itself serves, at the two sizes it serves
them: 32×32 for the tab, 180×180 for `apple-touch-icon`. 2.5 kB together.

The same pass looked for code that had stopped being reachable. `knip` over
`src`, every custom rule in `index.css` checked against the components that
use it, and every public and private function in the contexts checked for a
caller. What it found in my own work was small and is gone: a stale
`ApiResponse`/`JobsApiResponse` pair in `types.ts`, made redundant when the
API layer grew its own runtime validation, an `eslint-plugin-react` I had
installed and then not used, and two props types exported by components that
nobody imports them from.

Five unused exports remain — `SignInFormProps`, `SignUpFormProps`,
`SignupParams`, `Applicant`, `Candidate` — along with `postcss` in
`devDependencies`. All of them came with the starter, all of them are in the
sign-in and applicants areas, and none of them are in this feature's way.
Deleting other people's scaffolding to make a linter quieter is not a tidy-up,
it is noise in a diff about job search.

## One hole I found and did not close

`GET /api/jobs/:id` still returns unpublished jobs. The list is sealed —
`search_jobs/1` filters to published, and the end-to-end suite checks that the
seeded draft never appears in results — but the single-job endpoint was not
part of that change and hands a draft to anyone who guesses the id:

```bash
curl localhost:4000/api/jobs/3
# 200 {"data":{"status":"draft","title":"Senior QA Engineer …"}}
```

I left it, deliberately, and it is worth saying why rather than quietly
shipping a half-closed door. The correct fix is not "return 404 for drafts": a
registered user is supposed to see their own unpublished jobs, since this
application is where they create and edit them. So the rule is "published, or
yours" — an authorisation rule, and there is no such rule anywhere in this
codebase to extend. Inventing an ownership model inside a task about search
would be a bigger, less reviewable change than the feature itself.

What I would do with more time: give `show` the same treatment as the list,
behind a session check, and add the fixture that proves an anonymous request
cannot read a draft while its author can.

Worth noting that the commit which sealed the list says `list_jobs/0` and not
"the API", precisely because this was still open when it was written.

---

## Local environment

Two deviations from the starter, neither of them product code:

- `credo` is bumped in `mix.lock`. The locked version fails to compile on
  Elixir 1.20 with a `Regex.CompileError`, which breaks the whole build.
- `.claude/` holds the tooling configuration described above.

Ports are untouched: the app runs against a plain local Postgres on 5432, and
`pg_trgm` installs there without extra privileges.
