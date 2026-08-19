import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { IconSprite } from ".";
import { ICON_NAMES } from "./iconNames";
import { JobList } from "../../pages/JobList";
import type { Job } from "../../types";

const buildJob = (id: number): Job => ({
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
});

const ok = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response;

/** Every icon the rendered tree asks for, by the id in its `use` href. */
const requestedIcons = () =>
  new Set(
    [...document.querySelectorAll("use")]
      .map(
        (use) =>
          use.getAttribute("href") ?? use.getAttribute("xlink:href") ?? "",
      )
      .filter((href) => href.startsWith("#"))
      .map((href) => href.slice(1)),
  );

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/filters")
        ? ok({
            data: {
              offices: ["Paris", "Lyon"],
              contract_types: [{ value: "FULL_TIME", label: "Full-Time" }],
              work_modes: [
              { value: "onsite", label: "On site" },
              { value: "remote", label: "Remote" },
            ],
            },
          })
        : ok({
            data: [buildJob(1), buildJob(2)],
            meta: {
              total: 60,
              total_is_capped: false,
              page: 2,
              page_size: 20,
              total_pages: 3,
            },
          }),
    ),
  );
});

describe("IconSprite", () => {
  it("defines every symbol it advertises", () => {
    render(<IconSprite />);

    for (const name of ICON_NAMES) {
      expect(
        document.querySelector(`symbol#${CSS.escape(name)}`),
        `symbol #${name} is missing from the sprite`,
      ).not.toBeNull();
    }
  });

  it("stays out of layout and out of the accessibility tree", () => {
    render(<IconSprite />);

    const sprite = screen.getByTestId("icon-sprite");

    expect(sprite).not.toBeVisible();
    expect(sprite).toHaveAttribute("aria-hidden", "true");
  });

  /*
   * The regression this file exists for.
   *
   * welcome-ui renders icons as `<use href="#name">`, which fails silently:
   * a missing symbol paints nothing at all and leaves the layout intact, so
   * the page looks merely plain rather than broken. That is exactly what
   * shipped before this sprite was mounted — the search glyph, all three
   * select carets and both pagination arrows were absent and nothing
   * complained.
   */
  it("covers every icon the job search asks for, in every state", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={["/?q=abc&office=Paris&contract_type=FULL_TIME"]}
      >
        <IconSprite />
        <JobList />
      </MemoryRouter>,
    );

    // Let the list, the pager and the applied-filter chips render.
    await screen.findByRole("navigation");

    // Then open each dropdown, which is where the remaining glyphs live.
    for (const combobox of screen.queryAllByRole("combobox")) {
      await user.click(combobox);
    }

    const requested = requestedIcons();
    const defined = new Set<string>(ICON_NAMES);
    const missing = [...requested].filter((name) => !defined.has(name));

    expect(requested.size).toBeGreaterThan(0);
    expect(missing, `add these symbols to IconSprite: ${missing.join(", ")}`)
      .toEqual([]);
  });
});
