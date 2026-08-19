# Job search — how I broke the work down

Written before the first line of the feature, and left in the repository
unchanged, so the plan can be read against what actually happened.

The brief asks for a job search on `GET /api/jobs`, implemented on the backend,
reachable by every visitor. That is one sentence and about a day of decisions,
so the first thing worth doing is deciding what the pieces are and what order
they go in.

## Order

Each ticket depends only on what is already there. Nothing is scaffolded twice
and nothing is written against an interface that does not exist yet.

```
tooling  →  backend  →  app shell  →  data layer  →  screens  →  proofs  →  writing
 001-003     004-006     007-008       009-011      012-016      017        018
```

Tooling first, because a linter that does not read the code and a formatter
nobody runs are worth fixing before there is code to lint. Backend second: the
brief is explicit that the search happens in the database, and the shape of the
API decides what the client can ask for. The frontend then goes bottom-up —
data layer, then the pieces, then the pages that compose them — so every screen
is assembled from parts that already work on their own.

## Tickets

| # | Ticket | Done when |
|---|---|---|
| 001 | Set the rails before writing any of the feature | The conventions of this repo are written down, the assistant runs under them, and the two things I should not have to remember — formatting and manifest edits — are automated |
| 002 | Install the three dev dependencies this needs | Every added package is dev-only and justified in the commit; no runtime dependency, no existing version bumped |
| 003 | Point the linter at the language the app is written in | `yarn lint` reads `src/`, jsx-a11y is on, and the run is green rather than green-because-empty |
| 004 | Search published jobs with composable filters | Free text, office, contract types, work modes and sorting all compose in one query; drafts are unreachable; indexes exist for what the query reads |
| 005 | Expose the search and the values it can be given | The endpoint takes the filters and returns paginated results; the client can ask the server which values it understands rather than hard-coding them |
| 006 | Answer a bad application with 422 instead of a 500 | A malformed application is rejected at the boundary with per-field errors and nothing is written |
| 007 | Give the app its icons, tokens, title and tab | Icons render, the focus ring and borders meet contrast, the tab names the page, the favicon is real |
| 008 | A Select that can be opened without a mouse | Every filter is reachable and operable from the keyboard, and announces its name |
| 009 | One module that knows the shape of the jobs API | Nothing outside `src/api` builds a jobs URL or reads a raw response; responses are validated at runtime |
| 010 | Keep the filters in the URL and the typing out of it | A search survives a reload and a paste; typing costs one URL write per burst and never loses a character |
| 011 | Fetch, cancel, and derive the loading state | A superseded request is aborted; no flag is raised from an effect; the previous results stay on screen |
| 012 | The filter bar, stateless and holding its height | Everything it shows comes from the URL; applying the first filter does not move the page |
| 013 | The results — a card, its facts, and the states around the list | Loading, empty, error and success are each designed; a card is a real link; typing does not rebuild the list |
| 014 | Compose the search page and give it a way past the header | The page only wires hooks to components; a keyboard user can skip to the results |
| 015 | The job page and the three things it can say | Loading, gone and broken are distinguishable, and moving between jobs never shows the previous verdict |
| 016 | The application form with errors that do not move the page | Applying from a result works end to end; a validation error does not shift the layout |
| 017 | End-to-end specs and CI running every gate | The promises that only exist in a browser are asserted in one, and every gate runs on push |
| 018 | Write down the decisions and the ground covered | The reasoning, the criteria and the library defects are readable without opening the diff |

## Definition of done, for all of them

- The gates are green: `mix test`, `mix format --check-formatted`, `tsc`,
  `eslint`, `vitest`, `yarn build`, and from 017 onwards `playwright`.
- New behaviour ships with a test, and the test has been seen to fail — a test
  that has never gone red is a claim, not a check.
- The commit message says *why*. The diff already says what.
- No commit leaves the tree broken.

## Deliberately out of scope

- **Keyset pagination.** Offset costs a count per request and degrades on deep
  pages, but replacing it changes the client contract from page numbers to a
  cursor. That is a decision about the interface, not a tuning pass.
- **Redesigning anything the feature does not touch.** Defects found on the way
  get fixed where they block the search and get written down where they do not.
