export type ApplyParams = {
  full_name: string;
  email: string;
  phone: string;
  last_known_job: string;
  salary_expectation: number;
  job_id?: number | string;
};

/** Field name -> first message the server gave for it. */
export type ApplyFieldErrors = Record<string, string>;

/**
 * The outcome of an application, as three cases the UI has to tell apart.
 *
 * A rejected application is not the same kind of event as a broken one: the
 * first belongs next to the field the user has to fix, the second belongs at
 * the top of the form. Collapsing both into a thrown Error is why this used to
 * report "Unknown error" for a blank phone number.
 */
export type ApplyResult =
  | { status: "ok" }
  | { status: "invalid"; fieldErrors: ApplyFieldErrors }
  | { status: "failed"; message: string };

const FAILED_MESSAGE = "Your application could not be sent. Please try again.";

export const apply = async (
  jobId: number | string,
  params: ApplyParams,
  signal?: AbortSignal,
): Promise<ApplyResult> => {
  let response: Response;

  try {
    response = await fetch(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ apply: params }),
      signal,
    });
  } catch {
    // Offline, DNS, connection reset: never reached the server at all.
    return { status: "failed", message: FAILED_MESSAGE };
  }

  if (response.ok) return { status: "ok" };

  if (response.status === 422) {
    const payload: unknown = await response.json().catch(() => null);
    const fieldErrors = readFieldErrors(payload);

    // A 422 with an unreadable body is still a rejection, but there is nothing
    // to attach to a field, so it has to surface as a general failure.
    if (Object.keys(fieldErrors).length > 0) {
      return { status: "invalid", fieldErrors };
    }
  }

  return { status: "failed", message: FAILED_MESSAGE };
};

/**
 * Phoenix renders changeset errors as `{errors: {field: ["can't be blank"]}}`.
 * Only the first message per field is kept: the field can show one line, and
 * the rest are variations on the same problem.
 */
const readFieldErrors = (payload: unknown): ApplyFieldErrors => {
  if (typeof payload !== "object" || payload === null) return {};

  const { errors } = payload as { errors?: unknown };

  if (typeof errors !== "object" || errors === null) return {};

  const result: ApplyFieldErrors = {};

  for (const [field, messages] of Object.entries(errors)) {
    const first = Array.isArray(messages) ? messages[0] : messages;

    if (typeof first === "string" && first.length > 0) {
      result[field] = capitalise(first);
    }
  }

  return result;
};

const capitalise = (message: string) =>
  message.charAt(0).toUpperCase() + message.slice(1);
