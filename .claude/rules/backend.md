---
paths:
  - "lib/**/*.ex"
  - "test/**/*.exs"
---

# Backend rules

## Where code goes

`Ats.Jobs` owns the query. `JobController` reads params and delegates. A
controller that builds an Ecto query is in the wrong place.

`import Ecto.Query` is already present in `lib/ats/jobs.ex`. Compose with
`from`/`where` rather than filtering in Elixir after `Repo.all/1`.

## Filter semantics

Text matches are case-insensitive and partial (`ilike`). Enum fields match
exactly.

Filters combine with AND. A blank or missing param is skipped entirely, so
`list_jobs/1` with an empty map behaves exactly like the old `list_jobs/0`.

Keep the existing arity working, or update every caller in the same commit.

## Style

Public functions carry `@doc` and `@spec`, matching the file they live in.

## Tests

Cover each filter alone, two filters combined, no filters, and a query that
matches nothing. Use the fixtures already in `test/support/`.
