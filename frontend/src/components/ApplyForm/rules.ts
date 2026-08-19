import type { RegisterOptions } from "react-hook-form";

import type { ApplyFormValues } from ".";

/*
 * What the form will accept, in one place.
 *
 * Kept out of the markup because these are the decisions worth reviewing, and
 * five fields of them inline buries the shape of the form underneath its
 * conditions. Each rule is here because something got through without it.
 */

// Permissive about formatting, strict about substance. Anything stricter on
// shape rejects real international numbers; checking the shape alone accepted
// "((((((" — six characters from the allowed set and not one digit among them.
const PHONE_SHAPE = /^\+?[\d\s().-]+$/;
const MIN_PHONE_DIGITS = 6;
// E.164 caps a number, country code included, at fifteen digits.
const MAX_PHONE_DIGITS = 15;

// Deliberately not RFC 5322. This catches the class of typo that matters — no
// @, no domain, no dot — and leaves the rest to the confirmation email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const trim = (value: string) => value.trim();

const validatePhone = (value: string): true | string => {
  if (!PHONE_SHAPE.test(value)) {
    return "A phone number can only contain digits, spaces and + ( ) . -";
  }

  const digits = value.replace(/\D/g, "").length;

  if (digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
    return `Enter a phone number with ${MIN_PHONE_DIGITS} to ${MAX_PHONE_DIGITS} digits`;
  }

  return true;
};


/** Rules for one named field, so each set is checked against its own type. */
type RulesFor<Field extends keyof ApplyFormValues> = RegisterOptions<
  ApplyFormValues,
  Field
>;

export const fullNameRules: RulesFor<"full_name"> = {
  required: "Full name is required",
  // Trimmed first: a single space satisfies "required" otherwise.
  setValueAs: trim,
  minLength: { value: 2, message: "Full name is too short" },
  maxLength: { value: 100, message: "Full name is too long" },
};

export const emailRules: RulesFor<"email"> = {
  required: "Email is required",
  setValueAs: trim,
  pattern: {
    value: EMAIL_PATTERN,
    message: "Enter an email address like name@example.com",
  },
};

export const phoneRules: RulesFor<"phone"> = {
  required: "Phone is required",
  setValueAs: trim,
  validate: validatePhone,
};

export const lastKnownJobRules: RulesFor<"last_known_job"> = {
  required: "Last known job is required",
  setValueAs: trim,
  maxLength: { value: 120, message: "This is too long" },
};

export const salaryRules: RulesFor<"salary_expectation"> = {
  // Without this the field arrives as a string and the caller has to remember
  // to convert it — which is how an empty input becomes a salary of zero.
  valueAsNumber: true,
  required: "Salary expectation is required",
  // `isInteger` rather than `isFinite`: the column is an integer, so 100.5
  // would be silently truncated on the way in. It also covers the NaN an
  // empty number input produces.
  validate: (value) =>
    Number.isInteger(value) || "Salary expectation must be a whole number",
  min: { value: 1, message: "Salary expectation must be positive" },
  max: { value: 10_000_000, message: "Salary expectation looks too high" },
};
