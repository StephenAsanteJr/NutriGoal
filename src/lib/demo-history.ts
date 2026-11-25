// Generated demo history for the analytics dashboards: a 30-person clinician roster (the 4 seeded
// clinicians plus 26 generated) and about five months of members, tickets, responses, ratings,
// referrals, subscriptions and payments. Every generated person is flagged users.demo_history = 1
// (dashboards can exclude them) and has no usable password.
// Deterministic (seeded), so every copy of the demo gets the same numbers.
import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { referralCode } from "./referrals";

const CLIN_FIRST = ["Amara", "Daniel", "Sofia", "Kwame", "Hannah", "Mateo", "Priyanka", "Owen", "Leila", "Marcus", "Grace", "Tomas", "Ifeoma", "Ethan", "Yuki", "Rachel", "Andre", "Nadia", "Victor", "Chloe", "Samuel", "Imani", "Lucas", "Mei", "Gabriel", "Zara"];
const CLIN_LAST = ["Adeyemi", "Fischer", "Romero", "Asante", "Lindqvist", "Delgado", "Iyer", "Gallagher", "Haddad", "Whitfield", "Osei", "Marquez", "Eze", "Brennan", "Tanaka", "Goldberg", "Baptiste", "Rahman", "Petrov", "Dubois", "Achebe", "Coleman", "Ferreira", "Zhou", "Santos", "Malik"];
/** [clinician_type, credential shown to members, share of the generated roster] */
const ROSTER: ["MD" | "RD", string, number][] = [
  ["MD", "MD, Internal Medicine", 0.15],
  ["MD", "MD, Obesity Medicine", 0.12],
  ["MD", "DO, Family Medicine", 0.1],
  ["RD", "RD, LDN", 0.25],
  ["RD", "RD, CDCES", 0.13],
  ["RD", "CNS, Certified Nutrition Specialist", 0.12],
  ["RD", "Licensed Nutritionist", 0.13],
];
const FIRST = ["Avery", "Jordan", "Riley", "Morgan", "Casey", "Taylor", "Quinn", "Jamie", "Drew", "Sam", "Alex", "Robin", "Kendall", "Reese", "Skyler", "Dana", "Hayden", "Logan", "Parker", "Rowan", "Sasha", "Emerson", "Blake", "Cameron", "Jesse", "Kai", "Noel", "Sidney", "Tatum", "Wren"];
const LAST = ["Nguyen", "Patel", "Garcia", "Johnson", "Kim", "Okoro", "Silva", "Brooks", "Chen", "Rivera", "Mensah", "Cohen", "Ali", "Moreau", "Novak", "Haddad", "Ortiz", "Bell", "Sato", "Reyes"];
const GOALS: [string, string][] = [
  ["fat_loss", "Lose 15 lb before summer without feeling starved"],
  ["muscle_gain", "Put on lean muscle while training four days a week"],
  ["protein", "Hit my protein target on busy workdays"],
  ["blood_sugar", "Bring my A1C down before my next checkup"],
  ["heart_health", "Lower my LDL with food first"],
  ["glp1_side_effects", "Eat enough on a GLP-1 without nausea"],
  ["keep_weight_off", "Keep the weight off after coming off my medication"],
  ["budget_meals", "Eat healthier for under $80 a week"],
];
const PRAISE = ["Clear and doable.", "Exactly what I needed.", "Very practical steps.", "Helped me plan my week.", "Straight to the point, thank you."];
const CRITIQUE = ["Wish it had more snack ideas.", "A little generic for my situation.", "Hard to fit around my shift work.", "Hoped for more detail on portions."];

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoHistory(conn: Database.Database) {
  if (conn.prepare("SELECT 1 FROM users WHERE demo_history = 1 LIMIT 1").get()) return;
  const seeded = conn
    .prepare("SELECT id, clinician_type FROM users WHERE role = 'clinician' AND email LIKE '%@nutrigoal.test' ORDER BY email")
    .all() as { id: string; clinician_type: string }[];
  if (!seeded.length) return;

  const r = prng(20261125);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
  const between = (a: number, b: number) => a + r() * (b - a);
  const DAY = 86400_000;
  const HOUR = 3600_000;
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const id = () => crypto.randomUUID();
  const noLogin = bcrypt.hashSync(crypto.randomBytes(24).toString("hex"), 8);

  // 26 generated clinicians, so the roster is 30. Most are part-time: 3–9 tickets a week.
  const insClinician = conn.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, clinician_type, credential, specialties, bio, onboarding_complete, staff_status, license_info, created_at, referral_code, weekly_capacity, demo_history)
     VALUES (?, ?, ?, ?, 'clinician', ?, ?, ?, ?, 1, 'active', ?, ?, ?, ?, 1)`,
  );
  const goalIds = GOALS.map(([g]) => g);
  const clinicians: { id: string; clinician_type: string; capacity: number }[] = seeded.map((c) => ({ ...c, capacity: 12 }));
  for (let i = 0; i < 26; i++) {
    let roll = r();
    const [type, credential] = ROSTER.find(([, , share]) => (roll -= share) < 0) ?? ROSTER[3];
    const isDoctor = credential.startsWith("MD") || credential.startsWith("DO");
    const name = `${isDoctor ? "Dr. " : ""}${CLIN_FIRST[i]} ${CLIN_LAST[i]}`;
    const specialties = [...goalIds].sort(() => r() - 0.5).slice(0, 2 + Math.floor(r() * 2));
    const capacity = Math.round(between(3, 9));
    const cid = id();
    insClinician.run(
      cid, `demo.clinician${i + 1}@nutrigoal.test`, noLogin, name, type, credential, JSON.stringify(specialties),
      `${credential.split(",")[0]} focused on ${specialties.map((g) => g.replace(/_/g, " ")).join(" and ")}.`,
      JSON.stringify({ license: `DEMO-${100000 + i}`, state: pick(["CA", "NY", "TX", "IL", "WA", "GA", "MA", "CO"]), npi: null }),
      iso(now - between(150, 400) * DAY), referralCode(name), capacity,
    );
    clinicians.push({ id: cid, clinician_type: type, capacity });
  }
  // Assign tickets in proportion to each clinician's weekly capacity.
  const totalCapacity = clinicians.reduce((n, c) => n + c.capacity, 0);
  const pickClinician = () => {
    let x = r() * totalCapacity;
    for (const c of clinicians) if ((x -= c.capacity) < 0) return c;
    return clinicians[clinicians.length - 1];
  };

  const insUser = conn.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, onboarding_complete, created_at, demo_history, referred_by) VALUES (?, ?, ?, ?, 'member', 1, ?, 1, ?)",
  );
  const insProfile = conn.prepare(
    `INSERT INTO profiles (user_id, unit_system, sex, age, height_cm, weight_kg, body_fat_pct, meals_per_day, workout_min_per_day, desired_weight_kg, desired_body_fat_pct, timeframe_weeks, source, updated_at)
     VALUES (?, 'imperial', ?, ?, ?, ?, ?, 3, ?, ?, ?, ?, 'manual', ?)`,
  );
  const insSub = conn.prepare(
    "INSERT INTO subscriptions (id, user_id, plan, status, price_cents, started_at, renews_at, ticket_credits, credits_reset_at, canceled_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
  );
  const insPay = conn.prepare(
    "INSERT INTO payments (id, user_id, kind, description, amount_cents, card_brand, card_last4, ticket_id, status, created_at, provider) VALUES (?, ?, ?, ?, ?, 'Visa', '4242', ?, 'succeeded', ?, 'demo')",
  );
  const insTicket = conn.prepare(
    `INSERT INTO tickets (user_id, goal_type, goal_statement, typical_diet, setbacks, specific_target, status, payment_method, routing_reason, assigned_clinician_id, created_at, paid_at, assigned_at, due_at, responded_at, member_seen_at)
     VALUES (?, ?, ?, 'Mostly home cooking, takeout twice a week.', 'Long workdays and late dinners.', 'A measurable change in 8–12 weeks.', ?, ?, 'Matched by goal type and clinician load (demo history).', ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insResponse = conn.prepare(
    "INSERT INTO ticket_responses (id, ticket_id, clinician_id, recommendation, steps_json, ai_assist, created_at, rating, rating_comment, rated_at) VALUES (?, ?, ?, ?, ?, 'none', ?, ?, ?, ?)",
  );
  const insNudge = conn.prepare("INSERT INTO nudges (id, ticket_id, member_id, clinician_id, source, message, created_at) VALUES (?, ?, ?, ?, 'member', 'Checking in on my plan.', ?)");
  const steps = JSON.stringify(
    ["Anchor each meal with protein", "Plan two backup meals", "Walk after dinner", "Weigh in twice a week", "Send a follow-up ticket"].map((title, i) => ({
      title,
      detail: "Demo history step.",
      timeframe: ["Week 1", "Weeks 1–2", "Weeks 2–4", "Ongoing", "Month 2"][i],
    })),
  );

  const ticketFor = (userId: string, at: number, method: string, refClinician: string | null) => {
    if (at > now - 2 * HOUR) return null;
    const [goal, statement] = pick(GOALS);
    const clinician = refClinician && r() < 0.6 ? clinicians.find((c) => c.id === refClinician)! : pickClinician();
    const paid = at + between(2, 30) * 60_000;
    const due = paid + 48 * HOUR;
    let hours = between(3, 30);
    const roll = r();
    if (roll > 0.9) hours = between(48, 70); // a few miss the 48-hour promise
    else if (roll > 0.7) hours = between(30, 47);
    const responded = paid + hours * HOUR;
    const open = responded > now;
    const info = insTicket.run(
      userId, goal, statement, open ? (r() < 0.5 ? "in_review" : "assigned") : "responded", method, clinician.id,
      iso(at), iso(paid), iso(paid + 60_000), iso(due), open ? null : iso(responded), open ? null : iso(responded + between(1, 30) * HOUR),
    );
    const ticketId = Number(info.lastInsertRowid);
    if (!open) {
      const rated = r() < 0.72;
      const q = r();
      const rating = q < 0.56 ? 5 : q < 0.86 ? 4 : q < 0.96 ? 3 : q < 0.99 ? 2 : 1;
      const ratedAt = responded + between(2, 96) * HOUR;
      insResponse.run(id(), ticketId, clinician.id, "Demo history recommendation.", steps, iso(responded),
        rated && ratedAt < now ? rating : null, rated && ratedAt < now && r() < 0.35 ? pick(rating >= 4 ? PRAISE : CRITIQUE) : null, rated && ratedAt < now ? iso(ratedAt) : null);
    }
    if (hours > 36 && r() < 0.6) insNudge.run(id(), ticketId, userId, clinician.id, iso(paid + 30 * HOUR));
    return ticketId;
  };

  for (let i = 0; i < 900; i++) {
    const userId = id();
    const joined = now - between(2, 165) * DAY;
    const sex = r() < 0.52 ? "female" : "male";
    const height = sex === "male" ? between(168, 192) : between(155, 178);
    const weight = sex === "male" ? between(78, 125) : between(60, 110);
    const referrer = r() < 0.25 ? pickClinician().id : null;
    insUser.run(userId, `demo.member${i + 1}@nutrigoal.test`, noLogin, `${pick(FIRST)} ${pick(LAST)}`, iso(joined), referrer);
    insProfile.run(userId, sex, Math.round(between(24, 64)), height, weight, between(sex === "male" ? 18 : 24, sex === "male" ? 34 : 42), Math.round(between(10, 60)), weight * 0.88, between(15, 28), Math.round(between(12, 30)), iso(joined));

    const plan = r();
    const start = joined + between(0, 3) * DAY;
    if (plan < 0.34) {
      // Monthly member: pays each month until now or until they cancel; ~1 ticket a month.
      const cancels = r() < 0.3;
      const months = Math.max(1, Math.floor((now - start) / (30 * DAY)) + 1);
      const keep = cancels ? Math.max(1, Math.min(months, Math.round(between(1, 4)))) : months;
      const canceledAt = cancels && keep < months ? start + keep * 30 * DAY - between(1, 10) * DAY : null;
      insSub.run(id(), userId, "monthly", canceledAt ? "canceled" : "active", 2999, iso(start), iso(start + keep * 30 * DAY), iso(start + keep * 30 * DAY), canceledAt ? iso(canceledAt) : null);
      for (let m = 0; m < keep; m++) {
        const at = start + m * 30 * DAY;
        if (at > now) break;
        insPay.run(id(), userId, "subscription_monthly", "NutriGoal membership (monthly)", 2999, null, iso(at));
        if (r() < 0.8) ticketFor(userId, at + between(1, 20) * DAY, "subscription", referrer);
        if (r() < 0.12) {
          const extraAt = at + between(5, 28) * DAY;
          const t = ticketFor(userId, extraAt, "card", referrer);
          if (t) insPay.run(id(), userId, "ticket_member_extra", "Extra goal ticket (member price)", 1499, t, iso(extraAt + 60_000));
        }
      }
    } else if (plan < 0.42) {
      insSub.run(id(), userId, "yearly", "active", 30000, iso(start), iso(start + 365 * DAY), iso(start + 30 * DAY), null);
      insPay.run(id(), userId, "subscription_yearly", "NutriGoal membership (annual)", 30000, null, iso(start));
      const n = Math.max(1, Math.floor((now - start) / (35 * DAY)));
      for (let k = 0; k < n; k++) ticketFor(userId, start + (k + between(0.1, 0.9)) * 35 * DAY, "subscription", referrer);
    } else if (plan < 0.82) {
      // Pay-per-ticket: one or two tickets.
      const n = r() < 0.7 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const at = start + between(0, 40) * DAY + k * between(20, 50) * DAY;
        const t = ticketFor(userId, at, "card", referrer);
        if (t) insPay.run(id(), userId, "ticket", "Goal ticket (one-time)", 1999, t, iso(at + 60_000));
      }
    }
    // The remaining ~18% signed up and built a profile but haven't bought anything yet.
  }
}
