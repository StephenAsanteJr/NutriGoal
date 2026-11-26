// NutriGoal mobile app API. Bearer tokens (scope "mobile") issued at /api/mobile/login.
// One file routes all mobile calls so the app's surface is easy to review.

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, nowIso } from "@/lib/db";
import type { User } from "@/lib/auth";
import { computeBuild, lbToKg } from "@/lib/biometrics";
import {
  addWeighIn, getActiveSubscription, getProfile, getResponse, getSettings, getTicket, listClinicians, listNotifications,
  listPartners, listTicketsForMember, listTicketsForStaff, nudgeCounts, toBuildInput, unreadCount, type TicketWithPeople,
} from "@/lib/data";
import { GOAL_TYPES, TICKET_STATUS, TRACKING_APPS, goalLabel, money, skinTone, ticketNumber } from "@/lib/domain";
import { hasMarketplaceAccess } from "@/lib/access";
import { getLocation, trainersNear } from "@/lib/trainers";
import { computeTrends } from "@/lib/integrations/trends";
import { createToken, json, preflight, redeemHandoff, revokeTokenByValue, userFromRequest } from "@/lib/integrations/tokens";
import { nudgeClinician } from "@/lib/nudges";
import { saveResponse, startReviewFor } from "@/lib/responses";
import { submitPaidTicket } from "@/lib/fulfillment";
import { runAgent, type ChatMessage } from "@/lib/agent";
import { runVoiceMode } from "@/lib/voice-mode";
import { rateResponseFor } from "@/lib/ratings";
import { publicOrigin } from "@/lib/origin";
import { enabledProviders } from "@/lib/oauth";
import { FOOD_GROUPS, examplesFor, foodGuide, macroTargets } from "@/lib/foods";
import { clinicianDashboard, financeDashboard, opsDashboard } from "@/lib/analytics";

type Ctx = { params: Promise<{ path: string[] }> };
const iso = (d: Date) => d.toISOString();

function ticketSummary(t: TicketWithPeople, nudges?: Map<number, { n: number }>) {
  return {
    id: t.id,
    number: ticketNumber(t.id),
    goal: t.goal_statement,
    goalType: goalLabel(t.goal_type),
    status: t.status,
    statusLabel: TICKET_STATUS[t.status]?.label ?? t.status,
    member: t.member_name,
    clinician: t.clinician_name ? `${t.clinician_name}, ${t.clinician_credential}` : null,
    dueAt: t.due_at,
    respondedAt: t.responded_at,
    nudges: nudges?.get(t.id)?.n ?? 0,
  };
}

/** Food guide for the app: servings per group, example foods with their match, and % match to targets. */
function guidePayload(g: ReturnType<typeof foodGuide>) {
  return {
    match: g.match,
    totals: g.totals,
    rows: g.rows.map((r) => ({
      id: r.group.id, label: r.group.label, hint: r.group.hint, servings: r.servings, typical: r.group.typical,
      examples: r.examples.map((e) => ({ name: e.name, serving: e.serving, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, match: Math.round(e.match * 100) })),
    })),
  };
}

async function home(user: User, origin: string) {
  const unread = unreadCount(user.id);
  if (user.role === "member") {
    const p = getProfile(user.id);
    const input = toBuildInput(p);
    const b = input ? computeBuild(input) : null;
    const s = getSettings(user.id);
    const sub = getActiveSubscription(user.id);
    const t = computeTrends(user.id, 7);
    return {
      role: "member",
      name: user.name,
      unread,
      units: p?.unit_system ?? "imperial",
      build: b && input ? {
        weightKg: input.weightKg, goalWeightKg: b.goalWeightKg, bodyFatPct: Math.round(b.bodyFatPct), goalBodyFatPct: Math.round(b.goalBodyFatPct),
        bmi: Math.round(b.bmi * 10) / 10, targetKcal: Math.round(s.calorie_goal_override ?? b.targetCalories), proteinG: b.proteinG, weeks: b.effectiveWeeks,
        sex: input.sex, heightCm: input.heightCm,
      } : null,
      look: { skin: skinTone(s.skin_tone).hex, skinShade: skinTone(s.skin_tone).shade, hairStyle: s.hair_style, hairColor: s.hair_color, facialHair: s.facial_hair },
      membership: sub ? { plan: sub.plan, credits: sub.ticket_credits } : null,
      marketplace: hasMarketplaceAccess(user.id),
      nutrition: t.current.length ? { avgKcal: t.averages.calories && Math.round(t.averages.calories), avgProtein: t.averages.protein_g && Math.round(t.averages.protein_g), insights: t.insights.slice(0, 3).map((i) => i.text) } : null,
      tickets: listTicketsForMember(user.id).filter((x) => x.status !== "awaiting_payment").slice(0, 5).map((x) => ticketSummary(x)),
      foodGuide: b ? guidePayload(foodGuide(macroTargets(Math.round(s.calorie_goal_override ?? b.targetCalories), { carbs: s.macro_carbs, protein: s.macro_protein, fat: s.macro_fat }))) : null,
      webUrl: origin,
    };
  }
  const nudges = nudgeCounts();
  if (user.role === "clinician") {
    const all = listTicketsForStaff({ clinicianId: user.id });
    const open = all.filter((x) => x.status !== "responded");
    return {
      role: "clinician", name: user.name, credential: user.credential, unread,
      counts: { open: open.length, dueSoon: open.filter((x) => x.due_at && new Date(x.due_at).getTime() - Date.now() < 12 * 3600_000).length, nudged: open.filter((x) => nudges.has(x.id)).length, responded: all.length - open.length },
      queue: open.map((x) => ticketSummary(x, nudges)),
      stats: (() => {
        const d = clinicianDashboard(user.id, "30d");
        return d && {
          utilization: Math.round(d.utilization.week), thisWeek: d.utilization.thisWeek, capacity: d.me.capacity,
          earnings: d.earnings.range, earningsAllTime: d.earnings.allTime, plans: d.earnings.responses,
          retention: d.retention.rate == null ? null : Math.round(d.retention.rate), retained: d.retention.retained, served: d.retention.served,
          rating: d.rating.avg == null ? null : Math.round(d.rating.avg * 100) / 100, ratings: d.rating.count,
          referralRate: d.referrals.rate == null ? null : Math.round(d.referrals.rate), referralSignups: d.referrals.signups, referralConverted: d.referrals.converted,
          referralLink: d.me.referralCode ? `${origin}/signup?ref=${d.me.referralCode}` : null,
        };
      })(),
    };
  }
  const all = listTicketsForStaff({});
  const open = all.filter((x) => x.status !== "responded");
  const revenue = (db().prepare("SELECT COALESCE(SUM(amount_cents),0) AS c FROM payments WHERE created_at >= ?").get(iso(new Date(Date.now() - 30 * 86400_000))) as { c: number }).c;
  return {
    role: "manager", name: user.name, unread,
    kpis: {
      open: open.length,
      dueSoon: open.filter((x) => x.due_at && new Date(x.due_at).getTime() - Date.now() < 12 * 3600_000).length,
      revenue30: money(revenue),
      members: (db().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'member'").get() as { n: number }).n,
    },
    clinicians: listClinicians().map((c) => ({ id: c.id, name: c.name, credential: c.credential, open: c.open_count, done: c.done_count })),
    queue: open.map((x) => ticketSummary(x, nudges)),
    dashboards: (() => {
      const f = { range: "30d" as const, clinician: null, goal: null, demo: true };
      const o = opsDashboard(f).kpis;
      const fin = financeDashboard(f).kpis;
      return {
        ops: { submitted: o.submitted.value, responded: o.responded.value, avgHours: o.avgHours.value == null ? null : Math.round(o.avgHours.value), sla: o.sla.value == null ? null : Math.round(o.sla.value), overdue: o.overdue, rating: o.rating.value == null ? null : Math.round(o.rating.value * 100) / 100, newMembers: o.newMembers, clinicians: o.activeClinicians },
        finance: { revenue: fin.revenue.value / 100, payouts: fin.payouts.value / 100, margin: fin.margin.value / 100, marginPct: fin.marginPct.value == null ? null : Math.round(fin.marginPct.value), mrr: Math.round(fin.mrr) / 100, activeSubs: fin.activeSubs, churn: fin.churn == null ? null : Math.round(fin.churn) },
      };
    })(),
  };
}

export async function GET(req: Request, ctx: Ctx) {
  const path = (await ctx.params).path.join("/");
  // Public: which "Continue with…" buttons the app should show.
  if (path === "auth/providers") return json({ providers: enabledProviders(), start: `${publicOrigin(req)}/auth/oauth` });
  const user = userFromRequest(req, "mobile");
  if (!user) return json({ error: "Please sign in again." }, 401);
  const origin = publicOrigin(req);

  if (path === "me") return json({ id: user.id, name: user.name, role: user.role, credential: user.credential });
  if (path === "home") return json(await home(user, origin));
  if (path === "foods") {
    // Catalog for clinicians picking example foods on a response (only foods with an 80%+ match).
    return json({ groups: FOOD_GROUPS.map((g) => ({ id: g.id, label: g.label, hint: g.hint, foods: examplesFor(g).map((e) => ({ name: e.name, serving: e.serving, match: Math.round(e.match * 100) })) })) });
  }

  if (path === "tickets") {
    const list = user.role === "member" ? listTicketsForMember(user.id).filter((x) => x.status !== "awaiting_payment") : listTicketsForStaff({ clinicianId: user.role === "clinician" ? user.id : undefined });
    return json({ tickets: list.map((x) => ticketSummary(x, nudgeCounts())) });
  }
  const m = path.match(/^tickets\/(\d+)$/);
  if (m) {
    const t = getTicket(Number(m[1]));
    if (!t || (user.role === "member" && t.user_id !== user.id) || (user.role === "clinician" && t.assigned_clinician_id !== user.id)) return json({ error: "Not found." }, 404);
    const r = getResponse(t.id);
    return json({
      ticket: { ...ticketSummary(t), typicalDiet: t.typical_diet, setbacks: t.setbacks, target: t.specific_target, extra: t.extra_context, routing: user.role === "member" ? null : t.routing_reason },
      response: r ? { recommendation: r.recommendation, steps: r.steps, clinician: `${r.clinician_name}, ${r.clinician_credential}`, aiAssist: r.ai_assist, foods: r.foods, rating: r.rating, ratingComment: r.rating_comment, at: r.created_at } : null,
      canRespond: user.role === "clinician" && t.status !== "responded",
    });
  }

  if (path === "marketplace") {
    if (user.role !== "member") return json({ error: "Members only." }, 403);
    if (!hasMarketplaceAccess(user.id)) return json({ locked: true });
    const loc = getLocation(user.id);
    const near = loc ? await trainersNear(user.id, loc) : null;
    const goals = new Set(listTicketsForMember(user.id).map((t) => t.goal_type));
    const partners = listPartners(user.id);
    return json({
      locked: false,
      location: loc ? { label: loc.label, radius: loc.radius } : null,
      trainers: near ? near.verified.slice(0, 6).map((t) => ({ id: t.id, name: t.name, certification: t.certification, specialty: t.specialty, miles: Math.round(t.miles * 10) / 10, price: t.price_cents ? money(t.price_cents) : null })) : [],
      apps: [...TRACKING_APPS].sort((a, b) => b.goals.filter((g) => goals.has(g)).length - a.goals.filter((g) => goals.has(g)).length).map((a) => ({ id: a.id, name: a.name, bestFor: a.bestFor, url: a.url })),
      national: ["grocer", "retailer", "pharmacy"].map((c) => ({ category: c, names: partners.filter((p) => p.kind === "national" && p.category === c).map((p) => p.name) })),
      partners: partners.filter((p) => p.kind !== "national").slice(0, 8).map((p) => ({ id: p.id, name: p.name, category: p.category, tagline: p.tagline, offer: p.offer, saved: p.connected })),
    });
  }

  if (path === "notifications") return json({ notifications: listNotifications(user.id, 40) });
  return json({ error: "Not found." }, 404);
}

const DraftSchema = z.object({
  goal_type: z.enum(GOAL_TYPES.map((g) => g.id) as [string, ...string[]]),
  goal_statement: z.string().trim().min(10).max(200),
  typical_diet: z.string().trim().min(10).max(1200),
  setbacks: z.string().trim().min(5).max(1200),
  specific_target: z.string().trim().min(5).max(300),
});

export async function POST(req: Request, ctx: Ctx) {
  const path = (await ctx.params).path.join("/");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const origin = publicOrigin(req);

  if (path === "login") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const row = db().prepare("SELECT id, password_hash, role, name, onboarding_complete, staff_status FROM users WHERE email = ?").get(email) as
      | { id: string; password_hash: string; role: string; name: string; onboarding_complete: number; staff_status: string }
      | undefined;
    if (!row || !(await bcrypt.compare(String(body.password ?? ""), row.password_hash))) return json({ error: "That email and password don't match an account." }, 401);
    if (row.role === "member" && !row.onboarding_complete) return json({ error: "Finish building your profile on the website first, then sign in here." }, 403);
    if (row.role !== "member" && row.staff_status !== "active") return json({ error: "Your account is waiting for approval by a NutriGoal manager." }, 403);
    return json({ token: createToken(row.id, "NutriGoal mobile app", "mobile"), user: { name: row.name, role: row.role } });
  }

  // App finished Google / Apple / SSO in the browser and holds a one-time code: trade it for an app token.
  if (path === "oauth/redeem") {
    const userId = redeemHandoff(String(body.code ?? ""));
    if (!userId) return json({ error: "That sign-in link expired. Please try again." }, 401);
    const row = db().prepare("SELECT id, role, name, onboarding_complete, staff_status FROM users WHERE id = ?").get(userId) as
      | { id: string; role: string; name: string; onboarding_complete: number; staff_status: string }
      | undefined;
    if (!row) return json({ error: "Account not found." }, 404);
    if (row.role !== "member" && row.staff_status !== "active") return json({ error: "Your account is waiting for approval by a NutriGoal manager." }, 403);
    if (row.role === "member" && !row.onboarding_complete) {
      const next = createToken(row.id, "Web handoff", "handoff");
      return json({ error: "Welcome! Build your profile on the website first, then come back to the app.", continueUrl: `${origin}/auth/handoff?code=${encodeURIComponent(next)}&next=%2Fonboarding` }, 403);
    }
    return json({ token: createToken(row.id, "NutriGoal mobile app", "mobile"), user: { name: row.name, role: row.role } });
  }

  const user = userFromRequest(req, "mobile");
  if (!user) return json({ error: "Please sign in again." }, 401);

  if (path === "logout") {
    revokeTokenByValue(req);
    return json({ ok: true });
  }

  if (path === "voice") {
    const r = await runVoiceMode(user, body);
    return json(r.body, r.status);
  }

  if (path === "handoff") {
    const next = String(body.next ?? "/dashboard");
    const code = createToken(user.id, "Web handoff", "handoff");
    return json({ url: `${origin}/auth/handoff?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next.startsWith("/") ? next : "/dashboard")}` });
  }

  if (path === "tickets") {
    if (user.role !== "member") return json({ error: "Members only." }, 403);
    const d = DraftSchema.safeParse(body);
    if (!d.success) return json({ error: "Please fill in every field (goal 10+ characters, diet 10+, setbacks 5+, target 5+)." }, 400);
    const r = db()
      .prepare(`INSERT INTO tickets (user_id, goal_type, goal_statement, typical_diet, setbacks, specific_target, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'awaiting_payment', ?)`)
      .run(user.id, d.data.goal_type, d.data.goal_statement, d.data.typical_diet, d.data.setbacks, d.data.specific_target, nowIso());
    const id = Number(r.lastInsertRowid);
    const sub = getActiveSubscription(user.id);
    return json({ id, number: ticketNumber(id), canRedeem: !!sub && sub.ticket_credits > 0 });
  }

  const m = path.match(/^tickets\/(\d+)\/(redeem|nudge|start-review|respond|rate)$/);
  if (m) {
    const id = Number(m[1]);
    const action = m[2];
    if (action === "redeem") {
      const sub = getActiveSubscription(user.id);
      const draft = db().prepare("SELECT 1 FROM tickets WHERE id = ? AND user_id = ? AND status = 'awaiting_payment'").get(id, user.id);
      if (!draft || !sub || sub.ticket_credits < 1) return json({ error: "No included ticket available." }, 400);
      db().prepare("UPDATE subscriptions SET ticket_credits = ticket_credits - 1 WHERE id = ?").run(sub.id);
      submitPaidTicket(user.id, id, "subscription");
      return json({ ok: true });
    }
    if (action === "nudge") {
      if (user.role === "clinician") return json({ error: "Not available." }, 403);
      const r = nudgeClinician({ ticketId: id, actor: user, source: user.role === "manager" ? "manager" : "member", note: typeof body.note === "string" ? body.note : undefined });
      return json(r, r.ok ? 200 : 400);
    }
    if (action === "start-review") return json({ ok: startReviewFor(user, id) });
    if (action === "rate") {
      if (user.role !== "member") return json({ error: "Members only." }, 403);
      const r = rateResponseFor(user.id, id, Number(body.rating), String(body.comment ?? ""));
      return json(r, r.ok ? 200 : 400);
    }
    if (action === "respond") {
      const steps = Array.isArray(body.steps) ? (body.steps as { title?: string; detail?: string; timeframe?: string }[]) : [];
      const r = saveResponse(user, id, {
        recommendation: String(body.recommendation ?? ""),
        steps: steps.map((s) => ({ title: String(s.title ?? ""), detail: String(s.detail ?? ""), timeframe: String(s.timeframe ?? "") })),
        aiAssist: body.aiAssist === "wording" ? "wording" : "none",
        foods: body.foods,
      });
      return json(r, r.ok ? 200 : 400);
    }
  }

  if (path === "weigh-ins") {
    if (user.role !== "member") return json({ error: "Members only." }, 403);
    const p = getProfile(user.id);
    const w = Number(body.weight);
    if (!p || !Number.isFinite(w)) return json({ error: "Enter your weight." }, 400);
    const kg = p.unit_system === "metric" ? w : lbToKg(w);
    if (kg < 35 || kg > 300) return json({ error: "That weight looks out of range." }, 400);
    const today = new Date().toISOString().slice(0, 10);
    addWeighIn(user.id, { logged_on: today, weight_kg: Math.round(kg * 10) / 10, note: "From the mobile app" });
    db().prepare("UPDATE profiles SET weight_kg = ?, updated_at = ? WHERE user_id = ?").run(Math.round(kg * 10) / 10, nowIso(), user.id);
    return json({ ok: true });
  }

  if (path === "notifications/read") {
    db().prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(nowIso(), user.id);
    return json({ ok: true });
  }

  if (path === "assistant") {
    if (user.role !== "member") return json({ error: "Members only." }, 403);
    if (!getSettings(user.id).assistant_enabled) return json({ error: "The assistant is turned off in your settings." }, 403);
    const messages = Array.isArray(body.messages) ? (body.messages as ChatMessage[]) : [];
    return json(await runAgent(user, messages));
  }

  return json({ error: "Not found." }, 404);
}

export const OPTIONS = preflight;
