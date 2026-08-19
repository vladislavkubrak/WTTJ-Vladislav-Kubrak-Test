---
name: component
description: Scaffold a frontend component in this repo's convention — folder with index.tsx, the hook, and the test. Use when adding any new component under frontend/src/components.
---

# Scaffold a component

Create `frontend/src/components/<Name>/` with exactly three files.

## index.tsx

Presentational. Receives data and callbacks as props, renders welcome-ui
components imported by subpath, spaces with semantic Tailwind tokens.

Give the root element a `data-testid` in kebab-case so the test can find it,
matching `ApplyForm` which uses `data-testid="apply-form"`.

## use<Name>.ts

Holds state, effects and any call into `src/api/`. Returns a plain object.
No JSX in this file.

## index.test.tsx

Vitest plus Testing Library, in the style of the existing
`components/ApplyForm/index.test.tsx`.

Assert behaviour, not markup: what the user can do and what the component
reports back. A render smoke test alone is not enough for a component that
holds logic.

## Before finishing

Read a sibling component first and match it. If this component needs something
the convention does not cover, say so instead of inventing a new pattern.
