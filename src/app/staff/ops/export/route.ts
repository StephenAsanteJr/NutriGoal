import { getCurrentUser } from "@/lib/auth";
import { opsDashboard, parseFilters } from "@/lib/analytics";
import { GOAL_TYPES } from "@/lib/domain";
import { CSV, XLSX, csv, describeFilters, download, workbook, type Col } from "@/lib/exports";

/** Operations dashboard export, same filters as the page: ?format=xlsx (Excel) or ?format=tableau (CSV). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "manager" || user.staff_status !== "active") return new Response("Managers only.", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseFilters(sp);
  const d = opsDashboard(f);
  const stamp = new Date().toISOString().slice(0, 10);

  const tickets: Col[] = [
    { key: "ticket", header: "ticket_id" },
    { key: "submitted", header: "submitted_at", date: true, width: 18 },
    { key: "responded", header: "plan_sent_at", date: true, width: 18 },
    { key: "goal", header: "goal_type", width: 30 },
    { key: "status", header: "status" },
    { key: "clinician", header: "clinician", width: 24 },
    { key: "credential", header: "credential", width: 24 },
    { key: "hours", header: "hours_to_plan", numFmt: "0.0" },
    { key: "withinSla", header: "within_48h" },
    { key: "rating", header: "member_rating" },
    { key: "nudges", header: "nudges" },
    { key: "payment", header: "paid_with", width: 18 },
    { key: "demo", header: "demo_record" },
  ];
  if (sp.format === "tableau") return download(csv(tickets, d.rows), `nutrigoal-operations-tickets-${stamp}.csv`, CSV);

  const k = d.kpis;
  const names = { clinician: d.clinicianOptions.find((c) => c.id === f.clinician)?.name, goal: GOAL_TYPES.find((g) => g.id === f.goal)?.label };
  const file = await workbook("NutriGoal operations dashboard", describeFilters(f, names), [
    ["Tickets submitted", k.submitted.value],
    ["Plans sent", k.responded.value],
    ["Average hours to plan", k.avgHours.value == null ? null : Number(k.avgHours.value.toFixed(1))],
    ["Median hours to plan", k.medianHours == null ? null : Number(k.medianHours.toFixed(1))],
    ["Within 48 hours (%)", k.sla.value == null ? null : Number(k.sla.value.toFixed(1))],
    ["Open now", k.open],
    ["Due within 12 hours", k.dueSoon],
    ["Overdue", k.overdue],
    ["Average rating", k.rating.value == null ? null : Number(k.rating.value.toFixed(2))],
    ["Ratings", k.rating.count],
    ["Member nudges", k.nudges],
    ["New members", k.newMembers],
    ["Active clinicians", k.activeClinicians],
    ["Pending applications", k.pendingApplications],
  ], [
    { name: "Tickets", columns: tickets.map((c) => ({ ...c, header: c.header.replace(/_/g, " ") })), rows: d.rows },
    {
      name: "Clinicians",
      columns: [
        { key: "name", header: "Clinician", width: 26 }, { key: "credential", header: "Credential", width: 26 }, { key: "open", header: "Open" }, { key: "responded", header: "Plans sent" },
        { key: "avgHours", header: "Avg hours", numFmt: "0.0" }, { key: "sla", header: "Within 48 h %", numFmt: "0.0" }, { key: "rating", header: "Avg rating", numFmt: "0.00" },
        { key: "ratings", header: "Ratings" }, { key: "utilization", header: "Utilization %", numFmt: "0" }, { key: "capacity", header: "Capacity / week" },
      ],
      rows: d.clinicians,
    },
    { name: "Trend", columns: [{ key: "label", header: "Period starting" }, { key: "submitted", header: "Submitted" }, { key: "responded", header: "Plans sent" }], rows: d.series },
    { name: "Goal mix", columns: [{ key: "label", header: "Goal", width: 34 }, { key: "value", header: "Tickets" }], rows: d.goals },
    { name: "Time to plan", columns: [{ key: "label", header: "Bucket" }, { key: "value", header: "Plans" }], rows: d.responseBuckets },
    { name: "Backlog", columns: [{ key: "label", header: "Age" }, { key: "value", header: "Open tickets" }], rows: d.aging },
    { name: "Funnel", columns: [{ key: "label", header: "Step", width: 26 }, { key: "value", header: "Members" }], rows: d.funnel },
  ]);
  return download(file, `nutrigoal-operations-${stamp}.xlsx`, XLSX);
}
