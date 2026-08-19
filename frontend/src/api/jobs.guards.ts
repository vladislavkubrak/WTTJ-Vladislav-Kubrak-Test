import type { EnumOption, Job, JobsMeta } from "../types";

/*
 * What a response has to look like before it is believed.
 *
 * TypeScript types vanish at runtime, so `await response.json() as JobsPage`
 * is a promise the compiler cannot keep: a deploy that renames a field turns
 * into `undefined` rendered into the DOM rather than an error anyone notices.
 *
 * These check the shape the app actually reads, and nothing more. With a
 * schema library this would be a few lines of Zod; hand rolling it avoids a
 * dependency for three endpoints, at the cost of the length below — which is
 * why it lives here rather than in the middle of the requests.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isEnumOption = (value: unknown): value is EnumOption =>
  isRecord(value) &&
  typeof value.value === "string" &&
  typeof value.label === "string";

const isEnumOptionArray = (value: unknown): value is EnumOption[] =>
  Array.isArray(value) && value.every(isEnumOption);

export const isJob = (value: unknown): value is Job =>
  isRecord(value) &&
  typeof value.id === "number" &&
  typeof value.title === "string" &&
  typeof value.description === "string" &&
  typeof value.contract_type === "string" &&
  typeof value.office === "string" &&
  typeof value.work_mode === "string" &&
  typeof value.work_mode_label === "string";

const isMeta = (value: unknown): value is JobsMeta =>
  isRecord(value) &&
  typeof value.total === "number" &&
  typeof value.total_is_capped === "boolean" &&
  typeof value.page === "number" &&
  typeof value.page_size === "number" &&
  typeof value.total_pages === "number";

export const isJobsPayload = (
  value: unknown,
): value is { data: Job[]; meta: JobsMeta } =>
  isRecord(value) &&
  Array.isArray(value.data) &&
  value.data.every(isJob) &&
  isMeta(value.meta);

export const isFiltersPayload = (
  value: unknown,
): value is {
  data: {
    offices: string[];
    contract_types: EnumOption[];
    work_modes: EnumOption[];
    sorts: EnumOption[];
  };
} =>
  isRecord(value) &&
  isRecord(value.data) &&
  isStringArray(value.data.offices) &&
  isEnumOptionArray(value.data.contract_types) &&
  isEnumOptionArray(value.data.work_modes) &&
  isEnumOptionArray(value.data.sorts);
