import { TIERS, fmtCents, type TierId } from "@/lib/enterprise";

/** The four enterprise plans side by side. */
export function TierCards({ current }: { current?: TierId | string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TIERS.map((t) => {
        const on = current === t.id;
        return (
          <article key={t.id} className={`card flex flex-col p-5 ${on ? "border-bcg-deep ring-1 ring-bcg-deep" : ""}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">{t.name}</h3>
              {on && <span className="pill bg-bcg-tint text-bcg-deep">Your plan</span>}
            </div>
            <div className="mt-1 text-xs text-muted">
              {t.id === "pilot" ? `${t.termMonths} months · up to ${t.maxEnrolled} members` : `${t.minEnrolled.toLocaleString()}${t.maxEnrolled ? `–${t.maxEnrolled.toLocaleString()}` : "+"} enrolled members`}
            </div>
            <div className="mt-4">
              {t.flatCents ? (
                <div className="font-display text-3xl text-ink">{fmtCents(t.flatCents)}<span className="text-base text-slate"> flat</span></div>
              ) : (
                <div className="font-display text-3xl text-ink">
                  {fmtCents(t.pmpmCents)}
                  <span className="text-base text-slate"> per member / month</span>
                </div>
              )}
              <div className="mt-1 text-xs text-slate">
                {t.flatCents ? "Credited toward a first-year contract" : `+ ${fmtCents(t.platformMonthlyCents)}/mo platform · ${fmtCents(t.implementationCents)} one-time setup`}
              </div>
            </div>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bcg" aria-hidden />
                  {f}
                </li>
              ))}
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bain" aria-hidden />
                {t.report}
              </li>
            </ul>
          </article>
        );
      })}
    </div>
  );
}
