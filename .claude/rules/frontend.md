---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# Frontend rules

## Data flow

Filter state lives in the URL via `react-router-dom` search params, not in
`useState`. Reloading the page or sharing the link restores the same results.

The request goes to the API with the filters as query parameters. The browser
never filters an array it already has.

A new request supersedes the previous one: cancel the stale fetch with
`AbortController` so a slow early response cannot overwrite a fast later one.

Text input is debounced before it reaches the network. Typing five characters
sends one request.

## Structure

`src/api/jobs.ts` owns the URL contract with the backend. Build the query string
in a pure exported function so it can be tested without rendering anything.

`useJobs` owns fetching, loading and error state. Components receive data as
props and render it.

## States

Loading, empty and error are explicit branches, not an afterthought. An empty
result says so and offers a way to clear the filters.

## Accessibility

The search controls are a real `<form>` with labelled inputs. Every control is
reachable and operable from the keyboard, with a visible focus state. Do not
rely on placeholder text as the only label.
