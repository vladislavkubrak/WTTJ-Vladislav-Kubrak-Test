const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Turns a timestamp into "3 days ago".
 *
 * A job board is about freshness, and the default ordering here is by recency,
 * so a date is what makes that ordering legible: without it the list is in an
 * order the reader cannot see.
 *
 * The API sends a naive datetime — `2026-08-01T09:30:00`, no offset — which
 * `Date` parses as *local* time. On a machine east of UTC that puts every job
 * in the future and prints "in 2 hours". Appending `Z` reads it as what it is.
 */
export const postedAt = (timestamp: string, now = Date.now()): string | null => {
  const parsed = Date.parse(hasTimezone(timestamp) ? timestamp : `${timestamp}Z`);

  if (Number.isNaN(parsed)) return null;

  const elapsed = now - parsed;

  // Clock skew between server and browser can make a fresh job look future
  // dated. "Just posted" is truer than "in 30 seconds".
  if (elapsed < MINUTE) return "Just posted";

  const [unit, size] =
    elapsed < HOUR
      ? (["minute", MINUTE] as const)
      : elapsed < DAY
        ? (["hour", HOUR] as const)
        : elapsed < WEEK
          ? (["day", DAY] as const)
          : elapsed < MONTH
            ? (["week", WEEK] as const)
            : (["month", MONTH] as const);

  return relative.format(-Math.floor(elapsed / size), unit);
};

const hasTimezone = (timestamp: string) => /(?:Z|[+-]\d{2}:?\d{2})$/.test(timestamp);
