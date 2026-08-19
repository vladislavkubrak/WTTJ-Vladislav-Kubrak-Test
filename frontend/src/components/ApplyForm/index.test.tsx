import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApplyForm } from ".";
import type { ApplyFormValues } from ".";
import type { ApplyResult } from "../../api/apply";

const VALID: ApplyFormValues = {
  full_name: "Grace Hopper",
  email: "grace.hopper@example.com",
  phone: "+33 6 66 66 66 66",
  last_known_job: "Senior mathematician",
  salary_expectation: 100000,
};

const renderForm = (result: ApplyResult = { status: "ok" }) => {
  const onSubmit = vi.fn<(values: ApplyFormValues) => Promise<ApplyResult>>(
    async () => result,
  );

  render(<ApplyForm onSubmit={onSubmit} />);

  return { onSubmit, user: userEvent.setup() };
};

const fillIn = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<Record<keyof ApplyFormValues, string>> = {},
) => {
  const values = {
    "Full name": overrides.full_name ?? VALID.full_name,
    Email: overrides.email ?? VALID.email,
    Phone: overrides.phone ?? VALID.phone,
    "Last known job": overrides.last_known_job ?? VALID.last_known_job,
    "Salary expectation":
      overrides.salary_expectation ?? String(VALID.salary_expectation),
  };

  for (const [label, value] of Object.entries(values)) {
    const field = screen.getByLabelText(new RegExp(label, "i"));
    await user.clear(field);
    if (value) await user.type(field, value);
  }
};

const submitForm = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: /apply/i }));

describe("ApplyForm", () => {
  describe("layout", () => {
    it("does not move the fields when an error appears", async () => {
      const { user } = renderForm();

      const email = screen.getByLabelText(/email/i);
      const before = email.getBoundingClientRect().top;

      await submitForm(user);

      expect(await screen.findByText(/full name is required/i)).toBeVisible();

      // The message slot exists whether or not there is a message, so the
      // field below it does not jump when one arrives.
      expect(email.getBoundingClientRect().top).toBe(before);
    });
  });

  describe("validation", () => {
    it("does not submit an empty form, and says why for every field", async () => {
      const { onSubmit, user } = renderForm();

      await submitForm(user);

      expect(await screen.findByText(/full name is required/i)).toBeVisible();
      expect(screen.getByText(/email is required/i)).toBeVisible();
      expect(screen.getByText(/phone is required/i)).toBeVisible();
      expect(screen.getByText(/last known job is required/i)).toBeVisible();
      expect(
        screen.getByText(/salary expectation is required/i),
      ).toBeVisible();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rejects whitespace where a value is required", async () => {
      const { onSubmit, user } = renderForm();

      await fillIn(user, { full_name: "   " });
      await submitForm(user);

      // A space satisfies a naive `required`, which is how blank names reach
      // the database.
      expect(await screen.findByText(/full name is required/i)).toBeVisible();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rejects an address that is not an address", async () => {
      const { onSubmit, user } = renderForm();

      await fillIn(user, { email: "grace.hopper" });
      await submitForm(user);

      expect(await screen.findByText(/name@example\.com/i)).toBeVisible();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("accepts an international phone number", async () => {
      const { onSubmit, user } = renderForm();

      await fillIn(user, { phone: "+33 (0)6 66.66.66.66" });
      await submitForm(user);

      expect(onSubmit).toHaveBeenCalledOnce();
    });

    it("rejects a phone number made of letters", async () => {
      const { onSubmit, user } = renderForm();

      await fillIn(user, { phone: "call me" });
      await submitForm(user);

      expect(
        await screen.findByText(/can only contain digits/i),
      ).toBeVisible();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rejects a salary that is not a positive number", async () => {
      const { onSubmit, user } = renderForm();

      await fillIn(user, { salary_expectation: "-5" });
      await submitForm(user);

      expect(await screen.findByText(/must be positive/i)).toBeVisible();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    /*
     * A table rather than a test each, because these are the same question
     * asked of one rule at a time, and three of them were answered wrongly by
     * the first version: "((((((" and "......" passed as phone numbers because
     * the pattern checked the shape without requiring a single digit, and
     * "100.5" passed as a salary that the integer column would truncate.
     */
    const CASES: Array<[string, Partial<Record<keyof ApplyFormValues, string>>, boolean]> = [
      ["a one letter name", { full_name: "A" }, false],
      ["a name at the limit", { full_name: "A".repeat(100) }, true],
      ["a name over the limit", { full_name: "A".repeat(101) }, false],
      ["a phone of only brackets", { phone: "((((((" }, false],
      ["a phone of only dots", { phone: "......" }, false],
      ["a phone with five digits", { phone: "12345" }, false],
      ["a phone with six digits", { phone: "123456" }, true],
      ["a phone with too many digits", { phone: "1234567890123456" }, false],
      ["an address with no domain", { email: "a@b" }, false],
      ["an address with a one letter tld", { email: "a@b.c" }, false],
      ["a subdomained address", { email: "a.b+x@sub.example.co.uk" }, true],
      ["a salary of zero", { salary_expectation: "0" }, false],
      ["a salary with decimals", { salary_expectation: "100.5" }, false],
      ["a salary of one", { salary_expectation: "1" }, true],
      ["an implausible salary", { salary_expectation: "99999999" }, false],
      ["a last job over the limit", { last_known_job: "A".repeat(121) }, false],
    ];

    for (const [description, overrides, isAccepted] of CASES) {
      it(`${isAccepted ? "accepts" : "rejects"} ${description}`, async () => {
        const { onSubmit, user } = renderForm();

        await fillIn(user, overrides);
        await submitForm(user);

        expect(onSubmit.mock.calls).toHaveLength(isAccepted ? 1 : 0);
      }, 20000);
    }

    it("holds its tongue until a field has been left", async () => {
      const { user } = renderForm();

      await user.type(screen.getByLabelText(/email/i), "g");

      // Telling someone their email is invalid while they are typing the first
      // character of it is noise, not help.
      expect(screen.queryByText(/name@example\.com/i)).not.toBeInTheDocument();

      await user.tab();

      expect(await screen.findByText(/name@example\.com/i)).toBeVisible();
    });
  });

  describe("submitting", () => {
    it("sends the values as the API expects them", async () => {
      const { onSubmit, user } = renderForm();

      await fillIn(user);
      await submitForm(user);

      expect(onSubmit).toHaveBeenCalledWith(VALID);
      // Notably a number, not "100000": the caller should not have to remember
      // to convert it, which is how an empty input becomes a salary of zero.
      expect(typeof onSubmit.mock.calls[0]?.[0].salary_expectation).toBe(
        "number",
      );
    });

    it("puts a rejected field's message on that field", async () => {
      const { user } = renderForm({
        status: "invalid",
        fieldErrors: { email: "Has already applied to this job" },
      });

      await fillIn(user);
      await submitForm(user);

      expect(
        await screen.findByText(/has already applied to this job/i),
      ).toBeVisible();
    });

    it("surfaces a rejection it cannot attach to a field", async () => {
      const { user } = renderForm({
        status: "invalid",
        fieldErrors: { candidate: "Something about the candidate" },
      });

      await fillIn(user);
      await submitForm(user);

      // Dropping it because no field matches would leave the user staring at a
      // form that refuses to submit and will not say why.
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /something about the candidate/i,
      );
    });

    it("reports a broken request at the top of the form", async () => {
      const { user } = renderForm({
        status: "failed",
        message: "Your application could not be sent. Please try again.",
      });

      await fillIn(user);
      await submitForm(user);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /could not be sent/i,
      );
    });
  });
});
