---
name: verify
description: Prove a claim about this app with a measurement instead of an assertion — render counts, request counts, layout shift, index usage, accessible names. Use before writing any performance, accessibility or "it works" claim into a commit message, NOTES.md or CHECKLIST.md.
---

# Prove it, then write it down

Every number in this repo's documentation came from a measurement. That is the
rule this skill exists to keep, because the alternative is plausible prose, and
plausible prose is how a solution ends up claiming a thing it does not do.

A claim goes in a document only after it has been measured. If it cannot be
measured, it is written as a judgement, not as a fact.

## The measurement always beats the reasoning

Three claims in this repo were written from reasoning and turned out to be
false. Each one was caught by measuring it, and each hid a real defect:

- "The layout holds still." It did not — the active-filter row appeared on the
  first filter and pushed the results down, 0.013.
- "`aria-activedescendant` follows the highlight." It does, onto an element
  with no role, where it does nothing.
- "CLS is 0.00." That was one reading with the fonts already cached.

So: measure first, and if the number disagrees with what you were about to
write, the number is right.

## How to measure the things this app claims

**Requests per interaction** — wrap `window.fetch`, count what leaves. Typing
eight characters must produce one request; choosing a filter must produce one
immediately.

**A superseded request is cancelled, not ignored** — listen on the
`AbortSignal` passed to `fetch` and assert the abort fires before the next
request is sent.

**Renders** — a `<Profiler>` around the subtree, or a counter in the body of a
hook under `renderHook`. Record the number before the change and after it; a
memoisation with no before-and-after is a guess.

**Layout shift** — a `PerformanceObserver` on `layout-shift` in a Playwright
spec, started after `networkidle` so webfonts are excluded. Assert on the
*source* of each shift, not on a total: results moving when the results change
is the feature working.

**Accessible names and roles** — `getByRole(..., { name })`, never
`getByLabelText`, which falls back to a `<label for>` that may point at
nothing. In a browser, read the computed attribute off the element that
actually carries the role.

**Index usage** — `EXPLAIN` the query the context builds against a table with
enough rows to make a sequential scan unattractive, and read the plan.

## Tests get the same treatment

A test that has never been seen to fail is a claim, not a check. After writing
one, break the code it covers on purpose, watch it go red, restore the code,
watch it go green. If it stays green, it is testing nothing.

Say so in the commit message when you have done this — it is the difference
between a test and a decoration.

## Writing it down

Put the number and the method next to each other: "1.79 ms per keystroke before
and 1.39 ms after, Profiler over twenty cards" is checkable. "Fewer renders" is
not. A range is fine when the measurement varies — say it is a range and give
the runs.
