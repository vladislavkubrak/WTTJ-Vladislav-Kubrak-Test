import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "welcome-ui/Button";
import { Loader } from "welcome-ui/Loader";
import { Text } from "welcome-ui/Text";

import { buildJobsQuery } from "../../api/jobs";
import { useDocumentTitle } from "../../useDocumentTitle";
import { JobResults } from "../../components/JobResults";
import { JobSearchForm } from "../../components/JobSearchForm";
import { useCurrentUser } from "./useCurrentUser";
import { useJobFilterOptions } from "./useJobFilterOptions";
import { useJobFilters } from "./useJobFilters";
import { useJobs } from "./useJobs";
import { useQueryDraft } from "./useQueryDraft";

/**
 * The job board.
 *
 * This component composes and does nothing else. Each concern lives in its own
 * hook — the filters in the URL, the request lifecycle, the filter options,
 * the session — so each can be read, tested and changed on its own, and the
 * page stays a description of the screen rather than an implementation of it.
 */
export const JobList = () => {
  const { filters, isFiltered, setQuery, setFilter, setSort, setPage, reset } =
    useJobFilters();
  const [draftQuery, setDraftQuery] = useQueryDraft(filters.query, setQuery);
  const options = useJobFilterOptions();
  const { jobs, meta, error, isFetching, isInitialLoading, retry } =
    useJobs(filters);
  const { user, hasToken, signOut } = useCurrentUser();
  const navigate = useNavigate();

  // The tab says what was searched for, so six open tabs are six different
  // searches rather than six copies of the same word.
  useDocumentTitle(filters.query ? `${filters.query} — jobs` : "Jobs");

  const buildPageHref = useCallback(
    (page: number) => {
      const query = buildJobsQuery({ ...filters, page });

      return query ? `/?${query}` : "/";
    },
    [filters],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/signin");
  }, [navigate, signOut]);

  return (
    <main className="p-xl max-w-894 my-0 mx-auto">
      {/*
        Hidden until focused. With twenty jobs on a page, reaching the pager
        means tabbing past forty links, and coming back to the page means
        tabbing past the header and four filters again to reach the results.
      */}
      {/* Points at the section, not its heading: a heading cannot take focus,
          so the browser would scroll there and leave the keyboard behind. The
          section carries tabIndex={-1} and is named "Jobs". */}
      <a
        href="#job-results"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:m-sm focus:p-sm focus:bg-background-neutral-primary focus:rounded-sm"
      >
        Skip to results
      </a>

      <div className="flex items-center justify-between gap-md mb-lg">
        <Text as="h1" variant="heading-xl">
          Job Listings
        </Text>

        {hasToken ? (
          <div className="flex items-center gap-sm">
            {user ? (
              <>
                <Text variant="body-sm">{user.email}</Text>
                <Button size="md" variant="secondary" onClick={handleSignOut}>
                  Logout
                </Button>
              </>
            ) : (
              <Loader size="sm" />
            )}
          </div>
        ) : (
          <div className="flex gap-sm">
            <Button as={Link} to="/signup" size="md">
              Sign up
            </Button>
            <Button as={Link} to="/signin" size="md" variant="secondary">
              Sign in
            </Button>
          </div>
        )}
      </div>

      {user && (
        <div className="flex items-center justify-end gap-sm mb-md">
          <Button as={Link} to="/jobs/new" size="md">
            Create a new job
          </Button>
        </div>
      )}

      <JobSearchForm
        filters={filters}
        query={draftQuery}
        options={options}
        isFiltered={isFiltered}
        onQueryChange={setDraftQuery}
        onFilterChange={setFilter}
        onReset={reset}
      />

      <JobResults
        jobs={jobs}
        meta={meta}
        error={error}
        isFetching={isFetching}
        isInitialLoading={isInitialLoading}
        isFiltered={isFiltered}
        sort={filters.sort}
        sortOptions={options.sorts}
        onSortChange={setSort}
        onResetFilters={reset}
        onRetry={retry}
        onPageChange={setPage}
        buildPageHref={buildPageHref}
      />
    </main>
  );
};
