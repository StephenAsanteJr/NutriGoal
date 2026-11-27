"use client";

import { useActionState } from "react";
import { signup, type FormState } from "@/actions/auth";
import { Alert, Field } from "@/components/ui";

export function SignupForm({ referral = "", org }: { referral?: string; org?: { code: string; name: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      {referral && <input type="hidden" name="ref" value={referral} />}
      {org && <input type="hidden" name="org" value={org.code} />}
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
          <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-bcg-deep" />
          <span>
            I agree that NutriGoal clinicians may review the health information I share to answer my tickets. NutriGoal never sells
            individual health data.
          </span>
        </label>
        {fe.consent && <p className="field-error">{fe.consent}</p>}
      </div>
      {org && (
        <label className="flex items-start gap-3 rounded-[3px] border border-bcg-deep/30 bg-bcg-tint/50 p-3 text-sm text-slate">
          <input type="checkbox" name="org_consent" defaultChecked className="mt-0.5 h-4 w-4 accent-bcg-deep" />
          <span>
            Join <strong className="text-ink">{org.name}</strong> on NutriGoal. They see only de-identified totals for groups of 5 or more people, never
            your name, weight, labs, tickets or plans. Your clinician isn&apos;t told who sponsors you. You can leave any time in Membership.
          </span>
        </label>
      )}
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Creating account…" : "Create account and continue"}
      </button>
    </form>
  );
}
