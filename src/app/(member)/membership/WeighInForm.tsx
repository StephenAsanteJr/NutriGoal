"use client";

import { useActionState } from "react";
import { logWeighIn, type SimpleState } from "@/actions/settings";
import { Alert } from "@/components/ui";

export function WeighInForm({ units, today }: { units: "imperial" | "metric"; today: string }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(logWeighIn, undefined);
  const w = units === "metric" ? "kg" : "lb";
  return (
    <form action={action} className="card space-y-3 p-5">
      <div className="font-bold">Log a weigh-in</div>
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="good">{state.ok}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs font-bold sm:col-span-1">
          Date
          <input type="date" name="logged_on" defaultValue={today} max={today} className="input mt-1" required />
        </label>
        <label className="col-span-2 text-xs font-bold sm:col-span-1">
          Weight ({w})
          <input name="weight" inputMode="decimal" className="input mt-1" required />
        </label>
        <label className="text-xs font-bold">
          Body fat % <span className="font-normal text-muted">(optional)</span>
          <input name="body_fat_pct" inputMode="decimal" className="input mt-1" />
        </label>
        <label className="text-xs font-bold">
          Waist ({units === "metric" ? "cm" : "in"}) <span className="font-normal text-muted">(optional)</span>
          <input name="waist" inputMode="decimal" className="input mt-1" />
        </label>
        <label className="col-span-2 text-xs font-bold">
          Note <span className="font-normal text-muted">(optional)</span>
          <input name="note" maxLength={200} className="input mt-1" placeholder="e.g. after a long weekend" />
        </label>
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save weigh-in"}</button>
    </form>
  );
}
