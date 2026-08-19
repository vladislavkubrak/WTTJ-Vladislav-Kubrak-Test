import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { JobCard } from ".";
import type { Job } from "../../types";

const job: Job = {
  id: 1,
  title: "Senior Elixir Engineer",
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
};

const renderCard = (overrides: Partial<Job> = {}) =>
  render(
    <MemoryRouter>
      <JobCard job={{ ...job, ...overrides }} />
    </MemoryRouter>,
  );

describe("JobCard", () => {
  it("shows the labels the server resolved, not the raw enums", () => {
    renderCard();

    expect(screen.getByText("Full-Time")).toBeVisible();
    expect(screen.getByText("Remote")).toBeVisible();
    expect(screen.queryByText("FULL_TIME")).not.toBeInTheDocument();
  });

  it("dates the posting in a machine readable way as well as a human one", () => {
    renderCard();

    const time = screen.getByText(/ago|just posted/i);

    // The reader gets "3 months ago"; anything parsing the page gets the
    // timestamp it was computed from.
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", job.inserted_at);
  });

  it("still renders when there is no profession", () => {
    renderCard({ profession: "" });

    expect(
      screen.getByRole("heading", { name: job.title }),
    ).toBeVisible();
  });
});
