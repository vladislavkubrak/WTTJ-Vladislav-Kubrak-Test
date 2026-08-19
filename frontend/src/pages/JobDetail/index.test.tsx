import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

import { JobDetail } from ".";
import type { Job } from "../../types";

/*
 * This page tells the reader one of three things, and they are not
 * interchangeable: it is loading, the job is gone, or the request broke. "Gone"
 * is final and "broke" is worth retrying, so showing the wrong one sends
 * someone away from a job that is still open.
 *
 * Which of the three is showing is derived from a single piece of state —
 * whether what has settled belongs to the id in the URL — so a mistake there
 * shows the previous job's outcome under the next job's heading. These are the
 * tests for that.
 */

const job: Job = {
  id: 7,
  title: "Senior Frontend Engineer",
  description: "Building the job board.",
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
};

const fetchMock = vi.fn<typeof fetch>();

const respond = (status: number, body: unknown = null) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

/** A button that moves to another job without unmounting the page. */
const GoTo = ({ id }: { id: string }) => {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate(`/jobs/${id}`)}>
      go
    </button>
  );
};

const renderPage = (id = "7") =>
  render(
    <MemoryRouter initialEntries={[`/jobs/${id}`]}>
      <Routes>
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("JobDetail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("says it is loading before anything has arrived", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent(/loading this job/i);
  });

  it("shows the job once it arrives, and stops saying it is loading", async () => {
    fetchMock.mockResolvedValue(respond(200, { data: job }));

    renderPage();

    expect(
      await screen.findByRole("heading", { name: job.title }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("treats a 404 as gone rather than as broken", async () => {
    fetchMock.mockResolvedValue(respond(404));

    renderPage();

    expect(
      await screen.findByText(/no longer listed/i),
    ).toBeInTheDocument();
    // "Gone" is final, so it must not offer the recovery that an error does.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("treats a failed request as broken rather than as gone", async () => {
    fetchMock.mockResolvedValue(respond(500));

    renderPage();

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(/did not load/i);
    expect(screen.queryByText(/no longer listed/i)).not.toBeInTheDocument();
  });

  it("does not show a previous job's outcome under the next one", async () => {
    /*
     * Moving between two jobs reuses the component — React Router changes the
     * param, it does not remount — so whatever the last request concluded is
     * still in state when the next id renders. Unmounting between the two
     * would hide exactly the bug this is here for, so this navigates.
     */
    fetchMock.mockResolvedValue(respond(404));

    render(
      <MemoryRouter initialEntries={["/jobs/7"]}>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetail />} />
        </Routes>
        <GoTo id="8" />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no longer listed/i)).toBeInTheDocument();

    // The next request never settles, which is the whole point: the window
    // being tested is the one where the new job is still in flight and the old
    // verdict is the only thing state remembers.
    fetchMock.mockReturnValue(new Promise(() => {}));
    await userEvent.click(screen.getByRole("button", { name: "go" }));

    expect(screen.getByRole("status")).toHaveTextContent(/loading this job/i);
    expect(screen.queryByText(/no longer listed/i)).not.toBeInTheDocument();
  });
});
