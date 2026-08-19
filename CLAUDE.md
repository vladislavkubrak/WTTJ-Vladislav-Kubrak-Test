# ATS — job search feature

Monorepo. `frontend/` is React 19 + TypeScript + Vite. Repo root is a Phoenix/Elixir JSON API.

## Commands

- Backend: `mix setup`, `mix test`, `mix phx.server` (port 4000)
- Frontend: `cd frontend && yarn install`, `yarn dev` (port 5173), `yarn test`
- Database: `docker compose up -d` then `mix ecto.setup`

## Scope

Implement server-side job search on `GET /api/jobs`. Filtering happens in the
database, never on an already-fetched list in the browser.

Do not refactor unrelated code.

Dependencies are a decision, not a reflex. The brief allows new ones "if
needed, but justify your choices", so the rule is: reach for what is installed
first, and if something really is missing, add it and write the justification
in NOTES.md in the same commit. Three were added this way — Playwright for the
end-to-end run, and typescript-eslint with jsx-a11y because the starter's
linter matched `**/*.{js,jsx}` on a TypeScript codebase and so read none of it.
No runtime dependency was added at all.

## Frontend conventions

A component is a folder, not a file:

```
components/JobSearchBar/
  index.tsx        markup and props
  useJobSearch.ts  state and logic
  index.test.tsx   test
```

Logic lives in the hook. The component renders.

Import welcome-ui by subpath: `import { Button } from "welcome-ui/Button"`.
Never `import { Button } from "welcome-ui"`.

Tailwind spacing uses semantic tokens only: `p-xl`, `gap-sm`, `mt-xs`, `mb-lg`.
A raw number such as `p-4` is wrong even when it renders correctly.

Network calls live in `src/api/`, one module per resource, mirroring
`src/api/apply.ts`. Pages and components never call `fetch` directly.

Types come from `src/types.ts`. Do not redeclare a local `interface Job`.

## Backend conventions

Query logic belongs in the context (`lib/ats/jobs.ex`), not in the controller.
The controller reads params and delegates.

Every public function carries `@doc` and `@spec`, matching the existing style
in `lib/ats/jobs.ex`.

Filters compose. Absent or blank params are ignored, so `GET /api/jobs` with no
query string keeps returning every job.

## Tests

New behaviour ships with a test. Frontend uses Vitest and Testing Library;
backend uses ExUnit with the fixtures in `test/support/`.

Test what would break the feature, not what is trivially true. Two focused
tests beat eight shallow ones.

## Commits

Format: `[WTTJ-001]: short imperative summary`

One logical change per commit. No emoji, no generated changelog prose, no
mention of tooling in the message.

## This file

Only a human edits this file. Do not rewrite or extend it to make a task easier.
