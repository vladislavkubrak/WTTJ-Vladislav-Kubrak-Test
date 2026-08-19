import { expect, test } from "@playwright/test";

/*
 * Run against the seeded database (`mix ecto.setup`). The specs assert that a
 * named job is present or absent rather than counting rows, so adding jobs to
 * the database does not turn them red — the suite reads the data, it does not
 * own it.
 *
 * From `priv/repo/seeds.exs`:
 *   - "Dev Backend" — published, Paris
 *   - "Senior Frontend Engineer React JS …" — published, Paris
 *   - "Senior QA Engineer …" — draft, Nantes
 */
// `.first()` throughout: seeds are re-runnable, so `mix ecto.setup` twice puts
// two rows with the same title in the database and strict mode would fail on
// an ambiguity that says nothing about the feature.
const PUBLISHED = "Senior Frontend Engineer React JS";
const OTHER_PUBLISHED = "Dev Backend";
const DRAFT = "Senior QA Engineer";

test.describe("job search", () => {
  test("lists jobs and never the ones that are not published", async ({
    page,
  }) => {
    await page.goto("/");

    const results = page.getByRole("list", { name: "Job results" });
    await expect(results.getByRole("listitem").first()).toBeVisible();

    /*
     * The regression this file is most worth having for.
     *
     * `GET /api/jobs` used to return every job whatever its status, and the
     * seeds contain a draft, so an anonymous visitor could read an unpublished
     * posting. The unit tests assert it at the context and controller level;
     * this asserts it where it would actually have been exploited — a browser,
     * signed out, against the real database.
     */
    await expect(page.getByText(DRAFT)).toHaveCount(0);

    await page.goto(`/?q=${encodeURIComponent(DRAFT)}`);
    await expect(
      page.getByRole("heading", { name: /no jobs match your search/i }),
    ).toBeVisible();
  });

  test("narrows the results as you type, with one request per burst", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/jobs") requests.push(url.search);
    });

    await page.goto("/");
    await expect(page.getByTestId("job-card").first()).toBeVisible();

    const before = requests.length;
    await page.getByRole("searchbox").pressSequentially("frontend", {
      delay: 40,
    });

    // Asserted as "this one is in and that one is out" rather than a count,
    // so adding jobs to the database does not turn this red.
    await expect(
      page.getByRole("heading", { name: PUBLISHED }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: OTHER_PUBLISHED }).first(),
    ).toHaveCount(0);

    // Eight characters, one request. Typed with a delay well under the 300ms
    // debounce, so a per-keystroke implementation would show up here.
    expect(requests.length - before).toBe(1);
    expect(requests.at(-1)).toContain("q=frontend");
  });

  test("puts the search in the URL, so it survives a reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("searchbox").pressSequentially("frontend");

    await expect(page).toHaveURL(/q=frontend/);

    await page.reload();

    await expect(page.getByRole("searchbox")).toHaveValue("frontend");
    await expect(
      page.getByRole("heading", { name: PUBLISHED }).first(),
    ).toBeVisible();
  });

  test("filters by office, and clears back to everything", async ({ page }) => {
    await page.goto("/");
    // Count only once the first result is on screen, or the baseline is zero.
    await expect(page.getByTestId("job-card").first()).toBeVisible();
    const total = await page.getByTestId("job-card").count();

    // Paris, not Nantes: the office filter is built from offices that have a
    // published job, and the only job in Nantes is the draft. That the
    // dropdown cannot offer a location with nothing behind it is the point.
    await page.getByRole("combobox", { name: "Office" }).click();
    await page.getByRole("option", { name: "Paris" }).click();

    await expect(page).toHaveURL(/office=Paris/);
    await expect(page.getByText("Paris").first()).toBeVisible();

    await page.getByRole("button", { name: /clear filters/i }).click();

    await expect(page).not.toHaveURL(/office=/);
    await expect(page.getByTestId("job-card")).toHaveCount(total);
    // Clearing hands focus back, so a keyboard user is not stranded on <body>.
    await expect(page.getByRole("searchbox")).toBeFocused();
  });

  test("opens a job from the results and applies to it", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(PUBLISHED)}`);

    await page.getByRole("heading", { name: PUBLISHED }).first().click();

    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(PUBLISHED) }),
    ).toBeVisible();

    await page.getByRole("link", { name: /apply now/i }).click();
    await expect(page.getByTestId("apply-form")).toBeVisible();

    // Nothing is submitted until it is valid, and the message appears without
    // pushing the rest of the form down the page.
    //
    // Measured as the distance between two fields, not as a viewport
    // coordinate: react-hook-form focuses the first invalid control, which
    // scrolls the page, so absolute positions move even when the layout does
    // not.
    const gapBetweenFields = () =>
      page.evaluate(() => {
        const inputs = document.querySelectorAll<HTMLElement>(
          '[data-testid="apply-form"] input',
        );
        const first = inputs[0]?.getBoundingClientRect();
        const second = inputs[1]?.getBoundingClientRect();

        return second && first ? Math.round(second.top - first.top) : -1;
      });

    const before = await gapBetweenFields();

    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page.getByText(/full name is required/i)).toBeVisible();

    expect(await gapBetweenFields()).toBe(before);

    await page.getByRole("textbox", { name: /full name/i }).fill("Grace Hopper");
    await page
      .getByRole("textbox", { name: /email/i })
      .fill("grace.hopper@example.com");
    await page.getByRole("textbox", { name: /phone/i }).fill("+33 6 66 66 66 66");
    await page
      .getByRole("textbox", { name: /last known job/i })
      .fill("Senior mathematician");
    await page
      .getByRole("spinbutton", { name: /salary expectation/i })
      .fill("100000");

    await page.getByRole("button", { name: /^apply$/i }).click();

    await expect(
      page.getByRole("heading", { name: /your application is in/i }),
    ).toBeVisible();
  });

  test("reorders the results without losing the rest of the search", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("job-card").first()).toBeVisible();

    await page.getByRole("combobox", { name: "Sort results" }).click();
    await page.getByRole("option", { name: /title/i }).click();

    await expect(page).toHaveURL(/sort=title/);

    // Alphabetical: "Dev Backend" comes before "Senior Frontend Engineer …".
    await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText(
      new RegExp(OTHER_PUBLISHED),
    );
  });

  test("can be filtered with the keyboard alone", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("job-card").first()).toBeVisible();

    /*
     * Asserted through `document.activeElement` rather than
     * `getByRole("combobox")`, because those are two different elements:
     * welcome-ui puts the role, `aria-expanded` and `aria-haspopup` on a
     * wrapper that cannot receive focus, and `tabindex` on an inner div that
     * has no role at all. The control a keyboard reaches is therefore not the
     * one carrying the combobox semantics.
     */
    const focusedLabel = () =>
      page.evaluate(() => document.activeElement?.getAttribute("aria-label"));

    // Tab until it is reached rather than counting: a fixed count breaks the
    // day anything is added above it, which is exactly what the skip link did.
    for (let i = 0; i < 12 && (await focusedLabel()) !== "Contract type"; i += 1) {
      await page.keyboard.press("Tab");
    }

    expect(await focusedLabel()).toBe("Contract type");

    /*
     * welcome-ui's select is operable by keyboard in every respect except the
     * first: nothing opened it, so a filter was unreachable without a pointer
     * — WCAG 2.1.1, Level A, on the controls this page exists to offer.
     */
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option").first()).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/contract_type=/);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("option")).toHaveCount(0);
    // Escape closes the list without throwing focus away.
    expect(await focusedLabel()).toBe("Contract type");
  });

  test("never moves the controls while a search is running", async ({
    page,
  }) => {
    /*
     * The claim this defends: the search form and everything around it hold
     * still while results are being fetched and replaced. It is deliberately
     * not "nothing on the page moves" — results moving when the results change
     * is the feature working, and an earlier version of this test asserted a
     * total of zero and duly went red the moment the database held a job whose
     * removal pushed the rest up.
     *
     * So it records every layout shift and fails on any whose source lies
     * outside the results list. That covers the regression it was written for:
     * the active-filter row used to render only once something was applied, so
     * the first filter made it appear and shoved the entire list down a line.
     *
     * Recording starts after the page has settled, which excludes welcome-ui
     * loading its webfonts from a CDN — real, but not this feature's layout.
     */
    await page.goto("/");
    await expect(
      page.getByRole("list", { name: "Job results" }).getByRole("listitem").first(),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      const outside: string[] = [];
      (window as unknown as { __outside: string[] }).__outside = outside;

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
            sources?: Array<{ node?: Node | null }>;
          };

          if (shift.hadRecentInput) continue;

          const results = document.querySelector('[aria-label="Job results"]');

          for (const source of shift.sources ?? []) {
            const node = source.node;
            if (!node) continue;

            const element =
              node.nodeType === Node.ELEMENT_NODE
                ? (node as Element)
                : node.parentElement;

            if (element && !results?.contains(element)) {
              outside.push(
                `${element.tagName} "${(element.textContent ?? "").trim().slice(0, 40)}"`,
              );
            }
          }
        }
      }).observe({ type: "layout-shift", buffered: false });
    });

    await page.getByRole("searchbox", { name: "Search jobs" }).fill("engineer");
    await expect(page).toHaveURL(/q=engineer/);
    await page.waitForLoadState("networkidle");

    await page.getByRole("combobox", { name: "Office" }).click();
    await page.getByRole("option", { name: "Paris" }).click();
    await expect(page).toHaveURL(/office=Paris/);
    await page.waitForLoadState("networkidle");

    const moved = await page.evaluate(
      () => (window as unknown as { __outside: string[] }).__outside,
    );

    expect(moved, `these moved outside the results list: ${moved.join(", ")}`)
      .toEqual([]);
  });

  test("keeps working on a phone-sized screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    await expect(page.getByTestId("job-card").first()).toBeVisible();

    // Nothing overflows: a job board that scrolls sideways on a phone is a job
    // board nobody uses on a phone.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});
