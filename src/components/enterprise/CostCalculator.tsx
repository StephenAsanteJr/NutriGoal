"use client";

import { useMemo, useState } from "react";
import { DEFAULT_INPUTS, EXTRA_PLAN_CENTS, TIERS, costRundown, fmtCents, type CostInputs, type TierId } from "@/lib/enterprise";
import { CLINICIAN_PAYOUT_CENTS, PRICES } from "@/lib/domain";

const pct = (n: number) => `${Math.round(n)}%`;

function Slider({ label, value, min, max, step = 1, suffix = "", onChange, hint }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void; hint?: string }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label !mb-0">{label}</label>
        <span className="text-sm font-bold text-ink">{value.toLocaleString()}{suffix}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-bcg-deep" />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

/**
 * Interactive cost rundown for an enterprise plan: change headcount, enrollment and usage and see
 * the organization's cost, cost per person, what members would pay on their own and (for NutriGoal
 * management) the clinician payouts and contribution behind it.
 */
export function CostCalculator({ initial, economics = false, lockEligible = false }: { initial?: Partial<CostInputs>; economics?: boolean; lockEligible?: boolean }) {
  const [v, setV] = useState<CostInputs>({ ...DEFAULT_INPUTS, ...initial });
  const r = useMemo(() => costRundown(v), [v]);
  const set = (patch: Partial<CostInputs>) => setV((s) => ({ ...s, ...patch }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="card space-y-5 p-5">
        <div>
          <label htmlFor="eligible" className="label">People eligible</label>
          <input
            id="eligible"
            inputMode="numeric"
            className="input"
            value={v.eligible || ""}
            disabled={lockEligible}
            onChange={(e) => set({ eligible: Math.min(2_000_000, Number(e.target.value.replace(/[^\d]/g, "")) || 0) })}
          />
          <p className="hint">Employees, plan members or students you&apos;d offer NutriGoal to.</p>
        </div>
        <Slider label="Expected enrollment" value={v.enrollmentPct} min={5} max={90} suffix="%" onChange={(n) => set({ enrollmentPct: n })} hint="Opt-in wellness benefits typically see 20–45%." />
        <Slider label="Included plans used" value={v.utilizationPct} min={10} max={100} step={5} suffix="%" onChange={(n) => set({ utilizationPct: n })} />
        <Slider label="Extra plans per member, per year" value={v.extraPlansPerMember} min={0} max={4} step={0.25} onChange={(n) => set({ extraPlansPerMember: n })} hint={`Billed at ${fmtCents(EXTRA_PLAN_CENTS, 2)} each (members pay ${fmtCents(PRICES.ticketOneTime, 2)} on their own).`} />
        {economics && <Slider label="Plans written by physicians" value={v.physicianPct} min={0} max={100} step={5} suffix="%" onChange={(n) => set({ physicianPct: n })} hint={`Payout ${fmtCents(CLINICIAN_PAYOUT_CENTS.MD)} per physician plan, ${fmtCents(CLINICIAN_PAYOUT_CENTS.RD)} per dietitian or nutritionist plan.`} />}
        <div>
          <label htmlFor="tier" className="label">Plan</label>
          <select id="tier" className="input" value={v.tier ?? ""} onChange={(e) => set({ tier: (e.target.value || undefined) as TierId | undefined })}>
            <option value="">Sized to enrollment ({r.tier.name})</option>
            {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line md:grid-cols-4">
          {[
            [r.tier.id === "pilot" ? `Pilot (${r.months} months)` : "First year", fmtCents(r.total), `${r.enrolled.toLocaleString()} enrolled members`],
            ["Per enrolled member", `${fmtCents(r.perEnrolledMonthly, 2)}/mo`, `${r.tier.name} plan`],
            ["Per eligible person", `${fmtCents(r.perEligibleMonthly, 2)}/mo`, "PEPM, the benefits budget line"],
            ["vs. members paying alone", r.savings >= 0 ? `${pct(r.savingsPct)} less` : `${pct(-r.savingsPct)} more`, `${fmtCents(r.retail)} at retail`],
          ].map(([label, value, sub]) => (
            <div key={label} className="bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
              <div className="font-display mt-1 text-2xl text-ink">{value}</div>
              <div className="mt-0.5 text-xs text-slate">{sub}</div>
            </div>
          ))}
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <caption className="sr-only">Cost rundown</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-2.5 font-bold">Cost rundown</th>
                <th className="px-4 py-2.5 text-right font-bold">Amount</th>
                <th className="px-4 py-2.5 text-right font-bold">Share</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 text-slate">{l.label}</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-ink">{fmtCents(l.cents)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{r.total ? pct((l.cents / r.total) * 100) : "–"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink">
                <td className="px-4 py-2.5 font-bold">Total {r.tier.id === "pilot" ? "for the pilot" : "in year one"}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{fmtCents(r.total)}</td>
                <td />
              </tr>
              {r.renewal != null && (
                <tr>
                  <td className="px-4 pb-3 text-slate">Each year after (no implementation fee)</td>
                  <td className="px-4 pb-3 text-right font-bold tabular-nums text-slate">{fmtCents(r.renewal)}</td>
                  <td />
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card p-4 text-sm">
            <div className="font-bold">What members get</div>
            <p className="mt-1 text-slate">
              {r.plans.included.toLocaleString()} clinician plans included ({r.tier.plansPerYear} per member per year
              {r.tier.termMonths ? `, prorated to ${r.tier.termMonths} months` : ""}); at {v.utilizationPct}% use that&apos;s about {r.plans.used.toLocaleString()} plans
              {r.plans.extra ? `, plus ${r.plans.extra.toLocaleString()} extra` : ""}. Every plan is written and signed by a licensed clinician within 48 hours.
            </p>
            <p className="mt-2 text-slate">{r.tier.report}.</p>
          </div>
          {economics ? (
            <div className="card p-4 text-sm">
              <div className="font-bold">NutriGoal unit economics</div>
              <dl className="mt-2 space-y-1 text-slate">
                <div className="flex justify-between"><dt>Revenue</dt><dd className="font-bold tabular-nums text-ink">{fmtCents(r.total)}</dd></div>
                <div className="flex justify-between"><dt>Clinician payouts ({r.plans.delivered.toLocaleString()} plans × {fmtCents(r.nutrigoal.blendedPayout, 2)})</dt><dd className="font-bold tabular-nums text-bain">−{fmtCents(r.nutrigoal.payouts)}</dd></div>
                <div className="flex justify-between border-t border-line pt-1"><dt>Contribution</dt><dd className="font-bold tabular-nums text-bcg-deep">{fmtCents(r.nutrigoal.contribution)} ({pct(r.nutrigoal.contributionPct)})</dd></div>
              </dl>
              <p className="mt-2 text-xs text-muted">Before hosting, support staff and card or invoicing fees.</p>
            </div>
          ) : (
            <div className="card p-4 text-sm">
              <div className="font-bold">How the price compares</div>
              <p className="mt-1 text-slate">
                On their own, {r.enrolled.toLocaleString()} people on an annual membership ({fmtCents(PRICES.subscriptionYearly)} a year each) would pay{" "}
                {fmtCents(r.retail)}. Through your organization the same people cost {fmtCents(r.total)}
                {r.tier.implementationCents ? `, including the one-time ${fmtCents(r.tier.implementationCents)} implementation` : ""}.
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted">Illustrative pricing for planning, not a quote. Taxes not included.</p>
      </div>
    </div>
  );
}
