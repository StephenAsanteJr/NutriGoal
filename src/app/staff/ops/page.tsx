import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { hasDemoHistory, opsDashboard, parseFilters, RANGES } from "@/lib/analytics";
import { GOAL_TYPES } from "@/lib/domain";
import { BarList, Funnel, LineChart } from "@/components/dash/Charts";
import { DataTable, FilterBar, Kpi, Panel } from "@/components/dash/Parts";

export const metadata: Metadata = { title: "Operations dashboard" };

export default async function OpsDashboard(props: PageProps<"/staff/ops">) {
  await requireStaff(["manager"]);
  const f = parseFilters(await props.searchParams);
  const d = opsDashboard(f);
  const k = d.kpis;
  const scope = [f.clinician && d.clinicianOptions.find((c) => c.id === f.clinician)?.name, f.goal && GOAL_TYPES.find((g) => g.id === f.goal)?.label].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Operations</div>
          <h1 className="font-display text-4xl">Operations dashboard</h1>
          <p className="mt-1 text-sm text-slate">
            Ticket flow, the 48-hour promise, clinician load and the member funnel{scope ? ` · filtered to ${scope}` : ""}. Click bars and rows to filter.
          </p>
        </div>
      </header>

      <FilterBar ranges={RANGES} clinicians={d.clinicianOptions} goals={GOAL_TYPES.map((g) => ({ id: g.id, label: g.label }))} exportBase="/staff/ops/export" showDemo={hasDemoHistory()} />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line md:grid-cols-4">
        <Kpi label="Tickets submitted" value={k.submitted.value} prev={k.submitted.prev} />
        <Kpi label="Plans sent" value={k.responded.value} prev={k.responded.prev} />
        <Kpi label="Avg time to plan" value={k.avgHours.value} prev={k.avgHours.prev} format="hours" goodWhen="down" sub={`median ${k.medianHours == null ? "–" : `${k.medianHours.toFixed(0)} h`}`} />
        <Kpi label="Within 48 hours" value={k.sla.value} prev={k.sla.prev} format="pct" tone={k.sla.value != null && k.sla.value >= 90 ? "good" : undefined} />
        <Kpi label="Open now" value={k.open} sub={`${k.dueSoon} due within 12 h`} />
        <Kpi label="Overdue" value={k.overdue} tone={k.overdue ? "alert" : undefined} sub={k.overdue ? "past the 48-hour promise" : "none past 48 hours"} />
        <Kpi label="Average rating" value={k.rating.value} format="rating" sub={`${k.rating.count.toLocaleString()} ratings`} />
        <Kpi label="New members" value={k.newMembers} sub={`${k.activeClinicians} active clinicians · ${k.pendingApplications} applying`} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Tickets submitted vs. plans sent" subtitle="Hover for exact counts">
          <LineChart labels={d.series.map((s) => s.label)} series={[{ name: "Submitted", values: d.series.map((s) => s.submitted) }, { name: "Plans sent", values: d.series.map((s) => s.responded) }]} />
        </Panel>
        <Panel title="Time to plan" subtitle={`Plans sent in this period · ${k.nudges} nudges from members`}>
          <BarList items={d.responseBuckets} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Goal mix" subtitle="Click a goal to filter the whole dashboard">
          <BarList items={d.goals} filterParam="goal" selected={f.goal} color="#197a56" />
        </Panel>
        <Panel title="Open backlog by age" subtitle="Hours since payment, open tickets now">
          <BarList items={d.aging} showShare={false} color="#cc0000" />
        </Panel>
        <Panel title="Member funnel" subtitle="Members who joined in this period">
          <Funnel steps={d.funnel} />
        </Panel>
      </div>

      <Panel title="Clinician performance" subtitle="Click a clinician to filter the dashboard · utilization = plans in the last 7 days ÷ weekly capacity">
        <DataTable
          rows={d.clinicians}
          filterParam="clinician"
          selected={f.clinician}
          initialSort={{ key: "responded", dir: "desc" }}
          columns={[
            { key: "name", label: "Clinician" },
            { key: "credential", label: "Credential" },
            { key: "open", label: "Open", format: "int" },
            { key: "responded", label: "Plans sent", format: "int" },
            { key: "avgHours", label: "Avg time", format: "hours" },
            { key: "sla", label: "≤ 48 h", format: "pct" },
            { key: "rating", label: "Rating", format: "rating" },
            { key: "utilization", label: "Utilization", format: "pct" },
            { key: "capacity", label: "Capacity / wk", format: "int" },
          ]}
        />
      </Panel>

      <Panel title="Ticket log" subtitle="Every paid ticket in this period, newest first">
        <DataTable
          rows={d.rows}
          rowKey="ticket"
          initialSort={{ key: "submitted", dir: "desc" }}
          columns={[
            { key: "ticket", label: "Ticket" },
            { key: "submitted", label: "Submitted", format: "date" },
            { key: "goal", label: "Goal" },
            { key: "clinician", label: "Clinician" },
            { key: "status", label: "Status" },
            { key: "hours", label: "Hours to plan", format: "decimal" },
            { key: "rating", label: "Rating", format: "int" },
            { key: "nudges", label: "Nudges", format: "int" },
            { key: "payment", label: "Paid with" },
          ]}
        />
      </Panel>
    </div>
  );
}
