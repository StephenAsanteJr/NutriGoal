"use client";

import { useActionState, useMemo, useState } from "react";
import { saveProfile, type ProfileFormState } from "@/actions/profile";
import {
  bmiOf,
  cmToFtIn,
  computeBuild,
  estimateBodyFat,
  formatHeight,
  inToCm,
  kgToLb,
  lbToKg,
  minGoalBodyFat,
  minHealthyWeightKg,
  safeTimeframe,
  type Sex,
} from "@/lib/biometrics";
import { MEDICATION_STAGES } from "@/lib/domain";
import { AvatarBuild, type AvatarLook } from "@/components/AvatarBuild";
import { LookPicker } from "@/components/LookPicker";
import { PhotoScanButton } from "@/components/PhotoScan";
import { Alert } from "@/components/ui";

export type ProfileInitial = {
  unit_system: "imperial" | "metric";
  sex: string;
  age: string;
  height_cm: string;
  height_ft: string;
  height_in: string;
  weight: string;
  body_fat_pct: string;
  meals_per_day: string;
  est_calories: string;
  workout_min_per_day: string;
  desired_weight: string;
  desired_body_fat_pct: string;
  timeframe_weeks: string;
  medication_stage: string;
  systolic: string;
  diastolic: string;
  a1c: string;
  fasting_glucose: string;
  total_cholesterol: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
  vitamin_d: string;
  conditions: string;
};

const num = (s: string) => (s.trim() === "" ? null : Number(s));

export function ProfileForm({
  initial,
  fromReport,
  hasReport,
  initialLook,
}: {
  initial: ProfileInitial;
  fromReport: string[];
  name: string;
  hasReport: boolean;
  initialLook: AvatarLook;
}) {
  const [v, setV] = useState(initial);
  const [look, setLook] = useState<AvatarLook>(initialLook);
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, undefined);
  const fe = state?.fieldErrors ?? {};
  const metric = v.unit_system === "metric";
  const set = (k: keyof ProfileInitial) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  function switchUnits(next: "imperial" | "metric") {
    if (next === v.unit_system) return;
    setV((s) => {
      const conv = (w: string) => {
        const n = num(w);
        if (n == null || Number.isNaN(n)) return w;
        return next === "metric" ? String(Math.round(lbToKg(n) * 10) / 10) : String(Math.round(kgToLb(n)));
      };
      let { height_cm, height_ft, height_in } = s;
      if (next === "metric") {
        const ft = num(s.height_ft);
        if (ft != null) height_cm = String(Math.round(inToCm(ft * 12 + (num(s.height_in) ?? 0))));
      } else {
        const cm = num(s.height_cm);
        if (cm != null) {
          const r = cmToFtIn(cm);
          height_ft = String(r.ft);
          height_in = String(r.inch);
        }
      }
      return { ...s, unit_system: next, weight: conv(s.weight), desired_weight: conv(s.desired_weight), height_cm, height_ft, height_in };
    });
  }

  // ---- live preview ----
  const live = useMemo(() => {
    const sex = v.sex as Sex;
    const age = num(v.age);
    const heightCm = metric ? num(v.height_cm) : num(v.height_ft) != null ? inToCm((num(v.height_ft) ?? 0) * 12 + (num(v.height_in) ?? 0)) : null;
    const toKg = (s: string) => {
      const n = num(s);
      return n == null || Number.isNaN(n) ? null : metric ? n : lbToKg(n);
    };
    const weightKg = toKg(v.weight);
    if ((sex !== "male" && sex !== "female") || !age || !heightCm || !weightKg || heightCm < 120 || heightCm > 230 || weightKg < 35 || weightKg > 300)
      return null;
    const desiredKg = toKg(v.desired_weight);
    const bf = num(v.body_fat_pct);
    const dbf = num(v.desired_body_fat_pct);
    const currentBf = bf && bf > 0 ? bf : estimateBodyFat(bmiOf(weightKg, heightCm), age, sex);
    const safe = safeTimeframe({ sex, weightKg, desiredWeightKg: desiredKg, bodyFatPct: currentBf, desiredBodyFatPct: dbf });
    const build = computeBuild({
      sex,
      age,
      heightCm,
      weightKg,
      bodyFatPct: bf,
      mealsPerDay: num(v.meals_per_day),
      estCalories: num(v.est_calories),
      workoutMinPerDay: num(v.workout_min_per_day),
      desiredWeightKg: desiredKg,
      desiredBodyFatPct: dbf,
      timeframeWeeks: num(v.timeframe_weeks),
    });
    return { sex, heightCm, weightKg, desiredKg, safe, build, minKg: minHealthyWeightKg(heightCm), minBf: minGoalBodyFat(sex) };
  }, [v, metric]);

  const weeks = num(v.timeframe_weeks);
  const tooFast = live && weeks != null && weeks < live.safe.minWeeks;
  const goalTooLow = live && live.desiredKg != null && live.desiredKg < live.minKg;
  const fmtW = (kg: number) => (metric ? `${kg.toFixed(1)} kg` : `${Math.ceil(kgToLb(kg))} lb`);

  const rep = (k: string) => fromReport.includes(k);
  const inputCls = (k: string) => `input ${rep(k) ? "!border-bcg !bg-bcg-tint/40" : ""}`;
  const err = (k: string) => (fe[k] ? <p className="field-error">{fe[k]}</p> : null);
  const fromBadge = (k: string) =>
    rep(k) ? <span className="ml-2 rounded-full bg-bcg-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">From report</span> : null;

  return (
    <form action={action} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]" noValidate>
      <input type="hidden" name="unit_system" value={v.unit_system} />
      <div className="space-y-6">
        {state?.error && <Alert>{state.error}</Alert>}

        <Section title="About you" step="1" right={<UnitToggle value={v.unit_system} onChange={switchUnits} />}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <span className="label">Sex {fromBadge("sex")}</span>
              <div className="flex gap-2" role="radiogroup" aria-label="Sex">
                {(["female", "male"] as const).map((s) => (
                  <label key={s} className={`flex flex-1 cursor-pointer items-center justify-center rounded-[2px] border px-3 py-2.5 text-sm font-bold ${v.sex === s ? "border-blue bg-blue-tint text-blue" : "border-line text-slate hover:border-navy"}`}>
                    <input type="radio" name="sex" value={s} checked={v.sex === s} onChange={set("sex")} className="sr-only" />
                    {s === "female" ? "Female" : "Male"}
                  </label>
                ))}
              </div>
              <p className="hint">Used for energy and body-fat formulas.</p>
              {err("sex")}
            </div>
            <div>
              <label htmlFor="age" className="label">Age {fromBadge("age")}</label>
              <input id="age" name="age" inputMode="numeric" className={inputCls("age")} value={v.age} onChange={set("age")} aria-invalid={!!fe.age} />
              {err("age")}
            </div>
            <div>
              <span className="label">Height {fromBadge("height_cm")}</span>
              {metric ? (
                <div className="relative">
                  <input name="height_cm" aria-label="Height in centimeters" inputMode="decimal" className={inputCls("height_cm")} value={v.height_cm} onChange={set("height_cm")} />
                  <Unit>cm</Unit>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input name="height_ft" aria-label="Height, feet" inputMode="numeric" className={inputCls("height_ft")} value={v.height_ft} onChange={set("height_ft")} />
                    <Unit>ft</Unit>
                  </div>
                  <div className="relative">
                    <input name="height_in" aria-label="Height, inches" inputMode="numeric" className={inputCls("height_in")} value={v.height_in} onChange={set("height_in")} />
                    <Unit>in</Unit>
                  </div>
                </div>
              )}
              {err("height")}
            </div>
            <div>
              <label htmlFor="weight" className="label">Current weight {fromBadge("weight")}</label>
              <div className="relative">
                <input id="weight" name="weight" inputMode="decimal" className={inputCls("weight")} value={v.weight} onChange={set("weight")} aria-invalid={!!fe.weight} />
                <Unit>{metric ? "kg" : "lb"}</Unit>
              </div>
              {err("weight")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="body_fat_pct" className="label">Body fat % <span className="font-normal text-muted">(optional)</span> {fromBadge("body_fat_pct")}</label>
              <div className="relative max-w-[220px]">
                <input id="body_fat_pct" name="body_fat_pct" inputMode="decimal" className={inputCls("body_fat_pct")} value={v.body_fat_pct} onChange={set("body_fat_pct")} placeholder={live ? `≈ ${live.build.bodyFatPct.toFixed(0)}` : ""} />
                <Unit>%</Unit>
              </div>
              {fe.body_fat_pct ? err("body_fat_pct") : <p className="hint">Don&apos;t know it? Leave blank and we&apos;ll estimate it from your BMI, age and sex.</p>}
            </div>
          </div>
        </Section>

        <Section title="Your character" step="2" subtitle="Your build is shown as an animated character. Pick a look, or scan a photo to match your skin tone.">
          <LookPicker
            sex={v.sex}
            value={look}
            onChange={setLook}
            extra={
              <PhotoScanButton
                onResult={(r) => {
                  if (r.skinTone) setLook((l) => ({ ...l, skinTone: r.skinTone! }));
                  if (r.bodyFatPct && !v.body_fat_pct) setV((s) => ({ ...s, body_fat_pct: String(r.bodyFatPct) }));
                }}
              />
            }
          />
        </Section>

        <Section title="Daily habits" step="3">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="meals_per_day" className="label">Meals a day</label>
              <select id="meals_per_day" name="meals_per_day" className="input" value={v.meals_per_day} onChange={set("meals_per_day")}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {err("meals_per_day")}
            </div>
            <div>
              <label htmlFor="est_calories" className="label">Estimated calories / day</label>
              <div className="relative">
                <input id="est_calories" name="est_calories" inputMode="numeric" className="input" value={v.est_calories} onChange={set("est_calories")} placeholder="e.g. 2200" aria-invalid={!!fe.est_calories} />
                <Unit>kcal</Unit>
              </div>
              {fe.est_calories ? err("est_calories") : <p className="hint">Your best guess is fine.</p>}
            </div>
            <div>
              <label htmlFor="workout_min_per_day" className="label">Workout time / day</label>
              <div className="relative">
                <input id="workout_min_per_day" name="workout_min_per_day" inputMode="numeric" className="input" value={v.workout_min_per_day} onChange={set("workout_min_per_day")} placeholder="e.g. 30" aria-invalid={!!fe.workout_min_per_day} />
                <Unit>min</Unit>
              </div>
              {fe.workout_min_per_day ? err("workout_min_per_day") : <p className="hint">Average, including walks. 0 is OK.</p>}
            </div>
          </div>
        </Section>

        <Section title="Your goal" step="4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="desired_weight" className="label">Goal weight</label>
              <div className="relative">
                <input id="desired_weight" name="desired_weight" inputMode="decimal" className="input" value={v.desired_weight} onChange={set("desired_weight")} aria-invalid={!!fe.desired_weight || !!goalTooLow} />
                <Unit>{metric ? "kg" : "lb"}</Unit>
              </div>
              {fe.desired_weight ? err("desired_weight") : goalTooLow ? (
                <p className="field-error">Below a healthy BMI for your height. The lowest goal we accept is {fmtW(live!.minKg)}.</p>
              ) : live ? (
                <p className="hint">Healthy-BMI minimum for your height: {fmtW(live.minKg)}.</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="desired_body_fat_pct" className="label">Goal body fat % <span className="font-normal text-muted">(optional)</span></label>
              <div className="relative">
                <input id="desired_body_fat_pct" name="desired_body_fat_pct" inputMode="decimal" className="input" value={v.desired_body_fat_pct} onChange={set("desired_body_fat_pct")} aria-invalid={!!fe.desired_body_fat_pct} />
                <Unit>%</Unit>
              </div>
              {fe.desired_body_fat_pct ? err("desired_body_fat_pct") : live ? <p className="hint">Lowest we accept: {live.minBf}%.</p> : null}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="timeframe_weeks" className="label">Desired timeframe</label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-36">
                  <input id="timeframe_weeks" name="timeframe_weeks" inputMode="numeric" className="input" value={v.timeframe_weeks} onChange={set("timeframe_weeks")} aria-invalid={!!fe.timeframe_weeks || !!tooFast} />
                  <Unit>weeks</Unit>
                </div>
                {live && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="pill bg-mist text-slate hover:bg-blue-tint hover:text-blue" onClick={() => setV((s) => ({ ...s, timeframe_weeks: String(live.safe.minWeeks) }))}>
                      Fastest safe · {live.safe.minWeeks} wks
                    </button>
                    <button type="button" className="pill bg-blue-tint text-blue hover:bg-blue hover:text-white" onClick={() => setV((s) => ({ ...s, timeframe_weeks: String(live.safe.recommendedWeeks) }))}>
                      Recommended · {live.safe.recommendedWeeks} wks
                    </button>
                  </div>
                )}
              </div>
              {live ? (
                <div className={`mt-3 rounded-[2px] border px-4 py-3 text-sm ${tooFast ? "border-warn/30 bg-warn-tint text-warn" : "border-line bg-mist text-slate"}`}>
                  <strong className={tooFast ? "" : "text-navy"}>Platform guidance: </strong>
                  {tooFast ? `${weeks} weeks is faster than is safe for this goal. Choose at least ${live.safe.minWeeks} weeks. ` : `Choose between ${live.safe.minWeeks} and ${live.safe.maxWeeks} weeks; ${live.safe.recommendedWeeks} is recommended. `}
                  {live.safe.explanation}
                </div>
              ) : (
                <p className="hint">Fill in your sex, age, height and weight to see the safe range for your goal.</p>
              )}
              {err("timeframe_weeks")}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="medication_stage" className="label">Weight-loss medication</label>
              <select id="medication_stage" name="medication_stage" className="input" value={v.medication_stage} onChange={set("medication_stage")}>
                {MEDICATION_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <p className="hint">Helps route your tickets to a physician when medication is involved.</p>
            </div>
          </div>
        </Section>

        <Section title="Labs and vitals" step="5" subtitle={hasReport ? "Pre-filled from your report where we could read it." : "Optional. Add these if you have a recent checkup."}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LabInput k="systolic" label="Blood pressure (top)" unit="mmHg" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
            <LabInput k="diastolic" label="Blood pressure (bottom)" unit="mmHg" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
            <LabInput k="a1c" label="A1C" unit="%" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
            <LabInput k="fasting_glucose" label="Fasting glucose" unit="mg/dL" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
            <LabInput k="total_cholesterol" label="Total cholesterol" unit="mg/dL" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
            <LabInput k="ldl" label="LDL" unit="mg/dL" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
            <LabInput k="hdl" label="HDL" unit="mg/dL" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
            <LabInput k="triglycerides" label="Triglycerides" unit="mg/dL" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
            <LabInput k="vitamin_d" label="Vitamin D" unit="ng/mL" v={v} set={set} cls={inputCls} badge={fromBadge} err={err} />
          </div>
          <div className="mt-5">
            <label htmlFor="conditions" className="label">Conditions, allergies or medicines <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="conditions" name="conditions" rows={3} className="input" value={v.conditions} onChange={set("conditions")} placeholder="e.g. Type 2 diabetes on metformin; lactose intolerant" />
          </div>
        </Section>

        <div className="flex items-center justify-end gap-4">
          <p className="text-xs text-muted">You can update your build any time from your dashboard.</p>
          <button className="btn-primary !px-8 !py-3" disabled={pending || !!tooFast || !!goalTooLow}>
            {pending ? "Building…" : "Create my build"}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card overflow-hidden">
          <div className="bg-navy px-5 py-3 text-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-bcg-fresh">Live preview</div>
            <div className="text-sm text-white/80">Your animated build updates as you type</div>
          </div>
          {live ? (
            <div className="p-5">
              <AvatarBuild
                className="mx-auto w-full max-w-[260px]"
                sex={live.sex}
                heightCm={live.heightCm}
                weightKg={live.weightKg}
                bodyFatPct={live.build.bodyFatPct}
                goalWeightKg={live.build.goalWeightKg}
                goalBodyFatPct={live.build.goalBodyFatPct}
                weeks={live.build.effectiveWeeks}
                units={v.unit_system}
                heightLabel={formatHeight(live.heightCm, v.unit_system)}
                look={look}
              />
              <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[2px] bg-line text-sm">
                {[
                  ["BMI", live.build.bmi.toFixed(1)],
                  ["Body fat", `${live.build.bodyFatPct.toFixed(0)}%${live.build.bodyFatEstimated ? "*" : ""}`],
                  ["Daily burn", `${Math.round(live.build.tdee).toLocaleString()} kcal`],
                  ["Daily target", `${Math.round(live.build.targetCalories).toLocaleString()} kcal`],
                  ["Protein", `${live.build.proteinG} g`],
                  ["Timeline", `${live.build.effectiveWeeks} wks`],
                ].map(([k, val]) => (
                  <div key={k} className="bg-white px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{k}</dt>
                    <dd className="font-bold">{val}</dd>
                  </div>
                ))}
              </dl>
              {live.build.bodyFatEstimated && <p className="mt-2 text-[11px] text-muted">*Estimated from BMI, age and sex.</p>}
            </div>
          ) : (
            <div className="flex h-[360px] flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted">
              <svg viewBox="0 0 60 120" className="h-28 opacity-30" aria-hidden>
                <circle cx="30" cy="12" r="10" fill="#051C2C" />
                <path d="M14 30h32l4 40h-8l-2 46h-8l-2-36-2 36h-8l-2-46h-8z" fill="#051C2C" />
              </svg>
              Add sex, age, height and weight to see your build.
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}

function Section({ title, step, subtitle, right, children }: { title: string; step: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-2xl text-bain">{step}</span>
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-slate">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{children}</span>;
}

function UnitToggle({ value, onChange }: { value: "imperial" | "metric"; onChange: (u: "imperial" | "metric") => void }) {
  return (
    <div className="inline-flex rounded-[2px] border border-line p-0.5 text-xs font-bold" role="group" aria-label="Units">
      {(["imperial", "metric"] as const).map((u) => (
        <button key={u} type="button" onClick={() => onChange(u)} aria-pressed={value === u} className={`rounded-[2px] px-3 py-1.5 ${value === u ? "bg-navy text-white" : "text-slate hover:text-navy"}`}>
          {u === "imperial" ? "lb · ft" : "kg · cm"}
        </button>
      ))}
    </div>
  );
}

function LabInput({
  k,
  label,
  unit,
  v,
  set,
  cls,
  badge,
  err,
}: {
  k: keyof ProfileInitial;
  label: string;
  unit: string;
  v: ProfileInitial;
  set: (k: keyof ProfileInitial) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  cls: (k: string) => string;
  badge: (k: string) => React.ReactNode;
  err: (k: string) => React.ReactNode;
}) {
  const key = k === "diastolic" && badge("systolic") ? "systolic" : k;
  return (
    <div>
      <label htmlFor={k} className="label">
        {label} {badge(key)}
      </label>
      <div className="relative">
        <input id={k} name={k} inputMode="decimal" className={cls(key)} value={v[k]} onChange={set(k)} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>
      </div>
      {err(k)}
    </div>
  );
}
