"use client";

import { useActionState } from "react";
import { updateOrgSettings, type OrgFormState } from "@/actions/org";
import { INDUSTRIES, TIERS } from "@/lib/enterprise";
import { Alert, Field } from "@/components/ui";

export function OrgSettingsForm({ org }: { org: { name: string; industry: string | null; eligible: number; plan: string } }) {
  const [state, action, pending] = useActionState<OrgFormState, FormData>(updateOrgSettings, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="good">{state.ok}</Alert>}
      <Field label="Organization name" name="name" error={fe.name}>
        <input id="name" name="name" defaultValue={org.name} className="input" aria-invalid={!!fe.name} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type of organization" name="industry" error={fe.industry}>
          <select id="industry" name="industry" defaultValue={org.industry ?? INDUSTRIES[0]} className="input">
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="People eligible" name="eligible" error={fe.eligible}>
          <input id="eligible" name="eligible" inputMode="numeric" defaultValue={org.eligible} className="input" aria-invalid={!!fe.eligible} />
        </Field>
      </div>
      <Field label="Plan" name="plan" hint="NutriGoal confirms plan changes before your next invoice.">
        <select id="plan" name="plan" defaultValue={org.plan} className="input">
          {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
