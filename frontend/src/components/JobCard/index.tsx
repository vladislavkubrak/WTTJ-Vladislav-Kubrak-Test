import { memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "welcome-ui/Button";
import { Card } from "welcome-ui/Card";
import { Text } from "welcome-ui/Text";

import { JobFacts } from "../JobFacts";

import type { Job } from "../../types";
import { postedAt } from "./postedAt";

interface JobCardProps {
  job: Job;
}

/**
 * One job in the results list.
 *
 * Memoised on purpose. The page re-renders on every keystroke because the
 * query lives in the URL, and without this every card in the list re-renders
 * with it even though none of their props changed. The jobs array is replaced
 * only when a response arrives, so the memo holds between keystrokes.
 *
 * Rendered as an `li` because a result list is a list, and a screen reader
 * announcing "list, 12 items" is the cheapest orientation a user can get.
 */
export const JobCard = memo(({ job }: JobCardProps) => {
  const posted = postedAt(job.inserted_at);

  return (
    <Card as="li" size="md" data-testid="job-card">
      <Card.Body>
      <div className="min-w-0">
        <Text as="h3" variant="heading-md" className="font-semi-bold leading-[1.4]">
          {/*
            The pseudo-element stretches this link over the whole card, so the
            entire surface is the click target rather than the title alone.
            `z-1` is required: welcome-ui gives Tag `position: relative`, and
            without it the three tags would paint over the overlay and stay
            dead. The trade-off is that card text is no longer selectable.
          */}
          <Link
            to={`/jobs/${job.id}`}
            className="no-underline hover:underline after:absolute after:inset-0 after:z-1"
          >
            {job.title}
          </Link>
        </Text>

        <div className="flex flex-wrap items-baseline gap-xs mt-xs">
          {job.profession && (
            <Text variant="body-sm" className="text-text-neutral-subtle">
              {job.profession}
            </Text>
          )}

          {/* The list is ordered by recency by default; the date is what makes
              that order visible instead of merely true. */}
          {posted && (
            <Text
              as="time"
              dateTime={job.inserted_at}
              variant="body-sm"
              className="text-text-neutral-subtle"
            >
              {job.profession ? `· ${posted}` : posted}
            </Text>
          )}
        </div>

        {/*
          No description here, matching WTTJ's own card: title, then metadata.
          The full text lives on the job detail page.
        */}
        {/*
          Neutral chips with icons, as on welcometothejungle.com. The previous
          version used three different tag colours for three different
          categories, which encoded nothing: two of them were 7.85 ΔE apart and
          read as the same colour. The icon carries the category instead.
        */}
        <div className="flex flex-wrap items-center justify-between gap-md mt-sm">
          <JobFacts job={job} />

          {/* On the metadata row rather than a row of its own: it reads as
              part of the job, and it fills the space the chips leave.
              
              `z-1`, the same layer as the stretched-link overlay rather than
              above it: within a layer the later element in the DOM wins, and
              this comes after. At `z-10` it painted over the filter dropdowns,
              which welcome-ui puts at `z-2`. */}
          <Button
            as={Link}
            to={`/jobs/${job.id}/apply`}
            size="md"
            variant="secondary"
            className="relative z-1 shrink-0"
            aria-label={`Apply to ${job.title}`}
          >
            Apply
          </Button>
        </div>
      </div>
      </Card.Body>
    </Card>
  );
});

JobCard.displayName = "JobCard";
