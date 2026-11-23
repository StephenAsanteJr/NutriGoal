"use client";

import { useActionState, useState } from "react";
import { payExtraTicket, payTicketOnce, redeemIncludedTicket, subscribeAndSubmit, type PayState } from "@/actions/tickets";
import { CardFields } from "@/components/CardFields";
import { Alert } from "@/components/ui";
import { MEMBERSHIP, PRICES, money } from "@/lib/domain";

type Membership = { plan: "monthly" | "yearly"; credits: number; nextCredit: string } | null;

/** Split view: option 1 (one-time ticket) on the left, option 2 (membership) on the right. */
export function PaymentOptions({ ticketId, membership, stripe = false }: { ticketId: number; membership: Membership; stripe?: boolean }) {
  const [open, setOpen] = useState<"one" | "member" | null>(null);
  return (
    <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-0">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-line lg:block" aria-hidden />
      <span className="pointer-events-none absolute left-1/2 top-24 z-10 hidden -translate-x-1/2 rounded-full border border-line bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted lg:block">
        or
      </span>
      <div className="lg:pr-10">
        {membership ? (
          <MemberExtraOption ticketId={ticketId} open={open === "one"} onOpen={() => setOpen("one")} hasCredit={membership.credits > 0} stripe={stripe} />
        ) : (
          <OneTimeOption ticketId={ticketId} open={open === "one"} onOpen={() => setOpen("one")} stripe={stripe} />
        )}
      </div>
      <div className="lg:pl-10">
        {membership ? (
          <IncludedTicketOption ticketId={ticketId} membership={membership} />
        ) : (
          <MembershipOption ticketId={ticketId} open={open === "member"} onOpen={() => setOpen("member")} stripe={stripe} />
        )}
      </div>
    </div>
  );
}

function OptionShell({ n, title, price, unit, children, featured }: { n: string; title: string; price: string; unit: string; children: React.ReactNode; featured?: boolean }) {
  return (
    <section className={`card flex h-full flex-col p-7 ${featured ? "border-navy" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="eyebrow">Option {n}</span>
        {featured && <span className="pill bg-navy text-white">Best value</span>}
      </div>
      <h2 className="font-display mt-3 text-3xl">{title}</h2>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-5xl">{price}</span>
        <span className="text-sm text-muted">{unit}</span>
      </div>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2 text-sm text-slate">
      {items.map((i) => (
        <li key={i} className="flex gap-2">
          <span className="text-blue" aria-hidden>✓</span>
          {i}
        </li>
      ))}
    </ul>
  );
}

function OneTimeOption({ ticketId, open, onOpen, stripe }: { ticketId: number; open: boolean; onOpen: () => void; stripe: boolean }) {
  const [state, action, pending] = useActionState<PayState, FormData>(payTicketOnce, undefined);
  return (
    <OptionShell n="1" title="Submit this ticket" price={money(PRICES.ticketOneTime)} unit="one-time fee">
      <Bullets items={["This one goal, answered in writing", "Matched physician or dietitian", `Response ticket within ${MEMBERSHIP.responseSlaHours} hours`, "No subscription, nothing recurring"]} />
      {!open ? (
        <button type="button" className="btn-outline mt-7 w-full !py-3" onClick={onOpen}>
          Pay {money(PRICES.ticketOneTime)} and submit
        </button>
      ) : (
        <form action={action} className="mt-7 space-y-4 border-t border-line pt-6">
          <input type="hidden" name="ticket_id" value={ticketId} />
          {state?.error && <Alert>{state.error}</Alert>}
          <CardFields idPrefix="one" stripe={stripe} />
          <button className="btn-primary w-full !py-3" disabled={pending}>
            {pending ? (stripe ? "Opening Stripe…" : "Processing…") : stripe ? `Continue to secure checkout · ${money(PRICES.ticketOneTime)}` : `Pay ${money(PRICES.ticketOneTime)} and submit ticket`}
          </button>
        </form>
      )}
    </OptionShell>
  );
}

function MembershipOption({ ticketId, open, onOpen, stripe }: { ticketId: number; open: boolean; onOpen: () => void; stripe: boolean }) {
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [state, action, pending] = useActionState<PayState, FormData>(subscribeAndSubmit, undefined);
  const price = plan === "yearly" ? PRICES.subscriptionYearly : PRICES.subscriptionMonthly;
  const saving = PRICES.subscriptionMonthly * 12 - PRICES.subscriptionYearly;
  return (
    <OptionShell n="2" title="Join NutriGoal Membership" price={money(price)} unit={plan === "yearly" ? "per year" : "per month"} featured>
      <div className="mt-4 inline-flex w-fit rounded-[2px] border border-line p-0.5 text-sm font-bold" role="group" aria-label="Billing period">
        {(["monthly", "yearly"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPlan(p)} aria-pressed={plan === p} className={`rounded-[2px] px-4 py-1.5 ${plan === p ? "bg-navy text-white" : "text-slate hover:text-navy"}`}>
            {p === "monthly" ? `Monthly ${money(PRICES.subscriptionMonthly)}` : `Yearly ${money(PRICES.subscriptionYearly)}`}
          </button>
        ))}
      </div>
      {plan === "yearly" && <p className="mt-2 text-xs font-bold text-good">Save {money(saving)} a year versus monthly.</p>}
      <Bullets
        items={[
          `${MEMBERSHIP.ticketsPerMonth} goal ticket every month — this ticket uses this month's`,
          `Daily Support Pack included (${money(PRICES.supportPack)}/mo value): meal-timed nudges, programs, grocery lists`,
          `Extra tickets at the member price of ${money(PRICES.extraTicketMember)}`,
          "Member offers from verified partners. Cancel any time.",
        ]}
      />
      {!open ? (
        <button type="button" className="btn-primary mt-7 w-full !py-3" onClick={onOpen}>
          Join and submit this ticket
        </button>
      ) : (
        <form action={action} className="mt-7 space-y-4 border-t border-line pt-6">
          <input type="hidden" name="ticket_id" value={ticketId} />
          <input type="hidden" name="plan" value={plan} />
          {state?.error && <Alert>{state.error}</Alert>}
          <CardFields idPrefix="member" stripe={stripe} />
          <button className="btn-primary w-full !py-3" disabled={pending}>
            {pending ? (stripe ? "Opening Stripe…" : "Processing…") : stripe ? `Continue to secure checkout · ${money(price)}` : `Pay ${money(price)} — join and submit`}
          </button>
          <p className="text-center text-xs text-muted">Renews {plan === "yearly" ? "yearly" : "monthly"} until you cancel.</p>
        </form>
      )}
    </OptionShell>
  );
}

function IncludedTicketOption({ ticketId, membership }: { ticketId: number; membership: NonNullable<Membership> }) {
  const [state, action, pending] = useActionState<PayState, FormData>(redeemIncludedTicket, undefined);
  const next = new Date(membership.nextCredit).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const has = membership.credits > 0;
  return (
    <OptionShell n="2" title="Use your membership" price={has ? "$0" : "—"} unit={has ? "included ticket" : `next ticket ${next}`} featured>
      <p className="mt-4 text-sm text-slate">
        You&apos;re signed in to your {membership.plan === "yearly" ? "annual" : "monthly"} membership.{" "}
        {has ? "You have 1 included ticket available this month." : `You've used this month's included ticket. Your next one arrives ${next}.`}
      </p>
      {has ? (
        <form action={action} className="mt-7">
          <input type="hidden" name="ticket_id" value={ticketId} />
          {state?.error && <Alert>{state.error}</Alert>}
          <button className="btn-primary w-full !py-3" disabled={pending}>
            {pending ? "Submitting…" : "Submit with my included ticket"}
          </button>
        </form>
      ) : (
        <p className="mt-7 rounded-[2px] bg-mist px-4 py-3 text-sm text-slate">Your draft is saved. Come back on {next} to send it free, or buy an extra ticket now.</p>
      )}
    </OptionShell>
  );
}

function MemberExtraOption({ ticketId, open, onOpen, hasCredit, stripe }: { ticketId: number; open: boolean; onOpen: () => void; hasCredit: boolean; stripe: boolean }) {
  const [state, action, pending] = useActionState<PayState, FormData>(payExtraTicket, undefined);
  return (
    <OptionShell n="1" title="Buy an extra ticket" price={money(PRICES.extraTicketMember)} unit="member price">
      <Bullets
        items={[
          hasCredit ? "Keep your included ticket for later this month" : "Send this goal now instead of waiting",
          `Members save ${money(PRICES.ticketOneTime - PRICES.extraTicketMember)} off the one-time price`,
          `Response ticket within ${MEMBERSHIP.responseSlaHours} hours`,
        ]}
      />
      {!open ? (
        <button type="button" className="btn-outline mt-7 w-full !py-3" onClick={onOpen}>
          Pay {money(PRICES.extraTicketMember)} and submit
        </button>
      ) : (
        <form action={action} className="mt-7 space-y-4 border-t border-line pt-6">
          <input type="hidden" name="ticket_id" value={ticketId} />
          {state?.error && <Alert>{state.error}</Alert>}
          <CardFields idPrefix="extra" stripe={stripe} />
          <button className="btn-primary w-full !py-3" disabled={pending}>
            {pending ? (stripe ? "Opening Stripe…" : "Processing…") : stripe ? `Continue to secure checkout · ${money(PRICES.extraTicketMember)}` : `Pay ${money(PRICES.extraTicketMember)} and submit ticket`}
          </button>
        </form>
      )}
    </OptionShell>
  );
}
