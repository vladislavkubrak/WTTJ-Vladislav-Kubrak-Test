import {
  isFiltersPayload,
  isJob,
  isJobsPayload,
  isRecord,
} from "./jobs.guards";
import type { Job, JobFilterOptions, JobFilters, JobsPage } from "../types";

/*
 * These are causes, not headlines. The UI supplies the headline ("The jobs did
 * not load") and the recovery control, so repeating that here would print the
 * same sentence twice.
 */
const JOBS_ERROR_MESSAGE = "The server did not respond as expected.";
const FILTERS_ERROR_MESSAGE = "The filter options are unavailable.";

export const EMPTY_FILTERS: JobFilters = {
  query: "",
  office: "",
  contractTypes: [],
  workModes: [],
  sort: "",
  page: 1,
};

/**
 * Reads filters out of a set of query parameters.
 *
 * This is the inverse of `buildJobsQuery`, and the two live together on
 * purpose: the browser URL and the API query use the same parameter names, so
 * a shareable link is literally the request that produced it. Splitting the
 * two halves of that contract across modules is how they drift apart.
 *
 * Anything malformed falls back to the default rather than throwing. A URL is
 * user input — someone will hand-edit `?page=` sooner or later.
 */
export const parseJobFilters = (params: URLSearchParams): JobFilters => ({
  query: params.get("q") ?? "",
  office: params.get("office") ?? "",
  contractTypes: parseList(params.get("contract_type")),
  workModes: parseList(params.get("work_mode")),
  sort: params.get("sort") ?? "",
  page: parsePage(params.get("page")),
});

const parseList = (value: string | null): string[] =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/**
 * Turns filters into a query string, dropping everything that is empty.
 *
 * Kept pure and exported so the URL contract can be tested on its own: it is
 * the one piece of this module where an off-by-one or a stray `&` silently
 * changes what the user sees.
 */
export const buildJobsQuery = (filters: JobFilters): string => {
  const params = new URLSearchParams();

  const query = filters.query.trim();
  if (query) params.set("q", query);

  const office = filters.office.trim();
  if (office) params.set("office", office);

  if (filters.contractTypes.length > 0) {
    params.set("contract_type", filters.contractTypes.join(","));
  }

  if (filters.workModes.length > 0) {
    params.set("work_mode", filters.workModes.join(","));
  }

  // The server's default ordering is the empty case, so it stays out of the URL.
  if (filters.sort) params.set("sort", filters.sort);

  // Page 1 is the default on the server too, so leaving it out keeps the URL
  // short and makes "no filters" a single canonical request.
  if (filters.page > 1) params.set("page", String(filters.page));

  return params.toString();
};

/**
 * Fetches one page of jobs for an already built query string.
 *
 * Taking the serialised query rather than the filters object is deliberate.
 * The caller runs this inside an effect, and an effect keyed on an object
 * re-runs on every render because the object is new each time — which would
 * quietly undo the debounce. A string compares by value, so the effect fires
 * exactly when the request actually changes.
 *
 * `signal` is required rather than optional for the same reason: a fetch
 * nobody can cancel is how a search box ends up showing results for a query
 * the user already backspaced away.
 */
export const listJobs = async (
  query: string,
  signal: AbortSignal,
): Promise<JobsPage> => {
  const response = await fetch(query ? `/api/jobs?${query}` : "/api/jobs", {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) throw new Error(JOBS_ERROR_MESSAGE);

  const payload: unknown = await response.json();

  if (!isJobsPayload(payload)) throw new Error(JOBS_ERROR_MESSAGE);

  return { jobs: payload.data, meta: payload.meta };
};

/**
 * Fetches a single job.
 *
 * Shared by the job page and the application form, which both need the same
 * record and would otherwise each carry their own copy of this request and its
 * validation.
 */
export const getJob = async (
  id: string,
  signal: AbortSignal,
): Promise<Job> => {
  const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (response.status === 404) throw new JobNotFound();
  if (!response.ok) throw new Error(JOBS_ERROR_MESSAGE);

  const payload: unknown = await response.json();

  if (!isRecord(payload) || !isJob(payload.data)) {
    throw new Error(JOBS_ERROR_MESSAGE);
  }

  return payload.data;
};

/** Distinguishes "this job is gone" from "the request broke". */
export class JobNotFound extends Error {
  constructor() {
    super("This job no longer exists.");
    this.name = "JobNotFound";
  }
}

/** Fetches the values the user can filter on. */
export const listJobFilterOptions = async (
  signal: AbortSignal,
): Promise<JobFilterOptions> => {
  const response = await fetch("/api/jobs/filters", {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) throw new Error(FILTERS_ERROR_MESSAGE);

  const payload: unknown = await response.json();

  if (!isFiltersPayload(payload)) throw new Error(FILTERS_ERROR_MESSAGE);

  return {
    offices: payload.data.offices,
    contractTypes: payload.data.contract_types,
    workModes: payload.data.work_modes,
    sorts: payload.data.sorts,
  };
};
