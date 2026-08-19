import { Badge } from "welcome-ui/Badge";
import { Select } from "../Select";
import { Text } from "welcome-ui/Text";

import { describeResults } from "./describeResults";
import type { EnumOption } from "../../types";

interface ResultsHeaderProps {
  total: number;
  isCapped: boolean;
  hasCount: boolean;
  isFiltered: boolean;
  isInitialLoading: boolean;
  sort: string;
  sortOptions: EnumOption[];
  onSortChange: (sort: string) => void;
}

/**
 * The line above the results: what they are, how many, and in what order.
 *
 * The status paragraph is rendered whatever the state, including before the
 * first response. A live region added to the DOM at the same moment as its
 * content is not announced by most screen readers — it has to already be
 * there for the change to be noticed.
 */
export const ResultsHeader = ({
  total,
  isCapped,
  hasCount,
  isFiltered,
  isInitialLoading,
  sort,
  sortOptions,
  onSortChange,
}: ResultsHeaderProps) => (
  <div className="mb-md flex flex-wrap items-center gap-sm">
    {/* The section is named by this heading. Naming it by the status line
        would make its accessible name "Jobs 54 54 jobs match your search". */}
    <Text as="h2" id="job-results-heading" variant="heading-sm">
      Jobs
    </Text>

    {/*
      Only once there is a count: otherwise a yellow zero hangs over the
      skeletons and then jumps. And "1000+" rather than "1000" when the count
      stopped at its ceiling — presenting a floor as a total is a small lie
      that compounds with every page.
    */}
    {hasCount && (
      <Badge variant="brand" size="lg">
        {isCapped ? `${total}+` : total}
      </Badge>
    )}

    {/* The badge already shows the number, so repeating it in visible text
        reads as a stutter. The live region stays in the DOM and keeps
        announcing changes; it is only hidden visually. */}
    <Text
      as="p"
      id="job-results-status"
      role="status"
      variant="body-sm"
      className="sr-only"
    >
      {isInitialLoading
        ? "Loading jobs…"
        : describeResults(total, isFiltered, isCapped)}
    </Text>

    {/* Ordering belongs with the results it orders, not among the filters
        that decide which results there are. */}
    {sortOptions.length > 0 && total > 1 && (
      <div className="ml-auto w-192">
        <Select
          name="sort"
          aria-label="Sort results"
          options={sortOptions}
          value={sort || (sortOptions[0]?.value ?? "")}
          onChange={(value) => onSortChange(String(value ?? ""))}
        />
      </div>
    )}
  </div>
);
