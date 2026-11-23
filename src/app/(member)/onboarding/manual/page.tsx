import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getProfile, getSettings, listReports } from "@/lib/data";
import { cmToFtIn, kgToLb } from "@/lib/biometrics";
import type { Extraction } from "@/lib/report-extract";
import { ProfileForm, type ProfileInitial } from "./ProfileForm";

export const metadata: Metadata = { title: "Your health data" };

export default async function ManualPage(props: PageProps<"/onboarding/manual">) {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  const sp = await props.searchParams;
  const profile = getProfile(user.id);
  const reports = listReports(user.id);
  const reportId = typeof sp.report === "string" ? sp.report : null;
  const report = reportId ? reports.find((r) => r.id === reportId) : null;
  const extraction: Extraction | null = report?.extracted_json ? JSON.parse(report.extracted_json) : null;

  const units = profile?.unit_system ?? (sp.units === "metric" ? "metric" : "imperial");
  // Merge: saved profile first, then any values just read from the uploaded report.
  const merged = { ...(profile ?? {}), ...(extraction?.fields ?? {}) } as Record<string, unknown>;
  const n = (k: string) => (merged[k] == null ? "" : String(merged[k]));
  const weight = (k: string) => {
    const v = merged[k] as number | null | undefined;
    if (v == null) return "";
    return units === "metric" ? String(Math.round(v * 10) / 10) : String(Math.round(kgToLb(v)));
  };
  const heightCm = merged.height_cm as number | undefined;
  const ftin = heightCm ? cmToFtIn(heightCm) : null;

  const initial: ProfileInitial = {
    unit_system: units,
    sex: (merged.sex as string) ?? "",
    age: n("age"),
    height_cm: heightCm ? String(Math.round(heightCm)) : "",
    height_ft: ftin ? String(ftin.ft) : "",
    height_in: ftin ? String(ftin.inch) : "",
    weight: weight("weight_kg"),
    body_fat_pct: n("body_fat_pct"),
    meals_per_day: n("meals_per_day") || "3",
    est_calories: n("est_calories"),
    workout_min_per_day: n("workout_min_per_day"),
    desired_weight: weight("desired_weight_kg"),
    desired_body_fat_pct: n("desired_body_fat_pct"),
    timeframe_weeks: n("timeframe_weeks"),
    medication_stage: (merged.medication_stage as string) ?? "none",
    systolic: n("systolic"),
    diastolic: n("diastolic"),
    a1c: n("a1c"),
    fasting_glucose: n("fasting_glucose"),
    total_cholesterol: n("total_cholesterol"),
    ldl: n("ldl"),
    hdl: n("hdl"),
    triglycerides: n("triglycerides"),
    vitamin_d: n("vitamin_d"),
    conditions: n("conditions"),
  };
  const fromReport = Object.keys(extraction?.fields ?? {}).flatMap((k) =>
    k === "weight_kg" ? ["weight"] : k === "height_cm" ? ["height_cm", "height_ft", "height_in"] : [k],
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{user.onboarding_complete ? "Update your build" : "Step 2 of 3 · Your build"}</div>
          <h1 className="font-display text-4xl">{report ? "Review your report and add details" : "Enter your health data"}</h1>
          <p className="mt-2 max-w-2xl text-slate">
            {report
              ? `We pre-filled what we could read from “${report.original_name}”. Check each highlighted value and add anything missing.`
              : "Everything here feeds your physical build and biometric card. Fields marked optional can be left blank."}
          </p>
        </div>
        {!user.onboarding_complete && (
          <Link href="/onboarding" className="btn-ghost">
            ← Choose a different way
          </Link>
        )}
      </div>
      <ProfileForm
        initial={initial}
        fromReport={fromReport}
        name={user.name}
        hasReport={!!report || reports.length > 0}
        initialLook={(() => {
          const st = getSettings(user.id);
          return { skinTone: st.skin_tone, hairStyle: st.hair_style, hairColor: st.hair_color };
        })()}
      />
    </div>
  );
}
