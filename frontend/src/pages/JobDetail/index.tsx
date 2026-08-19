import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Alert } from "welcome-ui/Alert";
import { Link as WUILink } from "welcome-ui/Link";
import { Text } from "welcome-ui/Text";

import { JobNotFound, getJob } from "../../api/jobs";
import type { Job } from "../../types";
import { useDocumentTitle } from "../../useDocumentTitle";
import { JobSummary } from "./JobSummary";

export const JobDetail = () => {
  const { id } = useParams<{ id: string }>();

  // One piece of state, holding the outcome of a request and which job it was
  // for. Loading is then the difference between the job asked for and the job
  // in hand, rather than a flag an effect has to raise before fetching — which
  // would re-render the page once more, with nothing new to show.
  const [settled, setSettled] = useState<{
    forId: string | null;
    job: Job | null;
    error: string | null;
    notFound: boolean;
  }>({ forId: null, job: null, error: null, notFound: false });

  const loading = settled.forId !== id;
  const job = loading ? null : settled.job;
  // A request in flight replaces the previous outcome rather than sitting
  // underneath it, so moving to another job never shows the last one's error.
  const error = loading ? null : settled.error;
  const notFound = settled.notFound;

  // Null while it loads, so the tab does not flash a wrong name first.
  useDocumentTitle(job?.title ?? null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    getJob(id, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setSettled({ forId: id, job: data, error: null, notFound: false });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({
          forId: id,
          job: null,
          notFound: caught instanceof JobNotFound,
          error:
            caught instanceof Error
              ? caught.message
              : "The server did not respond as expected.",
        });
      });

    // Navigating between two jobs quickly would otherwise let the first
    // response overwrite the second.
    return () => controller.abort();
  }, [id]);

  return (
    <main className="p-xl max-w-894 my-0 mx-auto">
      <WUILink
        as={Link}
        to="/"
        variant="secondary"
        className="mb-md inline-block"
      >
        ← Back to jobs
      </WUILink>

      {loading && <Text role="status">Loading this job…</Text>}

      {/* "Gone" and "broken" are different answers and deserve different
          words: one is final, the other is worth retrying. */}
      {error && notFound && (
        <Alert variant="warning" isFullWidth>
          <Alert.Title>This job is no longer listed</Alert.Title>
          It may have been filled or withdrawn.
        </Alert>
      )}

      {error && !notFound && (
        <Alert variant="danger" role="alert" isFullWidth>
          <Alert.Title>This job did not load</Alert.Title>
          {error}
        </Alert>
      )}

      {job && <JobSummary job={job} />}

    </main>
  );
};
