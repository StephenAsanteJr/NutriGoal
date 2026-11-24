import "server-only";
// Daily nutrition from food-tracking apps (MyFitnessPal, Cronometer, MacroFactor,
// FatSecret, Lose It!) — from the member's own CSV exports or the NutriGoal API.

import { db, newId, nowIso } from "../db";
import { normaliseDate, parseCsv } from "./csv";

export type NutritionDay = {
  day: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
};

const num = (v: string | undefined) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) && String(v).trim() !== "" ? n : null;
};

/** Map export headers to nutrients. Works across the common tracker formats. */
function columnMap(headers: string[]) {
  const h = headers.map((x) => x.trim().toLowerCase());
  const find = (test: (x: string) => boolean) => h.findIndex(test);
  return {
    date: find((x) => x === "date" || x === "day" || x.startsWith("date") || x === "datetime"),
    meal: find((x) => x === "meal"),
    calories: find((x) => /^(calories|energy|kcal|food energy)/.test(x) && !/burn|goal|target|remain/.test(x)),
    protein: find((x) => x.startsWith("protein")),
    carbs: find((x) => /^(carbohydrates|carbs|total carb|carbohydrate)/.test(x) && !/net/.test(x)),
    fat: find((x) => /^(fat|total fat)\b/.test(x) || x === "fat (g)"),
    fiber: find((x) => /^(fiber|fibre|dietary fiber)/.test(x)),
    sugar: find((x) => /^(sugar|sugars)/.test(x)),
    sodium: find((x) => x.startsWith("sodium")),
  };
}

export function detectApp(headers: string[]) {
  const h = headers.join("|").toLowerCase();
  if (h.includes("energy (kcal)")) return "cronometer";
  if (h.includes("meal") && h.includes("fat (g)")) return "myfitnesspal";
  if (h.includes("expenditure") || h.includes("trend weight")) return "macrofactor";
  return null;
}

export function parseNutritionCsv(text: string) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { days: [] as NutritionDay[], detected: null, error: "That file has no rows." };
  const headers = rows[0];
  const c = columnMap(headers);
  if (c.date < 0 || (c.calories < 0 && c.protein < 0)) return { days: [], detected: null, error: "We couldn't find date and calorie/protein columns in that file." };
  const byDay = new Map<string, NutritionDay>();
  for (const r of rows.slice(1)) {
    const day = normaliseDate(r[c.date] ?? "");
    if (!day) continue;
    const d = byDay.get(day) ?? { day, calories: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null, sugar_g: null, sodium_mg: null };
    const add = (k: keyof Omit<NutritionDay, "day">, idx: number) => {
      if (idx < 0) return;
      const v = num(r[idx]);
      if (v == null) return;
      d[k] = Math.round(((d[k] ?? 0) + v) * 10) / 10; // MyFitnessPal exports one row per meal
    };
    add("calories", c.calories);
    add("protein_g", c.protein);
    add("carbs_g", c.carbs);
    add("fat_g", c.fat);
    add("fiber_g", c.fiber);
    add("sugar_g", c.sugar);
    add("sodium_mg", c.sodium);
    byDay.set(day, d);
  }
  const days = [...byDay.values()].filter((d) => (d.calories ?? 0) > 0 || (d.protein_g ?? 0) > 0).sort((a, b) => a.day.localeCompare(b.day));
  return { days, detected: detectApp(headers), error: days.length ? null : "No days with calories or protein were found." };
}

export function saveNutritionDays(userId: string, source: string, days: NutritionDay[]) {
  const up = db().prepare(`INSERT INTO nutrition_days (id, user_id, day, source, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, day, source) DO UPDATE SET calories = excluded.calories, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g,
      fat_g = excluded.fat_g, fiber_g = excluded.fiber_g, sugar_g = excluded.sugar_g, sodium_mg = excluded.sodium_mg`);
  const today = new Date().toISOString().slice(0, 10);
  let n = 0;
  db().transaction(() => {
    for (const d of days.slice(-730)) {
      if (d.day > today) continue;
      up.run(newId(), userId, d.day, source, d.calories, d.protein_g, d.carbs_g, d.fat_g, d.fiber_g, d.sugar_g, d.sodium_mg, nowIso());
      n++;
    }
  })();
  return n;
}

export function recordSource(userId: string, s: { kind: string; label: string; url?: string | null; details?: string | null; records: number }) {
  const existing = db().prepare("SELECT id FROM data_sources WHERE user_id = ? AND kind = ? AND COALESCE(url,'') = COALESCE(?, '')").get(userId, s.kind, s.url ?? null) as { id: string } | undefined;
  if (existing) {
    db().prepare("UPDATE data_sources SET label = ?, details = ?, records = records + ?, last_sync_at = ? WHERE id = ?").run(s.label, s.details ?? null, s.records, nowIso(), existing.id);
    return existing.id;
  }
  const id = newId();
  db()
    .prepare("INSERT INTO data_sources (id, user_id, kind, label, url, details, records, last_sync_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, userId, s.kind, s.label, s.url ?? null, s.details ?? null, s.records, nowIso(), nowIso());
  return id;
}
