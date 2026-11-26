import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { financeDashboard, hasDemoHistory, parseFilters, RANGES } from "@/lib/analytics";
import { CLINICIAN_PAYOUT_CENTS } from "@/lib/domain";
import { fmt } from "@/lib/fmt";
import { BarList, LineChart, StackedColumns } from "@/components/dash/Charts";
import { DataTable, FilterBar, Kpi, Panel } from "@/components/dash/Parts";

export const metadata: Metadata = { title: "Financial dashboard" };

export default async function FinanceDashboard(props: PageProps<"/staff/finance">) {
  await requireStaff(["manager"]);
  const f = parseFilters(await props.searchParams);
  const d = financeDashboard(f);
  const k = d.kpis;
  const labels = d.series.map((s) => s.label);

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow">Finance</div>
        <h1 className="font-display text-4xl">Financial dashboard</h1>
        <p className="mt-1 text-sm text-slate">
          Revenue, recurring revenue, clinician payouts and margin. Payouts are {fmt(CLINICIAN_PAYOUT_CENTS.MD, "moneyCents")} per plan for physicians and{" "}
          {fmt(CLINICIAN_PAYOUT_CENTS.RD, "moneyCents")} for dietitians and nutritionists. Card fees aren&apos;t included.
        </p>
      </header>

      <FilterBar ranges={RANGES} exportBase="/staff/finance/export" showDemo={hasDemoHistory()} />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line md:grid-cols-4">
        <Kpi label="Gross revenue" value={k.revenue.value} prev={k.revenue.prev} format="moneyCents" sub={`${k.transactions.toLocaleString()} transactions`} />
        <Kpi label="Clinician payouts" value={k.payouts.value} format="moneyCents" sub="plans sent in this period" />
        <Kpi label="Gross margin" value={k.margin.value} prev={k.margin.prev} format="moneyCents" tone="good" />
        <Kpi label="Margin %" value={k.marginPct.value} prev={k.marginPct.prev} format="pct" />
        <Kpi label="MRR" value={k.mrr} format="moneyCents" sub={`ARR ${fmt(k.arr, "moneyCompact")}`} />
        <Kpi label="Active memberships" value={k.activeSubs} sub={`${k.monthlySubs} monthly · ${k.yearlySubs} annual · ${k.newSubs} new`} />
        <Kpi label="Membership churn" value={k.churn} format="pct" goodWhen="down" tone={k.churn != null && k.churn > 10 ? "alert" : undefined} sub={`${k.canceled} canceled in period`} />
        <Kpi label="Avg order value" value={k.aov} format="moneyCents" sub={`${fmt(k.arppu, "moneyCents")} per paying member · ${fmt(k.referralRevenue, "moneyCompact")} via referrals`} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Revenue by product" subtitle="Hover a column for the breakdown">
          <StackedColumns labels={labels} series={[{ name: "Tickets", values: d.series.map((s) => s.tickets) }, { name: "Memberships", values: d.series.map((s) => s.memberships) }, { name: "Add-ons", values: d.series.map((s) => s.addons) }]} />
        </Panel>
        <Panel title="Revenue, payouts and margin" subtitle="Same scale, so the gap between revenue and payouts is your margin">
          <LineChart format="moneyCents" labels={labels} series={[{ name: "Revenue", values: d.series.map((s) => s.revenue) }, { name: "Margin", values: d.series.map((s) => s.margin) }, { name: "Payouts", values: d.series.map((s) => s.payouts), dashed: true }]} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Monthly recurring revenue" subtitle="Monthly plans plus annual plans ÷ 12, at the end of each period">
          <LineChart format="moneyCents" height={180} labels={labels} series={[{ name: "MRR", values: d.series.map((s) => s.mrr) }]} />
        </Panel>
        <Panel title="Revenue mix" subtitle="This period">
          <BarList items={d.products} format="moneyCents" color="#197a56" />
        </Panel>
        <Panel title="Revenue by item" subtitle="This period">
          <BarList items={d.kinds} format="moneyCents" color="#cc0000" />
        </Panel>
      </div>

      <Panel title="Clinician payouts" subtitle="Plans sent in this period × the clinician's per-plan rate">
        <DataTable
          rows={d.payoutRows}
          initialSort={{ key: "payout", dir: "desc" }}
          columns={[
            { key: "name", label: "Clinician" },
            { key: "credential", label: "Credential" },
            { key: "responses", label: "Plans", format: "int" },
            { key: "rate", label: "Rate", format: "moneyCents" },
            { key: "payout", label: "Payout", format: "moneyCents" },
          ]}
        />
      </Panel>

      <Panel title="Transactions" subtitle="Every successful payment in this period">
        <DataTable
          rows={d.rows}
          rowKey="payment"
          initialSort={{ key: "date", dir: "desc" }}
          columns={[
            { key: "date", label: "Date", format: "date" },
            { key: "item", label: "Item" },
            { key: "product", label: "Product" },
            { key: "amount", label: "Amount", format: "money" },
            { key: "member", label: "Member" },
            { key: "referred", label: "Referred", format: "bool" },
            { key: "ticket", label: "Ticket" },
          ]}
        />
      </Panel>
    </div>
  );
}
