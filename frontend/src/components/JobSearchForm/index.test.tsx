import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { JobSearchForm } from ".";
import { EMPTY_FILTERS } from "../../api/jobs";
import type { JobFilterOptions, JobFilters } from "../../types";

const options: JobFilterOptions = {
  offices: ["Paris", "Nantes"],
  contractTypes: [
    { value: "FULL_TIME", label: "Full-Time" },
    { value: "INTERNSHIP", label: "Internship" },
  ],
  workModes: [
    { value: "onsite", label: "On site" },
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
  ],
  sorts: [{ value: "recent", label: "Most recent" }],
};

const renderForm = (
  overrides: {
    filters?: Partial<JobFilters>;
    isFiltered?: boolean;
  } = {},
) => {
  const onQueryChange = vi.fn();
  const onFilterChange = vi.fn();
  const onReset = vi.fn();
  const filters = { ...EMPTY_FILTERS, ...overrides.filters };

  render(
    <JobSearchForm
      filters={filters}
      query={filters.query}
      options={options}
      isFiltered={overrides.isFiltered ?? false}
      onQueryChange={onQueryChange}
      onFilterChange={onFilterChange}
      onReset={onReset}
    />,
  );

  return { onQueryChange, onFilterChange, onReset };
};

describe("JobSearchForm", () => {
  it("names the search field", () => {
    renderForm();

    expect(screen.getByRole("searchbox", { name: /search jobs/i })).toBeVisible();
  });

  it("names each filter as assistive technology computes the name", () => {
    renderForm();

    /*
     * `getByLabelText` is not enough here, and that is the point: it falls back
     * to the `<label for>` association and so reported these as labelled while
     * every one of them announced as an unnamed combobox. welcome-ui points the
     * control's `aria-labelledby` at a downshift id it never renders, and
     * `aria-labelledby` is consulted before anything else.
     *
     * `getByRole(..., { name })` runs the real accessible name computation, so
     * it fails when the name is empty.
     */
    expect(screen.getByRole("combobox", { name: "Office" })).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Contract type" }),
    ).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Work mode" })).toBeVisible();
  });

  it("leaves no aria attribute on an element whose role forbids it", () => {
    renderForm();

    // `aria-autocomplete` is only valid on combobox, textbox or searchbox.
    // welcome-ui put it on a roleless inner div while the combobox role sits
    // on the wrapper, which is the one thing Lighthouse still flagged.
    const misplaced = [...document.querySelectorAll("[aria-autocomplete]")].filter(
      (element) =>
        !["combobox", "textbox", "searchbox"].includes(
          element.getAttribute("role") ?? "",
        ),
    );

    expect(misplaced).toHaveLength(0);
  });

  it("is a search landmark, so it can be jumped to directly", () => {
    renderForm();

    expect(screen.getByRole("search", { name: "Job search" })).toBeVisible();
  });

  it("reports every keystroke, and leaves the debouncing to its caller", async () => {
    const user = userEvent.setup();
    const { onQueryChange } = renderForm();

    await user.type(screen.getByRole("searchbox"), "abc");

    // Three characters, three calls: the component holds no state of its own,
    // which is what keeps the URL and the input from disagreeing.
    expect(onQueryChange).toHaveBeenCalledTimes(3);
    expect(onQueryChange).toHaveBeenLastCalledWith("c");
  });

  it("shows the query it is given rather than one of its own", () => {
    renderForm({ filters: { query: "elixir" } });

    expect(screen.getByRole("searchbox")).toHaveValue("elixir");
  });

  it("only offers to clear filters when there are filters to clear", () => {
    renderForm({ isFiltered: false });

    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it("clears the filters and takes focus back to the search field", async () => {
    const user = userEvent.setup();
    const { onReset } = renderForm({
      filters: { query: "elixir" },
      isFiltered: true,
    });

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("does not reload the page when the form is submitted", async () => {
    const user = userEvent.setup();
    renderForm();

    // There is no submit step; pressing Enter must be a no-op rather than a
    // full page navigation that throws away the results.
    await user.type(screen.getByRole("searchbox"), "{Enter}");

    expect(screen.getByRole("search")).toBeVisible();
  });
});
