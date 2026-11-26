import "server-only";
// Dashboard metrics for managers (operations, finance) and clinicians (performance).
// Rows are loaded once per request and computed in JS: the data set is small, and one code path
// feeds both the on-screen dashboards and the Excel/Tableau exports, so they always agree.

import { db } from "./db";
import { CLINICIAN_PAYOUT_CENTS, GOAL_TYPES, goalLabel } from "./domain";

export type Range = "7d" | "30d" | "90d" | "180d" | "all";
export const RANGES: { id: Range; label: string; days: number | null }[] = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "180d", label: "6 months", days: 180 },
  { id: "all", label: "All time", days: null },
];
export type Filters = { range: Range; clinician: string | null; goal: string | null; demo: boolean };

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const range = (RANGES.find((r) => r.id === one("range"))?.id ?? "30d") as Range;
  const goal = GOAL_TYPES.some((g) => g.id === one("goal")) ? one("goal") : null;
  return { range, clinician: one("clinician") || null, goal, demo: one("demo") !== "0" };
}

/** Whether any generated demo records exist (the dashboards hide the demo switch when there are none). */
export const hasDemoHistory = () => !!db().prepare("SELECT 1 FROM users WHERE demo_history = 1 LIMIT 1").get();

export function filterQuery(f: Filters, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ range: f.range, ...(f.clinician ? { clinician: f.clinician } : {}), ...(f.goal ? { goal: f.goal } : {}), ...(f.demo ? {} : { demo: "0" }), ...extra });
  return q.toString();
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** SQLite rows mix "YYYY-MM-DD HH:MM:SS" (UTC defaults) and JS ISO strings; read both as UTC. */
const ts = (s: string | null | undefined) => (s ? Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s.replace(" ", "T") : `${s.replace(" ", "T")}Z`) : NaN);
const pct = (n: number, d: number) => (d ? (n / d) * 100 : null);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

type TicketRow = {
  id: number; user_id: string; goal_type: string; status: string; clinician_id: string | null; created_at: string; paid_at: string | null; due_at: string | null;
  responded_at: string | null; member_demo: number; member_name: string; rating: number | null; rated_at: string | null; nudges: number; payment_method: string | null;
};
type ClinicianRow = { id: string; name: string; credential: string | null; clinician_type: "MD" | "RD" | null; weekly_capacity: number; referral_code: string | null; staff_status: string; demo_history: number; created_at: string };
type PaymentRow = { id: string; user_id: string; kind: string; description: string; amount_cents: number; created_at: string; status: string; ticket_id: number | null; member_demo: number; referred_by: string | null; member_name: string; provider: string | null };
type SubRow = { id: string; user_id: string; plan: "monthly" | "yearly"; status: string; price_cents: number; started_at: string; canceled_at: string | null; member_demo: number };
type MemberRow = { id: string; created_at: string; onboarding_complete: number; demo_history: number; referred_by: string | null };

function load() {
  const c = db();
  return {
    tickets: c
      .prepare(
        `SELECT t.id, t.user_id, t.goal_type, t.status, t.assigned_clinician_id AS clinician_id, t.created_at, t.paid_at, t.due_at, t.responded_at, t.payment_method,
                u.demo_history AS member_demo, u.name AS member_name, r.rating, r.rated_at,
                (SELECT COUNT(*) FROM nudges n WHERE n.ticket_id = t.id) AS nudges
         FROM tickets t JOIN users u ON u.id = t.user_id LEFT JOIN ticket_responses r ON r.ticket_id = t.id
         WHERE t.paid_at IS NOT NULL`,
      )
      .all() as TicketRow[],
    clinicians: c
      .prepare("SELECT id, name, credential, clinician_type, weekly_capacity, referral_code, staff_status, demo_history, created_at FROM users WHERE role = 'clinician'")
      .all() as ClinicianRow[],
    payments: c
      .prepare(
        `SELECT p.id, p.user_id, p.kind, p.description, p.amount_cents, p.created_at, p.status, p.ticket_id, p.provider, u.demo_history AS member_demo, u.referred_by, u.name AS member_name
         FROM payments p JOIN users u ON u.id = p.user_id WHERE p.status = 'succeeded'`,
      )
      .all() as PaymentRow[],
    subs: c
      .prepare("SELECT s.id, s.user_id, s.plan, s.status, s.price_cents, s.started_at, s.canceled_at, u.demo_history AS member_demo FROM subscriptions s JOIN users u ON u.id = s.user_id")
      .all() as SubRow[],
    members: c.prepare("SELECT id, created_at, onboarding_complete, demo_history, referred_by FROM users WHERE role = 'member'").all() as MemberRow[],
  };
}

function window(range: Range, now = Date.now()) {
  const days = RANGES.find((r) => r.id === range)?.days ?? null;
  const start = days ? now - days * DAY : -Infinity;
  const prevStart = days ? now - 2 * days * DAY : -Infinity;
  return { now, start, prevStart, days };
}

/** Buckets for time series: days for short ranges, weeks for longer ones. */
function buckets(range: Range, earliest: number, now = Date.now()) {
  const days = RANGES.find((r) => r.id === range)?.days ?? Math.max(30, Math.ceil((now - earliest) / DAY));
  const size = days <= 31 ? DAY : 7 * DAY;
  const n = Math.ceil((days * DAY) / size);
  const end = Math.ceil(now / DAY) * DAY;
  return Array.from({ length: n }, (_, i) => {
    const s = end - (n - i) * size;
    const d = new Date(s);
    return { start: s, end: s + size, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) };
  });
}

export const payoutFor = (type: string | null) => CLINICIAN_PAYOUT_CENTS[type === "MD" ? "MD" : "RD"];
const hoursToRespond = (t: TicketRow) => (t.responded_at && t.paid_at ? (ts(t.responded_at) - ts(t.paid_at)) / HOUR : null);
const productOf = (kind: string) => (kind.startsWith("subscription") ? "Memberships" : kind === "addon" ? "Add-ons" : "Tickets");

// ---------------------------------------------------------------- Operations

export function opsDashboard(f: Filters) {
  const all = load();
  const { now, start, prevStart } = window(f.range);
  const inScope = (t: TicketRow) => (f.demo || !t.member_demo) && (!f.clinician || t.clinician_id === f.clinician) && (!f.goal || t.goal_type === f.goal);
  const tickets = all.tickets.filter(inScope);
  const clin = new Map(all.clinicians.map((c) => [c.id, c]));

  const submitted = (a: number, b: number) => tickets.filter((t) => ts(t.paid_at) >= a && ts(t.paid_at) < b);
  const responded = (a: number, b: number) => tickets.filter((t) => t.responded_at && ts(t.responded_at) >= a && ts(t.responded_at) < b);
  const cur = { submitted: submitted(start, now + 1), responded: responded(start, now + 1) };
  const prev = { submitted: submitted(prevStart, start), responded: responded(prevStart, start) };
  const hours = (list: TicketRow[]) => list.map(hoursToRespond).filter((h): h is number => h != null);
  const sla = (list: TicketRow[]) => pct(hours(list).filter((h) => h <= 48).length, hours(list).length);
  const open = tickets.filter((t) => !t.responded_at);
  const ratingsIn = tickets.filter((t) => t.rating != null && ts(t.rated_at) >= start);
  const members = all.members.filter((m) => f.demo || !m.demo_history);
  const newMembers = members.filter((m) => ts(m.created_at) >= start);

  const kpis = {
    submitted: { value: cur.submitted.length, prev: prev.submitted.length },
    responded: { value: cur.responded.length, prev: prev.responded.length },
    avgHours: { value: avg(hours(cur.responded)), prev: avg(hours(prev.responded)) },
    medianHours: median(hours(cur.responded)),
    sla: { value: sla(cur.responded), prev: sla(prev.responded) },
    open: open.length,
    dueSoon: open.filter((t) => ts(t.due_at) - now < 12 * HOUR && ts(t.due_at) >= now).length,
    overdue: open.filter((t) => ts(t.due_at) < now).length,
    rating: { value: avg(ratingsIn.map((t) => t.rating!)), count: ratingsIn.length },
    nudges: cur.submitted.reduce((n, t) => n + t.nudges, 0),
    newMembers: newMembers.length,
    activeClinicians: all.clinicians.filter((c) => c.staff_status === "active" && (f.demo || !c.demo_history)).length,
    pendingApplications: all.clinicians.filter((c) => c.staff_status === "pending").length,
  };

  const earliest = Math.min(...tickets.map((t) => ts(t.paid_at)).filter(Number.isFinite), now - 30 * DAY);
  const series = buckets(f.range, earliest).map((b) => ({
    label: b.label,
    submitted: tickets.filter((t) => ts(t.paid_at) >= b.start && ts(t.paid_at) < b.end).length,
    responded: tickets.filter((t) => t.responded_at && ts(t.responded_at) >= b.start && ts(t.responded_at) < b.end).length,
  }));

  const h = hours(cur.responded);
  const responseBuckets = [
    { key: "0-12", label: "Under 12 h", value: h.filter((x) => x < 12).length },
    { key: "12-24", label: "12–24 h", value: h.filter((x) => x >= 12 && x < 24).length },
    { key: "24-36", label: "24–36 h", value: h.filter((x) => x >= 24 && x < 36).length },
    { key: "36-48", label: "36–48 h", value: h.filter((x) => x >= 36 && x <= 48).length },
    { key: "late", label: "Over 48 h", value: h.filter((x) => x > 48).length, late: true },
  ];

  // Goal mix ignores the goal filter itself, so clicking a bar can switch goals.
  const goalBase = all.tickets.filter((t) => (f.demo || !t.member_demo) && (!f.clinician || t.clinician_id === f.clinician) && ts(t.paid_at) >= start);
  const goals = GOAL_TYPES.map((g) => ({ key: g.id, label: g.label, value: goalBase.filter((t) => t.goal_type === g.id).length })).sort((a, b) => b.value - a.value);

  const aging = [
    { key: "0-12", label: "0–12 h", value: 0 },
    { key: "12-24", label: "12–24 h", value: 0 },
    { key: "24-36", label: "24–36 h", value: 0 },
    { key: "36-48", label: "36–48 h", value: 0 },
    { key: "overdue", label: "Overdue", value: 0, late: true },
  ];
  for (const t of open) {
    const age = (now - ts(t.paid_at)) / HOUR;
    aging[ts(t.due_at) < now ? 4 : age < 12 ? 0 : age < 24 ? 1 : age < 36 ? 2 : 3].value++;
  }

  // Per-clinician table ignores the clinician filter (it's how you pick one).
  const clinBase = all.tickets.filter((t) => (f.demo || !t.member_demo) && (!f.goal || t.goal_type === f.goal));
  const weekAgo = now - 7 * DAY;
  const clinicians = all.clinicians
    .filter((c) => c.staff_status === "active" && (f.demo || !c.demo_history))
    .map((c) => {
      const mine = clinBase.filter((t) => t.clinician_id === c.id);
      const done = mine.filter((t) => t.responded_at && ts(t.responded_at) >= start);
      const hh = hours(done);
      const rated = mine.filter((t) => t.rating != null && ts(t.rated_at) >= start);
      const lastWeek = mine.filter((t) => t.responded_at && ts(t.responded_at) >= weekAgo).length;
      return {
        id: c.id, name: c.name, credential: c.credential ?? "", open: mine.filter((t) => !t.responded_at).length, responded: done.length,
        avgHours: avg(hh), sla: pct(hh.filter((x) => x <= 48).length, hh.length), rating: avg(rated.map((t) => t.rating!)), ratings: rated.length,
        utilization: pct(lastWeek, c.weekly_capacity), capacity: c.weekly_capacity,
      };
    })
    .sort((a, b) => b.responded - a.responded);

  // Funnel for members who joined in the window.
  const paidBy = new Set(all.payments.map((p) => p.user_id));
  const ticketsByMember = new Map<string, TicketRow[]>();
  for (const t of all.tickets) ticketsByMember.set(t.user_id, [...(ticketsByMember.get(t.user_id) ?? []), t]);
  const activeSub = new Set(all.subs.filter((s) => s.status === "active").map((s) => s.user_id));
  const funnel = [
    { key: "signup", label: "Signed up", value: newMembers.length },
    { key: "profile", label: "Built a profile", value: newMembers.filter((m) => m.onboarding_complete).length },
    { key: "paid", label: "Sent a paid ticket", value: newMembers.filter((m) => (ticketsByMember.get(m.id) ?? []).length > 0 || paidBy.has(m.id)).length },
    { key: "answered", label: "Received a plan", value: newMembers.filter((m) => (ticketsByMember.get(m.id) ?? []).some((t) => t.responded_at)).length },
    { key: "returned", label: "Came back or subscribed", value: newMembers.filter((m) => (ticketsByMember.get(m.id) ?? []).length > 1 || activeSub.has(m.id)).length },
  ];

  const rows = tickets
    .filter((t) => ts(t.paid_at) >= start)
    .sort((a, b) => ts(b.paid_at) - ts(a.paid_at))
    .map((t) => {
      const c = t.clinician_id ? clin.get(t.clinician_id) : undefined;
      const hrs = hoursToRespond(t);
      return {
        ticket: `NG-${1000 + t.id}`, submitted: t.paid_at, goal: goalLabel(t.goal_type), status: t.responded_at ? "Responded" : ts(t.due_at) < now ? "Overdue" : "Open",
        clinician: c?.name ?? "Unassigned", credential: c?.credential ?? "", responded: t.responded_at, hours: hrs == null ? null : Math.round(hrs * 10) / 10,
        withinSla: hrs == null ? null : hrs <= 48, rating: t.rating, nudges: t.nudges, payment: t.payment_method === "subscription" ? "Membership credit" : "Card", demo: !!t.member_demo,
      };
    });

  return { kpis, series, responseBuckets, goals, aging, clinicians, funnel, rows, clinicianOptions: clinicians.map((c) => ({ id: c.id, name: c.name })) };
}

// ---------------------------------------------------------------- Finance

export function financeDashboard(f: Filters) {
  const all = load();
  const { now, start, prevStart } = window(f.range);
  const pays = all.payments.filter((p) => f.demo || !p.member_demo);
  const subs = all.subs.filter((s) => f.demo || !s.member_demo);
  const tickets = all.tickets.filter((t) => f.demo || !t.member_demo);
  const clin = new Map(all.clinicians.map((c) => [c.id, c]));
  const between = <T,>(list: T[], at: (x: T) => number, a: number, b: number) => list.filter((x) => at(x) >= a && at(x) < b);
  const sum = (list: PaymentRow[]) => list.reduce((n, p) => n + p.amount_cents, 0);
  const payoutOf = (list: TicketRow[]) => list.reduce((n, t) => n + payoutFor(t.clinician_id ? clin.get(t.clinician_id)?.clinician_type ?? null : null), 0);

  const cur = between(pays, (p) => ts(p.created_at), start, now + 1);
  const prev = between(pays, (p) => ts(p.created_at), prevStart, start);
  const respondedCur = between(tickets.filter((t) => t.responded_at), (t) => ts(t.responded_at), start, now + 1);
  const respondedPrev = between(tickets.filter((t) => t.responded_at), (t) => ts(t.responded_at), prevStart, start);
  const mrrAt = (t: number) =>
    subs.filter((s) => ts(s.started_at) <= t && (!s.canceled_at || ts(s.canceled_at) > t)).reduce((n, s) => n + (s.plan === "yearly" ? s.price_cents / 12 : s.price_cents), 0);
  const activeAt = (t: number) => subs.filter((s) => ts(s.started_at) <= t && (!s.canceled_at || ts(s.canceled_at) > t));
  const activeNow = activeAt(now);
  const startActive = Number.isFinite(start) ? activeAt(start).length : 0;
  const canceled = subs.filter((s) => s.canceled_at && ts(s.canceled_at) >= start);
  const newSubs = subs.filter((s) => ts(s.started_at) >= start);
  const payingMembers = new Set(cur.map((p) => p.user_id)).size;
  const gross = sum(cur);
  const payouts = payoutOf(respondedCur);
  const grossPrev = sum(prev);
  const payoutsPrev = payoutOf(respondedPrev);

  const kpis = {
    revenue: { value: gross, prev: grossPrev },
    payouts: { value: payouts, prev: payoutsPrev },
    margin: { value: gross - payouts, prev: grossPrev - payoutsPrev },
    marginPct: { value: pct(gross - payouts, gross), prev: pct(grossPrev - payoutsPrev, grossPrev) },
    mrr: mrrAt(now),
    arr: mrrAt(now) * 12,
    activeSubs: activeNow.length,
    monthlySubs: activeNow.filter((s) => s.plan === "monthly").length,
    yearlySubs: activeNow.filter((s) => s.plan === "yearly").length,
    newSubs: newSubs.length,
    canceled: canceled.length,
    churn: Number.isFinite(start) ? pct(canceled.length, startActive) : null,
    transactions: cur.length,
    aov: cur.length ? gross / cur.length : null,
    arppu: payingMembers ? gross / payingMembers : null,
    referralRevenue: sum(cur.filter((p) => p.referred_by)),
  };

  const earliest = Math.min(...pays.map((p) => ts(p.created_at)), now - 30 * DAY);
  const bks = buckets(f.range, earliest);
  const series = bks.map((b) => {
    const list = between(pays, (p) => ts(p.created_at), b.start, b.end);
    const resp = between(tickets.filter((t) => t.responded_at), (t) => ts(t.responded_at), b.start, b.end);
    const by = (prod: string) => list.filter((p) => productOf(p.kind) === prod).reduce((n, p) => n + p.amount_cents, 0);
    const revenue = sum(list);
    const payout = payoutOf(resp);
    return { label: b.label, tickets: by("Tickets"), memberships: by("Memberships"), addons: by("Add-ons"), revenue, payouts: payout, margin: revenue - payout, mrr: mrrAt(b.end) };
  });

  const products = ["Tickets", "Memberships", "Add-ons"].map((name) => {
    const list = cur.filter((p) => productOf(p.kind) === name);
    return { key: name, label: name, value: sum(list), count: list.length };
  });
  const kinds = [...new Set(cur.map((p) => p.kind))].map((k) => {
    const list = cur.filter((p) => p.kind === k);
    return { key: k, label: list[0]?.description ?? k, value: sum(list), count: list.length };
  }).sort((a, b) => b.value - a.value);

  const payoutRows = all.clinicians
    .filter((c) => f.demo || !c.demo_history)
    .map((c) => {
      const done = respondedCur.filter((t) => t.clinician_id === c.id);
      return { id: c.id, name: c.name, credential: c.credential ?? "", responses: done.length, rate: payoutFor(c.clinician_type), payout: payoutOf(done) };
    })
    .filter((r) => r.responses > 0)
    .sort((a, b) => b.payout - a.payout);

  const rows = [...cur]
    .sort((a, b) => ts(b.created_at) - ts(a.created_at))
    .map((p) => ({
      payment: p.id.slice(0, 8), date: p.created_at, product: productOf(p.kind), item: p.description, amount: p.amount_cents / 100,
      member: p.member_name, referred: !!p.referred_by, ticket: p.ticket_id ? `NG-${1000 + p.ticket_id}` : "", provider: p.provider ?? "demo", demo: !!p.member_demo,
    }));
  const payoutDetail = respondedCur
    .sort((a, b) => ts(b.responded_at) - ts(a.responded_at))
    .map((t) => {
      const c = t.clinician_id ? clin.get(t.clinician_id) : undefined;
      return { ticket: `NG-${1000 + t.id}`, responded: t.responded_at, clinician: c?.name ?? "", credential: c?.credential ?? "", payout: payoutFor(c?.clinician_type ?? null) / 100 };
    });

  return { kpis, series, products, kinds, payoutRows, rows, payoutDetail };
}

// ---------------------------------------------------------------- Clinician

export function clinicianDashboard(clinicianId: string, range: Range) {
  const all = load();
  const { now, start } = window(range);
  const me = all.clinicians.find((c) => c.id === clinicianId);
  if (!me) return null;
  const mine = all.tickets.filter((t) => t.clinician_id === clinicianId);
  const done = mine.filter((t) => t.responded_at);
  const doneIn = done.filter((t) => ts(t.responded_at) >= start);
  const rate = payoutFor(me.clinician_type);
  const weekAgo = now - 7 * DAY;
  const weeksInRange = Number.isFinite(start) ? (now - start) / (7 * DAY) : Math.max(1, (now - Math.min(...done.map((t) => ts(t.responded_at)), now - 7 * DAY)) / (7 * DAY));

  // Utilization: plans written per week ÷ weekly capacity.
  const thisWeek = done.filter((t) => ts(t.responded_at) >= weekAgo).length;
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const b = now - (12 - i) * 7 * DAY;
    const n = done.filter((t) => ts(t.responded_at) >= b && ts(t.responded_at) < b + 7 * DAY).length;
    return { label: new Date(b).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: n, utilization: pct(n, me.weekly_capacity) ?? 0 };
  });

  // Earnings by month (last 6).
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (5 - i), 1));
    const e = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
    const n = done.filter((t) => ts(t.responded_at) >= m.getTime() && ts(t.responded_at) < e.getTime()).length;
    return { label: m.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), value: (n * rate) / 100, responses: n };
  });

  // Retention: members you answered who came back (a later paid ticket within 90 days) or still have an active membership.
  // Members need at least 30 days to come back, so each period is judged on the members answered in the same-length
  // window that ended 30 days ago (e.g. "30 days" = members answered 30–60 days ago).
  const activeSub = new Set(all.subs.filter((s) => s.status === "active").map((s) => s.user_id));
  const byMember = new Map<string, TicketRow[]>();
  for (const t of all.tickets) byMember.set(t.user_id, [...(byMember.get(t.user_id) ?? []), t]);
  const servedFirst = new Map<string, number>();
  const cohortStart = Number.isFinite(start) ? start - 30 * DAY : -Infinity;
  const cohortEnd = now - 30 * DAY;
  for (const t of done) {
    const at = ts(t.responded_at);
    if (at >= cohortStart && at <= cohortEnd && (!servedFirst.has(t.user_id) || at < servedFirst.get(t.user_id)!)) servedFirst.set(t.user_id, at);
  }
  let retained = 0;
  for (const [member, at] of servedFirst) {
    const later = (byMember.get(member) ?? []).some((t) => ts(t.paid_at) > at && ts(t.paid_at) <= at + 90 * DAY);
    if (later || activeSub.has(member)) retained++;
  }

  // Ratings.
  const rated = mine.filter((t) => t.rating != null && ts(t.rated_at) >= start);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ key: String(n), label: `${n} star${n === 1 ? "" : "s"}`, value: rated.filter((t) => t.rating === n).length }));
  const comments = db()
    .prepare(
      `SELECT r.rating, r.rating_comment AS comment, r.rated_at, t.id AS ticket_id FROM ticket_responses r JOIN tickets t ON t.id = r.ticket_id
       WHERE r.clinician_id = ? AND r.rating_comment IS NOT NULL ORDER BY r.rated_at DESC LIMIT 6`,
    )
    .all(clinicianId) as { rating: number; comment: string; rated_at: string; ticket_id: number }[];

  // Referrals: members who signed up with your link, and how many went on to pay.
  const referred = all.members.filter((m) => m.referred_by === clinicianId && ts(m.created_at) >= start);
  const payers = new Set(all.payments.map((p) => p.user_id));
  const converted = referred.filter((m) => payers.has(m.id));
  const referralRevenue = all.payments.filter((p) => p.referred_by === clinicianId && ts(p.created_at) >= start).reduce((n, p) => n + p.amount_cents, 0);

  // Roster benchmarks (active clinicians, same window).
  const roster = all.clinicians.filter((c) => c.staff_status === "active");
  const rosterRatings = all.tickets.filter((t) => t.rating != null && ts(t.rated_at) >= start).map((t) => t.rating!);
  const rosterUtil = avg(roster.map((c) => pct(all.tickets.filter((t) => t.clinician_id === c.id && t.responded_at && ts(t.responded_at) >= weekAgo).length, c.weekly_capacity) ?? 0));
  const hrs = doneIn.map(hoursToRespond).filter((h): h is number => h != null);

  return {
    me: { name: me.name, credential: me.credential, capacity: me.weekly_capacity, referralCode: me.referral_code, rate },
    utilization: { week: pct(thisWeek, me.weekly_capacity) ?? 0, range: pct(doneIn.length, me.weekly_capacity * weeksInRange) ?? 0, thisWeek, open: mine.filter((t) => !t.responded_at).length, roster: rosterUtil },
    earnings: { range: (doneIn.length * rate) / 100, allTime: (done.length * rate) / 100, responses: doneIn.length, months },
    retention: { rate: pct(retained, servedFirst.size), retained, served: servedFirst.size },
    rating: { avg: avg(rated.map((t) => t.rating!)), count: rated.length, dist, comments, roster: avg(rosterRatings) },
    referrals: { signups: referred.length, converted: converted.length, rate: pct(converted.length, referred.length), revenue: referralRevenue / 100 },
    speed: { avgHours: avg(hrs), sla: pct(hrs.filter((h) => h <= 48).length, hrs.length) },
    weekly,
  };
}
