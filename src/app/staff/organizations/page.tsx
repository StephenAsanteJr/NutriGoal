import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listOrganizations } from "@/lib/org-wellness";
import { TIERS, fmtCents, tierById } from "@/lib/enterprise";
import { manageOrganization } from "@/actions/org";
import { Kpi, Panel } from "@/components/dash/Parts";
import { CostCalculator } from "@/components/enterprise/CostCalculator";
import { TierCards } from "@/components/enterprise/TierCards";
import { shortDate } from "@/components/ui";

export const metadata: Metadata = { title: "Organizations" };

const STATUS_STYLE = { pilot: "bg-warn-tint text-warn", active: "bg-good-tint text-good", paused: "bg-mist text-slate" } as const;

/** NutriGoal management: enterprise customers, their plans and the enterprise revenue model. */
export default async function Organizations() {
  await requireStaff(["manager"]);
  const orgs = listOrganizations();
  const live = orgs.filter((o) => o.status !== "paused");
  const mrr = live.filter((o) => o.status === "active").reduce((n, o) => n + o.monthlyBillCents, 0);
  const pilotMrr = live.filter((o) => o.status === "pilot").reduce((n, o) => n + o.monthlyBillCents, 0);
  const enrolled = live.reduce((n, o) => n + o.enrolled, 0);
  const eligible = live.reduce((n, o) => n + o.eligible_count, 0);

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow">Enterprise</div>
        <h1 className="font-display text-4xl">Organizations</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate">
          Employers, health plans and schools that sponsor NutriGoal. Their portal shows only de-identified totals; this page shows enrollment
          counts and billing, never which members belong to which organization.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line md:grid-cols-4">
        <Kpi label="Organizations" value={live.length} sub={`${live.filter((o) => o.status === "active").length} active · ${live.filter((o) => o.status === "pilot").length} pilots`} />
        <Kpi label="Enrolled members" value={enrolled} sub={`of ${eligible.toLocaleString()} eligible`} />
        <Kpi label="Enterprise MRR" value={mrr} format="moneyCents" sub={`ARR ${fmtCents(mrr * 12)}`} tone="good" />
        <Kpi label="Pilot revenue / mo" value={pilotMrr} format="moneyCents" sub="pilot fees spread over 3 months" />
      </div>

      <Panel title="Customers" subtitle="Change status when a contract is signed; change plan when a customer upgrades">
        {orgs.length === 0 ? (
          <p className="text-sm text-slate">No organizations yet. They sign up at /signup?role=org or from the enterprise page.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 pr-3 font-bold">Organization</th>
                  <th className="py-2 pr-3 font-bold">Contact</th>
                  <th className="py-2 pr-3 text-right font-bold">Eligible</th>
                  <th className="py-2 pr-3 text-right font-bold">Enrolled</th>
                  <th className="py-2 pr-3 text-right font-bold">Bill / mo</th>
                  <th className="py-2 pr-3 font-bold">Status and plan</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="border-b border-line align-top last:border-0">
                    <td className="py-3 pr-3">
                      <div className="font-bold">{o.name}</div>
                      <div className="text-xs text-muted">{o.industry ?? "–"} · since {shortDate(o.created_at)}</div>
                    </td>
                    <td className="py-3 pr-3 text-slate">{o.admin_name ?? "–"}<div className="text-xs text-muted">{o.admin_email}</div></td>
                    <td className="py-3 pr-3 text-right tabular-nums">{o.eligible_count.toLocaleString()}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{o.enrolled.toLocaleString()}</td>
                    <td className="py-3 pr-3 text-right font-bold tabular-nums">{fmtCents(o.monthlyBillCents)}</td>
                    <td className="py-3 pr-3">
                      <form key={`${o.status}-${o.plan}`} action={manageOrganization} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={o.id} />
                        <span className={`pill ${STATUS_STYLE[o.status as keyof typeof STATUS_STYLE] ?? ""}`}>{o.status}</span>
                        <select name="status" defaultValue={o.status} className="input !w-auto !py-1 text-xs" aria-label={`Status for ${o.name}`}>
                          <option value="pilot">Pilot</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                        </select>
                        <select name="plan" defaultValue={o.plan} className="input !w-auto !py-1 text-xs" aria-label={`Plan for ${o.name}`}>
                          {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button className="btn-dark !px-3 !py-1 text-xs">Save</button>
                        <span className="w-full text-xs text-muted">{tierById(o.plan).name}: {tierById(o.plan).flatCents ? fmtCents(tierById(o.plan).flatCents!) + " flat" : `${fmtCents(tierById(o.plan).pmpmCents)} PMPM`}</span>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <section>
        <h2 className="font-display text-2xl">Enterprise plans</h2>
        <p className="mb-4 mt-1 text-sm text-slate">What customers see on the enterprise page and in their portal.</p>
        <TierCards />
      </section>

      <section>
        <h2 className="font-display text-2xl">Deal model</h2>
        <p className="mb-4 mt-1 text-sm text-slate">The customer&apos;s cost rundown plus NutriGoal&apos;s clinician payouts and contribution for the same deal. For pricing conversations and investor walkthroughs.</p>
        <CostCalculator economics />
      </section>
    </div>
  );
}
