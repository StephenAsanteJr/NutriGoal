import "server-only";
// Nutrition trends from connected trackers + build targets + lab history.
// Insights are plain arithmetic against the member's targets and published guidelines
// (no AI-written commentary).

import crypto from "node:crypto";
import { db, nowIso } from "../db";
import { computeBuild } from "../biometrics";
import { getProfile, getSettings, listWeighIns, toBuildInput } from "../data";
import { LAB_LABELS, listLabHistory, type LabCode } from "./fhir";

export type TrendDay = { day: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null; sodium_mg: number | null; source: string };

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function computeTrends(userId: string, days = 30) {
  const since = new Date(Date.now() - (days - 1) * 86400_000);
  const prevSince = new Date(since.getTime() - days * 86400_000);
  const rows = db()
    .prepare("SELECT * FROM nutrition_days WHERE user_id = ? AND day >= ? ORDER BY day, calories DESC")
    .all(userId, iso(prevSince)) as TrendDay[];
  // One row per day: keep the most complete entry when several apps logged the same day.
  const byDay = new Map<string, TrendDay>();
  for (const r of rows) if (!byDay.has(r.day)) byDay.set(r.day, r);
  const all = [...byDay.values()];
  const current = all.filter((d) => d.day >= iso(since));
  const previous = all.filter((d) => d.day < iso(since));

  const profile = getProfile(userId);
  const input = toBuildInput(profile);
  const build = input ? computeBuild(input) : null;
  const s = getSettings(userId);
  const kcalTarget = s.calorie_goal_override ?? (build ? Math.round(build.targetCalories) : null);
  const proteinTarget = build ? Math.max(build.proteinG, Math.round(((kcalTarget ?? 0) * s.macro_protein) / 100 / 4)) : null;

  const a = {
    calories: avg(current.map((d) => d.calories)),
    protein_g: avg(current.map((d) => d.protein_g)),
    carbs_g: avg(current.map((d) => d.carbs_g)),
    fat_g: avg(current.map((d) => d.fat_g)),
    fiber_g: avg(current.map((d) => d.fiber_g)),
    sodium_mg: avg(current.map((d) => d.sodium_mg)),
  };
  const prev = { calories: avg(previous.map((d) => d.calories)), protein_g: avg(previous.map((d) => d.protein_g)) };
  const within = kcalTarget ? current.filter((d) => d.calories != null && Math.abs(d.calories - kcalTarget) <= kcalTarget * 0.1).length : 0;
  const proteinHit = proteinTarget ? current.filter((d) => (d.protein_g ?? 0) >= proteinTarget * 0.9).length : 0;
  const macroKcal = (a.carbs_g ?? 0) * 4 + (a.protein_g ?? 0) * 4 + (a.fat_g ?? 0) * 9;
  const split = macroKcal
    ? { carbs: Math.round(((a.carbs_g ?? 0) * 400) / macroKcal), protein: Math.round(((a.protein_g ?? 0) * 400) / macroKcal), fat: Math.round(((a.fat_g ?? 0) * 900) / macroKcal) }
    : null;

  const insights: { tone: "good" | "watch" | "info"; text: string }[] = [];
  const f0 = (n: number) => Math.round(n).toLocaleString();
  if (current.length) {
    insights.push({ tone: current.length >= days * 0.7 ? "good" : "watch", text: `Logged ${current.length} of the last ${days} days${current.length < days * 0.7 ? "; more complete logging makes trends more reliable" : ""}.` });
    if (kcalTarget && a.calories != null) {
      const pct = Math.round(((a.calories - kcalTarget) / kcalTarget) * 100);
      insights.push({ tone: Math.abs(pct) <= 10 ? "good" : "watch", text: `Calories averaged ${f0(a.calories)} a day, ${Math.abs(pct)}% ${pct >= 0 ? "above" : "below"} the ${f0(kcalTarget)} target; ${within} days landed within 10%.` });
    }
    if (proteinTarget && a.protein_g != null) {
      const ch = prev.protein_g != null ? ` (${a.protein_g >= prev.protein_g ? "up" : "down"} ${f0(Math.abs(a.protein_g - prev.protein_g))} g vs. the previous ${days} days)` : "";
      insights.push({ tone: a.protein_g >= proteinTarget * 0.9 ? "good" : "watch", text: `Protein averaged ${f0(a.protein_g)} g, ${Math.round((a.protein_g / proteinTarget) * 100)}% of the ${proteinTarget} g target${ch}; hit on ${proteinHit} day${proteinHit === 1 ? "" : "s"}.` });
    }
    if (a.fiber_g != null && a.calories) {
      const target = Math.round((a.calories / 1000) * 14);
      insights.push({ tone: a.fiber_g >= target ? "good" : "watch", text: `Fiber averaged ${f0(a.fiber_g)} g; the Dietary Guidelines suggest about ${target} g at this calorie level (14 g per 1,000 kcal).` });
    }
    if (a.sodium_mg != null) insights.push({ tone: a.sodium_mg <= 2300 ? "good" : "watch", text: `Sodium averaged ${f0(a.sodium_mg)} mg${a.sodium_mg > 2300 ? ", above the 2,300 mg daily limit" : ", within the 2,300 mg daily limit"}.` });
  }

  // Labs: latest vs previous for each test
  const hist = listLabHistory(userId);
  const labs = (Object.keys(LAB_LABELS) as LabCode[])
    .map((code) => {
      const h = hist.filter((x) => x.code === code);
      if (!h.length) return null;
      const last = h[h.length - 1];
      const before = h.length > 1 ? h[h.length - 2] : null;
      return { code, label: LAB_LABELS[code].label, unit: last.unit, value: last.value, date: last.observed_on, source: last.source, previous: before ? { value: before.value, date: before.observed_on } : null, history: h.map((x) => ({ date: x.observed_on, value: x.value })) };
    })
    .filter(Boolean) as { code: LabCode; label: string; unit: string; value: number; date: string; source: string; previous: { value: number; date: string } | null; history: { date: string; value: number }[] }[];

  const weights = listWeighIns(userId).filter((w) => w.logged_on >= iso(since));
  // One point per calendar day in the period (null = not logged), for charts.
  const points = Array.from({ length: days }, (_, i) => {
    const d = iso(new Date(since.getTime() + i * 86400_000));
    const row = byDay.get(d);
    return { day: d, calories: row?.calories ?? null, protein: row?.protein_g ?? null };
  });
  return { days, points, current, averages: a, previous: prev, targets: { kcal: kcalTarget, protein: proteinTarget }, split, insights, labs, weights, units: profile?.unit_system ?? "imperial", energyUnit: s.energy_unit };
}

// ---------- Shareable reports ----------
export type ShareInclude = { build: boolean; nutrition: boolean; labs: boolean; weight: boolean };

export function createShareLink(userId: string, opts: { label: string; days: number; include: ShareInclude; expiresInDays: number }) {
  const token = crypto.randomBytes(18).toString("base64url");
  const expires = new Date(Date.now() + opts.expiresInDays * 86400_000).toISOString();
  db()
    .prepare("INSERT INTO share_links (token, user_id, label, include_json, days, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(token, userId, opts.label.slice(0, 80), JSON.stringify(opts.include), opts.days, expires, nowIso());
  return token;
}

export function getShareLink(token: string) {
  const row = db().prepare("SELECT * FROM share_links WHERE token = ?").get(token) as
    | { token: string; user_id: string; label: string; include_json: string; days: number; expires_at: string; revoked_at: string | null; views: number; created_at: string }
    | undefined;
  if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) return null;
  return { ...row, include: JSON.parse(row.include_json) as ShareInclude };
}

export function listShareLinks(userId: string) {
  return db()
    .prepare("SELECT token, label, days, expires_at, revoked_at, views, created_at FROM share_links WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as { token: string; label: string; days: number; expires_at: string; revoked_at: string | null; views: number; created_at: string }[];
}
