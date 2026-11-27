import type { Metadata } from "next";
import { requireOrgManager } from "@/lib/auth";
import { getOrgForManager, orgReport } from "@/lib/org-wellness";
import { fmtCents, tierById, type TierId } from "@/lib/enterprise";
import { CostCalculator } from "@/components/enterprise/CostCalculator";
import { TierCards } from "@/components/enterprise/TierCards";

export const metadata: Metadata = { title: "Enterprise plan and costs" };

export default async function OrgPlan() {
  const user = await requireOrgManager();
  const org = getOrgForManager(user.id);
  if (!org) return null;
  const r = orgReport(org);
  const tier = tierById(org.plan);
  const enrollmentPct = org.eligible_count && r.enrolled >= 5 ? Math.max(5, Math.min(90, Math.round((r.enrolled / org.eligible_count) * 100))) : 35;

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow">Enterprise plan</div>
        <h1 className="font-display text-4xl">Plan and cost rundown</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate">
          You&apos;re on the <strong className="text-ink">{tier.name}</strong> plan ({org.status}). Today&apos;s bill at {r.enrolled.toLocaleString()} enrolled:{" "}
          <strong className="text-ink">{fmtCents(r.monthlyBillCents)}</strong> a month. Change the plan on Invite &amp; settings; NutriGoal confirms changes before
          the next invoice.
        </p>
      </header>
      <TierCards current={org.plan} />
      <section>
        <h2 className="font-display text-2xl">Cost rundown</h2>
        <p className="mb-4 mt-1 text-sm text-slate">Starts from your organization&apos;s numbers. Move the sliders to see how enrollment and usage change the cost.</p>
        <CostCalculator initial={{ eligible: org.eligible_count, enrollmentPct, tier: org.plan as TierId }} />
      </section>
    </div>
  );
}
