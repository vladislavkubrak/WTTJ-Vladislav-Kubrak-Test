import { Button } from "welcome-ui/Button";
import { Card } from "welcome-ui/Card";
import { Text } from "welcome-ui/Text";

interface NoResultsProps {
  isFiltered: boolean;
  onResetFilters: () => void;
}

/**
 * What the page says when the search matched nothing.
 *
 * It offers the way out rather than only reporting the dead end, and only
 * when there is something to clear — a reset button on an unfiltered empty
 * list would reset nothing.
 */
export const NoResults = ({ isFiltered, onResetFilters }: NoResultsProps) => (
  <Card size="md">
    <Card.Body>
      <div className="flex flex-col items-start gap-sm">
        <Text as="h3" variant="heading-sm">
          No jobs match your search
        </Text>
        <Text variant="body-sm" className="text-text-neutral-subtle">
          Try a different keyword, or widen the filters.
        </Text>
        {isFiltered && (
          <Button size="md" variant="secondary" onClick={onResetFilters}>
            Clear all filters
          </Button>
        )}
      </div>
    </Card.Body>
  </Card>
);
