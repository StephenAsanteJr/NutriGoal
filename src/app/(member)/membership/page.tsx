import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveSubscription } from "@/lib/data";
import { MEMBERSHIP, PRICES, money } from "@/lib/domain";
import { Alert, PageHeader, shortDate } from "@/components/ui";
import { JoinPanel } from "./JoinPanel";

export const metadata: Metadata = { title: "Membership" };

export default async function MembershipPage(props: PageProps<"/membership">) {
  const user = await requireMember();
  const sp = await props.searchParams;
  const sub = getActiveSubscription(user.id);
  const payments = db()
    .prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 12")
    .all(user.id) as { id: string; description: string; amount_cents: number; card_brand: string | null; card_last4: string | null; created_at: string }[];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Membership" title={sub ? "Your NutriGoal Membership" : "Join NutriGoal Membership"}>
        {money(PRICES.subscriptionMonthly)} a month or {money(PRICES.subscriptionYearly)} a year: {MEMBERSHIP.ticketsPerMonth} goal ticket every month, the Daily
        Support Pack, and member pricing on extra tickets.
      </PageHeader>
      {sp.welcome && <Alert tone="good">Welcome aboard. Your membership is active and this month&apos;s ticket is ready to use.</Alert>}

      {sub ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Stat label="Plan" value={sub.plan === "yearly" ? "Annual" : "Monthly"} sub={`${money(sub.price_cents)} · renews ${new Date(sub.renews_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`} />
          <Stat
            label="Included tickets"
            value={`${sub.ticket_credits} available`}
            sub={`Next credit ${new Date(sub.credits_reset_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            action={sub.ticket_credits > 0 ? <Link href="/tickets/new" className="link text-sm">Use it now →</Link> : undefined}
          />
          <Stat label="Daily Support Pack" value="Active" sub="Meal-timed nudges, programs and grocery lists" action={<Link href="/marketplace#addons" className="link text-sm">See add-ons →</Link>} />
        </div>
      ) : (
        <JoinPanel />
      )}

      <section className="card">
        <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Payment history</h2>
        {payments.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3">{p.description}</td>
                  <td className="px-3 py-3 text-slate">{p.card_brand ? `${p.card_brand} ·· ${p.card_last4}` : "—"}</td>
                  <td className="px-3 py-3 text-slate">{shortDate(p.created_at)}</td>
                  <td className="px-6 py-3 text-right font-bold">{money(p.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="border-t border-line px-6 py-2 text-[11px] text-muted">Demo build: these are simulated payments; no card was charged.</p>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, action }: { label: string; value: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="eyebrow">{label}</div>
      <div className="font-display mt-2 text-3xl">{value}</div>
      <p className="mt-1 text-sm text-slate">{sub}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
