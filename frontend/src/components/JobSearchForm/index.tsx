import { useCallback, useRef } from "react";
import { Field } from "welcome-ui/Field";
import { Icon } from "welcome-ui/Icon";
import { InputText } from "welcome-ui/InputText";
import { Select } from "../Select";

import { ActiveFilters } from "./ActiveFilters";
import { useActiveFilters } from "./useActiveFilters";
import type { JobFilterOptions, JobFilters } from "../../types";

interface JobSearchFormProps {
  filters: JobFilters;
  /**
   * What is in the search box right now, which runs ahead of `filters.query`
   * until the typing stops. Keeping them separate is what stops a fast typist
   * losing characters — see `useQueryDraft`.
   */
  query: string;
  options: JobFilterOptions;
  isFiltered: boolean;
  onQueryChange: (query: string) => void;
  onFilterChange: (patch: Partial<Omit<JobFilters, "page">>) => void;
  onReset: () => void;
}

const toValues = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

/**
 * Suppresses the chips welcome-ui's multi-select renders under its control,
 * so `ActiveFilters` can state everything applied once, in one row.
 */
const renderNothing = () => <></>;

const summarise = (values: string[], empty: string) =>
  values.length === 0 ? empty : `${values.length} selected`;

/**
 * The filter bar.
 *
 * Stateless: everything it shows comes from the URL through props, which is
 * what makes a shared link reproduce the sender's screen exactly.
 *
 * It deliberately does not use welcome-ui's `Search`: inside a `Field` that
 * renders an input with no `id`, so the label is attached to nothing and the
 * control cannot be reached by its accessible name. `InputText` with a search
 * icon looks the same and behaves.
 */
export const JobSearchForm = ({
  filters,
  query,
  options,
  isFiltered,
  onQueryChange,
  onFilterChange,
  onReset,
}: JobSearchFormProps) => {
  const queryInput = useRef<HTMLInputElement>(null);
  const activeFilters = useActiveFilters(filters, options, onFilterChange);

  const handleReset = useCallback(() => {
    onReset();
    // This button disappears with the filters it clears. Without moving focus
    // it would land on `<body>`, stranding a keyboard user at the top of the
    // document with no idea where they are.
    queryInput.current?.focus();
  }, [onReset]);

  return (
    <form
      role="search"
      aria-label="Job search"
      // There is no submit step: results follow the filters. Preventing the
      // default keeps Enter from reloading the page.
      onSubmit={(event) => event.preventDefault()}
      data-testid="job-search-form"
      className="mb-xl"
    >
      {/*
        The search field gets its own full width row, and the three selects
        share the row below it. This is welcometothejungle.com's own
        composition, and it removes two defects at once: a four column grid
        left "Work mode" stranded alone on a second row, and hiding only the
        search label left its control sitting above its neighbours.
      */}
      <div className="mb-md">
        <Field label="Search jobs" hideLabel>
          <InputText
            ref={queryInput}
            type="search"
            name="q"
            placeholder="Job title or keyword"
            icon={<Icon name="search" />}
            isClearable
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </Field>
      </div>

      {/* Three columns, so every label and every control shares a baseline. */}
      <div className="grid gap-md grid-cols-1 md:grid-cols-3 items-start">
        <Field label="Office">
          <Select
            name="office"
            aria-label="Office"
            placeholder="Any office"
            isClearable
            options={options.offices.map((office) => ({
              label: office,
              value: office,
            }))}
            value={filters.office}
            onChange={(value) => onFilterChange({ office: String(value ?? "") })}
          />
        </Field>

        <Field label="Contract type">
          <Select
            name="contract_type"
            aria-label="Contract type"
            placeholder={summarise(filters.contractTypes, "Any contract")}
            className={
              filters.contractTypes.length ? "filter-has-value" : undefined
            }
            isMultiple
            isClearable
            // Without this a chosen value renders greyed and inert, which
            // reads as disabled rather than as chosen.
            allowUnselectFromList
            renderMultiple={renderNothing}
            options={options.contractTypes}
            value={filters.contractTypes}
            onChange={(value) =>
              onFilterChange({ contractTypes: toValues(value) })
            }
          />
        </Field>

        <Field label="Work mode">
          <Select
            name="work_mode"
            aria-label="Work mode"
            placeholder={summarise(filters.workModes, "Any work mode")}
            className={filters.workModes.length ? "filter-has-value" : undefined}
            isMultiple
            isClearable
            allowUnselectFromList
            renderMultiple={renderNothing}
            options={options.workModes}
            value={filters.workModes}
            onChange={(value) => onFilterChange({ workModes: toValues(value) })}
          />
        </Field>
      </div>

      {/*
        The row is reserved whether or not anything is applied. It used to be
        rendered only when it had something to say, and appearing pushed the
        entire results list down a line the moment the first filter took
        effect — after the debounce and the round trip, so far enough from the
        keystroke that the browser counts it as an unexpected shift rather
        than one the reader asked for. Measured at 0.013 by the e2e suite, now
        zero.
      */}
      <div className="mt-md min-h-33">
        {isFiltered && (
          <ActiveFilters filters={activeFilters} onClearAll={handleReset} />
        )}
      </div>
    </form>
  );
};
