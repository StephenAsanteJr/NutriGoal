import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { MIN_GROUP } from "@/lib/enterprise";
import { CostCalculator } from "@/components/enterprise/CostCalculator";
import { TierCards } from "@/components/enterprise/TierCards";

export const metadata: Metadata = {
  title: "NutriGoal for organizations",
  description: "Enterprise plans, a cost rundown calculator and double-blind wellness reporting for employers, health plans and schools.",
};

const STEPS = [
  ["Set up", "Create your organization account and get an invite link. No employee list needed."],
  ["Invite", "Share the link. People join on their own and build a private profile."],
  ["Care", "Members send goal tickets; licensed clinicians write and sign plans within 48 hours."],
  ["Report", `You see de-identified totals for groups of ${MIN_GROUP}+: who's getting closer to or straying from their goals, never who.`],
];

/** Public: enterprise plans, the interactive cost rundown, and how the reporting protects members. */
export default function Enterprise() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-ink text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo tone="light" suffix="For organizations" />
          <nav className="flex items-center gap-4 text-sm font-bold">
            <Link href="/login" className="hover:text-bcg-fresh">Sign in</Link>
            <Link href="/signup?role=org" className="btn-primary !py-2">Set up your organization</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-10">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-bcg-fresh">Enterprise</div>
          <h1 className="font-display mt-3 max-w-3xl text-5xl leading-tight">Clinician-written nutrition plans for your people, with reporting that never reveals who</h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Employers, health plans, schools and unions sponsor NutriGoal. You pay per enrolled member, see how your population is moving
            toward the goals people set for themselves, and never see a name, a weight or a diagnosis.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-14 px-6 py-12">
        <section>
          <div className="eyebrow">How it works</div>
          <ol className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-[3px] bg-line md:grid-cols-4">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="bg-white p-5">
                <div className={`font-display text-3xl ${i % 2 ? "text-bain" : "text-bcg-deep"}`}>0{i + 1}</div>
                <div className="mt-2 font-bold">{t}</div>
                <p className="mt-1 text-sm text-slate">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="eyebrow">Plans</div>
          <h2 className="font-display mt-2 text-4xl">Pay for the people who join</h2>
          <p className="mb-6 mt-2 max-w-3xl text-sm text-slate">
            Per enrolled member per month, plus a platform fee for invitations, reporting and support. Start with a 90-day pilot; the fee is
            credited toward a first-year contract.
          </p>
          <TierCards />
        </section>

        <section>
          <div className="eyebrow">Cost rundown</div>
          <h2 className="font-display mt-2 text-4xl">What it would cost you</h2>
          <p className="mb-6 mt-2 max-w-3xl text-sm text-slate">Enter your headcount and expected enrollment. Every line of the bill is shown.</p>
          <CostCalculator />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="eyebrow">Double-blind reporting</div>
            <h2 className="font-display mt-2 text-4xl leading-tight">Organizational wellness without anyone&apos;s medical information</h2>
            <p className="mt-3 text-sm text-slate">
              Reports are computed on NutriGoal&apos;s servers from members who chose to join, and only group totals leave. The clinician writing a
              plan is never told who sponsors the member.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-2">
            {[
              ["You see", "Enrollment, activity, a 0–100 wellness index, and the share of people getting closer to, holding or straying from their own goals, month by month."],
              ["You never see", "Names, emails, weights, labs, conditions, medications, goals, tickets, plans or any individual row."],
              [`Groups under ${MIN_GROUP}`, `Any view covering fewer than ${MIN_GROUP} people is withheld, and shares are rounded to the nearest 5%.`],
              ["Clinicians never see", "Which organization, if any, sponsors a member. Care is the same either way."],
            ].map(([t, b], i) => (
              <div key={t} className="bg-white p-5">
                <div className={`text-sm font-bold ${i === 1 || i === 3 ? "text-bain" : "text-bcg-deep"}`}>{t}</div>
                <p className="mt-1 text-sm text-slate">{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-4 bg-ink p-8 text-white">
          <div>
            <h2 className="font-display text-3xl">Start a 90-day pilot</h2>
            <p className="mt-1 text-sm text-white/75">Your portal opens right away with a sample preview, your invite link and this cost rundown.</p>
          </div>
          <Link href="/signup?role=org" className="btn-primary">Set up your organization</Link>
        </section>
      </main>
    </div>
  );
}
