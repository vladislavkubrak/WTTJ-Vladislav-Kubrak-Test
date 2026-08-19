import { describe, expect, it } from "vitest";

import { EMPTY_FILTERS, buildJobsQuery, parseJobFilters } from "./jobs";
import type { JobFilters } from "../types";

const filters = (overrides: Partial<JobFilters> = {}): JobFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
});

describe("buildJobsQuery", () => {
  it("omits everything that is empty", () => {
    expect(buildJobsQuery(EMPTY_FILTERS)).toBe("");
  });

  it("omits the first page, because it is the default on both sides", () => {
    expect(buildJobsQuery(filters({ page: 1 }))).toBe("");
    expect(buildJobsQuery(filters({ page: 3 }))).toBe("page=3");
  });

  it("trims free text so a stray space is not a different search", () => {
    expect(buildJobsQuery(filters({ query: "  elixir  " }))).toBe("q=elixir");
    expect(buildJobsQuery(filters({ query: "   " }))).toBe("");
  });

  it("joins multi valued filters with commas", () => {
    expect(
      buildJobsQuery(filters({ contractTypes: ["FULL_TIME", "INTERNSHIP"] })),
    ).toBe("contract_type=FULL_TIME%2CINTERNSHIP");
  });

  it("encodes characters that would otherwise break the query string", () => {
    expect(buildJobsQuery(filters({ query: "c++ & ruby" }))).toBe(
      "q=c%2B%2B+%26+ruby",
    );
  });
});

describe("parseJobFilters", () => {
  it("round trips with buildJobsQuery", () => {
    const original = filters({
      query: "elixir",
      office: "Paris",
      contractTypes: ["FULL_TIME", "VIE"],
      workModes: ["remote"],
      page: 4,
    });

    const roundTripped = parseJobFilters(
      new URLSearchParams(buildJobsQuery(original)),
    );

    expect(roundTripped).toEqual(original);
  });

  it("falls back to defaults for an empty query string", () => {
    expect(parseJobFilters(new URLSearchParams(""))).toEqual(EMPTY_FILTERS);
  });

  it("survives a hand edited URL", () => {
    // Someone will type this into the address bar eventually.
    const parsed = parseJobFilters(
      new URLSearchParams("page=-3&contract_type=,,&work_mode="),
    );

    expect(parsed.page).toBe(1);
    expect(parsed.contractTypes).toEqual([]);
    expect(parsed.workModes).toEqual([]);
  });

  it("ignores non numeric pages rather than propagating NaN", () => {
    expect(parseJobFilters(new URLSearchParams("page=abc")).page).toBe(1);
    expect(parseJobFilters(new URLSearchParams("page=1.5")).page).toBe(1);
  });
});
