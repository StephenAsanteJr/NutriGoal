import { getLocation, trainersNear, type NearbyTrainer } from "@/lib/trainers";
import { changeTrainerRadius, toggleTrainer } from "@/actions/marketplace";
import { SubmitButton } from "@/components/SubmitButton";
import { goalLabel, money } from "@/lib/domain";
import { LocationPicker } from "./LocationPicker";

/** Certified trainers within 5 or 10 miles of the member. */
export async function TrainersNearYou({ userId }: { userId: string }) {
  const loc = getLocation(userId);
  const result = loc ? await trainersNear(userId, loc) : null;

  return (
    <section id="trainers" aria-labelledby="trainers-heading" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Trainers near you</div>
          <h2 id="trainers-heading" className="font-display mt-1 text-3xl">Certified trainers within {loc?.radius ?? 10} miles</h2>
          {loc?.label && <p className="mt-1 text-sm text-slate">Searching near {loc.label}</p>}
        </div>
        {loc && (
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-[2px] border border-line bg-white p-0.5 text-xs font-bold" role="group" aria-label="Search radius">
              {[5, 10].map((r) => (
                <form key={r} action={changeTrainerRadius}>
                  <input type="hidden" name="radius" value={r} />
                  <button aria-pressed={loc.radius === r} className={`rounded-[2px] px-3 py-1.5 ${loc.radius === r ? "bg-navy text-white" : "text-slate hover:text-navy"}`}>
                    {r} miles
                  </button>
                </form>
              ))}
            </div>
            <LocationPicker compact />
          </div>
        )}
      </div>

      {!loc ? (
        <div className="card p-6">
          <p className="mb-4 text-sm text-slate">
            Share your ZIP code or location to see certified trainers within 5–10 miles. We store an approximate location only (about 1 km),
            never your address.
          </p>
          <LocationPicker />
        </div>
      ) : (
        <>
          {result!.verified.length === 0 ? (
            <div className="card p-6 text-sm text-slate">
              No NutriGoal-verified trainers within {loc.radius} miles yet.{" "}
              {result!.coverage.miles > 40 ? "We're launching city by city; your area isn't covered yet." : loc.radius === 5 ? "Try 10 miles." : ""}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result!.verified.map((t) => (
                <TrainerCard key={t.id} t={t} />
              ))}
            </div>
          )}
          {result!.google.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold">More trainers nearby from Google Maps</h3>
              <p className="mb-3 text-xs text-muted">Not verified by NutriGoal. Check certifications before you book.</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {result!.google.map((t) => (
                  <TrainerCard key={t.id} t={t} />
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted">
            Demo trainers are sample listings in {16} launch cities.{result!.googleEnabled ? " Google results are matched to your approximate location." : ""}
          </p>
        </>
      )}
    </section>
  );
}

function TrainerCard({ t }: { t: NearbyTrainer }) {
  const google = t.source === "google";
  return (
    <article className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg text-white ${google ? "bg-slate" : "bg-navy"}`} aria-hidden>
            {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div className="font-bold">{t.name}</div>
            <div className="text-xs text-slate">{t.certification}</div>
          </div>
        </div>
        <span className="pill whitespace-nowrap bg-bcg-tint text-bcg-deep">{t.miles < 1 ? "<1" : t.miles.toFixed(1)} mi</span>
      </div>
      <p className="mt-3 text-sm font-bold text-navy">{t.specialty}</p>
      <p className="text-xs text-muted">{t.studio}</p>
      {t.goal_types.length > 0 && <p className="mt-2 text-xs text-bcg-deep">Good for: {t.goal_types.slice(0, 2).map((g) => goalLabel(g).toLowerCase()).join(", ")}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-xs">
        <span className="text-slate">
          {t.price_cents ? `${money(t.price_cents)}/session · ` : ""}
          {t.modes}
          {t.rating ? ` · ★ ${t.rating.toFixed(1)}` : ""}
          {!google && <span className="ml-1 font-bold text-good">· ✓ Verified</span>}
        </span>
        <div className="flex items-center gap-3">
          {t.url && (
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="link">
              Listing ↗
            </a>
          )}
          <form action={toggleTrainer}>
            <input type="hidden" name="trainer_id" value={t.id} />
            <input type="hidden" name="label" value={t.name} />
            <SubmitButton className={t.saved ? "font-bold text-good" : "font-bold text-bain hover:underline"} pendingText="…">
              {t.saved ? "✓ Saved" : "Save"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}
