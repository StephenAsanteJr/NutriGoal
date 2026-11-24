import Link from "next/link";
import { TRACKING_APPS } from "@/lib/domain";

/** Independent food-tracking app recommendations, ranked by fit with the member's goals. */
export function TrackingApps({ goals }: { goals: string[] }) {
  const g = new Set(goals);
  const ranked = [...TRACKING_APPS]
    .map((a) => ({ a, fit: a.goals.filter((x) => g.has(x)).length }))
    .sort((x, y) => y.fit - x.fit);
  return (
    <section aria-labelledby="apps-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Track your food</div>
          <h2 id="apps-heading" className="font-display mt-1 text-3xl">Apps our clinicians recommend</h2>
        </div>
        <p className="max-w-md text-xs text-muted">
          Independent picks: we&apos;re not paid by these apps. Log in any of them, then connect your exports so your clinician can see your
          real nutrition trends.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ranked.map(({ a, fit }, i) => (
          <article key={a.id} className={`card flex flex-col p-5 ${i === 0 && fit > 0 ? "border-blue ring-1 ring-blue" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold">{a.name}</h3>
              {i === 0 && fit > 0 && <span className="pill bg-blue text-white">Best fit for you</span>}
            </div>
            <p className="mt-1 flex-1 text-sm text-slate">{a.bestFor}</p>
            <p className="mt-3 text-xs text-muted">{a.price}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="link text-xs">Get the app ↗</a>
              <Link href={`/data?tab=connect#app-${a.id}`} className="link text-xs">Connect your data →</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
