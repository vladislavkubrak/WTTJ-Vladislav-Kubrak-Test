import { memo, useEffect, useRef } from "react";
import { Alert } from "welcome-ui/Alert";
import { Button } from "welcome-ui/Button";
import { Pagination } from "welcome-ui/Pagination";

import { JobCard } from "../JobCard";
import { JobListSkeleton } from "./JobListSkeleton";
import { NoResults } from "./NoResults";
import { ResultsHeader } from "./ResultsHeader";
import type { EnumOption, Job, JobsMeta } from "../../types";

interface JobResultsProps {
  jobs: Job[];
  meta: JobsMeta | null;
  error: string | null;
  isFetching: boolean;
  isInitialLoading: boolean;
  isFiltered: boolean;
  sort: string;
  sortOptions: EnumOption[];
  onSortChange: (sort: string) => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  buildPageHref: (page: number) => string;
}

/**
 * The results half of the page: the header, the list, and the pager.
 *
 * Memoised, and it earns it. Every keystroke in the search box re-renders the
 * page while the URL is still catching up, and none of what this shows can
 * have changed in that moment — the request has not been sent yet. Without it,
 * twenty cards, their tags and their stretched links were rebuilt on every
 * character typed. Every prop it takes is either state or a `useCallback`, so
 * the comparison actually holds.
 */
const JobResultsComponent = ({
  jobs,
  meta,
  error,
  isFetching,
  isInitialLoading,
  isFiltered,
  sort,
  sortOptions,
  onSortChange,
  onResetFilters,
  onRetry,
  onPageChange,
  buildPageHref,
}: JobResultsProps) => {
  const total = meta?.total ?? 0;
  const showNoResults = !isInitialLoading && !error && jobs.length === 0;
  const section = useFocusOnPageChange(meta?.page);

  return (
    <section
      ref={section}
      id="job-results"
      // Focusable only by script: it is a landing place after paging and the
      // target of the skip link, not a stop in the tab order.
      tabIndex={-1}
      aria-labelledby="job-results-heading"
      aria-busy={isFetching}
      data-testid="job-results"
      /*
       * From the second request onwards the skeleton is gone by design — the
       * previous results stay on screen — which left the page silent while it
       * worked. Dimming it is the smallest honest signal.
       *
       * Skipped during the first load so it cannot multiply with the
       * skeleton's own pulse and fade it to nothing.
       */
      className={
        isInitialLoading
          ? undefined
          : "motion-safe:transition-opacity motion-safe:duration-200 aria-busy:opacity-60"
      }
    >
      <ResultsHeader
        total={total}
        isCapped={meta?.total_is_capped ?? false}
        hasCount={meta !== null}
        isFiltered={isFiltered}
        isInitialLoading={isInitialLoading}
        sort={sort}
        sortOptions={sortOptions}
        onSortChange={onSortChange}
      />

      {error && (
        <Alert
          variant="danger"
          role="alert"
          isFullWidth
          className="mb-md"
          /*
           * "Please try again" with no way to try again is an instruction the
           * page refuses to carry out. The retry re-runs the same request:
           * nothing about what was asked was wrong.
           */
          cta={
            <Button size="md" variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          }
        >
          <Alert.Title>The jobs did not load</Alert.Title>
          {error}
        </Alert>
      )}

      {isInitialLoading && <JobListSkeleton />}

      {showNoResults && (
        <NoResults isFiltered={isFiltered} onResetFilters={onResetFilters} />
      )}

      {jobs.length > 0 && (
        <ul
          aria-label="Job results"
          className="flex flex-col gap-md list-none p-0 m-0"
        >
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="mt-xl flex justify-center">
          <Pagination
            page={meta.page}
            pageCount={meta.total_pages}
            onChange={(page) => onPageChange(Number(page))}
            // Real anchors rather than buttons: a page of results deserves a
            // URL you can open in a new tab. welcome-ui prevents the default,
            // so navigation stays client side.
            getHref={(page) => buildPageHref(Number(page))}
            aria-label="Job results pages"
          />
        </div>
      )}
    </section>
  );
};

/**
 * Sends the reader to the results when the page changes.
 *
 * The pager sits below a screenful of results and replaces everything above
 * it, so without this the reader is left at the bottom of a page they have
 * already read — and a keyboard user is worse off still: the link they
 * activated is re-rendered underneath them and focus falls back to `<body>`.
 */
const useFocusOnPageChange = (page: number | undefined) => {
  const section = useRef<HTMLElement>(null);
  const rendered = useRef(page);

  useEffect(() => {
    // First paint, or a change that is not a page change.
    if (page === undefined || rendered.current === undefined) {
      rendered.current = page;
      return;
    }

    if (page === rendered.current) return;

    rendered.current = page;

    // Optional call: matchMedia is absent in jsdom, and a missing media query
    // API is no reason for paging to throw.
    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // Focus first, without letting it scroll: `focus()` performs its own
    // minimal scroll, which lands on the nearest edge and cancels the smooth
    // scroll started after it.
    section.current?.focus({ preventScroll: true });
    section.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [page]);

  return section;
};

export const JobResults = memo(JobResultsComponent);
