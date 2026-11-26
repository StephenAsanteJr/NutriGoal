import { FOOD_GROUPS, findFood, type ClinicianFoods, type FoodGuide as Guide } from "@/lib/foods";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Daily food guide for a member's targets: servings per food group and swappable example foods. */
export function FoodGuide({ guide }: { guide: Guide }) {
  const m = guide.match;
  return (
    <section className="card" aria-labelledby="food-guide-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-4">
        <div>
          <div className="eyebrow">Foods that fit your targets</div>
          <h2 id="food-guide-title" className="font-display mt-1 text-2xl">A day of food groups, not meals</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate">
            Eat roughly these servings across your day, in any combination you like. Every example in a group is one serving that matches the
            group&apos;s typical serving at least 80% on calories, protein, carbs and fat, so you can swap freely.
          </p>
        </div>
        <div className="rounded-[3px] bg-bcg-tint px-4 py-3 text-center">
          <div className="font-display text-3xl text-bcg-deep">{m.overall}%</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-bcg-deep">match to your targets</div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {[
          ["Calories", guide.totals.kcal, "kcal", m.kcal],
          ["Protein", guide.totals.protein, "g", m.protein],
          ["Carbs", guide.totals.carbs, "g", m.carbs],
          ["Fat", guide.totals.fat, "g", m.fat],
        ].map(([k, v, u, pct]) => (
          <div key={k as string} className="bg-white px-5 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</dt>
            <dd className="mt-0.5 text-sm">
              <span className="font-bold text-navy">{(v as number).toLocaleString()} {u}</span>{" "}
              <span className={(pct as number) >= 90 ? "text-bcg-deep" : (pct as number) >= 80 ? "text-slate" : "text-alert"}>· {pct}% match</span>
            </dd>
          </div>
        ))}
      </dl>
      <ul className="divide-y divide-line">
        {guide.rows.map((r) => (
          <li key={r.group.id} className="grid gap-3 px-6 py-4 md:grid-cols-[220px_1fr]">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl text-bcg-deep">{r.servings}</span>
                <span className="text-sm font-bold">serving{r.servings === 1 ? "" : "s"} · {r.group.label}</span>
              </div>
              <div className="text-xs text-muted">{r.group.hint}. One serving ≈ {r.group.typical.serving}.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {r.examples.map((e) => (
                <span key={e.name} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs" title={`${e.kcal} kcal · ${fmt(e.protein)} g protein · ${fmt(e.carbs)} g carbs · ${fmt(e.fat)} g fat`}>
                  <span className="font-bold text-navy">{e.name}</span>
                  <span className="text-muted">{e.serving}</span>
                  <span className="rounded-full bg-bcg-tint px-1.5 py-0.5 text-[10px] font-bold text-bcg-deep">{Math.round(e.match * 100)}%</span>
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-line bg-mist px-6 py-3 text-xs text-slate">
        Nutrition facts are rounded per serving (USDA FoodData Central-style values); packaged foods vary by brand. This is general guidance, not a
        meal plan. Your clinician&apos;s plan comes first.
      </p>
    </section>
  );
}

/** Foods a clinician suggested on a response ticket, grouped by food group. */
export function ClinicianFoodsList({ foods, clinician }: { foods: ClinicianFoods; clinician: string }) {
  return (
    <section className="border-t border-line px-6 py-5" aria-label="Suggested foods">
      <div className="eyebrow mb-1">Foods {clinician} suggests</div>
      <p className="mb-3 text-xs text-slate">Examples by food group, not set meals. Mix them into your day.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FOOD_GROUPS.filter((g) => foods[g.id]?.length).map((g) => (
          <div key={g.id} className="rounded-[3px] border border-line p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-bcg-deep">{g.label}</div>
            <ul className="mt-1.5 space-y-1 text-sm">
              {foods[g.id]!.map((name) => {
                const known = findFood(g.id, name);
                return (
                  <li key={name} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-bcg-deep" aria-hidden>✓</span>
                    <span className="font-bold text-navy">{name}</span>
                    {known && (
                      <span className="text-xs text-muted">
                        {known.serving} · {known.kcal} kcal · {fmt(known.protein)} g protein
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
