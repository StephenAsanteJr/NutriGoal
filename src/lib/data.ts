import "server-only";
import { cleanFoods } from "./foods";
import { db, newId, nowIso } from "./db";
import type { BuildInput, Sex } from "./biometrics";
import type { User } from "./auth";
import { DEFAULT_SETTINGS, type Settings } from "./domain";

// ---------- Profiles ----------
export type ProfileRow = {
  user_id: string;
  unit_system: "imperial" | "metric";
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  meals_per_day: number | null;
  est_calories: number | null;
  workout_min_per_day: number | null;
  desired_weight_kg: number | null;
  desired_body_fat_pct: number | null;
  timeframe_weeks: number | null;
  medication_stage: string | null;
  systolic: number | null;
  diastolic: number | null;
  a1c: number | null;
  fasting_glucose: number | null;
  total_cholesterol: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides: number | null;
  vitamin_d: number | null;
  conditions: string | null;
  source: string;
  updated_at: string;
};

export function getProfile(userId: string) {
  return (db().prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId) as ProfileRow | undefined) ?? null;
}

export function toBuildInput(p: ProfileRow | null): BuildInput | null {
  if (!p || !p.sex || !p.age || !p.height_cm || !p.weight_kg) return null;
  return {
    sex: p.sex,
    age: p.age,
    heightCm: p.height_cm,
    weightKg: p.weight_kg,
    bodyFatPct: p.body_fat_pct,
    mealsPerDay: p.meals_per_day,
    estCalories: p.est_calories,
    workoutMinPerDay: p.workout_min_per_day,
    desiredWeightKg: p.desired_weight_kg,
    desiredBodyFatPct: p.desired_body_fat_pct,
    timeframeWeeks: p.timeframe_weeks,
    systolic: p.systolic,
    diastolic: p.diastolic,
    a1c: p.a1c,
    fastingGlucose: p.fasting_glucose,
    ldl: p.ldl,
    hdl: p.hdl,
    triglycerides: p.triglycerides,
    totalCholesterol: p.total_cholesterol,
    vitaminD: p.vitamin_d,
  };
}

// ---------- Medical reports ----------
export type ReportRow = {
  id: string;
  user_id: string;
  original_name: string;
  stored_name: string;
  mime: string;
  size_bytes: number;
  provider: string | null;
  report_date: string | null;
  extracted_json: string | null;
  extraction_note: string | null;
  uploaded_at: string;
};

export function listReports(userId: string) {
  return db()
    .prepare("SELECT * FROM medical_reports WHERE user_id = ? ORDER BY uploaded_at DESC")
    .all(userId) as ReportRow[];
}

// ---------- Subscriptions ----------
export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: "monthly" | "yearly";
  status: string;
  price_cents: number;
  started_at: string;
  renews_at: string;
  ticket_credits: number;
  credits_reset_at: string;
};

const addMonth = (iso: string) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
};

/** Active subscription, with the monthly ticket credit topped up when a new month starts. */
export function getActiveSubscription(userId: string) {
  const sub = db()
    .prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1")
    .get(userId) as SubscriptionRow | undefined;
  if (!sub) return null;
  if (new Date(sub.credits_reset_at) <= new Date()) {
    let next = sub.credits_reset_at;
    while (new Date(next) <= new Date()) next = addMonth(next);
    db().prepare("UPDATE subscriptions SET ticket_credits = 1, credits_reset_at = ? WHERE id = ?").run(next, sub.id);
    sub.ticket_credits = 1;
    sub.credits_reset_at = next;
  }
  return sub;
}

// ---------- Tickets ----------
export type TicketRow = {
  id: number;
  user_id: string;
  goal_type: string;
  goal_statement: string;
  typical_diet: string;
  setbacks: string;
  specific_target: string;
  extra_context: string | null;
  status: "awaiting_payment" | "assigned" | "in_review" | "responded";
  payment_method: string | null;
  goal_group: string | null;
  routing_reason: string | null;
  assigned_clinician_id: string | null;
  created_at: string;
  paid_at: string | null;
  assigned_at: string | null;
  due_at: string | null;
  responded_at: string | null;
  member_seen_at: string | null;
};

export type TicketWithPeople = TicketRow & {
  member_name: string;
  member_email: string;
  clinician_name: string | null;
  clinician_credential: string | null;
  clinician_type: string | null;
};

const TICKET_SELECT = `
  SELECT t.*, m.name AS member_name, m.email AS member_email,
         c.name AS clinician_name, c.credential AS clinician_credential, c.clinician_type AS clinician_type
  FROM tickets t
  JOIN users m ON m.id = t.user_id
  LEFT JOIN users c ON c.id = t.assigned_clinician_id`;

export function listTicketsForMember(userId: string) {
  return db().prepare(`${TICKET_SELECT} WHERE t.user_id = ? ORDER BY t.created_at DESC`).all(userId) as TicketWithPeople[];
}

export function getTicket(id: number) {
  return (db().prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(id) as TicketWithPeople | undefined) ?? null;
}

export function listTicketsForStaff(opts: { clinicianId?: string; status?: string[] } = {}) {
  const where: string[] = ["t.status != 'awaiting_payment'"];
  const params: unknown[] = [];
  if (opts.clinicianId) {
    where.push("t.assigned_clinician_id = ?");
    params.push(opts.clinicianId);
  }
  if (opts.status?.length) {
    where.push(`t.status IN (${opts.status.map(() => "?").join(",")})`);
    params.push(...opts.status);
  }
  return db()
    .prepare(
      `${TICKET_SELECT} WHERE ${where.join(" AND ")}
       ORDER BY CASE t.status WHEN 'responded' THEN 1 ELSE 0 END, t.due_at ASC, t.created_at DESC`,
    )
    .all(...params) as TicketWithPeople[];
}

export type Step = { title: string; detail: string; timeframe: string };
export type ResponseRow = {
  id: string;
  ticket_id: number;
  clinician_id: string;
  recommendation: string;
  steps_json: string;
  ai_assist: "none" | "wording";
  foods_json: string | null;
  rating: number | null;
  rating_comment: string | null;
  rated_at: string | null;
  created_at: string;
  clinician_name: string;
  clinician_credential: string | null;
  clinician_type: string | null;
};

export function getResponse(ticketId: number) {
  const row = db()
    .prepare(
      `SELECT r.*, u.name AS clinician_name, u.credential AS clinician_credential, u.clinician_type AS clinician_type
       FROM ticket_responses r JOIN users u ON u.id = r.clinician_id WHERE r.ticket_id = ?`,
    )
    .get(ticketId) as ResponseRow | undefined;
  if (!row) return null;
  return { ...row, steps: JSON.parse(row.steps_json) as Step[], foods: row.foods_json ? cleanFoods(JSON.parse(row.foods_json)) : null };
}

// ---------- Staff ----------
export function listClinicians() {
  return db()
    .prepare(
      `SELECT u.*, (SELECT COUNT(*) FROM tickets t WHERE t.assigned_clinician_id = u.id AND t.status IN ('assigned','in_review')) AS open_count,
              (SELECT COUNT(*) FROM tickets t WHERE t.assigned_clinician_id = u.id AND t.status = 'responded') AS done_count
       FROM users u WHERE u.role = 'clinician' AND u.staff_status = 'active' ORDER BY u.name`,
    )
    .all() as (User & { open_count: number; done_count: number })[];
}

export function listMembersWithProfiles() {
  return db()
    .prepare(
      `SELECT u.id, u.name, u.email, u.created_at, u.onboarding_complete, p.*,
              (SELECT COUNT(*) FROM tickets t WHERE t.user_id = u.id AND t.status != 'awaiting_payment') AS ticket_count,
              (SELECT COUNT(*) FROM medical_reports r WHERE r.user_id = u.id) AS report_count,
              (SELECT plan FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' LIMIT 1) AS plan
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.role = 'member' ORDER BY COALESCE(p.updated_at, u.created_at) DESC`,
    )
    .all() as (ProfileRow & {
    id: string;
    name: string;
    email: string;
    created_at: string;
    onboarding_complete: number;
    ticket_count: number;
    report_count: number;
    plan: string | null;
  })[];
}

export function getUserById(id: string) {
  return (db()
    .prepare(
      "SELECT id, email, name, role, clinician_type, credential, specialties, bio, onboarding_complete, created_at, staff_status FROM users WHERE id = ?",
    )
    .get(id) as User | undefined) ?? null;
}

export function listStaffNotes(memberId: string) {
  return db()
    .prepare(
      `SELECT n.*, u.name AS author_name, u.credential AS author_credential FROM staff_notes n
       JOIN users u ON u.id = n.author_id WHERE n.member_id = ? ORDER BY n.created_at DESC`,
    )
    .all(memberId) as { id: string; body: string; created_at: string; author_name: string; author_credential: string | null }[];
}

// ---------- Notifications ----------
export function notify(userId: string, title: string, body: string, link?: string) {
  db()
    .prepare("INSERT INTO notifications (id, user_id, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(newId(), userId, title, body, link ?? null, nowIso());
}

export function listNotifications(userId: string, limit = 20) {
  return db()
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string }[];
}

export function unreadCount(userId: string) {
  return (db().prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(userId) as { n: number }).n;
}

// ---------- Marketplace ----------
export type PartnerRow = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  verification: string;
  verified_on: string;
  location: string;
  tags: string[];
  offer: string | null;
  rating: number | null;
  goal_types: string[];
  connected: boolean;
  kind: "partner" | "national";
  website: string | null;
  rank_note: string | null;
  sort_rank: number;
};

export function listPartners(userId: string) {
  const rows = db()
    .prepare(
      `SELECT p.*, EXISTS(SELECT 1 FROM partner_connections c WHERE c.partner_id = p.id AND c.user_id = ?) AS connected
       FROM partners p ORDER BY p.category, p.sort_rank, p.rating DESC`,
    )
    .all(userId) as (Omit<PartnerRow, "tags" | "goal_types" | "connected"> & { tags: string; goal_types: string; connected: number })[];
  return rows.map((r) => ({
    ...r,
    tags: JSON.parse(r.tags) as string[],
    goal_types: JSON.parse(r.goal_types) as string[],
    connected: !!r.connected,
  })) as PartnerRow[];
}

export type AddonRow = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  interval: "month" | "once";
  partner_id: string | null;
  partner_name: string | null;
  included_with_membership: number;
  unlocked: number;
};

export function listAddons(userId: string) {
  return db()
    .prepare(
      `SELECT a.*, p.name AS partner_name,
              EXISTS(SELECT 1 FROM user_addons ua WHERE ua.addon_id = a.id AND ua.user_id = ?) AS unlocked
       FROM addons a LEFT JOIN partners p ON p.id = a.partner_id ORDER BY a.sort`,
    )
    .all(userId) as AddonRow[];
}

export function getAddon(id: string) {
  return (db().prepare("SELECT * FROM addons WHERE id = ?").get(id) as Omit<AddonRow, "unlocked" | "partner_name"> | undefined) ?? null;
}

// ---------- Settings ----------
const BOOL_KEYS = [
  "nudges_enabled",
  "channel_push",
  "channel_email",
  "channel_sms",
  "share_progress_with_clinician",
  "insights_opt_in",
  "voice_mode",
  "assistant_enabled",
] as const;

export function getSettings(userId: string): Settings {
  const row = db().prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId) as Record<string, unknown> | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (row[k] !== undefined && row[k] !== null) out[k] = row[k];
  out.calorie_goal_override = (row.calorie_goal_override as number | null) ?? null;
  for (const k of BOOL_KEYS) out[k] = !!row[k];
  try {
    out.meal_names = JSON.parse(String(row.meal_names));
  } catch {
    out.meal_names = DEFAULT_SETTINGS.meal_names;
  }
  return out as Settings;
}

export function saveSettings(userId: string, patch: Partial<Settings>) {
  const merged = { ...getSettings(userId), ...patch };
  const row: Record<string, unknown> = { ...merged, user_id: userId, updated_at: nowIso() };
  for (const k of BOOL_KEYS) row[k] = merged[k] ? 1 : 0;
  row.meal_names = JSON.stringify(merged.meal_names);
  const cols = Object.keys(row);
  db()
    .prepare(
      `INSERT INTO user_settings (${cols.join(", ")}) VALUES (${cols.map((c) => "@" + c).join(", ")})
       ON CONFLICT(user_id) DO UPDATE SET ${cols.filter((c) => c !== "user_id").map((c) => `${c} = excluded.${c}`).join(", ")}`,
    )
    .run(row);
  return merged;
}

// ---------- Progress ----------
export type WeighIn = {
  id: string;
  user_id: string;
  logged_on: string;
  weight_kg: number;
  body_fat_pct: number | null;
  waist_cm: number | null;
  note: string | null;
  created_at: string;
};

export function listWeighIns(userId: string) {
  return db()
    .prepare("SELECT * FROM weigh_ins WHERE user_id = ? ORDER BY logged_on ASC, created_at ASC")
    .all(userId) as WeighIn[];
}

export function addWeighIn(userId: string, w: { logged_on: string; weight_kg: number; body_fat_pct?: number | null; waist_cm?: number | null; note?: string | null }) {
  db()
    .prepare("INSERT INTO weigh_ins (id, user_id, logged_on, weight_kg, body_fat_pct, waist_cm, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(newId(), userId, w.logged_on, w.weight_kg, w.body_fat_pct ?? null, w.waist_cm ?? null, w.note ?? null, nowIso());
}

// ---------- Nudges ----------
export function listNudges(ticketId: number) {
  return db()
    .prepare("SELECT * FROM nudges WHERE ticket_id = ? ORDER BY created_at DESC")
    .all(ticketId) as { id: string; source: string; message: string | null; created_at: string }[];
}

export function nudgeCounts() {
  const rows = db()
    .prepare("SELECT ticket_id, COUNT(*) AS n, MAX(created_at) AS last FROM nudges GROUP BY ticket_id")
    .all() as { ticket_id: number; n: number; last: string }[];
  return new Map(rows.map((r) => [r.ticket_id, r]));
}
