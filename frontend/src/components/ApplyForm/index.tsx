import { useForm } from "react-hook-form";
import { Alert } from "welcome-ui/Alert";
import { Button } from "welcome-ui/Button";
import { Field } from "welcome-ui/Field";
import { InputText } from "welcome-ui/InputText";

import {
  emailRules,
  fullNameRules,
  lastKnownJobRules,
  phoneRules,
  salaryRules,
} from "./rules";
import type { ApplyResult } from "../../api/apply";

export type ApplyFormValues = {
  full_name: string;
  email: string;
  phone: string;
  last_known_job: string;
  salary_expectation: number;
};

type ApplyFormProps = {
  onSubmit: (values: ApplyFormValues) => Promise<ApplyResult>;
};

const FIELDS = [
  "full_name",
  "email",
  "phone",
  "last_known_job",
  "salary_expectation",
] as const;

const isFormField = (name: string): name is keyof ApplyFormValues =>
  (FIELDS as readonly string[]).includes(name);

/*
 * Reserving the message line.
 *
 * `Field` renders its hint and its error into the same slot — passing an error
 * replaces the hint rather than adding to it. Giving every field a blank hint
 * therefore keeps that line present at all times, so an error appearing does
 * not shove the rest of the form down the page. This is the component's own
 * API rather than a CSS workaround, so it survives a library upgrade.
 */
// A non-breaking space, not a plain one: whitespace-only inline content
// collapses to a zero-height box, so a normal space reserves nothing and
// the form still jumps the moment a message appears.
const RESERVED_LINE = "\u00A0";

export const ApplyForm = ({ onSubmit }: ApplyFormProps) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplyFormValues>({
    // Not `onChange`: validating from the first keystroke tells someone their
    // email is invalid while they are still typing the local part. Wait until
    // they leave the field, then correct live once they know it is wrong.
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      last_known_job: "",
      salary_expectation: undefined,
    },
  });

  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);

    if (result.status === "ok") return;

    if (result.status === "failed") {
      setError("root", { message: result.message });
      return;
    }

    // Server-side rejections land on the field they belong to. Anything the
    // form does not own — a field the API validates but does not render —
    // still has to be visible, so it goes to the form level rather than being
    // dropped on the floor.
    const unmapped: string[] = [];

    for (const [field, message] of Object.entries(result.fieldErrors)) {
      if (isFormField(field)) {
        setError(field, { message });
      } else {
        unmapped.push(message);
      }
    }

    if (unmapped.length > 0) {
      setError("root", { message: unmapped.join(" ") });
    }
  });

  const formError = errors.root?.message;

  return (
    <form data-testid="apply-form" onSubmit={submit} noValidate>
      {formError && (
        <Alert variant="danger" role="alert" isFullWidth className="mb-md">
          <Alert.Title>Your application was not sent</Alert.Title>
          {formError}
        </Alert>
      )}

      <Field
        label="Full name"
        required
        error={errors.full_name?.message}
        hint={RESERVED_LINE}
        className="mb-sm"
      >
        <InputText
          autoComplete="name"
          {...register("full_name", fullNameRules)}
        />
      </Field>

      <Field
        label="Email"
        required
        error={errors.email?.message}
        hint={RESERVED_LINE}
        className="mb-sm"
      >
        <InputText
          type="email"
          autoComplete="email"
          {...register("email", emailRules)}
        />
      </Field>

      <Field
        label="Phone"
        required
        error={errors.phone?.message}
        hint={RESERVED_LINE}
        className="mb-sm"
      >
        <InputText
          type="tel"
          autoComplete="tel"
          {...register("phone", phoneRules)}
        />
      </Field>

      <Field
        label="Last known job"
        required
        error={errors.last_known_job?.message}
        hint={RESERVED_LINE}
        className="mb-sm"
      >
        <InputText
          autoComplete="organization-title"
          {...register("last_known_job", lastKnownJobRules)}
        />
      </Field>

      <Field
        label="Salary expectation"
        required
        error={errors.salary_expectation?.message}
        hint={RESERVED_LINE}
        className="mb-md"
      >
        <InputText
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          {...register("salary_expectation", salaryRules)}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Apply"}
      </Button>
    </form>
  );
};
