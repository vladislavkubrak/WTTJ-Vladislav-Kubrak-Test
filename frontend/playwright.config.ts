import { defineConfig, devices } from "@playwright/test";

/*
 * End to end, against the real Phoenix API and a real database.
 *
 * The rest of the suite mocks `fetch`, which means it proves the frontend
 * behaves correctly given a response — never that the response is the one the
 * backend actually sends. This is the only thing here that pins both halves of
 * the wire at once.
 *
 * It expects the seeded development database (`mix ecto.setup`), and asserts
 * only things that hold regardless of what else has been added to it.
 */
export default defineConfig({
  testDir: "./e2e",
  // A failing e2e run must fail the pipeline, not be quietly retried into
  // green. Locally, a flake is a bug worth seeing.
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  /*
   * Both halves are started here rather than expected to be running, so the
   * suite is one command. `reuseExistingServer` keeps a local run from
   * fighting the dev server that is probably already up.
   */
  webServer: [
    {
      command: "mix phx.server",
      cwd: "..",
      url: "http://localhost:4000/api/jobs",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "yarn dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
