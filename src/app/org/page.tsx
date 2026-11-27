import type { Metadata } from "next";
import Link from "next/link";
import { requireOrgManager } from "@/lib/auth";
import { getOrgForManager, orgReport } from "@/lib/org-wellness";
import { MIN_GROUP, fmtCents, tierById } from "@/lib/enterprise";
import { pageOrigin } from "@/lib/origin";
import { Kpi, Panel } from "@/components/dash/Parts";
import { CopyLink } from "@/components/dash/CopyLink";
import { DirectionBar, DirectionTrend } from "@/components/enterprise/OrgCharts";

export const metadata: Metadata = { title: "Organizational wellness" };

export default async function OrgWellness(props: PageProps<"/org">) {
  const user = await requireOrgManager();
  const org = getOrgForManager(user.id);
  if (!org) return <p className="card p-6 text-sm text-slate">This account isn&apos;t linked to an organization. Contact NutriGoal support.</p>;
  const sp = await props.searchParams;
  const sample = sp.sample === "1";
  const r = orgReport(org, { sample });
  const now = Object.fromEntries(r.directions.map((d) => [d.id === "no_data" ? "noData" : d.id, d.pct])) as Record<"closer" | "holding" | "straying" | "noData", number | null>;
  const link = `${await pageOrigin()}/join/${org.invite_code}`;
  const tier = tierById(org.plan);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Organizational wellness</div>
          <h1 className="font-display text-4xl">{org.name}</h1>
          <p className="mt-1 text-sm text-slate">
            {tier.name} plan · {org.status === "pilot" ? "pilot" : org.status} · de-identified totals for members who joined with your invite link
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/org" className={`rounded-[2px] px-3 py-1.5 font-bold ${!sample ? "bg-ink text-white" : "text-slate hover:bg-white"}`} aria-current={!sample ? "page" : undefined}>Your data</Link>
          <Link href="/org?sample=1" className={`rounded-[2px] px-3 py-1.5 font-bold ${sample ? "bg-ink text-white" : "text-slate hover:bg-white"}`} aria-current={sample ? "page" : undefined}>Sample preview</Link>
        </div>
      </header>

      {sp.welcome === "1" && !sample && (
        <div className="card border-bcg-deep/30 bg-bcg-tint/50 p-5">
          <div className="font-bold">Your organization is set up as a pilot</div>
          <p className="mt-1 text-sm text-slate">Share your invite link with the people you&apos;re offering NutriGoal to. Totals appear here once {MIN_GROUP} or more have joined.</p>
          <div className="mt-3 max-w-xl"><CopyLink url={link} label="Your organization's invite link" /></div>
        </div>
      )}
      {r.sample && (
        <p className="rounded-[3px] border border-bain/30 bg-bain-tint px-4 py-2.5 text-sm text-bain">
          <strong>Sample data.</strong> Illustrative numbers for a walkthrough. They are not your organization&apos;s results.
        </p>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line md:grid-cols-4">
        <Kpi label="Members enrolled" value={r.enrolled} sub={`of ${r.org.eligible.toLocaleString()} eligible${r.enrollmentRate != null ? ` · ${r.enrollmentRate}%` : ""}`} />
        <Kpi label="Active in the last 30 days" value={r.activePct} format="pct" sub="checked in, logged food or sent a goal" />
        <Kpi label="Wellness index" value={r.wellnessIndex} sub="average progress toward personal goals, 0–100" tone={r.wellnessIndex != null && r.wellnessIndex >= 50 ? "good" : undefined} />
        <Kpi label="Getting closer" value={now.closer} format="pct" tone="good" sub={now.straying != null ? `${now.straying}% straying` : "shown at 5+ members"} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.3fr]">
        <Panel title="Where your people stand today" subtitle="Direction of travel over the last 6 weeks, toward or away from each person's own goal">
          <DirectionBar values={now} />
          <p className="mt-4 text-xs text-muted">
            &ldquo;Closer&rdquo; and &ldquo;straying&rdquo; mean a move of at least 0.5% of body weight toward or away from a member&apos;s own goal across two
            or more check-ins. Shares are rounded to the nearest 5%.
          </p>
        </Panel>
        <Panel title="Month by month" subtitle="Hover a month for the breakdown · hatched months covered fewer than 5 people">
          <DirectionTrend months={r.trend} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Clinician plans delivered" subtitle="Written and signed by licensed clinicians">
          <div className="font-display text-4xl text-ink">{r.plansDelivered30 ?? "–"}</div>
          <p className="text-sm text-slate">in the last 30 days · {r.plansDeliveredAll ?? "–"} since you joined</p>
        </Panel>
        <Panel title="This month's bill" subtitle={`${tier.name} plan at today's enrollment`}>
          <div className="font-display text-4xl text-ink">{fmtCents(r.monthlyBillCents)}</div>
          <p className="text-sm text-slate">
            {tier.flatCents ? `Pilot fee spread over ${tier.termMonths} months.` : `${r.enrolled.toLocaleString()} × ${fmtCents(tier.pmpmCents)} + ${fmtCents(tier.platformMonthlyCents)} platform.`}{" "}
            <Link href="/org/plan" className="link">Full cost rundown</Link>
          </p>
        </Panel>
        <Panel title="Invite link" subtitle="Anyone with it can join; you never see who did">
          <CopyLink url={link} label="Your organization's invite link" />
          <p className="mt-2 text-xs text-muted">Code {org.invite_code} · <Link href="/org/settings" className="underline">manage</Link></p>
        </Panel>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-bold">How this stays double-blind</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-slate md:grid-cols-3">
          <div>
            <div className="font-bold text-ink">You can&apos;t see who</div>
            <p className="mt-1">No names, emails or individual rows, ever. Reports are built on NutriGoal&apos;s servers and only group totals reach this page. Anything covering fewer than {MIN_GROUP} people is withheld.</p>
          </div>
          <div>
            <div className="font-bold text-ink">You can&apos;t see what</div>
            <p className="mt-1">No weights, labs, conditions, medications, goals, tickets or plans. Only the direction people are moving relative to goals they set for themselves.</p>
          </div>
          <div>
            <div className="font-bold text-ink">Clinicians can&apos;t see you</div>
            <p className="mt-1">The clinician writing a member&apos;s plan isn&apos;t told who sponsors them, so care is the same with or without an employer.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
