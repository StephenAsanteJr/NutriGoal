import { getCurrentUser } from "@/lib/auth";
import { financeDashboard, parseFilters } from "@/lib/analytics";
import { CSV, XLSX, csv, describeFilters, download, workbook, type Col } from "@/lib/exports";

const money = "$#,##0.00";

/** Financial dashboard export, same filters as the page: ?format=xlsx (Excel) or ?format=tableau (CSV ledger). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "manager" || user.staff_status !== "active") return new Response("Managers only.", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseFilters(sp);
  const d = financeDashboard(f);
  const stamp = new Date().toISOString().slice(0, 10);

  if (sp.format === "tableau") {
    // One ledger: revenue rows (positive) and clinician payout rows (negative). SUM(amount_usd) = gross margin.
    const ledger = [
      ...d.rows.map((r) => ({ entry_type: "Revenue", occurred_at: r.date, category: r.product, item: r.item, amount_usd: r.amount, counterparty: r.member, ticket_id: r.ticket, referred_member: r.referred, demo_record: r.demo })),
      ...d.payoutDetail.map((p) => ({ entry_type: "Clinician payout", occurred_at: p.responded, category: "Payouts", item: `Plan payout (${p.credential})`, amount_usd: -p.payout, counterparty: p.clinician, ticket_id: p.ticket, referred_member: null, demo_record: null })),
    ];
    const cols: Col[] = ["entry_type", "occurred_at", "category", "item", "amount_usd", "counterparty", "ticket_id", "referred_member", "demo_record"].map((k) => ({ key: k, header: k, date: k === "occurred_at" }));
    return download(csv(cols, ledger), `nutrigoal-finance-ledger-${stamp}.csv`, CSV);
  }

  const k = d.kpis;
  const c2 = (v: number | null) => (v == null ? null : Math.round(v) / 100);
  const file = await workbook("NutriGoal financial dashboard", [...describeFilters(f), "Card processing fees are not included."], [
    ["Gross revenue ($)", c2(k.revenue.value)],
    ["Clinician payouts ($)", c2(k.payouts.value)],
    ["Gross margin ($)", c2(k.margin.value)],
    ["Margin (%)", k.marginPct.value == null ? null : Number(k.marginPct.value.toFixed(1))],
    ["MRR ($)", c2(k.mrr)],
    ["ARR ($)", c2(k.arr)],
    ["Active memberships", k.activeSubs],
    ["  Monthly", k.monthlySubs],
    ["  Annual", k.yearlySubs],
    ["New memberships", k.newSubs],
    ["Canceled memberships", k.canceled],
    ["Membership churn (%)", k.churn == null ? null : Number(k.churn.toFixed(1))],
    ["Transactions", k.transactions],
    ["Average order value ($)", c2(k.aov)],
    ["Revenue per paying member ($)", c2(k.arppu)],
    ["Revenue from referred members ($)", c2(k.referralRevenue)],
  ], [
    {
      name: "Transactions",
      columns: [
        { key: "date", header: "Date", date: true, width: 18 }, { key: "item", header: "Item", width: 34 }, { key: "product", header: "Product" }, { key: "amount", header: "Amount", numFmt: money },
        { key: "member", header: "Member", width: 24 }, { key: "referred", header: "Referred" }, { key: "ticket", header: "Ticket" }, { key: "provider", header: "Processor" }, { key: "demo", header: "Demo record" },
      ],
      rows: d.rows,
    },
    {
      name: "Trend",
      columns: [
        { key: "label", header: "Period starting" }, { key: "tickets", header: "Tickets", numFmt: money }, { key: "memberships", header: "Memberships", numFmt: money }, { key: "addons", header: "Add-ons", numFmt: money },
        { key: "revenue", header: "Revenue", numFmt: money }, { key: "payouts", header: "Payouts", numFmt: money }, { key: "margin", header: "Margin", numFmt: money }, { key: "mrr", header: "MRR", numFmt: money },
      ],
      rows: d.series.map((s) => ({ ...s, tickets: s.tickets / 100, memberships: s.memberships / 100, addons: s.addons / 100, revenue: s.revenue / 100, payouts: s.payouts / 100, margin: s.margin / 100, mrr: Math.round(s.mrr) / 100 })),
    },
    { name: "Revenue by item", columns: [{ key: "label", header: "Item", width: 36 }, { key: "count", header: "Count" }, { key: "value", header: "Revenue", numFmt: money }], rows: d.kinds.map((x) => ({ ...x, value: x.value / 100 })) },
    {
      name: "Payouts by clinician",
      columns: [{ key: "name", header: "Clinician", width: 26 }, { key: "credential", header: "Credential", width: 26 }, { key: "responses", header: "Plans" }, { key: "rate", header: "Rate", numFmt: money }, { key: "payout", header: "Payout", numFmt: money }],
      rows: d.payoutRows.map((r) => ({ ...r, rate: r.rate / 100, payout: r.payout / 100 })),
    },
    {
      name: "Payout detail",
      columns: [{ key: "ticket", header: "Ticket" }, { key: "responded", header: "Plan sent", date: true, width: 18 }, { key: "clinician", header: "Clinician", width: 26 }, { key: "credential", header: "Credential", width: 26 }, { key: "payout", header: "Payout", numFmt: money }],
      rows: d.payoutDetail,
    },
  ]);
  return download(file, `nutrigoal-finance-${stamp}.xlsx`, XLSX);
}
