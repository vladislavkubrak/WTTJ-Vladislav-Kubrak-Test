import { useCallback, useEffect, useState } from "react";

import { buildJobsQuery, listJobs } from "../../api/jobs";
import type { Job, JobFilters, JobsMeta } from "../../types";

const FALLBACK_ERROR = "Something went wrong while loading the jobs.";

/** What the last finished request produced, and which request that was. */
interface SettledJobs {
  jobs: Job[];
  meta: JobsMeta | null;
  error: string | null;
  settledFor: string | null;
  hasLoaded: boolean;
}

const NOTHING_SETTLED: SettledJobs = {
  jobs: [],
  meta: null,
  error: null,
  settledFor: null,
  hasLoaded: false,
};

/**
 * Turns filters into results.
 *
 * Three things this hook is responsible for, all of which are invisible when
 * they work and obvious when they do not:
 *
 *   - Only the free text query is debounced. Picking a filter or a page is a
 *     single deliberate action and should feel immediate; typing is a burst
 *     and should cost one request, not one per character.
 *
 *   - Every request is cancellable, and the effect aborts the previous one
 *     before starting the next. Without that, two requests race and the slower
 *     one wins simply by finishing last — the user sees results for a query
 *     they have already moved on from.
 *
 *   - The previous page stays on screen while the next one loads. Clearing the
 *     list first would collapse the layout on every keystroke, which is both
 *     unpleasant to look at and a cumulative layout shift.
 *
 * "Loading" is derived rather than stored. The obvious shape — set a flag when
 * the effect starts, clear it when the response lands — costs an extra render
 * of the whole page every time a filter changes, before a single byte has come
 * back. Recording which request the state on screen belongs to gives the same
 * answer by comparison, so the only renders left are the ones with new data in
 * them.
 */
export const useJobs = (filters: JobFilters) => {
  const query = buildJobsQuery(filters);

  const [settled, setSettled] = useState<SettledJobs>(NOTHING_SETTLED);

  // Bumping this re-runs the effect with an unchanged query, which is what
  // "try again" means: the request did not fail because of what was asked.
  const [attempt, setAttempt] = useState(0);

  // Identifies one request. A retry has to count as a different one, or asking
  // again for the same thing would look like it had already arrived.
  const requestKey = `${attempt}:${query}`;
  const isFetching = settled.settledFor !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    listJobs(query, controller.signal)
      .then((page) => {
        // `fetch` rejects on abort, but a mocked or already-settled response
        // can still land here. Checking the signal makes the guarantee
        // explicit rather than inherited.
        if (controller.signal.aborted) return;

        setSettled({
          jobs: page.jobs,
          meta: page.meta,
          error: null,
          settledFor: requestKey,
          hasLoaded: true,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        // The stale results stay visible under the error: showing the user an
        // empty page on a transient failure loses the context they had.
        setSettled((previous) => ({
          ...previous,
          settledFor: requestKey,
          error: error instanceof Error ? error.message : FALLBACK_ERROR,
        }));
      });

    return () => controller.abort();
  }, [query, requestKey]);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);

  return {
    retry,
    isFetching,
    jobs: settled.jobs,
    meta: settled.meta,
    // A request in flight clears the previous failure, so a retry does not
    // show the old error underneath the new attempt.
    error: isFetching ? null : settled.error,
    // The very first load has nothing to keep on screen, so that is the only
    // moment a skeleton is the right answer.
    isInitialLoading: isFetching && !settled.hasLoaded,
  };
};
