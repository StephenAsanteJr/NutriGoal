import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listMembersWithProfiles, toBuildInput } from "@/lib/data";
import { computeBuild, formatWeight } from "@/lib/biometrics";
import { stageLabel } from "@/lib/domain";
import { PageHeader, timeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Member builds" };

export default async function MembersPage(props: PageProps<"/staff/members">) {
  await requireStaff();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const rows = listMembersWithProfiles()
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    .map((m) => {
      const input = toBuildInput(m);
      return { m, build: input ? computeBuild(input) : null };
    });

  return (
    <div>
      <PageHeader eyebrow="Member builds" title="Every member's build and biometric card">
        Each profile is processed into a mock physical build and biometric card for managers, physicians and dietitians to analyze.
      </PageHeader>

      <form className="mb-4 flex max-w-md gap-2" role="search">
        <input name="q" defaultValue={q} className="input" placeholder="Search by name or email" aria-label="Search members" />
        <button className="btn-dark">Search</button>
      </form>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-line bg-mist text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-6 py-2.5 font-bold">Member</th>
              <th className="px-3 py-2.5 font-bold">BMI</th>
              <th className="px-3 py-2.5 font-bold">Body fat → goal</th>
              <th className="px-3 py-2.5 font-bold">Weight → goal</th>
              <th className="px-3 py-2.5 font-bold">Target kcal</th>
              <th className="px-3 py-2.5 font-bold">Medication</th>
              <th className="px-3 py-2.5 font-bold">Flags</th>
              <th className="px-3 py-2.5 font-bold">Source</th>
              <th className="px-6 py-2.5 text-right font-bold">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, build }) => {
              const alerts = build?.flags.filter((f) => f.level === "alert").length ?? 0;
              const warns = build?.flags.filter((f) => f.level === "warn").length ?? 0;
              const units = m.unit_system ?? "imperial";
              return (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-mist/70">
                  <td className="px-6 py-3">
                    <Link href={`/staff/members/${m.id}`} className="font-bold hover:text-blue">{m.name}</Link>
                    <div className="text-xs text-muted">
                      {m.email}
                      {m.plan ? ` · member (${m.plan})` : ""}
                    </div>
                  </td>
                  {build ? (
                    <>
                      <td className="px-3 py-3">
                        <div className="font-bold">{build.bmi.toFixed(1)}</div>
                        <div className="text-xs text-muted">{build.bmiCategory}</div>
                      </td>
                      <td className="px-3 py-3">
                        {build.bodyFatPct.toFixed(0)}% → {build.goalBodyFatPct.toFixed(0)}%
                      </td>
                      <td className="px-3 py-3">
                        {formatWeight(m.weight_kg!, units)} → {formatWeight(build.goalWeightKg, units)}
                        <div className="text-xs text-muted">{build.effectiveWeeks} wks</div>
                      </td>
                      <td className="px-3 py-3">{Math.round(build.targetCalories).toLocaleString()}</td>
                      <td className="px-3 py-3 text-xs">{stageLabel(m.medication_stage)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          {alerts > 0 && <span className="pill bg-alert-tint text-alert">{alerts} alert</span>}
                          {warns > 0 && <span className="pill bg-warn-tint text-warn">{warns} watch</span>}
                          {!alerts && !warns && <span className="text-xs text-muted">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate">
                        {m.report_count > 0 ? `${m.report_count} report${m.report_count > 1 ? "s" : ""}` : "Self-reported"}
                        <div className="text-muted">{timeAgo(m.updated_at)}</div>
                      </td>
                    </>
                  ) : (
                    <td colSpan={7} className="px-3 py-3 text-xs text-muted">Build not completed yet</td>
                  )}
                  <td className="px-6 py-3 text-right font-bold">{m.ticket_count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
