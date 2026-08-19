import { useEffect, useState } from "react";

import { listJobFilterOptions } from "../../api/jobs";
import type { JobFilterOptions } from "../../types";

const NO_OPTIONS: JobFilterOptions = {
  offices: [],
  contractTypes: [],
  workModes: [],
  sorts: [],
};

/**
 * The values the user can filter on, fetched once.
 *
 * A failure here is deliberately silent. The dropdowns are an affordance, not
 * the feature: if this request fails the text search still works, and burying
 * the results behind an error banner about a filter list would be a worse
 * outcome than three empty dropdowns.
 */
export const useJobFilterOptions = (): JobFilterOptions => {
  const [options, setOptions] = useState<JobFilterOptions>(NO_OPTIONS);

  useEffect(() => {
    const controller = new AbortController();

    listJobFilterOptions(controller.signal)
      .then((fetched) => {
        if (!controller.signal.aborted) setOptions(fetched);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return options;
};
