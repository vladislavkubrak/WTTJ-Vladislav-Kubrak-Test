import { Button } from "welcome-ui/Button";
import { Tag } from "welcome-ui/Tag";

import type { ActiveFilter } from "./useActiveFilters";

interface ActiveFiltersProps {
  filters: ActiveFilter[];
  onClearAll: () => void;
}

/**
 * Everything currently applied, in one row.
 *
 * welcome-ui's multi-select renders its chosen values as chips under whichever
 * control produced them, at a different horizontal position per select, while
 * the control above still shows its placeholder. Those are suppressed and
 * gathered here instead, so what is applied is stated once, in one place, and
 * each part of it can be taken off on its own.
 */
export const ActiveFilters = ({ filters, onClearAll }: ActiveFiltersProps) => (
  <div className="flex flex-wrap items-center gap-xs">
    {filters.map((filter) => (
      <Tag
        key={filter.key}
        size="md"
        variant="warm"
        className="rounded-sm border-0 text-xs"
        onRemove={filter.remove}
        removeButtonProps={{ "aria-label": `Remove ${filter.label}` }}
      >
        {filter.label}
      </Tag>
    ))}

    <Button type="button" size="md" variant="secondary" onClick={onClearAll}>
      Clear filters
    </Button>
  </div>
);
