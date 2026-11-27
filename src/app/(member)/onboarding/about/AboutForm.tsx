"use client";

import { useActionState } from "react";
import { saveMemberDemographics, type DemographicsState } from "@/actions/demographics";
import type { Demographics } from "@/lib/demographics-options";
import { DemographicsFields } from "@/components/DemographicsFields";
import { Alert } from "@/components/ui";

export function AboutForm({ initial, editing }: { initial: Demographics | null; editing: boolean }) {
  const [state, action, pending] = useActionState<DemographicsState, FormData>(saveMemberDemographics, undefined);
  return (
    <form action={action} className="card space-y-6 p-6" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      <DemographicsFields kind="member" initial={initial} fe={state?.fieldErrors} />
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button className="btn-primary !px-6 !py-3" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Continue to your build"}</button>
        <p className="text-xs text-muted">Only you, your clinician and NutriGoal management see this. It&apos;s never shared with an organization.</p>
      </div>
    </form>
  );
}
