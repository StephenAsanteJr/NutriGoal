"use client";

import { useActionState, useState } from "react";
import { unlockAddon, type UnlockState } from "@/actions/marketplace";
import type { AddonRow } from "@/lib/data";
import { money } from "@/lib/domain";
import { CardFields } from "@/components/CardFields";
import { Alert } from "@/components/ui";

export function AddonCard({ addon, member, stripe = false, autoOpen = false }: { addon: AddonRow; member: boolean; stripe?: boolean; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockAddon, undefined);
  const included = !!addon.included_with_membership && member;
  const unlocked = !!addon.unlocked || state?.ok;

  return (
    <article id={`addon-${addon.id}`} className={`card flex scroll-mt-24 flex-col p-6 ${unlocked ? "border-good" : ""} ${autoOpen ? "ring-2 ring-blue" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold">{addon.name}</h3>
        {unlocked ? (
          <span className="pill bg-good-tint text-good">✓ Unlocked</span>
        ) : addon.included_with_membership ? (
          <span className="pill bg-navy text-white">Included with membership</span>
        ) : null}
      </div>
      {addon.partner_name && <div className="text-xs font-bold text-muted">with {addon.partner_name}</div>}
      <p className="mt-2 flex-1 text-sm text-slate">{addon.description}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-3xl">{included ? "$0" : money(addon.price_cents)}</span>
        <span className="text-sm text-muted">{included ? "with your membership" : addon.interval === "month" ? "/ month" : "one time"}</span>
      </div>
      {state?.paymentId && (
        <a href={`/payments/${state.paymentId}?new=1`} className="link mt-3 text-xs">View proof of payment →</a>
      )}
      {unlocked ? null : included ? (
        <form action={action} className="mt-4">
          <input type="hidden" name="addon_id" value={addon.id} />
          {state?.error && <Alert>{state.error}</Alert>}
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Unlocking…" : "Unlock — included"}</button>
        </form>
      ) : !open ? (
        <button type="button" className="btn-outline mt-4 w-full" onClick={() => setOpen(true)}>
          Unlock for {money(addon.price_cents)}
        </button>
      ) : (
        <form action={action} className="mt-4 space-y-4 border-t border-line pt-4">
          <input type="hidden" name="addon_id" value={addon.id} />
          {state?.error && <Alert>{state.error}</Alert>}
          <CardFields idPrefix={`addon-${addon.id}`} stripe={stripe} />
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? (stripe ? "Opening Stripe…" : "Processing…") : `${stripe ? "Continue to secure checkout · " : "Pay "}${money(addon.price_cents)}${addon.interval === "month" ? "/mo" : ""}`}
          </button>
        </form>
      )}
    </article>
  );
}
