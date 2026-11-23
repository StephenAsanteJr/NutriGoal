"use client";

import { useActionState } from "react";
import { signup, type FormState } from "@/actions/auth";
import { Alert, Field } from "@/components/ui";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="Full name" name="name" error={fe.name}>
        <input id="name" name="name" autoComplete="name" className="input" aria-invalid={!!fe.name} required />
      </Field>
      <Field label="Email" name="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="email" className="input" aria-invalid={!!fe.email} required />
      </Field>
      <Field label="Password" name="password" error={fe.password} hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" aria-invalid={!!fe.password} required />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm text-slate">
          <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-blue" />
          <span>
            I agree that NutriGoal clinicians may review the health information I share to answer my tickets. NutriGoal never sells
            individual health data.
          </span>
        </label>
        {fe.consent && <p className="field-error">{fe.consent}</p>}
      </div>
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Creating account…" : "Create account and continue"}
      </button>
    </form>
  );
}
