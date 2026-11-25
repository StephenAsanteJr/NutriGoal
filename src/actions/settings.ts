"use server";

import { revalidatePath } from "next/cache";
import { db, nowIso } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { addWeighIn, getProfile, saveSettings } from "@/lib/data";
import { bmiOf, estimateBodyFat, lbToKg, minGoalBodyFat, minHealthyWeightKg, safeTimeframe } from "@/lib/biometrics";
import { HAIR_COLORS, HAIR_STYLES, SKIN_TONES, WEEKLY_RATES_LB, type HairStyleId, type Settings, type SkinToneId, FACIAL_HAIR, type FacialHairId } from "@/lib/domain";

export type SimpleState = { error?: string; ok?: string } | undefined;

const num = (fd: FormData, k: string) => {
  const raw = String(fd.get(k) ?? "").trim();
  if (!raw) return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : NaN;
};
const on = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "1";
const hhmm = (v: unknown, fallback: string) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback);

/** Log a weigh-in (MyFitnessPal "check-in"). The latest entry becomes the profile's current weight. */
export async function logWeighIn(_: SimpleState, fd: FormData): Promise<SimpleState> {
  const user = await requireMember();
  const profile = getProfile(user.id);
  if (!profile?.weight_kg) return { error: "Finish your build first." };
  const metric = profile.unit_system === "metric";
  const w = num(fd, "weight");
  const bf = num(fd, "body_fat_pct");
  const waist = num(fd, "waist");
  const date = String(fd.get("logged_on") ?? "");
  const today = new Date().toISOString().slice(0, 10);
  if (w == null || Number.isNaN(w)) return { error: "Enter your weight." };
  const kg = metric ? w : lbToKg(w);
  if (kg < 35 || kg > 300) return { error: "That weight looks out of range." };
  if (bf != null && (Number.isNaN(bf) || bf < 3 || bf > 70)) return { error: "Body fat should be 3–70%, or leave it blank." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return { error: "Choose today or an earlier date." };
  const waistCm = waist == null || Number.isNaN(waist) ? null : metric ? waist : waist * 2.54;

  addWeighIn(user.id, {
    logged_on: date,
    weight_kg: Math.round(kg * 10) / 10,
    body_fat_pct: bf,
    waist_cm: waistCm ? Math.round(waistCm * 10) / 10 : null,
    note: String(fd.get("note") ?? "").trim().slice(0, 200) || null,
  });
  const latest = db().prepare("SELECT logged_on FROM weigh_ins WHERE user_id = ? ORDER BY logged_on DESC, created_at DESC LIMIT 1").get(user.id) as { logged_on: string };
  if (latest.logged_on === date) {
    db()
      .prepare("UPDATE profiles SET weight_kg = ?, body_fat_pct = COALESCE(?, body_fat_pct), updated_at = ? WHERE user_id = ?")
      .run(Math.round(kg * 10) / 10, bf, nowIso(), user.id);
  }
  revalidatePath("/membership");
  revalidatePath("/dashboard");
  return { ok: "Weigh-in saved." };
}

/** MyFitnessPal-style settings: goals, macros, units, diary, reminders, privacy, character. */
export async function saveMemberSettings(_: SimpleState, fd: FormData): Promise<SimpleState> {
  const user = await requireMember();
  const profile = getProfile(user.id);
  if (!profile?.weight_kg || !profile.height_cm || !profile.sex || !profile.age) return { error: "Finish your build first." };
  const section = String(fd.get("section") ?? "");
  const patch: Partial<Settings> = {};
  let notice = "Settings saved.";

  if (section === "character") {
    const tone = String(fd.get("skin_tone") ?? "");
    const style = String(fd.get("hair_style") ?? "");
    const color = String(fd.get("hair_color") ?? "");
    if (SKIN_TONES.some((t) => t.id === tone)) patch.skin_tone = tone as SkinToneId;
    if (HAIR_STYLES.some((h) => h.id === style)) patch.hair_style = style as HairStyleId;
    if (HAIR_COLORS.some((c) => c.id === color)) patch.hair_color = color;
    const facial = String(fd.get("facial_hair") ?? "");
    if (FACIAL_HAIR.some((f) => f.id === facial)) patch.facial_hair = facial as FacialHairId;
    const scanBf = num(fd, "scan_body_fat");
    if (scanBf != null && !Number.isNaN(scanBf) && !profile.body_fat_pct && scanBf >= 3 && scanBf <= 70) {
      db().prepare("UPDATE profiles SET body_fat_pct = ?, updated_at = ? WHERE user_id = ?").run(scanBf, nowIso(), user.id);
    }
    notice = "Your character has been updated.";
  }

  if (section === "goals") {
    const metric = profile.unit_system === "metric";
    const goalRaw = num(fd, "desired_weight");
    const goalBf = num(fd, "desired_body_fat_pct");
    const rateLb = Number(fd.get("weekly_rate_lb"));
    const kcal = num(fd, "calorie_goal_override");
    const carbs = Number(fd.get("macro_carbs"));
    const protein = Number(fd.get("macro_protein"));
    const fat = Number(fd.get("macro_fat"));
    if (goalRaw == null || Number.isNaN(goalRaw)) return { error: "Enter a goal weight." };
    const goalKg = metric ? goalRaw : lbToKg(goalRaw);
    if (goalKg < minHealthyWeightKg(profile.height_cm)) return { error: "That goal is below a healthy BMI (18.5) for your height." };
    if (goalBf != null && (Number.isNaN(goalBf) || goalBf < minGoalBodyFat(profile.sex))) return { error: `Goal body fat must be ${minGoalBodyFat(profile.sex)}% or higher.` };
    if (!WEEKLY_RATES_LB.includes(rateLb as (typeof WEEKLY_RATES_LB)[number])) return { error: "Choose a weekly goal." };
    if (![carbs, protein, fat].every((n) => Number.isInteger(n) && n >= 5 && n <= 80) || carbs + protein + fat !== 100)
      return { error: "Carbs, protein and fat must each be 5–80% and add up to 100%." };
    const floor = profile.sex === "male" ? 1500 : 1200;
    if (kcal != null && (Number.isNaN(kcal) || kcal < floor || kcal > 6000))
      return { error: `A custom calorie goal must be at least ${floor.toLocaleString()} (the platform minimum) and at most 6,000.` };

    // Weekly rate → timeframe, never faster than the platform's safe minimum.
    const diffKg = goalKg - profile.weight_kg;
    const bfNow = profile.body_fat_pct ?? estimateBodyFat(bmiOf(profile.weight_kg, profile.height_cm), profile.age, profile.sex);
    const safe = safeTimeframe({ sex: profile.sex, weightKg: profile.weight_kg, desiredWeightKg: goalKg, bodyFatPct: bfNow, desiredBodyFatPct: goalBf });
    let weeks = safe.recommendedWeeks;
    if (rateLb !== 0 && Math.abs(diffKg) > 0.5 && Math.sign(rateLb) === Math.sign(diffKg)) weeks = Math.ceil(Math.abs(diffKg) / lbToKg(Math.abs(rateLb)));
    if (weeks < safe.minWeeks) {
      notice = `Saved. That weekly pace is faster than is safe for your goal, so your timeline is set to the ${safe.minWeeks}-week minimum.`;
      weeks = safe.minWeeks;
    }
    db()
      .prepare("UPDATE profiles SET desired_weight_kg = ?, desired_body_fat_pct = ?, timeframe_weeks = ?, updated_at = ? WHERE user_id = ?")
      .run(Math.round(goalKg * 10) / 10, goalBf, weeks, nowIso(), user.id);
    Object.assign(patch, { calorie_goal_override: kcal, macro_carbs: carbs, macro_protein: protein, macro_fat: fat });
  }

  if (section === "units") {
    const unit = fd.get("unit_system") === "metric" ? "metric" : "imperial";
    db().prepare("UPDATE profiles SET unit_system = ? WHERE user_id = ?").run(unit, user.id);
    patch.energy_unit = fd.get("energy_unit") === "kJ" ? "kJ" : "kcal";
    patch.water_unit = fd.get("water_unit") === "ml" ? "ml" : "oz";
  }

  if (section === "diary") {
    const names = fd
      .getAll("meal_name")
      .map((n) => String(n).trim().slice(0, 24))
      .filter(Boolean);
    if (names.length < 1 || names.length > 6) return { error: "Keep between 1 and 6 meal names." };
    patch.meal_names = names;
    const meals = Math.min(8, Math.max(1, names.filter((n) => !/snack/i.test(n)).length || names.length));
    db().prepare("UPDATE profiles SET meals_per_day = ? WHERE user_id = ?").run(meals, user.id);
  }

  if (section === "reminders") {
    const r = String(fd.get("weigh_in_reminder"));
    patch.weigh_in_reminder = r === "off" || r === "daily" ? r : "weekly";
    patch.reminder_time = hhmm(fd.get("reminder_time"), "08:00");
    patch.nudges_enabled = on(fd, "nudges_enabled");
    patch.nudges_per_day = Math.min(4, Math.max(1, Number(fd.get("nudges_per_day")) || 3));
    patch.quiet_start = hhmm(fd.get("quiet_start"), "21:00");
    patch.quiet_end = hhmm(fd.get("quiet_end"), "08:00");
    patch.channel_push = on(fd, "channel_push");
    patch.channel_email = on(fd, "channel_email");
    patch.channel_sms = on(fd, "channel_sms");
  }

  if (section === "privacy") {
    patch.share_progress_with_clinician = on(fd, "share_progress_with_clinician");
    patch.insights_opt_in = on(fd, "insights_opt_in");
    patch.assistant_enabled = on(fd, "assistant_enabled");
    patch.voice_mode = on(fd, "voice_mode");
  }

  saveSettings(user.id, patch);
  revalidatePath("/membership");
  revalidatePath("/dashboard");
  return { ok: notice };
}
