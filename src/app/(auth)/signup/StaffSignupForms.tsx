"use client";

import { useActionState } from "react";
import { signupClinician, signupManager, type FormState } from "@/actions/auth";
import { GOAL_TYPES } from "@/lib/domain";
import { Alert, Field } from "@/components/ui";

function Common({ fe }: { fe: Record<string, string> }) {
  return (
    <>
      <Field label="Full name" name="name" error={fe.name}>
        <input id="name" name="name" autoComplete="name" className="input" aria-invalid={!!fe.name} required />
      </Field>
      <Field label="Work email" name="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="email" className="input" aria-invalid={!!fe.email} required />
      </Field>
      <Field label="Password" name="password" error={fe.password} hint="At least 10 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" aria-invalid={!!fe.password} required />
      </Field>
    </>
  );
}

function Consent({ fe, text }: { fe: Record<string, string>; text: string }) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-slate">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-blue" />
        <span>{text}</span>
      </label>
      {fe.consent && <p className="field-error">{fe.consent}</p>}
    </div>
  );
}

export function ClinicianSignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signupClinician, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-6 space-y-5" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      <Common fe={fe} />
      <Field label="Profession" name="clinician_type" error={fe.clinician_type}>
        <select id="clinician_type" name="clinician_type" className="input" defaultValue="">
          <option value="" disabled>Choose…</option>
          <option value="MD">Physician (MD)</option>
          <option value="DO">Physician (DO)</option>
          <option value="RD">Registered dietitian (RD/RDN)</option>
          <option value="CNS">Certified Nutrition Specialist (CNS)</option>
          <option value="NUT">Licensed nutritionist</option>
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_90px]">
        <Field label="License or registration number" name="license_number" error={fe.license_number}>
          <input id="license_number" name="license_number" className="input" aria-invalid={!!fe.license_number} />
        </Field>
        <Field label="State" name="license_state" error={fe.license_state}>
          <input id="license_state" name="license_state" maxLength={2} placeholder="NY" className="input uppercase" aria-invalid={!!fe.license_state} />
        </Field>
      </div>
      <Field label="NPI (optional)" name="npi" error={fe.npi}>
        <input id="npi" name="npi" inputMode="numeric" maxLength={10} className="input" aria-invalid={!!fe.npi} />
      </Field>
      <fieldset>
        <legend className="label">Goals you&apos;d like to take</legend>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {GOAL_TYPES.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm text-slate">
              <input type="checkbox" name="specialties" value={g.id} className="accent-blue" /> {g.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Consent
        fe={fe}
        text="I hold an active license or credential in good standing, and I'll write and sign my own recommendations using methods I've proven in practice. NutriGoal may verify my license."
      />
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Submitting…" : "Apply to join as a clinician"}
      </button>
    </form>
  );
}

export function ManagerSignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signupManager, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-6 space-y-5" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      <Common fe={fe} />
      <Field label="Organization" name="organization" error={fe.organization}>
        <input id="organization" name="organization" autoComplete="organization" className="input" aria-invalid={!!fe.organization} />
      </Field>
      <Field label="Job title" name="title" error={fe.title}>
        <input id="title" name="title" autoComplete="organization-title" placeholder="e.g. Clinical Operations Manager" className="input" aria-invalid={!!fe.title} />
      </Field>
      <Consent fe={fe} text="I'll access member information only to run care operations, and I understand an existing manager must approve my account." />
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Submitting…" : "Apply to join as a care manager"}
      </button>
    </form>
  );
}
