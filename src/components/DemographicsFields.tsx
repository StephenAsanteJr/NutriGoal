"use client";

import { useState } from "react";
import { CUISINES, REGIONS } from "@/lib/cuisines";
import { COOKING, COUNTRIES, DIETARY_PATTERNS, GENDERS, HOUSEHOLD, PRACTICE_SETTINGS, WORK_PATTERNS, type Demographics } from "@/lib/demographics-options";
import { Field } from "./ui";

/** Choose up to 8 cuisines, grouped by region. Posts each as a "cuisines" value. */
export function CuisinePicker({ initial = [], label = "Cuisines you eat most", hint }: { initial?: string[]; label?: string; hint?: string }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 8 ? [...p, id] : p));
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <p className="hint !mt-0 mb-2">{hint ?? "Up to 8. Your food guide shows ingredients from these first."}</p>
      {picked.map((id) => <input key={id} type="hidden" name="cuisines" value={id} />)}
      <div className="space-y-2.5">
        {REGIONS.map((r) => (
          <div key={r}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{r}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {CUISINES.filter((c) => c.region === r).map((c) => {
                const on = picked.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    title={c.note}
                    onClick={() => toggle(c.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${on ? "border-bcg-deep bg-bcg-tint text-bcg-deep" : "border-line text-ink hover:border-ink"}`}
                  >
                    {on ? "✓ " : ""}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The demographics section: who someone is and how they live, asked before biometrics (members)
 * or in the application (clinicians). Field names match lib/demographics.ts parseDemographics.
 */
export function DemographicsFields({ kind, initial, fe = {} }: { kind: "member" | "clinician"; initial?: Partial<Demographics> | null; fe?: Record<string, string> }) {
  const d = initial ?? {};
  const [alone, setAlone] = useState((d.household ?? []).includes("alone"));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={kind === "member" ? "Age" : "Age (optional)"} name="age" error={fe.age}>
          <input id="age" name="age" inputMode="numeric" defaultValue={d.age ?? ""} className="input" aria-invalid={!!fe.age} />
        </Field>
        <Field label="Gender (optional)" name="gender" error={fe.gender} className="sm:col-span-2">
          <select id="gender" name="gender" defaultValue={d.gender ?? ""} className="input">
            <option value="">Choose…</option>
            {GENDERS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
      </div>

      {kind === "member" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Occupation" name="occupation" hint="e.g. Nurse, software engineer, student">
            <input id="occupation" name="occupation" defaultValue={d.occupation ?? ""} autoComplete="organization-title" className="input" />
          </Field>
          <Field label="A typical workday" name="work_pattern" error={fe.work_pattern}>
            <select id="work_pattern" name="work_pattern" defaultValue={d.work_pattern ?? ""} className="input">
              <option value="">Choose…</option>
              {WORK_PATTERNS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Years in practice" name="years_in_practice" error={fe.years_in_practice}>
            <input id="years_in_practice" name="years_in_practice" inputMode="numeric" defaultValue={d.years_in_practice ?? ""} className="input" aria-invalid={!!fe.years_in_practice} />
          </Field>
          <Field label="Main practice setting" name="practice_setting" className="sm:col-span-2">
            <select id="practice_setting" name="practice_setting" defaultValue={d.practice_setting ?? ""} className="input">
              <option value="">Choose…</option>
              {PRACTICE_SETTINGS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="City or town" name="city" error={fe.city}>
          <input id="city" name="city" defaultValue={d.city ?? ""} autoComplete="address-level2" className="input" aria-invalid={!!fe.city} />
        </Field>
        <Field label="State, province or region" name="region">
          <input id="region" name="region" defaultValue={d.region ?? ""} autoComplete="address-level1" className="input" />
        </Field>
        <Field label="Country" name="country" error={fe.country}>
          <input id="country" name="country" list="ng-countries" defaultValue={d.country ?? "United States"} autoComplete="country-name" className="input" aria-invalid={!!fe.country} />
          <datalist id="ng-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
      </div>

      {kind === "member" && (
        <>
          <fieldset>
            <legend className="label">Who you live with</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {HOUSEHOLD.map((h) => (
                <label key={h.id} className="flex items-center gap-2 text-sm text-slate">
                  <input
                    type="checkbox"
                    name="household"
                    value={h.id}
                    defaultChecked={(d.household ?? []).includes(h.id)}
                    disabled={alone && h.id !== "alone"}
                    onChange={h.id === "alone" ? (e) => setAlone(e.target.checked) : undefined}
                    className="h-4 w-4 accent-bcg-deep"
                  />
                  {h.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="People in your household" name="household_size" error={fe.household_size} hint="Including you">
              <input id="household_size" name="household_size" inputMode="numeric" defaultValue={d.household_size ?? ""} className="input" aria-invalid={!!fe.household_size} />
            </Field>
            <Field label="Who does most of the cooking?" name="cooking">
              <select id="cooking" name="cooking" defaultValue={d.cooking ?? ""} className="input">
                <option value="">Choose…</option>
                {COOKING.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={kind === "member" ? "Languages you speak" : "Languages you can practice in"} name="languages" hint="e.g. English, Twi, Spanish">
          <input id="languages" name="languages" defaultValue={d.languages ?? ""} className="input" />
        </Field>
        <Field label="Cultural background (optional)" name="cultural_background" hint="In your own words, e.g. Ghanaian American">
          <input id="cultural_background" name="cultural_background" defaultValue={d.cultural_background ?? ""} className="input" />
        </Field>
      </div>

      {kind === "member" ? (
        <Field label="How you eat" name="dietary_pattern" hint="Religious, cultural or personal. Your clinician plans around it.">
          <select id="dietary_pattern" name="dietary_pattern" defaultValue={d.dietary_pattern ?? DIETARY_PATTERNS[0]} className="input">
            {DIETARY_PATTERNS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
      ) : (
        <Field label="Populations you serve (optional)" name="populations" hint="e.g. GLP-1 patients, athletes, pregnancy, older adults, Black and West African communities">
          <input id="populations" name="populations" defaultValue={d.populations ?? ""} className="input" />
        </Field>
      )}

      <CuisinePicker
        initial={d.cuisines ?? []}
        label={kind === "member" ? "Cuisines you eat most" : "Cuisines you know well"}
        hint={kind === "member" ? "Up to 8. Your food guide shows ingredients from these first." : "Up to 8. Helps match you with members who eat these cuisines."}
      />
    </div>
  );
}
