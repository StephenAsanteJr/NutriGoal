import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getActiveSubscription, listAddons, listPartners, listTicketsForMember } from "@/lib/data";
import { PARTNER_CATEGORIES, goalLabel } from "@/lib/domain";
import { togglePartner } from "@/actions/marketplace";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { AddonCard } from "./AddonCard";

export const metadata: Metadata = { title: "Marketplace" };

export default async function Marketplace(props: PageProps<"/marketplace">) {
  const user = await requireMember();
  const sp = await props.searchParams;
  const cat = typeof sp.category === "string" ? sp.category : "all";
  const partners = listPartners(user.id);
  const addons = listAddons(user.id);
  const member = !!getActiveSubscription(user.id);
  const myGoals = new Set(listTicketsForMember(user.id).map((t) => t.goal_type));
  const shown = cat === "all" ? partners : partners.filter((p) => p.category === cat);
  const connected = partners.filter((p) => p.connected);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Verified partner marketplace" title="Grocers, retailers, pharmacies and coaches">
        Open to every member, with or without a ticket. We check each partner&apos;s license or certification before listing them, and
        your clinician can point to them in your plan.
      </PageHeader>

      {connected.length > 0 && (
        <div className="card flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
          <span className="font-bold">Connected:</span>
          {connected.map((p) => (
            <a key={p.id} href={`#${p.id}`} className="pill bg-blue-tint text-blue">{p.name}</a>
          ))}
        </div>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Partner categories">
        {[{ id: "all", label: "All partners" }, ...PARTNER_CATEGORIES].map((c) => (
          <Link
            key={c.id}
            href={c.id === "all" ? "/marketplace" : `/marketplace?category=${c.id}`}
            className={`rounded-[2px] border px-4 py-2 text-sm font-bold ${cat === c.id ? "border-navy bg-navy text-white" : "border-line bg-white text-slate hover:border-navy"}`}
            aria-current={cat === c.id ? "page" : undefined}
          >
            {c.label}
            <span className="ml-2 text-xs opacity-60">{c.id === "all" ? partners.length : partners.filter((p) => p.category === c.id).length}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {addons.map((a) => (
            <AddonCard key={a.id} addon={a} member={member} />
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
