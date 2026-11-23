"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { db, newId, nowIso, UPLOAD_DIR } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import {
  computeBuild,
  inToCm,
  lbToKg,
  minGoalBodyFat,
  minHealthyWeightKg,
  safeTimeframe,
  estimateBodyFat,
  bmiOf,
  kgToLb,
  type Sex,
} from "@/lib/biometrics";
import { extractFromPdf, type Extraction } from "@/lib/report-extract";
import { HAIR_COLORS, HAIR_STYLES, MEDICATION_STAGES, SKIN_TONES, type HairStyleId, type SkinToneId } from "@/lib/domain";
import { addWeighIn, getProfile, saveSettings } from "@/lib/data";

export type ProfileFormState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function num(fd: FormData, key: string): number | null {
  const raw = String(fd.get(key) ?? "").trim();
  if (raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : NaN;
}

export async function saveProfile(_: ProfileFormState, fd: FormData): Promise<ProfileFormState> {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  const errors: Record<string, string> = {};
  const units = fd.get("unit_system") === "metric" ? "metric" : "imperial";

  const sex = fd.get("sex") as Sex | null;
  if (sex !== "female" && sex !== "male") errors.sex = "Choose the sex used for your energy estimates.";

  const age = num(fd, "age");
  if (age == null || Number.isNaN(age) || age < 18 || age > 100) errors.age = "Enter an age between 18 and 100.";

  let heightCm: number | null = null;
  if (units === "metric") {
    heightCm = num(fd, "height_cm");
  } else {
    const ft = num(fd, "height_ft");
    const inch = num(fd, "height_in") ?? 0;
    heightCm = ft != null && !Number.isNaN(ft) && !Number.isNaN(inch) ? inToCm(ft * 12 + inch) : null;
  }
  if (heightCm == null || Number.isNaN(heightCm) || heightCm < 120 || heightCm > 230)
    errors.height = "Enter a height between 4′0″ and 7′6″ (120–230 cm).";

  const toKg = (v: number | null) => (v == null || Number.isNaN(v) ? v : units === "metric" ? v : lbToKg(v));
  const weightKg = toKg(num(fd, "weight"));
  if (weightKg == null || Number.isNaN(weightKg) || weightKg < 35 || weightKg > 300)
    errors.weight = "Enter a weight between 77 and 660 lb (35–300 kg).";

  const bodyFat = num(fd, "body_fat_pct");
  if (bodyFat != null && (Number.isNaN(bodyFat) || bodyFat < 3 || bodyFat > 70))
    errors.body_fat_pct = "Body fat should be between 3% and 70%, or leave it blank.";

  const meals = num(fd, "meals_per_day");
  if (meals == null || Number.isNaN(meals) || meals < 1 || meals > 8) errors.meals_per_day = "Enter 1 to 8 meals a day.";

  const kcal = num(fd, "est_calories");
  if (kcal == null || Number.isNaN(kcal) || kcal < 600 || kcal > 7000) errors.est_calories = "Enter an estimate between 600 and 7,000 calories.";

  const workout = num(fd, "workout_min_per_day");
  if (workout == null || Number.isNaN(workout) || workout < 0 || workout > 300) errors.workout_min_per_day = "Enter 0 to 300 minutes a day.";

  const desiredKg = toKg(num(fd, "desired_weight"));
  if (desiredKg == null || Number.isNaN(desiredKg) || desiredKg < 35 || desiredKg > 300)
    errors.desired_weight = "Enter your goal weight.";

  const desiredBf = num(fd, "desired_body_fat_pct");
  if (desiredBf != null && Number.isNaN(desiredBf)) errors.desired_body_fat_pct = "Enter a number, or leave it blank.";

  const weeks = num(fd, "timeframe_weeks");
  if (weeks == null || Number.isNaN(weeks) || weeks < 1 || weeks > 156) errors.timeframe_weeks = "Choose a timeframe in weeks.";

  const stage = String(fd.get("medication_stage") ?? "none");
  if (!MEDICATION_STAGES.some((s) => s.id === stage)) errors.medication_stage = "Choose an option.";

  // Optional labs
  const labs = {
    systolic: num(fd, "systolic"),
    diastolic: num(fd, "diastolic"),
    a1c: num(fd, "a1c"),
    fasting_glucose: num(fd, "fasting_glucose"),
    total_cholesterol: num(fd, "total_cholesterol"),
    ldl: num(fd, "ldl"),
    hdl: num(fd, "hdl"),
    triglycerides: num(fd, "triglycerides"),
    vitamin_d: num(fd, "vitamin_d"),
  };
  for (const [k, v] of Object.entries(labs)) if (v != null && (Number.isNaN(v) || v < 0)) errors[k] = "Enter a valid number.";
  const conditions = String(fd.get("conditions") ?? "").trim().slice(0, 600) || null;

  if (Object.keys(errors).length) return { fieldErrors: errors, error: "Please fix the highlighted fields." };

  // ---- Platform guardrails ("within the reason provided by the platform") ----
  const minKg = minHealthyWeightKg(heightCm!);
  if (desiredKg! < minKg) {
    const shown = units === "metric" ? `${minKg.toFixed(1)} kg` : `${Math.ceil(kgToLb(minKg))} lb`;
    return { fieldErrors: { desired_weight: `Goal weight must be at least ${shown} (a healthy BMI of 18.5 for your height).` } };
  }
  const minBf = minGoalBodyFat(sex!);
  if (desiredBf != null && desiredBf < minBf)
    return { fieldErrors: { desired_body_fat_pct: `Goal body fat must be ${minBf}% or higher for long-term health.` } };

  const currentBf = bodyFat ?? estimateBodyFat(bmiOf(weightKg!, heightCm!), age!, sex!);
  const safe = safeTimeframe({ sex: sex!, weightKg: weightKg!, desiredWeightKg: desiredKg, bodyFatPct: currentBf, desiredBodyFatPct: desiredBf });
  if (weeks! < safe.minWeeks)
    return {
      fieldErrors: {
        timeframe_weeks: `For this goal the platform's safe minimum is ${safe.minWeeks} weeks (recommended ${safe.recommendedWeeks}). ${safe.explanation}`,
      },
    };

  const hasReports = (db().prepare("SELECT COUNT(*) AS n FROM medical_reports WHERE user_id = ?").get(user.id) as { n: number }).n > 0;

  const row = {
    user_id: user.id,
    unit_system: units,
    sex,
    age,
    height_cm: Math.round(heightCm! * 10) / 10,
    weight_kg: Math.round(weightKg! * 10) / 10,
    body_fat_pct: bodyFat,
    meals_per_day: meals,
    est_calories: kcal,
    workout_min_per_day: workout,
    desired_weight_kg: Math.round(desiredKg! * 10) / 10,
    desired_body_fat_pct: desiredBf,
    timeframe_weeks: weeks,
    medication_stage: stage,
    ...labs,
    conditions,
    source: hasReports ? "report+manual" : "manual",
    updated_at: nowIso(),
  };
  // Sanity-run the build so a bad combination fails here, not on the dashboard.
  computeBuild({
    sex: sex!, age: age!, heightCm: row.height_cm, weightKg: row.weight_kg, bodyFatPct: bodyFat,
    desiredWeightKg: row.desired_weight_kg, desiredBodyFatPct: desiredBf, timeframeWeeks: weeks,
  });

  const previous = getProfile(user.id);
  if (!previous?.weight_kg || Math.abs(previous.weight_kg - row.weight_kg) >= 0.1) {
    addWeighIn(user.id, {
      logged_on: new Date().toISOString().slice(0, 10),
      weight_kg: row.weight_kg,
      body_fat_pct: bodyFat,
      note: previous?.weight_kg ? "Updated in profile" : "Starting weight",
    });
  }

  const cols = Object.keys(row);
  db()
    .prepare(
      `INSERT INTO profiles (${cols.join(", ")}) VALUES (${cols.map((c) => "@" + c).join(", ")})
       ON CONFLICT(user_id) DO UPDATE SET ${cols.filter((c) => c !== "user_id").map((c) => `${c} = excluded.${c}`).join(", ")}`,
    )
    .run(row);
  // Character look (skin tone + hair) lives in settings.
  const tone = String(fd.get("skin_tone") ?? "");
  const hairStyle = String(fd.get("hair_style") ?? "");
  const hairColor = String(fd.get("hair_color") ?? "");
  saveSettings(user.id, {
    ...(SKIN_TONES.some((t) => t.id === tone) ? { skin_tone: tone as SkinToneId } : {}),
    ...(HAIR_STYLES.some((h) => h.id === hairStyle) ? { hair_style: hairStyle as HairStyleId } : {}),
    ...(HAIR_COLORS.some((c) => c.id === hairColor) ? { hair_color: hairColor } : {}),
  });

  const firstTime = !user.onboarding_complete;
  db().prepare("UPDATE users SET onboarding_complete = 1 WHERE id = ?").run(user.id);
  revalidatePath("/dashboard");
  redirect(firstTime ? "/dashboard?built=1" : "/dashboard?updated=1");
}

// ---------- Medical report upload ----------

export type UploadState =
  | { error?: string; ok?: false }
  | { ok: true; reportId: string; fileName: string; extraction: Extraction | null; isImage: boolean }
  | undefined;

const MAX_BYTES = 10 * 1024 * 1024;

function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.subarray(0, 4).toString("latin1") === "%PDF") return { mime: "application/pdf", ext: "pdf" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export async function uploadReport(_: UploadState, fd: FormData): Promise<UploadState> {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  const file = fd.get("report");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose your checkup report to upload." };
  if (file.size > MAX_BYTES) return { error: "That file is over 10 MB. Try a smaller PDF or a photo." };
  if (!fd.get("consent")) return { error: "Please confirm you're sharing your own report." };

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return { error: "Upload a PDF, JPG, PNG or WEBP file." };

  const id = newId();
  const stored = `${id}.${kind.ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, stored), buf, { mode: 0o600 });

  let extraction: Extraction | null = null;
  let note: string;
  if (kind.mime === "application/pdf") {
    try {
      extraction = await extractFromPdf(buf);
      note = extraction.note;
    } catch {
      note = "We couldn't read text from this PDF (it may be a scan). Your clinician will still review it.";
    }
  } else {
    note = "Photos are stored securely for your clinician to read. Please enter your details on the next screen.";
  }

  db()
    .prepare(
      `INSERT INTO medical_reports (id, user_id, original_name, stored_name, mime, size_bytes, provider, report_date, extracted_json, extraction_note, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      user.id,
      file.name.slice(0, 160),
      stored,
      kind.mime,
      file.size,
      extraction?.provider ?? null,
      extraction?.reportDate ?? null,
      extraction ? JSON.stringify(extraction) : null,
      note,
      nowIso(),
    );

  return {
    ok: true,
    reportId: id,
    fileName: file.name,
    extraction: extraction ?? { fields: {}, found: [], note },
    isImage: kind.mime !== "application/pdf",
  };
}
