import { useCallback, useState } from "react";

import { apply } from "../../api/apply";
import type { ApplyParams, ApplyResult } from "../../api/apply";

/**
 * Submits an application and reports what happened.
 *
 * It deliberately does not navigate. Sending an application is the whole point
 * of this screen, and redirecting the moment it succeeds leaves the candidate
 * on a list of jobs wondering whether anything was sent. The page decides what
 * to show; this only reports the outcome.
 */
export const useApply = () => {
  const [submitting, setSubmitting] = useState(false);

  const handleApply = useCallback(
    async (
      jobId: number | string,
      params: ApplyParams,
    ): Promise<ApplyResult> => {
      setSubmitting(true);

      try {
        return await apply(jobId, params);
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { handleApply, submitting };
};
