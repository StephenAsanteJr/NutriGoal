"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/actions/auth";
import { Alert, Field } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="mt-8 space-y-5">
      {state?.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email">
        <input id="email" name="email" type="email" autoComplete="email" className="input" required />
      </Field>
      <Field label="Password" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
      </Field>
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-muted">
        Demo accounts are listed in the project README (member, clinician and manager roles).
      </p>
    </form>
  );
}
