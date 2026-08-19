// Type definitions for the ATS frontend

export interface Job {
  id: number;
  title: string;
  description: string;
  /** The raw enum value, which is what the filters are expressed in. */
  contract_type: string;
  /** The human readable form of `contract_type`, resolved server side. */
  contract_type_label: string;
  office: string;
  status: string;
  work_mode: string;
  /** The human readable form of `work_mode`, resolved server side. */
  work_mode_label: string;
  profession_id: number;
  profession: string;
  inserted_at: string;
  updated_at: string;
}

/**
 * The filters the job search understands.
 *
 * `contractTypes` and `workModes` are arrays because the API accepts several
 * comma separated values per filter, and a job board is not useful if you
 * cannot ask for "full time or internship" in one go.
 *
 * Note that the enum-backed fields stay typed as `string`. Narrowing them to
 * unions would make the client reject a job the day the backend adds a new
 * contract type, which is the opposite of resilient: the labels arrive from
 * the API anyway.
 */
export interface JobFilters {
  query: string;
  office: string;
  contractTypes: string[];
  workModes: string[];
  sort: string;
  page: number;
}

/** What the client needs to render a pager. */
export interface JobsMeta {
  total: number;
  /**
   * True when the count stopped at its ceiling rather than reaching the end,
   * so `total` is a floor and should be shown as one.
   */
  total_is_capped: boolean;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface JobsPage {
  jobs: Job[];
  meta: JobsMeta;
}

/** An enum value together with the label the API wants it shown as. */
export interface EnumOption {
  value: string;
  label: string;
}

/**
 * The values worth filtering on, as reported by the API.
 *
 * Offices come from the data, so the dropdown can never offer a location with
 * nothing behind it; the enum options come from the schema, so they cannot
 * drift from what the database accepts.
 */
export interface JobFilterOptions {
  offices: string[];
  contractTypes: EnumOption[];
  workModes: EnumOption[];
  sorts: EnumOption[];
}

export interface Applicant {
  id: number;
  application_date: string;
  status: string;
  salary_expectation: number;
  candidate: Candidate;
}

export interface Candidate {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  last_known_job: string;
}
