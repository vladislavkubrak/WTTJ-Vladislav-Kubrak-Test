import { describe, expect, it } from "vitest";

import { postedAt } from "./postedAt";

// A fixed "now" so the expectations are about the function, not the clock.
const NOW = Date.parse("2026-08-16T12:00:00Z");

describe("postedAt", () => {
  it("reads a naive timestamp as UTC, which is what the API sends", () => {
    // `Date` parses "2026-08-16T10:00:00" as *local* time. East of UTC that
    // puts a two-hour-old job in the future and prints "in 1 hour".
    expect(postedAt("2026-08-16T10:00:00", NOW)).toBe("2 hours ago");
  });

  it("honours an offset when there is one", () => {
    expect(postedAt("2026-08-16T10:00:00Z", NOW)).toBe("2 hours ago");
    expect(postedAt("2026-08-16T12:00:00+02:00", NOW)).toBe("2 hours ago");
  });

  it("scales the unit to the distance", () => {
    expect(postedAt("2026-08-16T11:30:00Z", NOW)).toBe("30 minutes ago");
    expect(postedAt("2026-08-14T12:00:00Z", NOW)).toBe("2 days ago");
    expect(postedAt("2026-08-02T12:00:00Z", NOW)).toBe("2 weeks ago");
    expect(postedAt("2026-05-16T12:00:00Z", NOW)).toBe("3 months ago");
  });

  it("does not print a job as posted in the future", () => {
    // Server and browser clocks disagree by seconds all the time, and "in 30
    // seconds" reads as a bug.
    expect(postedAt("2026-08-16T12:00:20Z", NOW)).toBe("Just posted");
    expect(postedAt("2026-08-16T11:59:59Z", NOW)).toBe("Just posted");
  });

  it("says nothing rather than something wrong", () => {
    expect(postedAt("not a date", NOW)).toBeNull();
    expect(postedAt("", NOW)).toBeNull();
  });
});
