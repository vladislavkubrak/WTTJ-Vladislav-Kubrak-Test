import { Icon } from "welcome-ui/Icon";
import { Tag } from "welcome-ui/Tag";
import type { ComponentProps, ReactNode } from "react";

import type { Job } from "../../types";

interface JobFactsProps {
  job: Job;
}

/**
 * The three things every job states: what the contract is, where it is, and
 * how it is worked.
 *
 * Both the results list and the job page show exactly this, and they used to
 * show it twice over — the same three chips, the same icons, the same
 * overrides, in two files. One of them would have drifted.
 *
 * The chips are neutral on purpose. welcome-ui's `Tag` variants map contract
 * types onto colours that encode nothing: two of them are 7.85 ΔE apart and
 * read as the same colour, which is a decoration pretending to be a legend.
 * The icon carries the category instead.
 *
 * The label falls back to the raw enum, so a contract type the server adds
 * tomorrow renders as itself rather than as a blank chip.
 */
export const JobFacts = ({ job }: JobFactsProps) => (
  <div className="flex flex-wrap gap-xs">
    <Fact icon="file-alt">{job.contract_type_label || job.contract_type}</Fact>
    <Fact icon="map-marker-alt">{job.office}</Fact>
    <Fact icon="desktop">{job.work_mode_label || job.work_mode}</Fact>
  </div>
);

/** welcome-ui's own union of icon names, so a typo is a compile error. */
type IconName = ComponentProps<typeof Icon>["name"];

const Fact = ({
  icon,
  children,
}: {
  icon: IconName;
  children: ReactNode;
}) => (
  <Tag
    size="md"
    variant="warm"
    className="rounded-sm border-0 text-xs"
    icon={<Icon name={icon} />}
  >
    {children}
  </Tag>
);
