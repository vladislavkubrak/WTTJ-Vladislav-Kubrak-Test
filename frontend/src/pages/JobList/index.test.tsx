import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";

import { JobList } from ".";
import type { Job } from "../../types";

const DEBOUNCE_MS = 300;

const buildJob = (id: number, overrides: Partial<Job> = {}): Job => ({
  id,
  title: `Job ${id}`,
  description: "Description",
  contract_type: "FULL_TIME",
  contract_type_label: "Full-Time",
  office: "Paris",
  status: "published",
  work_mode: "remote",
  work_mode_label: "Remote",
  profession_id: 1,
  profession: "Software Engineering",
  inserted_at: "2026-08-01T00:00:00",
  updated_at: "2026-08-01T00:00:00",
  ...overrides,
});

const jobsPayload = (jobs: Job[], total = jobs.length, page = 1) => ({
  data: jobs,
  meta: {
    total,
    total_is_capped: false,
    page,
    page_size: 20,
    total_pages: Math.ceil(total / 20) || 1,
  },
});

const filtersPayload = {
  data: {
    offices: ["Paris", "Nantes"],
    contract_types: [
      { value: "FULL_TIME", label: "Full-Time" },
      { value: "INTERNSHIP", label: "Internship" },
    ],
    work_modes: [
      { value: "onsite", label: "On site" },
      { value: "remote", label: "Remote" },
      { value: "hybrid", label: "Hybrid" },
    ],
    sorts: [
      { value: "recent", label: "Most recent" },
      { value: "title", label: "Title A–Z" },
    ],
  },
};

const ok = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response;

const fetchMock = vi.fn<typeof fetch>();

/** Every `/api/jobs` request made so far, filters endpoint excluded. */
const jobRequests = () =>
  fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => !url.startsWith("/api/jobs/filters"));

const lastJobRequest = () => {
  const requests = jobRequests();

  return requests[requests.length - 1] ?? "";
};

const setupUser = () =>
  userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

/** Renders the current query string so assertions can read it. */
const LocationProbe = () => {
  const location = useLocation();

  return <span data-testid="location-search">{location.search}</span>;
};

const currentSearch = () => screen.getByTestId("location-search").textContent;

const renderPage = (initialEntry = "/") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <JobList />
      <LocationProbe />
    </MemoryRouter>,
  );

/** Lets the debounce elapse and the resulting request settle. */
const settle = async (ms = DEBOUNCE_MS) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  // `shouldAdvanceTime` is not optional here. user-event awaits an internal
  // timer between keystrokes, and with a fully frozen clock nothing ever
  // resolves it — every typing test hangs until the runner gives up. Letting
  // the fake clock follow real time unblocks it while keeping the debounce
  // under manual control: a test body runs in tens of milliseconds, far short
  // of the 300ms the debounce waits for.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("JobList", () => {
  const respondWith = (jobs: Job[], total = jobs.length) => {
    fetchMock.mockImplementation(async (input) =>
      String(input).startsWith("/api/jobs/filters")
        ? ok(filtersPayload)
        : ok(jobsPayload(jobs, total)),
    );
  };

  describe("rendering", () => {
    it("renders the jobs the API returns, as a list", async () => {
      respondWith([buildJob(1, { title: "Elixir Engineer" }), buildJob(2)]);

      renderPage();
      await settle(0);

      const list = screen.getByRole("list", { name: "Job results" });

      expect(within(list).getAllByRole("listitem")).toHaveLength(2);
      expect(
        screen.getByRole("heading", { level: 3, name: "Elixir Engineer" }),
      ).toBeVisible();
    });

    it("nests its headings without skipping a level", async () => {
      respondWith([buildJob(1), buildJob(2)]);

      renderPage();
      await settle(0);

      const levels = screen
        .getAllByRole("heading")
        .map((heading) => Number(heading.tagName[1]));

      // One h1, then the results section, then a heading per job inside it.
      // A flat run of h2s would say every job title is a sibling of the
      // section that contains it.
      expect(levels.filter((level) => level === 1)).toHaveLength(1);
      expect(levels[0]).toBe(1);
      levels.forEach((level, index) => {
        if (index > 0) expect(level - (levels[index - 1] ?? 0)).toBeLessThan(2);
      });
    });

    it("announces the result count in a live region", async () => {
      respondWith([buildJob(1), buildJob(2), buildJob(3)], 3);

      renderPage();

      // The region has to exist before the count lands in it, otherwise the
      // change is never announced.
      expect(screen.getByRole("status")).toBeInTheDocument();

      await settle(0);

      expect(screen.getByRole("status")).toHaveTextContent("3 jobs");
    });

    it("says how many jobs matched once a search is active", async () => {
      respondWith([buildJob(1)], 1);

      renderPage("/?q=elixir");
      await settle(0);

      expect(screen.getByRole("status")).toHaveTextContent(
        "1 job matches your search",
      );
    });

    it("offers a way out when nothing matches", async () => {
      respondWith([], 0);

      renderPage("/?q=nothing");
      await settle(0);

      expect(
        screen.getByRole("heading", { name: /no jobs match your search/i }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: /clear all filters/i }),
      ).toBeVisible();
    });

    it("surfaces a failed request without wiping the page", async () => {
      fetchMock.mockImplementation(async (input) =>
        String(input).startsWith("/api/jobs/filters")
          ? ok(filtersPayload)
          : ({ ok: false, status: 500 } as Response),
      );

      renderPage();
      await settle(0);

      expect(screen.getByRole("alert")).toHaveTextContent(/did not load/i);
      // Recoverable, and the rest of the page still works.
      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeVisible();
      expect(screen.getByRole("search")).toBeVisible();
    });

    it("rejects a response whose shape is not what it claims", async () => {
      fetchMock.mockImplementation(async (input) =>
        String(input).startsWith("/api/jobs/filters")
          ? ok(filtersPayload)
          : ok({ data: [{ id: "not-a-number" }], meta: {} }),
      );

      renderPage();
      await settle(0);

      // Types are erased at runtime; without a guard this renders `undefined`
      // into the DOM instead of failing.
      expect(screen.getByRole("alert")).toBeVisible();
      expect(screen.queryByTestId("job-card")).not.toBeInTheDocument();
    });
  });

  describe("searching", () => {
    it("makes one request for a burst of typing, not one per keystroke", async () => {
      respondWith([buildJob(1)]);
      const user = setupUser();

      renderPage();
      await settle(0);

      const initialRequests = jobRequests().length;

      await user.type(screen.getByRole("searchbox"), "elixir");
      await settle();

      expect(jobRequests()).toHaveLength(initialRequests + 1);
      expect(lastJobRequest()).toContain("q=elixir");
    });

    it("keeps the previous results visible while the next ones load", async () => {
      respondWith([buildJob(1, { title: "Elixir Engineer" })]);
      const user = setupUser();

      renderPage();
      await settle(0);

      await user.type(screen.getByRole("searchbox"), "ruby");

      // Mid-debounce: no request yet, and the list has not collapsed. Emptying
      // it here is what makes a search box flicker on every keystroke.
      expect(screen.getByText("Elixir Engineer")).toBeVisible();
      expect(screen.queryByTestId("job-list-skeleton")).not.toBeInTheDocument();
    });

    it("marks the results as busy while a request is in flight", async () => {
      respondWith([buildJob(1)]);
      const user = setupUser();

      renderPage();
      await settle(0);

      expect(screen.getByTestId("job-results")).toHaveAttribute(
        "aria-busy",
        "false",
      );

      await user.type(screen.getByRole("searchbox"), "a");
      await settle();

      expect(screen.getByTestId("job-results")).toHaveAttribute(
        "aria-busy",
        "false",
      );
    });

    it("ignores a slow response that a newer one has already superseded", async () => {
      const resolvers: Array<(value: Response) => void> = [];

      fetchMock.mockImplementation(async (input) => {
        if (String(input).startsWith("/api/jobs/filters")) {
          return ok(filtersPayload);
        }

        // Deliberately ignores the abort signal, so the only thing standing
        // between a stale response and the screen is the hook's own guard.
        return new Promise<Response>((resolve) => resolvers.push(resolve));
      });

      const user = setupUser();

      renderPage();
      await settle(0);

      await user.type(screen.getByRole("searchbox"), "a");
      await settle();

      await user.type(screen.getByRole("searchbox"), "b");
      await settle();

      expect(resolvers).toHaveLength(3);

      // The newest request answers first, then the oldest one straggles in.
      await act(async () => {
        resolvers[2]?.(ok(jobsPayload([buildJob(2, { title: "Newest" })])));
        resolvers[1]?.(ok(jobsPayload([buildJob(1, { title: "Stale" })])));
        resolvers[0]?.(ok(jobsPayload([buildJob(9, { title: "Stalest" })])));
      });

      expect(screen.getByText("Newest")).toBeVisible();
      expect(screen.queryByText("Stale")).not.toBeInTheDocument();
      expect(screen.queryByText("Stalest")).not.toBeInTheDocument();
    });
  });

  describe("the URL", () => {
    it("restores a search from the address bar", async () => {
      respondWith([buildJob(1)]);

      renderPage("/?q=elixir&work_mode=remote&page=2");
      await settle(0);

      expect(screen.getByRole("searchbox")).toHaveValue("elixir");

      const requested = lastJobRequest();
      expect(requested).toContain("q=elixir");
      expect(requested).toContain("work_mode=remote");
      expect(requested).toContain("page=2");
    });

    it("writes what the user typed back into the URL", async () => {
      respondWith([buildJob(1)]);
      const user = setupUser();

      renderPage();
      await settle(0);

      await user.type(screen.getByRole("searchbox"), "elixir");
      await settle();

      expect(currentSearch()).toBe("?q=elixir");
      expect(screen.getByRole("searchbox")).toHaveValue("elixir");
    });

    it("drops the page when the search changes, so page 4 of nothing is impossible", async () => {
      respondWith([buildJob(1)]);
      const user = setupUser();

      renderPage("/?page=4");
      await settle(0);

      await user.type(screen.getByRole("searchbox"), "elixir");
      await settle();

      expect(lastJobRequest()).not.toContain("page=");
    });
  });

  describe("accessibility", () => {
    it("labels the search landmark and its field", async () => {
      respondWith([buildJob(1)]);

      renderPage();
      await settle(0);

      expect(screen.getByRole("search", { name: "Job search" })).toBeVisible();
      expect(screen.getByLabelText(/search jobs/i)).toBe(
        screen.getByRole("searchbox"),
      );
    });

    it("returns focus to the search field after clearing the filters", async () => {
      respondWith([buildJob(1)]);
      const user = setupUser();

      renderPage("/?q=elixir");
      await settle(0);

      await user.click(screen.getByRole("button", { name: /clear filters/i }));
      await settle();

      // The button unmounts itself; without moving focus it would land on
      // <body> and a keyboard user would lose their place entirely.
      expect(screen.getByRole("searchbox")).toHaveFocus();
    });
  });
});
