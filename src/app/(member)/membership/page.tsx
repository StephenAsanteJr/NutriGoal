import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveSubscription, getProfile, getSettings, listWeighIns, toBuildInput } from "@/lib/data";
import { computeBuild, formatWeight, kgToLb } from "@/lib/biometrics";
import { MEMBERSHIP, PRICES, energy, money } from "@/lib/domain";
import { Alert, PageHeader, shortDate } from "@/components/ui";
import { BuildPanel, lookFrom, memberCode } from "@/components/BuildPanel";
import { ProgressChart } from "@/components/ProgressChart";
import { JoinPanel } from "./JoinPanel";
import { stripeEnabled } from "@/lib/stripe";
import { WeighInForm } from "./WeighInForm";
import { SettingsPanel } from "./SettingsPanel";

export const metadata: Metadata = { title: "Membership" };

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "progress", label: "Progress" },
  { id: "settings", label: "Settings" },
] as const;

export default async function MembershipPage(props: PageProps<"/membership">) {
  const user = await requireMember();
  const sp = await props.searchParams;
  const tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as (typeof TABS)[number]["id"]) : "overview";
  const sub = getActiveSubscription(user.id);
  const profile = getProfile(user.id)!;
  const input = toBuildInput(profile);
  const build = input ? computeBuild(input) : null;
  const settings = getSettings(user.id);
  const units = profile.unit_system;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Membership" title={sub ? "Your NutriGoal Membership" : "Membership"}>
        {sub
          ? `${sub.plan === "yearly" ? "Annual" : "Monthly"} plan · ${MEMBERSHIP.ticketsPerMonth} goal ticket a month, the Daily Support Pack and member pricing.`
          : `${money(PRICES.subscriptionMonthly)} a month or ${money(PRICES.subscriptionYearly)} a year. Your build, progress and settings are here either way.`}
      </PageHeader>
      {sp.welcome && <Alert tone="good">Welcome aboard. Your membership is active and this month&apos;s ticket is ready to use.</Alert>}
      {typeof sp.payment_error === "string" && <Alert>{sp.payment_error}</Alert>}
      {sp.canceled && <Alert tone="warn">Checkout was canceled. You haven&apos;t been charged.</Alert>}

      <nav className="flex gap-1 border-b border-line" aria-label="Membership sections">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/membership?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold ${tab === t.id ? "border-blue text-navy" : "border-transparent text-slate hover:text-navy"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <Overview userId={user.id} name={user.name} />}
      {tab === "progress" && build && <Progress userId={user.id} units={units} goalKg={build.goalWeightKg} weeks={build.effectiveWeeks} />}
      {tab === "settings" && build && (
        <SettingsPanel
          settings={settings}
          goals={{
            unitSystem: units,
            desiredWeight: profile.desired_weight_kg ? (units === "metric" ? profile.desired_weight_kg.toFixed(1) : String(Math.round(kgToLb(profile.desired_weight_kg)))) : "",
            desiredBodyFat: profile.desired_body_fat_pct != null ? String(profile.desired_body_fat_pct) : "",
            weeklyRateLb: nearestRate(build.weightChangeKg, build.effectiveWeeks),
            autoCalories: build.targetCalories,
            minCalories: profile.sex === "male" ? 1500 : 1200,
          }}
        />
      )}
    </div>
  );
}

function nearestRate(changeKg: number, weeks: number) {
  if (Math.abs(changeKg) < 0.5) return 0;
  const lbPerWeek = kgToLb(changeKg) / weeks;
  const options = [-2, -1.5, -1, -0.5, 0, 0.25, 0.5];
  return options.reduce((best, r) => (Math.abs(r - lbPerWeek) < Math.abs(best - lbPerWeek) ? r : best), 0);
}

function Overview({ userId, name }: { userId: string; name: string }) {
  const sub = getActiveSubscription(userId);
  const profile = getProfile(userId)!;
  const input = toBuildInput(profile)!;
  const build = computeBuild(input);
  const s = getSettings(userId);
  const kcal = s.calorie_goal_override ?? build.targetCalories;
  const grams = {
    carbs: Math.round((kcal * s.macro_carbs) / 100 / 4),
    protein: Math.round((kcal * s.macro_protein) / 100 / 4),
    fat: Math.round((kcal * s.macro_fat) / 100 / 9),
  };
  const payments = db()
    .prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 12")
    .all(userId) as { id: string; description: string; amount_cents: number; card_brand: string | null; card_last4: string | null; created_at: string; provider: string | null }[];

  return (
    <div className="space-y-6">
      {sub ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat label="Plan" value={sub.plan === "yearly" ? "Annual" : "Monthly"} sub={`${money(sub.price_cents)} · renews ${new Date(sub.renews_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`} />
          <Stat
            label="Included tickets"
            value={`${sub.ticket_credits} available`}
            sub={`Next credit ${new Date(sub.credits_reset_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            action={sub.ticket_credits > 0 ? <Link href="/tickets/new" className="link text-sm">Use it now →</Link> : undefined}
          />
          <Stat label="Daily Support Pack" value="Active" sub={`${s.nudges_enabled ? `${s.nudges_per_day} nudges a day` : "Nudges paused"} · quiet ${s.quiet_start}–${s.quiet_end}`} action={<Link href="/membership?tab=settings#settings-reminders" className="link text-sm">Adjust →</Link>} />
        </div>
      ) : (
        <JoinPanel stripe={stripeEnabled()} />
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl">Your build</h2>
          <Link href="/membership?tab=settings#settings-character" className="link text-sm">Customize character →</Link>
        </div>
        <BuildPanel name={name} memberId={memberCode(userId)} input={input} units={profile.unit_system} medicationStage={profile.medication_stage} source={profile.source} updatedAt={profile.updated_at} look={lookFrom(s)} />
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="eyebrow">Daily targets</div>
            <div className="font-display mt-1 text-3xl">{energy(kcal, s.energy_unit)}</div>
            <div className="text-xs text-slate">{s.calorie_goal_override ? "Custom goal" : "Automatic, from your build and timeline"}</div>
          </div>
          <Link href="/membership?tab=settings#settings-goals" className="link text-sm">Edit goals & macros →</Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["Carbohydrates", grams.carbs, s.macro_carbs, "#2251ff"],
            ["Protein", grams.protein, s.macro_protein, "#00a9f4"],
            ["Fat", grams.fat, s.macro_fat, "#051c2c"],
          ].map(([label, g, pct, color]) => (
            <div key={label as string} className="rounded-[2px] border border-line p-4">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{label}</span>
                <span className="text-slate">{pct}%</span>
              </div>
              <div className="font-display mt-1 text-2xl">{g} g</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color as string }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate">
          Meals: {s.meal_names.join(" · ")}. Water goal {s.water_unit === "ml" ? `${Math.round(build.waterL * 1000).toLocaleString()} ml` : `${Math.round(build.waterL * 33.814)} oz`} a day.
        </p>
      </section>

      <section className="card">
        <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Payments & receipts</h2>
        {payments.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-3">{p.description}</td>
                    <td className="px-3 py-3 text-slate">{p.card_brand ? `${p.card_brand} ·· ${p.card_last4}` : "—"}</td>
                    <td className="px-3 py-3 text-slate">{shortDate(p.created_at)}</td>
                    <td className="px-3 py-3 text-right font-bold">{money(p.amount_cents)}</td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/payments/${p.id}`} className="link text-xs">Receipt</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Progress({ userId, units, goalKg, weeks }: { userId: string; units: "imperial" | "metric"; goalKg: number; weeks: number }) {
  const list = listWeighIns(userId);
  const today = new Date().toISOString().slice(0, 10);
  if (list.length === 0) return <WeighInForm units={units} today={today} />;
  const first = list[0];
  const last = list[list.length - 1];
  const change = last.weight_kg - first.weight_kg;
  const total = goalKg - first.weight_kg;
  const pct = Math.abs(total) < 0.3 ? 100 : Math.max(0, Math.min(100, (change / total) * 100));
  const days = Math.max(1, (new Date(last.logged_on).getTime() - new Date(first.logged_on).getTime()) / 86400_000);
  const perWeek = (change / days) * 7;
  const w = (kg: number) => formatWeight(kg, units);
  const bfs = list.filter((x) => x.body_fat_pct != null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line lg:grid-cols-5">
        <Tile label="Starting" value={w(first.weight_kg)} sub={new Date(first.logged_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
        <Tile label="Current" value={w(last.weight_kg)} sub={new Date(last.logged_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
        <Tile label="Change" value={`${change > 0 ? "+" : change < 0 ? "−" : ""}${w(Math.abs(change))}`} sub={`${perWeek > 0 ? "+" : perWeek < 0 ? "−" : ""}${w(Math.abs(perWeek))} a week`} />
        <Tile label="To goal" value={w(Math.abs(goalKg - last.weight_kg))} sub={`Goal ${w(goalKg)}`} />
        <Tile label="Progress" value={`${Math.round(pct)}%`} sub={bfs.length > 1 ? `Body fat ${bfs[0].body_fat_pct}% → ${bfs[bfs.length - 1].body_fat_pct}%` : "of the way to goal"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-bold">Weight</h2>
            <span className="text-xs text-muted">{list.length} weigh-ins</span>
          </div>
          <ProgressChart points={list.map((x) => ({ date: x.logged_on, kg: x.weight_kg }))} goalKg={goalKg} weeks={weeks} units={units} />
        </section>
        <WeighInForm units={units} today={today} />
      </div>

      <section className="card overflow-x-auto">
        <h2 className="border-b border-line px-6 py-3 text-sm font-bold">History</h2>
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line bg-mist text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-6 py-2 font-bold">Date</th>
              <th className="px-3 py-2 font-bold">Weight</th>
              <th className="px-3 py-2 font-bold">Body fat</th>
              <th className="px-3 py-2 font-bold">Waist</th>
              <th className="px-6 py-2 font-bold">Note</th>
            </tr>
          </thead>
          <tbody>
            {[...list].reverse().map((x) => (
              <tr key={x.id} className="border-b border-line last:border-0">
                <td className="px-6 py-2.5">{new Date(x.logged_on + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                <td className="px-3 py-2.5 font-bold">{w(x.weight_kg)}</td>
                <td className="px-3 py-2.5">{x.body_fat_pct != null ? `${x.body_fat_pct}%` : "—"}</td>
                <td className="px-3 py-2.5">{x.waist_cm ? (units === "metric" ? `${x.waist_cm} cm` : `${(x.waist_cm / 2.54).toFixed(1)} in`) : "—"}</td>
                <td className="px-6 py-2.5 text-slate">{x.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, action }: { label: string; value: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="eyebrow">{label}</div>
      <div className="font-display mt-2 text-3xl">{value}</div>
      <p className="mt-1 text-sm text-slate">{sub}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display mt-1 text-3xl">{value}</div>
      <div className="text-xs text-slate">{sub}</div>
    </div>
  );
}
