import { Card } from "welcome-ui/Card";

const COUNT = 4;

/**
 * Placeholder cards for the first load.
 *
 * welcome-ui ships no skeleton component, so these are hand rolled: same card,
 * same padding, bars standing in for the title, the profession, the tag row
 * and the button, so the block is roughly the height of the real thing.
 *
 * Four of them, not a full page: they exist to fill the first viewport, and
 * twenty offscreen infinite animations would be a strange thing to defend on
 * a test about frontend performance.
 *
 * Hidden from assistive technology — the status line above already announces
 * that the page is loading.
 */
export const JobListSkeleton = () => (
  <ul
    aria-hidden="true"
    className="flex flex-col gap-md list-none p-0 m-0"
    data-testid="job-list-skeleton"
  >
    {Array.from({ length: COUNT }, (_, index) => (
      <li key={index}>
        <Card size="md">
          <Card.Body>
            <div className="skeleton-bar flex flex-col gap-sm">
              <div className="h-24 w-1/2 rounded-sm bg-background-neutral-subtlest" />
              <div className="h-16 w-1/3 rounded-sm bg-background-neutral-subtlest" />
              <div className="flex gap-xs">
                <div className="h-24 w-64 rounded-sm bg-background-neutral-subtlest" />
                <div className="h-24 w-48 rounded-sm bg-background-neutral-subtlest" />
                <div className="h-24 w-56 rounded-sm bg-background-neutral-subtlest" />
              </div>
              <div className="h-32 w-64 rounded-sm bg-background-neutral-subtlest" />
            </div>
          </Card.Body>
        </Card>
      </li>
    ))}
  </ul>
);
