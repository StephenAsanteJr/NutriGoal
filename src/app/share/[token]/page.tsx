import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getShareLink, computeTrends } from "@/lib/integrations/trends";
import { getProfile, getUserById, toBuildInput } from "@/lib/data";
import { computeBuild, formatWeight } from "@/lib/biometrics";
import { LogoLockup } from "@/components/Logo";
import { DailyChart } from "@/components/DailyChart";
import { LabsTable } from "@/components/LabsTable";
import { shortDate } from "@/components/ui";

export const metadata: Metadata = { title: "Shared nutrition report", robots: { index: false, follow: false } };

/** Public, read-only report a member chose to share (expires; can be turned off). */
export default async function SharedReport(props: PageProps<"/share/[token]">) {
  const { token } = await props.params;
  const link = getShareLink(token);
  if (!link) notFound();
  db().prepare("UPDATE share_links SET views = views + 1 WHERE token = ?").run(token);
  const user = getUserById(link.user_id);
  if (!user) notFound();
  const t = computeTrends(link.user_id, link.days);
  const profile = getProfile(link.user_id);
  const input = toBuildInput(profile);
  const build = input ? computeBuild(input) : null;
  const units = profile?.unit_system ?? "imperial";
  const weights = t.weights;
  const points = t.points;

  return (
    <main className="min-h-screen bg-mist/60 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <LogoLockup width={130} />
          <div className="text-right">
            <div className="eyebrow">Shared nutrition report</div>
            <div className="font-display text-2xl">{user.name}</div>
            <div className="text-xs text-muted">{link.label} · last {link.days} days · shared {shortDate(link.created_at)} · link expires {shortDate(link.expires_at)}</div>
          </div>
        </header>

        {link.include.build && build && input && (
          <section className="card grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
            {[
              ["Age · sex", `${input.age} · ${input.sex}`],
              ["BMI", build.bmi.toFixed(1)],
              ["Body fat", `${build.bodyFatPct.toFixed(0)}%${build.bodyFatEstimated ? " (est.)" : ""}`],
              ["Goal", `${formatWeight(build.goalWeightKg, units)} in ${build.effectiveWeeks} wks`],
              ["Calorie target", `${Math.round(build.targetCalories).toLocaleString()} kcal`],
              ["Protein target", `${build.proteinG} g`],
              ["Resting energy", `${Math.round(build.bmr).toLocaleString()} kcal`],
              ["Daily burn", `${Math.round(build.tdee).toLocaleString()} kcal`],
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{k}</div>
                <div className="font-bold">{v}</div>
              </div>
            ))}
          </section>
        )}

        {link.include.nutrition && (
          <>
            <section className="card p-5">
              <h2 className="font-bold">Nutrition summary</h2>
              {t.current.length === 0 ? (
                <p className="mt-2 text-sm text-slate">No logged days in this period.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {t.insights.map((i) => (
                    <li key={i.text}>• {i.text}</li>
                  ))}
                </ul>
              )}
            </section>
            {t.current.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <section className="card p-5">
                  <h3 className="mb-2 text-sm font-bold">Calories</h3>
                  <DailyChart points={points.map((p) => ({ day: p.day, value: p.calories }))} target={t.targets.kcal} unit="kcal" label="Daily calories" />
                </section>
                <section className="card p-5">
                  <h3 className="mb-2 text-sm font-bold">Protein</h3>
                  <DailyChart points={points.map((p) => ({ day: p.day, value: p.protein }))} target={t.targets.protein} unit="g" label="Daily protein" />
                </section>
              </div>
            )}
          </>
        )}

        {link.include.weight && weights.length > 0 && (
          <section className="card p-5 text-sm">
            <h2 className="font-bold">Weight</h2>
            <p className="mt-1 text-slate">
              {formatWeight(weights[0].weight_kg, units)} on {shortDate(weights[0].logged_on)} → {formatWeight(weights[weights.length - 1].weight_kg, units)} on{" "}
              {shortDate(weights[weights.length - 1].logged_on)} ({weights.length} weigh-ins)
            </p>
          </section>
        )}

        {link.include.labs && <LabsTable labs={t.labs} />}

        <p className="text-center text-xs text-muted">
          Shared by {user.name.split(" ")[0]} from NutriGoal. Read-only. Insights are calculated from logged data and published guidelines,
          not written by AI, and are not a diagnosis.
        </p>
      </div>
    </main>
  );
}
