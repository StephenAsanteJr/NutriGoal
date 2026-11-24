import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getActiveSubscription, listAddons, listPartners, listTicketsForMember } from "@/lib/data";
import { PARTNER_CATEGORIES, goalLabel } from "@/lib/domain";
import { togglePartner } from "@/actions/marketplace";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { AddonCard } from "./AddonCard";
import { stripeEnabled } from "@/lib/stripe";
import { hasMarketplaceAccess } from "@/lib/access";
import { Paywall } from "./Paywall";
import { TrainersNearYou } from "./TrainersNearYou";
import { TrackingApps } from "./TrackingApps";

export const metadata: Metadata = { title: "Marketplace" };

export default async function Marketplace(props: PageProps<"/marketplace">) {
  const user = await requireMember();
  const sp = await props.searchParams;
  if (!hasMarketplaceAccess(user.id)) return <Paywall />;
  const cat = typeof sp.category === "string" ? sp.category : "all";
  const partners = listPartners(user.id);
  const addons = listAddons(user.id);
  const member = !!getActiveSubscription(user.id);
  const myGoals = new Set(listTicketsForMember(user.id).map((t) => t.goal_type));
  const national = partners.filter((p) => p.kind === "national");
  const verified = partners.filter((p) => p.kind !== "national");
  const shown = cat === "all" ? verified : verified.filter((p) => p.category === cat);
  const connected = partners.filter((p) => p.connected);
  const nationalGroups = [
    { id: "grocer", title: "Top 3 U.S. supermarket grocers" },
    { id: "retailer", title: "Top 3 U.S. food retailers" },
    { id: "pharmacy", title: "Top 3 U.S. retail pharmacies" },
  ].filter((g) => cat === "all" || g.id === cat);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Marketplace · for members & ticket holders" title="Trainers, apps, grocers and pharmacies">
        Everything that helps your plan stick: certified trainers near you, the tracking app that fits your goal, and the stores and
        pharmacies you already use. Verified partners are checked before we list them; your clinician can point to them in your plan.
      </PageHeader>

      <TrainersNearYou userId={user.id} />

      <TrackingApps goals={[...myGoals]} />

      {connected.length > 0 && (
        <div className="card flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
          <span className="font-bold">Connected:</span>
          {connected.map((p) => (
            <a key={p.id} href={`#${p.id}`} className="pill bg-blue-tint text-blue">{p.name}</a>
          ))}
        </div>
      )}

      <section aria-labelledby="national-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow">Biggest names across the U.S.</div>
            <h2 id="national-heading" className="font-display mt-1 text-3xl">Shop where you already shop</h2>
          </div>
          <p className="max-w-md text-xs text-muted">
            Ranked by U.S. sales and prescription revenue. These are public listings, not NutriGoal partners: no partnership, discount or
            endorsement is implied. Saving one sets where your plan-built grocery lists point.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {nationalGroups.map((g) => (
            <div key={g.id} className="card">
              <h3 className="border-b border-line px-5 py-3 text-sm font-bold">{g.title}</h3>
              <ol>
                {national
                  .filter((p) => p.category === g.id)
                  .map((p, i) => (
                    <li key={p.id} id={p.id} className="flex scroll-mt-24 items-start gap-3 border-b border-line px-5 py-4 last:border-0">
                      <span className="font-display w-6 text-2xl leading-none text-blue">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{p.name}</div>
                        <div className="text-xs text-slate">{p.rank_note}</div>
                        <div className="mt-1 text-xs text-muted">{p.tagline} · {p.location}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {p.website && (
                            <a href={p.website} target="_blank" rel="noopener noreferrer" className="link text-xs">
                              Visit site ↗
                            </a>
                          )}
                          <form action={togglePartner}>
                            <input type="hidden" name="partner_id" value={p.id} />
                            <SubmitButton className={p.connected ? "text-xs font-bold text-good" : "text-xs font-bold text-blue hover:underline"} pendingText="…">
                              {p.connected ? "✓ Saved as my store" : g.id === "pharmacy" ? "Save as my pharmacy" : "Save as my store"}
                            </SubmitButton>
                          </form>
                        </div>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <div>
        <div className="eyebrow">Verified partners</div>
        <h2 className="font-display mt-1 text-3xl">Checked and listed by NutriGoal</h2>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Partner categories">
        {[{ id: "all", label: "All partners" }, ...PARTNER_CATEGORIES].map((c) => (
          <Link
            key={c.id}
            href={c.id === "all" ? "/marketplace" : `/marketplace?category=${c.id}`}
            className={`rounded-[2px] border px-4 py-2 text-sm font-bold ${cat === c.id ? "border-navy bg-navy text-white" : "border-line bg-white text-slate hover:border-navy"}`}
            aria-current={cat === c.id ? "page" : undefined}
          >
            {c.label}
            <span className="ml-2 text-xs opacity-60">{c.id === "all" ? verified.length : verified.filter((p) => p.category === c.id).length}</span>
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => {
          const match = p.goal_types.filter((g) => myGoals.has(g));
          return (
            <article key={p.id} id={p.id} className={`card flex scroll-mt-24 flex-col p-6 ${p.connected ? "border-blue" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy font-display text-lg text-white" aria-hidden>
                  {p.name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <span className="pill bg-good-tint text-good" title={`${p.verification} on ${p.verified_on}`}>✓ Verified</span>
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">
                {PARTNER_CATEGORIES.find((c) => c.id === p.category)?.singular} · {p.location}
              </div>
              <h2 className="mt-1 text-lg font-bold">{p.name}</h2>
              <p className="text-sm font-bold text-slate">{p.tagline}</p>
              <p className="mt-2 flex-1 text-sm text-slate">{p.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span key={t} className="pill bg-mist text-slate">{t}</span>
                ))}
              </div>
              {match.length > 0 && <p className="mt-3 text-xs font-bold text-blue">Fits your goal: {goalLabel(match[0]).toLowerCase()}</p>}
              <div className="mt-4 border-t border-line pt-4 text-xs text-muted">
                {p.verification} · checked {new Date(p.verified_on).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                {p.rating ? ` · ★ ${p.rating.toFixed(1)}` : ""}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                {p.offer ? <span className="text-sm font-bold text-navy">{p.offer}</span> : <span />}
                <form action={togglePartner}>
                  <input type="hidden" name="partner_id" value={p.id} />
                  <SubmitButton className={p.connected ? "btn-outline !px-4 !py-2" : "btn-primary !px-4 !py-2"} pendingText="…">
                    {p.connected ? "Connected ✓" : "Connect"}
                  </SubmitButton>
                </form>
              </div>
            </article>
          );
        })}
      </div>

      <section id="addons" className="scroll-mt-24">
        <div className="mb-5">
          <div className="eyebrow">Add-ons you can unlock</div>
          <h2 className="font-display mt-1 text-3xl">Extra help between tickets</h2>
          <p className="mt-1 text-sm text-slate">Unlock any of these whether or not you&apos;ve bought a ticket.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {addons.map((a) => (
            <AddonCard key={a.id} addon={a} member={member} stripe={stripeEnabled()} autoOpen={sp.unlock === a.id} />
          ))}
        </div>
      </section>

      <p className="text-xs text-muted">
        Partner listings in this demo are fictional sample businesses. NutriGoal may earn a disclosed commission on partner orders; it
        never shares your health data with partners unless you connect and approve it.
      </p>
    </div>
  );
}
