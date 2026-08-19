import { Button } from "welcome-ui/Button";
import { Card } from "welcome-ui/Card";
import { Link } from "react-router-dom";
import { Text } from "welcome-ui/Text";

import { JobFacts } from "../../components/JobFacts";
import type { Job } from "../../types";

interface JobSummaryProps {
  job: Job;
}

/**
 * Everything the page shows once the job has arrived.
 *
 * Split out so the page itself is only about which of its three answers to
 * give — loading, gone, or here it is. Reading them together meant seventy
 * lines of markup sitting between the states and the decision that picks one.
 */
export const JobSummary = ({ job }: JobSummaryProps) => (
  <>
    <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between mb-lg">
      <div className="min-w-0">
        {/* The starter rendered this as a paragraph, so the page had no
            heading at all — nothing to navigate to and nothing for a screen
            reader to announce as the title. */}
        <Text as="h1" variant="heading-xl">
          {job.title}
        </Text>

        {job.profession && (
          <Text variant="body-md" className="mt-xs text-text-neutral-subtle">
            {job.profession}
          </Text>
        )}

        {/* The same facts, in the same chips, as the results list. The status
            is not among them on purpose: only published jobs are reachable
            here, so it would always read "published". */}
        <div className="mt-sm">
          <JobFacts job={job} />
        </div>
      </div>

      <Button as={Link} to={`/jobs/${job.id}/apply`} className="shrink-0">
        Apply now
      </Button>
    </div>

    {/*
      The starter also carried a "Details" card repeating the contract type,
      office and work mode that the chips above already show, plus the internal
      status. Two places to read the same four facts is one too many, so the
      chips keep it and the card is gone.
    */}
    <Card size="md">
      <Card.Body>
        <Text as="h2" variant="heading-sm" className="mb-sm">
          Description
        </Text>
        <Text variant="body-md">{job.description}</Text>
      </Card.Body>
    </Card>
  </>
);
