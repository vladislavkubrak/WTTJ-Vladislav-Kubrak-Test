import { useMemo } from "react";

import type { JobFilterOptions, JobFilters } from "../../types";

/** One applied filter, and how to take it off. */
export interface ActiveFilter {
  key: string;
  label: string;
  remove: () => void;
}

/**
 * Flattens the applied filters into one list.
 *
 * The filters are shaped for the URL — a string here, an array there — and
 * the row that displays them wants one flat sequence of "this is on, here is
 * how to turn it off". Doing that conversion in the component put thirty
 * lines of derivation in the middle of its markup.
 *
 * The free text is not among them: it is visible in the search box, and a
 * chip repeating it would be a second place to remove the same thing.
 */
export const useActiveFilters = (
  filters: JobFilters,
  options: JobFilterOptions,
  onFilterChange: (patch: Partial<Omit<JobFilters, "page">>) => void,
): ActiveFilter[] => {
  const labels = useMemo(
    () =>
      new Map(
        [...options.contractTypes, ...options.workModes].map((option) => [
          option.value,
          option.label,
        ]),
      ),
    [options.contractTypes, options.workModes],
  );

  return useMemo(() => {
    const active: ActiveFilter[] = [];

    if (filters.office) {
      active.push({
        key: `office:${filters.office}`,
        label: filters.office,
        remove: () => onFilterChange({ office: "" }),
      });
    }

    for (const value of filters.contractTypes) {
      active.push({
        key: `contract:${value}`,
        label: labels.get(value) ?? value,
        remove: () =>
          onFilterChange({
            contractTypes: filters.contractTypes.filter((it) => it !== value),
          }),
      });
    }

    for (const value of filters.workModes) {
      active.push({
        key: `mode:${value}`,
        label: labels.get(value) ?? value,
        remove: () =>
          onFilterChange({
            workModes: filters.workModes.filter((it) => it !== value),
          }),
      });
    }

    return active;
  }, [filters, labels, onFilterChange]);
};
