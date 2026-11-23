import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, ticketNumber } from "@/lib/domain";
import { LogoLockup } from "@/components/Logo";
import { Alert } from "@/components/ui";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Proof of payment" };

type PaymentRow = {
  id: string;
  user_id: string;
  kind: string;
  description: string;
  amount_cents: number;
  card_brand: string | null;
  card_last4: string | null;
  ticket_id: number | null;
  status: string;
  created_at: string;
  provider: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  stripe_subscription_id: string | null;
  receipt_url: string | null;
};

export default async function ReceiptPage(props: PageProps<"/payments/[id]">) {
  const user = await requireMember();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const p = db().prepare("SELECT * FROM payments WHERE id = ? AND user_id = ?").get(id, user.id) as PaymentRow | undefined;
  if (!p) notFound();
  const stripe = p.provider === "stripe";
  const number = `NG-R-${p.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const when = new Date(p.created_at);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {sp.new && <Alert tone="good"><strong>Payment confirmed.</strong> Here&apos;s your proof of payment.</Alert>}
      <article className="card overflow-hidden print:border-0" aria-label="Proof of payment">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-8 py-6">
          <LogoLockup width={130} />
          <div className="text-right">
            <div className="eyebrow">Proof of payment</div>
            <div className="font-mono text-sm">{number}</div>
            <div className="text-xs text-muted">{when.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</div>
          </div>
        </header>

        <div className="px-8 py-6">
          <div className="flex items-center gap-3">
            <span className="pill bg-good-tint text-good">✓ {p.status === "succeeded" ? "Paid" : p.status}</span>
            <span className={`pill ${stripe ? "bg-[#635bff] text-white" : "bg-mist text-slate"}`}>{stripe ? "Processed by Stripe" : "Demo checkout · no real charge"}</span>
          </div>
          <div className="font-display mt-4 text-5xl">{money(p.amount_cents)}</div>
          <p className="mt-1 text-sm text-slate">{p.description}</p>

          <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-[2px] bg-line text-sm sm:grid-cols-2">
            {[
              ["Billed to", `${user.name} · ${user.email}`],
              ["Payment method", p.card_brand ? `${p.card_brand} ending ${p.card_last4}` : stripe ? "Card via Stripe" : "—"],
              ["Item", p.kind.startsWith("subscription") ? `Membership (${p.kind.endsWith("yearly") ? "annual" : "monthly"})` : p.kind === "addon" ? "Add-on" : "Goal ticket"],
              ["Ticket", p.ticket_id ? ticketNumber(p.ticket_id) : "—"],
              ...(stripe
                ? [
                    ["Stripe payment", p.stripe_payment_intent ?? p.stripe_subscription_id ?? "—"],
                    ["Stripe checkout", p.stripe_session_id?.startsWith("inv:") ? p.stripe_session_id.slice(4) : (p.stripe_session_id ?? "—")],
                  ]
                : []),
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-4 py-3">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</dt>
                <dd className="mt-0.5 break-all">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-mist px-8 py-4 text-xs text-slate print:hidden">
          <span>Keep this page as your proof of payment.</span>
          <div className="flex flex-wrap gap-2">
            {p.receipt_url && (
              <a href={p.receipt_url} target="_blank" rel="noreferrer" className="btn-outline !py-2 text-xs">
                View Stripe receipt ↗
              </a>
            )}
            <PrintButton />
          </div>
        </footer>
      </article>
      <div className="flex flex-wrap gap-3 print:hidden">
        {p.ticket_id && <Link href={`/tickets/${p.ticket_id}`} className="btn-primary">Go to ticket {ticketNumber(p.ticket_id)}</Link>}
        <Link href="/membership" className="btn-ghost">All payments</Link>
      </div>
    </div>
  );
}
