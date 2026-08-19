import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert } from "welcome-ui/Alert";
import { Button } from "welcome-ui/Button";
import { Card } from "welcome-ui/Card";
import { Link as WUILink } from "welcome-ui/Link";
import { Text } from "welcome-ui/Text";

import { getJob } from "../../api/jobs";
import { ApplyForm } from "../../components/ApplyForm";
import type { ApplyFormValues } from "../../components/ApplyForm";
import { useApply } from "./useApply";
import { useDocumentTitle } from "../../useDocumentTitle";

export const Apply = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { handleApply } = useApply();
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useDocumentTitle(jobTitle ? `Apply — ${jobTitle}` : "Apply");

  // Only for the heading. A failure here is silent on purpose: not knowing the
  // job's title is no reason to stop someone applying to it.
  useEffect(() => {
    if (!jobId) return;

    const controller = new AbortController();

    getJob(jobId, controller.signal)
      .then((job) => {
        if (!controller.signal.aborted) setJobTitle(job.title);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [jobId]);

  const onSubmit = useCallback(
    async (values: ApplyFormValues) => {
      if (!jobId) {
        return {
          status: "failed" as const,
          message: "This application is missing its job reference.",
        };
      }

      const result = await handleApply(jobId, values);

      if (result.status === "ok") setSent(true);

      return result;
    },
    [handleApply, jobId],
  );

  return (
    <main className="p-xl max-w-894 my-0 mx-auto">
      <WUILink
        as={Link}
        to={jobId ? `/jobs/${jobId}` : "/"}
        variant="secondary"
        className="mb-md inline-block"
      >
        ← Back to the job
      </WUILink>

      <Card size="md">
        <Card.Body>
          {sent ? (
            /*
              The starter redirected to the job list the moment the request
              succeeded, which left the candidate looking at a list of jobs
              with no evidence anything had been sent. Confirming here and
              letting them choose where to go next is the whole difference.
            */
            <div className="flex flex-col items-start gap-md">
              {/* A real heading, because this is now what the page is about.
                  welcome-ui's `Alert.Title` renders a plain div with no role,
                  so it cannot carry that on its own. */}
              <Text as="h1" variant="heading-xl">
                Your application is in
              </Text>

              <Alert variant="success" isFullWidth>
                {jobTitle
                  ? `We have sent your application for ${jobTitle}.`
                  : "We have sent your application."}
              </Alert>

              <Button as={Link} to="/" variant="secondary">
                Back to all jobs
              </Button>
            </div>
          ) : (
            <>
              <Text as="h1" variant="heading-xl" className="mb-xs">
                Apply
              </Text>

              {/* Which job this is for. The starter's heading said "Apply for
                  this position" and never named it, which reads as a mistake
                  on a page someone can land on directly. */}
              <Text
                variant="body-md"
                className="mb-lg text-text-neutral-subtle"
              >
                {jobTitle ?? " "}
              </Text>

              <ApplyForm onSubmit={onSubmit} />
            </>
          )}
        </Card.Body>
      </Card>
    </main>
  );
};
