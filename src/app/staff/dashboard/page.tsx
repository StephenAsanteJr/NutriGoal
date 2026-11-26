import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { clinicianDashboard, RANGES, type Range } from "@/lib/analytics";
import { fmt } from "@/lib/fmt";
import { BarList, Columns } from "@/components/dash/Charts";
import { FilterBar, Kpi, Panel } from "@/components/dash/Parts";
import { CopyLink } from "@/components/dash/CopyLink";

export const metadata: Metadata = { title: "My dashboard" };

export default async function ClinicianDashboard(props: PageProps<"/staff/dashboard">) {
  const user = await requireStaff(["clinician"]);
  const sp = await props.searchParams;
  const range = (RANGES.find((r) => r.id === sp.range)?.id ?? "90d") as Range;
  const d = clinicianDashboard(user.id, range);
  if (!d) return null;
  const h = await headers();
  const origin = process.env.APP_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const link = d.me.referralCode ? `${origin.replace(/\/$/, "")}/signup?ref=${d.me.referralCode}` : null;
  const rangeLabel = RANGES.find((r) => r.id === range)!.label.toLowerCase();

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow">My dashboard</div>
        <h1 className="font-display text-4xl">{d.me.name}</h1>
        <p className="mt-1 text-sm text-slate">
          {d.me.credential} · capacity {d.me.capacity} plans a week · {fmt(d.me.rate, "moneyCents")} per signed plan
        </p>
      </header>

      <FilterBar ranges={RANGES} showDemo={false} defaultRange="90d" />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line md:grid-cols-5 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
        <Kpi label="Utilization" value={d.utilization.week} format="pct" sub={`${d.utilization.thisWeek} of ${d.me.capacity} plans this week · roster ${fmt(d.utilization.roster, "pct")}`} tone={d.utilization.week > 100 ? "alert" : undefined} />
        <Kpi label="Gross earnings" value={d.earnings.range * 100} format="moneyCents" sub={`${d.earnings.responses} plans · ${fmt(d.earnings.allTime * 100, "moneyCompact")} all time`} tone="good" />
        <Kpi label="Avg retention rate" value={d.retention.rate} format="pct" sub={`${d.retention.retained} of ${d.retention.served} members came back or stayed subscribed`} />
        <Kpi label="Average rating" value={d.rating.avg} format="rating" sub={`${d.rating.count} ratings · roster ${d.rating.roster == null ? "–" : d.rating.roster.toFixed(2)}`} />
        <Kpi label="Referral conversions" value={d.referrals.rate} format="pct" sub={`${d.referrals.converted} of ${d.referrals.signups} sign-ups paid · ${fmt(d.referrals.revenue, "money")}`} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Weekly utilization" subtitle="Plans you signed each week ÷ your weekly capacity (last 12 weeks)">
          <Columns items={d.weekly.map((w) => ({ key: w.label, label: w.label, value: Math.round(w.utilization), note: `${w.value} plans`, late: w.utilization > 100 }))} format="pct" reference={100} referenceLabel="Capacity" />
        </Panel>
        <Panel title="Gross earnings by month" subtitle="Before taxes and fees">
          <Columns items={d.earnings.months.map((m) => ({ key: m.label, label: m.label, value: m.value, note: `${m.responses} plans` }))} format="money" color="#197a56" />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Ratings" subtitle={`Member ratings in the last ${rangeLabel}`}>
          <BarList items={d.rating.dist} color="#197a56" />
          {d.rating.comments.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-line pt-3">
              {d.rating.comments.map((c, i) => (
                <li key={i} className="text-xs">
                  <span className="font-bold text-bcg-deep">{"★".repeat(c.rating)}</span> <span className="text-slate">“{c.comment}” · NG-{1000 + c.ticket_id}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Retention" subtitle="Members who sent another ticket within 90 days or kept a membership. Judged on members you answered 30+ days before each period, so they've had time to come back.">
          <div className="font-display text-5xl text-navy">{fmt(d.retention.rate, "pct")}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-bcg" style={{ width: `${d.retention.rate ?? 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate">{d.retention.retained} of {d.retention.served} members retained.</p>
          <div className="mt-4 border-t border-line pt-3 text-xs text-slate">
            Speed: <strong className="text-navy">{fmt(d.speed.avgHours, "hours")}</strong> average to a plan · <strong className="text-navy">{fmt(d.speed.sla, "pct")}</strong> within 48 hours · {d.utilization.open} open now
          </div>
        </Panel>
        <Panel title="Referrals" subtitle="Share your link. Members who join through it are credited to you; a conversion is their first payment.">
          {link ? <CopyLink url={link} /> : <p className="text-xs text-muted">Your referral link appears once your account is approved.</p>}
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["Sign-ups", fmt(d.referrals.signups)],
              ["Converted", fmt(d.referrals.converted)],
              ["Revenue", fmt(d.referrals.revenue, "money")],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[2px] bg-mist px-2 py-2">
                <dd className="font-display text-xl text-navy">{v}</dd>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{k}</dt>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  );
}
