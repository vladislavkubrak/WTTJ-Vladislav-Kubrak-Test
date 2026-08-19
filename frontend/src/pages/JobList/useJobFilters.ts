import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { EMPTY_FILTERS, buildJobsQuery, parseJobFilters } from "../../api/jobs";
import type { JobFilters } from "../../types";

/**
 * Holds the search filters in the URL rather than in component state.
 *
 * The URL is the only source of truth here, which buys three things for free:
 * a search can be shared or bookmarked, reloading the page keeps it, and the
 * back button walks the user's own history of searches. Mirroring the same
 * state into `useState` would give two places to disagree.
 *
 * The write helpers are deliberately separate rather than one `set(patch)`,
 * because they differ in how they treat history:
 *
 *   - `setQuery` replaces, so typing eight characters leaves one entry rather
 *     than eight the user has to press back through.
 *   - `setFilter` and `setPage` push, because picking a filter or a page is a
 *     deliberate step and going back to the previous one is expected.
 *
 * Changing any filter resets the page, since holding on to page 4 of results
 * that no longer exist is the classic way to land on an empty list.
 */
export const useJobFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseJobFilters(searchParams), [searchParams]);

  /*
   * Every write derives the next parameters from the previous ones rather than
   * from `filters`, which is a snapshot of the render it was created in.
   *
   * That distinction is not academic. Typing at speed fires several change
   * events before React re-renders, and with the snapshot each of them
   * computed its update from the same stale state, so they overwrote one
   * another: typing "frontend" quickly left `?q=d` in the URL and one
   * character in the input. Only a real browser shows it — under a test
   * runner each keystroke is awaited, so every update sees fresh state.
   */
  const write = useCallback(
    (change: (previous: JobFilters) => JobFilters, replace: boolean) => {
      setSearchParams(
        (previous) => buildJobsQuery(change(parseJobFilters(previous))),
        { replace },
      );
    },
    [setSearchParams],
  );

  const setQuery = useCallback(
    (query: string) =>
      write((previous) => ({ ...previous, query, page: 1 }), true),
    [write],
  );

  const setFilter = useCallback(
    (patch: Partial<Omit<JobFilters, "page">>) =>
      write((previous) => ({ ...previous, ...patch, page: 1 }), false),
    [write],
  );

  const setSort = useCallback(
    (sort: string) => write((previous) => ({ ...previous, sort, page: 1 }), false),
    [write],
  );

  const setPage = useCallback(
    (page: number) => write((previous) => ({ ...previous, page }), false),
    [write],
  );

  const reset = useCallback(() => write(() => EMPTY_FILTERS, false), [write]);

  const isFiltered =
    filters.query !== "" ||
    filters.office !== "" ||
    filters.contractTypes.length > 0 ||
    filters.workModes.length > 0;

  return { filters, isFiltered, setQuery, setFilter, setSort, setPage, reset };
};
