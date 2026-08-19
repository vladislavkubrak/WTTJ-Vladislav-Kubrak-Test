# Checklist

The brief's own evaluation criteria, each with where to look and how to check
it. Unticked boxes are things I decided against or ran out of room for, and
they say which.

Gates, all green:

```
mix test                                      86 passed
cd frontend && npx tsc --noEmit               clean
cd frontend && yarn lint                      0 errors (TS + jsx-a11y)
cd frontend && npx vitest run                 99 passed
cd frontend && yarn build                     106.9 kB gzip
cd frontend && yarn test:e2e                   9 passed
```

Four dependencies added, all dev-only, none reaching the bundle:
`@playwright/test` for the end-to-end run, and `typescript-eslint`,
`eslint-plugin-jsx-a11y` and `eslint-plugin-react` because the starter's
linter matched `**/*.{js,jsx}` on a TypeScript codebase and was therefore
reading none of it.

---

## The task

> That new feature must allow all users to search for jobs … using various
> parameters like job title, location, work mode, etc.

- [x] Search by **job title** — `q`, partial and case insensitive
- [x] Search by **description** — same parameter
- [x] Search by **profession** — same parameter, joined from `professions`
- [x] Filter by **location** — `office`, partial and case insensitive
- [x] Filter by **work mode** — one or more values
- [x] Filter by **contract type** — one or more values
- [x] **Order** by recency, relevance, title or office, each with a stable
      tiebreak; relevance is `ts_rank` over a full text index, not a label
- [x] Filters combine with AND — `test/ats/jobs_test.exs`
- [x] No filters returns everything published
- [x] Available to **all users**, signed in or not — no auth on `GET /api/jobs`
- [x] Applying to a job from a search result still works — verified end to end
- [x] Pagination, with a total the client can page on

> You will have to implement the backend functionality.

- [x] Filtering happens in SQL, not on a list already fetched by the client
- [x] `search_jobs/1` in `lib/ats/jobs.ex`, composable filter functions
- [x] Indexed for it — trigram GIN on the text columns, composite on
      `(status, inserted_at DESC, id DESC)`

---

## Frontend criteria

**React best practices and component architecture**

- [x] The page composes and nothing else — `pages/JobList/index.tsx`
- [x] Search form, results and card are separate, each with one job
- [x] Presentational components hold no state: everything arrives as props
- [x] Follows the repository's own convention — folder, `index.tsx`, hook, test

**Proper use of hooks and state management**

- [x] The URL holds the filters, so a search is shareable and survives a
      reload. The one exception is the text being typed, which is held locally
      and written once typing stops — a controlled input fed by asynchronous
      state loses characters, and the e2e run proved it
- [x] One hook per concern: filters, the draft query, data, filter options,
      session
- [x] Requests are cancelled, not merely ignored, and a superseded response
      never reaches the screen
- [x] One debounce, in one place: the URL write. A filter click is immediate
- [x] No `eslint-disable` anywhere in `src/`
- [x] No cascading renders: nothing raises a loading flag from an effect. A
      render counter around `useJobs` measured 3 renders per filter change
      before and 2 after
- [x] Typing does not rebuild the results. `JobResults` is memoised, and a
      Profiler over twenty cards measured 1.79 ms per keystroke before and
      1.39 ms after

**Code organization and reusability**

- [x] Data layer in `src/api`, one module per resource
- [x] The URL contract lives in one place, both directions
- [x] `getJob` shared by the job page and the application form
- [x] Enum labels resolved once, on the server, rather than per component

**UI/UX quality with welcome-ui**

- [x] welcome-ui components throughout; custom CSS only where the library has
      nothing (skeleton animation)
- [x] Loading, empty, error and success states all designed, not defaulted
- [x] An error offers a way to recover rather than an apology
- [x] Layout holds still: results stay while the next page loads, form errors
      reserve their line, and the active-filter row reserves its height — it
      used to appear on the first filter and push the results down. The e2e
      suite asserts a layout-shift total of exactly zero across a search
- [x] Responsive from 375px up, no horizontal scroll
- [x] Sixteen defects found in the library, written up in
      [WELCOME-UI-FINDINGS.md](WELCOME-UI-FINDINGS.md)
- [x] Lighthouse accessibility **100** on mobile and desktop, best practices
      **100**. LCP **64–68 ms**, CLS **0.0002**, across five cold loads in a
      fresh browser context
- [x] Operable by keyboard alone, which it was not: nothing opened a filter,
      so every way of narrowing the search needed a pointer. WCAG 2.1.1,
      Level A, and there is an e2e test on it now
- [x] A focus ring that can be seen — 21:1, where the library shipped 1.30:1
      on buttons and none at all on inputs
- [x] A skip link that moves focus rather than only scrolling
- [x] A page title that names the page, and the search in it

**Testing quality and coverage**

- [x] 86 backend, 99 frontend, 9 end to end
- [x] The things that break silently: one request per burst of typing, a stale
      response discarded, drafts never served, no layout shift, every icon
      resolving, every filter having an accessible name
- [x] Tests named for the behaviour, so a failure reads as a broken promise
- [x] The three answers the job page can give — loading, gone, broken — are
      each tested, including the one case that only appears mid-navigation.
      That spec was checked by breaking the code on purpose: it fails when the
      outcome stops being keyed to the job it was decided for
- [x] **End-to-end in a real browser** — `frontend/e2e/job-search.spec.ts`,
      nine specs against the real API and database. It found a bug the mocked
      suite could not: see NOTES.md, "What only a browser could tell me".

**TypeScript usage and type safety**

- [x] `strict`, plus `noUnusedLocals`, `noUnusedParameters`,
      `noUncheckedIndexedAccess` — all from the starter, none relaxed
- [x] The linter reads the application. It matched `**/*.{js,jsx}` on a
      TypeScript codebase, so every rule was off for `src/`; it now covers
      `.ts`/`.tsx` and adds jsx-a11y, and passes with no errors
- [x] No `any` in `src/`
- [x] Responses validated at runtime, because types do not survive to it
- [x] Enum-backed fields typed as `string` on purpose: narrowing them would
      make the client reject a job the day the backend adds a contract type

**Search functionality is done on the backend**

- [x] Confirmed above

---

## Overall criteria

**Git commit history and messages**

- [x] One commit per ticket, `[WTTJ-0NN]` prefixed
- [x] Each says why, not what — the diff already says what
- [x] No commit leaves the tree failing

**Code documentation and comments**

- [x] Comments explain decisions and dead ends, not syntax
- [x] `@doc` and `@spec` on every public function added to the context
- [x] [NOTES.md](NOTES.md) for the decisions, this file for the ground covered,
      [WELCOME-UI-FINDINGS.md](WELCOME-UI-FINDINGS.md) for the library

**Problem-solving approach**

- [x] Two bugs found and fixed on the way: drafts were public, and
      `contract_type/1` returned `nil` for two of the seven contract types
- [x] And one I caused: validating `/api/me` against the starter's `id: string`
      annotation, where the API sends a number, left every signed-in visitor
      with a spinner instead of a header. Fixed, and the header now resolves
      even when the token is refused
- [x] A third under the feature itself: `Job.changeset/2` never cast
      `profession_id`, so no job created through the API could have one
- [x] Trade-offs named with what would change them, not left implied

**Attention to requirements**

- [x] The required feature first, and complete
- [x] Where I went past it and why: [NOTES.md](NOTES.md), "Where I stopped, and
      where I did not"
- [x] LLM usage stated plainly: [NOTES.md](NOTES.md), "On tooling"
- [x] The readme points at all of it

---

## Not done, deliberately

- [ ] **Keyset pagination.** The count is bounded at a thousand now, so a
      search no longer pays for a full `COUNT` — but `OFFSET 20000` still reads
      twenty thousand rows to throw them away. Fixing that means a cursor and a
      "next" instead of page numbers, which changes the client contract: a
      decision about the interface, not a tuning pass.
- [ ] **Screen reader and 200% zoom.** Checked by hand in VoiceOver and at 200%,
      and both behave — but neither is in CI, so I can only tell you I looked,
      not prove it on every commit.
