import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { PARTNER_CATEGORIES } from "@/lib/domain";
import { METROS } from "@/lib/geo-data";
import { removePartner, removeTrainer } from "@/actions/marketplace-admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PartnerForm, TrainerForm } from "./Forms";

export const metadata: Metadata = { title: "Marketplace listings" };

export default async function MarketplaceAdmin() {
  await requireStaff(["manager"]);
  const partners = db().prepare("SELECT id, name, category, verification, verified_on, location FROM partners WHERE kind = 'partner' ORDER BY category, name").all() as { id: string; name: string; category: string; verification: string; verified_on: string; location: string }[];
  const trainers = db().prepare("SELECT id, name, certification, metro, price_cents, verified_on FROM trainers ORDER BY metro, name").all() as { id: string; name: string; certification: string; metro: string; price_cents: number; verified_on: string }[];
  const metroName = (id: string) => METROS.find((m) => m.id === id)?.name ?? id;
  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow">Marketplace</div>
        <h1 className="font-display text-4xl">Verified partners and trainers</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate">
          Members see only what you list here (plus the public national retailers, which are labeled as non-partners). Check each license,
          certification or business registration before listing, and write down what you checked: members see it on the listing.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-bold">Add a partner</h2>
          <p className="mb-4 text-sm text-slate">Grocers, retailers, pharmacies and fitness coaches.</p>
          <PartnerForm />
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-bold">Add a trainer</h2>
          <p className="mb-4 text-sm text-slate">Shown to members within 5–10 miles under &quot;Trainers near you&quot;.</p>
          <TrainerForm metros={METROS.map((m) => ({ id: m.id, name: m.name }))} />
        </section>
      </div>

      <section className="card">
        <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Listed partners ({partners.length})</h2>
        {partners.length === 0 ? (
          <p className="px-6 py-5 text-sm text-muted">No partners listed yet. Members see an empty &quot;Verified partners&quot; section until you add one.</p>
        ) : (
          <ul className="divide-y divide-line">
            {partners.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                <div>
                  <div className="font-bold">{p.name} <span className="font-normal text-muted">· {PARTNER_CATEGORIES.find((c) => c.id === p.category)?.singular} · {p.location}</span></div>
                  <div className="text-xs text-slate">{p.verification} · listed {p.verified_on}</div>
                </div>
                <form action={removePartner}>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="btn-ghost !px-3 !py-1.5 text-xs !text-alert" pendingText="…">Remove</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Listed trainers ({trainers.length})</h2>
        {trainers.length === 0 ? (
          <p className="px-6 py-5 text-sm text-muted">No trainers listed yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {trainers.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                <div>
                  <div className="font-bold">{t.name} <span className="font-normal text-muted">· {t.certification} · {metroName(t.metro)}</span></div>
                  <div className="text-xs text-slate">{t.price_cents ? `$${(t.price_cents / 100).toFixed(0)} per session · ` : ""}listed {t.verified_on}</div>
                </div>
                <form action={removeTrainer}>
                  <input type="hidden" name="id" value={t.id} />
                  <SubmitButton className="btn-ghost !px-3 !py-1.5 text-xs !text-alert" pendingText="…">Remove</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
