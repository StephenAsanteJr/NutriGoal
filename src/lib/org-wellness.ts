import "server-only";
// De-identified ("double-blind") organizational wellness.
//
// Blind one: the organization never learns who did what. Reports are computed here, on the server,
// from members who chose to join with the organization's invite code, and only group totals leave
// this file: no names, emails, weights, labs, goals, tickets, plans or medications. A view that would
// describe fewer than MIN_GROUP people is withheld, and shares are rounded to the nearest 5%.
//
// Blind two: clinicians never learn who sponsors a member. Nothing in the ticket, plan, build or
// routing code reads org_enrollments, so an employer can't influence (or be inferred from) care.

import { db, newId, nowIso } from "./db";
import { MIN_GROUP, monthlyBill, tierById } from "./enterprise";

export type Direction = "closer" | "holding" | "straying" | "no_data";

export const DIRECTION_LABEL: Record<Direction, string> = {
  closer: "Getting closer to their goal",
  holding: "Holding steady",
  straying: "Straying from their goal",
  no_data: "No recent check-ins",
};

const DAY = 86400_000;
const WINDOW_DAYS = 45; // look-back for the direction of travel
const MIN_SPAN_DAYS = 14; // check-ins must span at least two weeks to call a direction
const STEP = 0.005; // 0.5% of body weight counts as a real move

type WeighIn = { user_id: string; logged_on: string; weight_kg: number };

/** One member's direction of travel and progress toward their goal, as of a date. Never leaves this file. */
function assess(weighIns: WeighIn[], startKg: number | null, goalKg: number | null, asOf: number): { direction: Direction; progress: number | null } {
  const upTo = weighIns.filter((w) => Date.parse(w.logged_on) <= asOf);
  if (!upTo.length || goalKg == null) return { direction: "no_data", progress: null };
  const start = startKg ?? upTo[0].weight_kg;
  const latest = upTo[upTo.length - 1];
  const recent = upTo.filter((w) => Date.parse(w.logged_on) >= asOf - WINDOW_DAYS * DAY);
  const maintain = Math.abs(start - goalKg) < 1;
  const progress = maintain
    ? Math.abs(latest.weight_kg - goalKg) / goalKg <= 0.02 ? 1 : 0.5
    : Math.min(1, Math.max(0, (start - latest.weight_kg) / (start - goalKg)));
  if (recent.length < 2 || Date.parse(recent[recent.length - 1].logged_on) - Date.parse(recent[0].logged_on) < MIN_SPAN_DAYS * DAY) {
    return { direction: "no_data", progress };
  }
  const first = recent[0].weight_kg;
  const last = recent[recent.length - 1].weight_kg;
  const step = first * STEP;
  if (maintain) {
    const before = Math.abs(first - goalKg);
    const now = Math.abs(last - goalKg);
    return { direction: now <= goalKg * 0.02 || now < before - step ? "closer" : now > before + step ? "straying" : "holding", progress };
  }
  const toward = (first - last) * Math.sign(start - goalKg); // positive = moved toward the goal
  return { direction: toward >= step ? "closer" : toward <= -step ? "straying" : "holding", progress };
}

/** Rounded share, or null when the group is too small to describe. */
const share = (n: number, of: number) => (of >= MIN_GROUP ? Math.round(((n / of) * 100) / 5) * 5 : null);

export type OrgReport = {
  org: { id: string; name: string; industry: string | null; plan: string; status: string; eligible: number; inviteCode: string; createdAt: string };
  sample: boolean;
  enrolled: number;
  enrollmentRate: number | null;
  /** True when fewer than MIN_GROUP members have joined: every health-derived view is withheld. */
  suppressed: boolean;
  activePct: number | null;
  wellnessIndex: number | null;
  directions: { id: Direction; label: string; pct: number | null }[];
  trend: { label: string; closer: number | null; holding: number | null; straying: number | null; noData: number | null; enrolled: number; suppressed: boolean }[];
  plansDelivered30: number | null;
  plansDeliveredAll: number | null;
  monthlyBillCents: number;
};

const monthEnds = (n: number) => {
  const out: { label: string; at: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = i === 0 ? now : new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    out.push({ label: d.toLocaleDateString("en-US", { month: "short", year: i === 0 || d.getMonth() === 0 ? "2-digit" : undefined }), at: d.getTime() });
  }
  return out;
};

export type OrgRow = { id: string; name: string; industry: string | null; plan: string; status: string; eligible_count: number; invite_code: string; created_at: string };

export function getOrgForManager(userId: string) {
  return db()
    .prepare("SELECT o.* FROM organizations o JOIN org_admins a ON a.org_id = o.id WHERE a.user_id = ?")
    .get(userId) as OrgRow | undefined;
}

export function getOrgByCode(code: string) {
  return db().prepare("SELECT * FROM organizations WHERE invite_code = ? AND status != 'paused'").get(code.trim().toUpperCase()) as OrgRow | undefined;
}

/** The member's organization, if they joined one (shown only to the member themself). */
export function memberOrg(userId: string) {
  return db()
    .prepare("SELECT o.id, o.name, e.joined_at FROM org_enrollments e JOIN organizations o ON o.id = e.org_id WHERE e.user_id = ?")
    .get(userId) as { id: string; name: string; joined_at: string } | undefined;
}

export function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    if (!db().prepare("SELECT 1 FROM organizations WHERE invite_code = ?").get(code)) return code;
  }
}

export function createOrganization(opts: { name: string; industry: string | null; eligible: number; plan: string; managerId: string; title: string | null }) {
  const id = newId();
  const now = nowIso();
  db().transaction(() => {
    db()
      .prepare("INSERT INTO organizations (id, name, industry, eligible_count, plan, status, invite_code, created_by, created_at) VALUES (?, ?, ?, ?, ?, 'pilot', ?, ?, ?)")
      .run(id, opts.name, opts.industry, opts.eligible, opts.plan, inviteCode(), opts.managerId, now);
    db().prepare("INSERT INTO org_admins (org_id, user_id, title, created_at) VALUES (?, ?, ?, ?)").run(id, opts.managerId, opts.title, now);
  })();
  return id;
}

/** Build the organization's de-identified report. Only aggregates are returned. */
export function orgReport(org: OrgRow, opts: { sample?: boolean } = {}): OrgReport {
  if (opts.sample) return sampleReport(org);
  const conn = db();
  const members = conn
    .prepare(
      `SELECT e.user_id, e.joined_at, p.weight_kg AS start_kg, p.desired_weight_kg AS goal_kg
       FROM org_enrollments e JOIN users u ON u.id = e.user_id AND u.role = 'member'
       LEFT JOIN profiles p ON p.user_id = e.user_id
       WHERE e.org_id = ?`,
    )
    .all(org.id) as { user_id: string; joined_at: string; start_kg: number | null; goal_kg: number | null }[];
  const enrolled = members.length;
  const suppressed = enrolled < MIN_GROUP;
  const base = {
    org: { id: org.id, name: org.name, industry: org.industry, plan: org.plan, status: org.status, eligible: org.eligible_count, inviteCode: org.invite_code, createdAt: org.created_at },
    sample: false,
    enrolled,
    enrollmentRate: org.eligible_count ? Math.round((enrolled / org.eligible_count) * 100) : null,
    suppressed,
    monthlyBillCents: monthlyBill(org.plan, enrolled),
  };
  if (suppressed) {
    return {
      ...base,
      activePct: null,
      wellnessIndex: null,
      directions: (Object.keys(DIRECTION_LABEL) as Direction[]).map((id) => ({ id, label: DIRECTION_LABEL[id], pct: null })),
      trend: monthEnds(6).map((m) => ({ label: m.label, closer: null, holding: null, straying: null, noData: null, enrolled: 0, suppressed: true })),
      plansDelivered30: null,
      plansDeliveredAll: null,
    };
  }

  const ids = members.map((m) => m.user_id);
  const marks = ids.map(() => "?").join(",");
  const weighIns = conn
    .prepare(`SELECT user_id, logged_on, weight_kg FROM weigh_ins WHERE user_id IN (${marks}) ORDER BY logged_on`)
    .all(...ids) as WeighIn[];
  const byUser = new Map<string, WeighIn[]>();
  for (const w of weighIns) byUser.set(w.user_id, [...(byUser.get(w.user_id) ?? []), w]);

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const active = new Set<string>();
  for (const w of weighIns) if (Date.parse(w.logged_on) >= now - 30 * DAY) active.add(w.user_id);
  for (const r of conn.prepare(`SELECT DISTINCT user_id FROM tickets WHERE user_id IN (${marks}) AND created_at >= ?`).all(...ids, since30) as { user_id: string }[]) active.add(r.user_id);
  for (const r of conn.prepare(`SELECT DISTINCT user_id FROM nutrition_days WHERE user_id IN (${marks}) AND day >= ?`).all(...ids, since30.slice(0, 10)) as { user_id: string }[]) active.add(r.user_id);

  const assessAt = (at: number, cohort: typeof members) => {
    const counts: Record<Direction, number> = { closer: 0, holding: 0, straying: 0, no_data: 0 };
    const progress: number[] = [];
    for (const m of cohort) {
      const firstW = byUser.get(m.user_id)?.[0]?.weight_kg ?? null;
      const a = assess(byUser.get(m.user_id) ?? [], firstW ?? m.start_kg, m.goal_kg, at);
      counts[a.direction]++;
      if (a.progress != null) progress.push(a.progress);
    }
    return { counts, progress };
  };

  const nowAssess = assessAt(now, members);
  const plans = (since: string | null) =>
    (conn
      .prepare(`SELECT COUNT(*) AS n FROM ticket_responses r JOIN tickets t ON t.id = r.ticket_id WHERE t.user_id IN (${marks})${since ? " AND r.created_at >= ?" : ""}`)
      .get(...ids, ...(since ? [since] : [])) as { n: number }).n;

  return {
    ...base,
    activePct: share(active.size, enrolled),
    wellnessIndex: nowAssess.progress.length >= MIN_GROUP ? Math.round((nowAssess.progress.reduce((a, b) => a + b, 0) / nowAssess.progress.length) * 100) : null,
    directions: (Object.keys(DIRECTION_LABEL) as Direction[]).map((id) => ({ id, label: DIRECTION_LABEL[id], pct: share(nowAssess.counts[id], enrolled) })),
    trend: monthEnds(6).map((m) => {
      const cohort = members.filter((x) => Date.parse(x.joined_at) <= m.at);
      const small = cohort.length < MIN_GROUP;
      const c = small ? null : assessAt(m.at, cohort).counts;
      return {
        label: m.label,
        enrolled: small ? 0 : cohort.length,
        suppressed: small,
        closer: c && share(c.closer, cohort.length),
        holding: c && share(c.holding, cohort.length),
        straying: c && share(c.straying, cohort.length),
        noData: c && share(c.no_data, cohort.length),
      };
    }),
    plansDelivered30: plans(since30),
    plansDeliveredAll: plans(null),
  };
}

/** Illustrative numbers for demos and investor walkthroughs. Clearly labeled; never mixed with real data. */
function sampleReport(org: OrgRow): OrgReport {
  const eligible = org.eligible_count || 1200;
  const enrolled = Math.round(eligible * 0.38);
  const trend = [
    [40, 30, 15, 15],
    [45, 30, 15, 10],
    [50, 25, 15, 10],
    [55, 25, 10, 10],
    [55, 25, 10, 10],
    [60, 25, 10, 5],
  ];
  return {
    org: { id: org.id, name: org.name, industry: org.industry, plan: org.plan, status: org.status, eligible, inviteCode: org.invite_code, createdAt: org.created_at },
    sample: true,
    enrolled,
    enrollmentRate: 38,
    suppressed: false,
    activePct: 70,
    wellnessIndex: 46,
    directions: [
      { id: "closer", label: DIRECTION_LABEL.closer, pct: 60 },
      { id: "holding", label: DIRECTION_LABEL.holding, pct: 25 },
      { id: "straying", label: DIRECTION_LABEL.straying, pct: 10 },
      { id: "no_data", label: DIRECTION_LABEL.no_data, pct: 5 },
    ],
    trend: monthEnds(6).map((m, i) => ({
      label: m.label,
      enrolled: Math.round(enrolled * (0.55 + i * 0.09)),
      suppressed: false,
      closer: trend[i][0],
      holding: trend[i][1],
      straying: trend[i][2],
      noData: trend[i][3],
    })),
    plansDelivered30: Math.round(enrolled * tierById(org.plan).plansPerYear * 0.7 / 12),
    plansDeliveredAll: Math.round(enrolled * tierById(org.plan).plansPerYear * 0.7 / 2),
    monthlyBillCents: monthlyBill(org.plan, enrolled),
  };
}

/** For NutriGoal management: every organization with enrollment and its monthly bill (no member detail). */
export function listOrganizations() {
  const rows = db()
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM org_enrollments e WHERE e.org_id = o.id) AS enrolled,
              (SELECT u.name FROM org_admins a JOIN users u ON u.id = a.user_id WHERE a.org_id = o.id ORDER BY a.created_at LIMIT 1) AS admin_name,
              (SELECT u.email FROM org_admins a JOIN users u ON u.id = a.user_id WHERE a.org_id = o.id ORDER BY a.created_at LIMIT 1) AS admin_email
       FROM organizations o ORDER BY o.created_at DESC`,
    )
    .all() as (OrgRow & { enrolled: number; admin_name: string | null; admin_email: string | null })[];
  return rows.map((r) => ({ ...r, monthlyBillCents: r.status === "paused" ? 0 : monthlyBill(r.plan, r.enrolled) }));
}
