"use client";

import { useActionState, useState } from "react";
import { subscribeAndSubmit, type PayState } from "@/actions/tickets";
import { CardFields } from "@/components/CardFields";
import { Alert } from "@/components/ui";
import { PRICES, money } from "@/lib/domain";

export function JoinPanel() {
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [state, action, pending] = useActionState<PayState, FormData>(subscribeAndSubmit, undefined);
  const price = plan === "yearly" ? PRICES.subscriptionYearly : PRICES.subscriptionMonthly;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlan(p)}
            aria-pressed={plan === p}
            className={`card p-6 text-left transition ${plan === p ? "border-blue ring-1 ring-blue" : "hover:border-navy"}`}
          >
            <div className="eyebrow">{p === "monthly" ? "Monthly" : "Annual"}</div>
            <div className="font-display mt-2 text-4xl">{money(p === "monthly" ? PRICES.subscriptionMonthly : PRICES.subscriptionYearly)}</div>
            <div className="text-sm text-muted">{p === "monthly" ? "per month" : "per year"}</div>
            {p === "yearly" && <div className="mt-2 text-xs font-bold text-good">Save {money(PRICES.subscriptionMonthly * 12 - PRICES.subscriptionYearly)} a year</div>}
          </button>
        ))}
        <ul className="card space-y-2 p-6 text-sm text-slate sm:col-span-2">
          {[
            "1 goal ticket every month, answered by a physician or dietitian",
            `Daily Support Pack included (${money(PRICES.supportPack)}/mo value)`,
            `Extra tickets at ${money(PRICES.extraTicketMember)} instead of ${money(PRICES.ticketOneTime)}`,
            "Member offers from verified partners · cancel any time",
          ].map((i) => (
            <li key={i} className="flex gap-2">
              <span className="text-blue" aria-hidden>✓</span>
              {i}
            </li>
          ))}
        </ul>
      </div>
      <form action={action} className="card space-y-4 p-6">
        <input type="hidden" name="plan" value={plan} />
        <div className="font-bold">Checkout · {plan === "yearly" ? "Annual" : "Monthly"} membership</div>
        {state?.error && <Alert>{state.error}</Alert>}
        <CardFields idPrefix="join" />
        <button className="btn-primary w-full !py-3" disabled={pending}>
          {pending ? "Processing…" : `Pay ${money(price)} and join`}
        </button>
      </form>
    </div>
  );
}
