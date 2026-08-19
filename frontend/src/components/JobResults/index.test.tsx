import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { JobResults } from ".";
import type { Job, JobsMeta } from "../../types";

const buildJob = (id: number, overrides: Partial<Job> = {}): Job => ({
  id,
  title: `Job ${id}`,
  description: "Description",
  contract_type: "FULL_TIME",
  contract_type_label: "Full-Time",
  office: "Paris",
  status: "published",
  work_mode: "remote",
  work_mode_label: "Remote",
  profession_id: 1,
  profession: "Software Engineering",
  inserted_at: "2026-08-01T00:00:00",
  updated_at: "2026-08-01T00:00:00",
  ...overrides,
});

const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "title", label: "Title A–Z" },
];

const buildMeta = (overrides: Partial<JobsMeta> = {}): JobsMeta => ({
  total: 1,
  total_is_capped: false,
  page: 1,
  page_size: 20,
  total_pages: 1,
  ...overrides,
});

const renderResults = (props: Partial<Parameters<typeof JobResults>[0]> = {}) => {
  const onPageChange = vi.fn();
  const onResetFilters = vi.fn();
  const onRetry = vi.fn();
  const onSortChange = vi.fn();

  render(
    <MemoryRouter>
      <JobResults
        jobs={[buildJob(1)]}
        meta={buildMeta()}
        error={null}
        isFetching={false}
        isInitialLoading={false}
        isFiltered={false}
        sort=""
        sortOptions={SORTS}
        onSortChange={onSortChange}
        onResetFilters={onResetFilters}
        onRetry={onRetry}
        onPageChange={onPageChange}
        buildPageHref={(page) => `/?page=${page}`}
        {...props}
      />
    </MemoryRouter>,
  );

  return { onPageChange, onResetFilters, onRetry, onSortChange };
};

describe("JobResults", () => {
  it("shows placeholders only while there is nothing to show yet", () => {
    const { rerender } = render(
      <MemoryRouter>
        <JobResults
          jobs={[]}
          meta={null}
          error={null}
          isFetching
          isInitialLoading
          isFiltered={false}
          sort=""
          sortOptions={SORTS}
          onSortChange={vi.fn()}
          onResetFilters={vi.fn()}
          onRetry={vi.fn()}
          onPageChange={vi.fn()}
          buildPageHref={() => "/"}
        />
      </MemoryRouter>,
    );

    const skeleton = screen.getByTestId("job-list-skeleton");
    expect(skeleton).toBeInTheDocument();
    // The status line already says the page is loading; four fake cards
    // announced on top of that would be noise.
    expect(skeleton).toHaveAttribute("aria-hidden", "true");

    rerender(
      <MemoryRouter>
        <JobResults
          jobs={[buildJob(1)]}
          meta={buildMeta()}
          error={null}
          isFetching={false}
          isInitialLoading={false}
          isFiltered={false}
          sort=""
          sortOptions={SORTS}
          onSortChange={vi.fn()}
          onResetFilters={vi.fn()}
          onRetry={vi.fn()}
          onPageChange={vi.fn()}
          buildPageHref={() => "/"}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("job-list-skeleton")).not.toBeInTheDocument();
  });

  it("keeps stale results on screen underneath an error", () => {
    renderResults({ error: "The server is unavailable" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The server is unavailable",
    );
    // Dropping the results on a transient failure throws away the context the
    // user already had.
    expect(screen.getByTestId("job-card")).toBeVisible();
  });

  it("offers a way to recover, not just an apology", async () => {
    const user = userEvent.setup();
    const { onRetry } = renderResults({ error: "The server is unavailable" });

    // Telling the user to try again without giving them a control to do it is
    // an instruction the page then refuses to carry out.
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("offers ordering next to the results, not among the filters", () => {
    renderResults({
      jobs: [buildJob(1), buildJob(2)],
      meta: buildMeta({ total: 12 }),
    });

    // Presence and naming here; that choosing an option actually reorders the
    // list is asserted in the e2e suite, where the dropdown really opens.
    expect(
      screen.getByRole("combobox", { name: "Sort results" }),
    ).toBeVisible();
  });

  it("does not offer to order a single result", () => {
    renderResults({ jobs: [buildJob(1)], meta: buildMeta({ total: 1 }) });

    // A control that cannot change anything is noise.
    expect(
      screen.queryByRole("combobox", { name: "Sort results" }),
    ).not.toBeInTheDocument();
  });

  it("hides the pager when everything fits on one page", () => {
    renderResults({ meta: buildMeta({ total: 3, total_pages: 1 }) });

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("renders pages as real links, and reports the current one", () => {
    renderResults({
      jobs: [buildJob(1)],
      meta: buildMeta({ total: 60, page: 2, total_pages: 3 }),
    });

    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute(
      "href",
      "/?page=3",
    );
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("takes the reader to the new results after paging", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const { rerender } = render(
      <MemoryRouter>
        <JobResults
          jobs={[buildJob(1)]}
          meta={buildMeta({ total: 60, page: 1, total_pages: 3 })}
          error={null}
          isFetching={false}
          isInitialLoading={false}
          isFiltered={false}
          sort=""
          sortOptions={SORTS}
          onSortChange={vi.fn()}
          onResetFilters={vi.fn()}
          onRetry={vi.fn()}
          onPageChange={vi.fn()}
          buildPageHref={(page) => `/?page=${page}`}
        />
      </MemoryRouter>,
    );

    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <JobResults
          jobs={[buildJob(2)]}
          meta={buildMeta({ total: 60, page: 2, total_pages: 3 })}
          error={null}
          isFetching={false}
          isInitialLoading={false}
          isFiltered={false}
          sort=""
          sortOptions={SORTS}
          onSortChange={vi.fn()}
          onResetFilters={vi.fn()}
          onRetry={vi.fn()}
          onPageChange={vi.fn()}
          buildPageHref={(page) => `/?page=${page}`}
        />
      </MemoryRouter>,
    );

    // The pager sits below a screenful of results, so without this the reader
    // stays at the bottom of a page they have already read — and the keyboard
    // user loses focus to <body> when the link they used is re-rendered.
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(screen.getByTestId("job-results")).toHaveFocus();
  });

  it("changes page without leaving the app", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderResults({
      meta: buildMeta({ total: 60, page: 1, total_pages: 3 }),
    });

    await user.click(screen.getByRole("link", { name: "2" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("names the results list so it is distinguishable from the filter tags", () => {
    renderResults({ jobs: [buildJob(1), buildJob(2)] });

    // The multi-selects in the filter bar also expose `role="list"`; without a
    // name here the two are indistinguishable to assistive technology.
    expect(
      screen.getByRole("list", { name: "Job results" }),
    ).toBeInTheDocument();
  });
});
