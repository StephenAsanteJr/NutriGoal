"use client";

import { useActionState, useState } from "react";
import { saveMemberSettings, type SimpleState } from "@/actions/settings";
import { LookPicker } from "@/components/LookPicker";
import { PhotoScanButton } from "@/components/PhotoScan";
import { Alert } from "@/components/ui";
import type { AvatarLook } from "@/components/AvatarBuild";
import { WEEKLY_RATES_LB, type Settings } from "@/lib/domain";

type Goals = {
  unitSystem: "imperial" | "metric";
  desiredWeight: string;
  desiredBodyFat: string;
  weeklyRateLb: number;
  autoCalories: number;
  minCalories: number;
};

/** MyFitnessPal-style settings, one card per section, each saved on its own. */
export function SettingsPanel({ settings, goals }: { settings: Settings; goals: Goals }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="hidden lg:block" aria-label="Settings sections">
        <ul className="sticky top-6 space-y-1 text-sm">
          {[
            ["character", "Character"],
            ["goals", "Goals & macros"],
            ["units", "Units"],
            ["diary", "Meals & diary"],
            ["reminders", "Reminders & nudges"],
            ["privacy", "Privacy & assistant"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#settings-${id}`} className="block rounded-[2px] px-3 py-2 font-bold text-slate hover:bg-white hover:text-navy">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-6">
        <CharacterCard settings={settings} />
        <GoalsCard settings={settings} goals={goals} />
        <UnitsCard settings={settings} unitSystem={goals.unitSystem} />
        <DiaryCard settings={settings} />
        <RemindersCard settings={settings} />
        <PrivacyCard settings={settings} />
      </div>
    </div>
  );
}

function SectionForm({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(saveMemberSettings, undefined);
  return (
    <form id={`settings-${id}`} action={action} className="card scroll-mt-24 p-6">
      <input type="hidden" name="section" value={id} />
      <div className="mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        {subtitle && <p className="text-sm text-slate">{subtitle}</p>}
      </div>
      <div className="space-y-4">
        {state?.error && <Alert>{state.error}</Alert>}
        {state?.ok && <Alert tone="good">{state.ok}</Alert>}
        {children}
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn-dark" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

function CharacterCard({ settings }: { settings: Settings }) {
  const [look, setLook] = useState<AvatarLook>({ skinTone: settings.skin_tone, hairStyle: settings.hair_style, hairColor: settings.hair_color });
  const [scanBf, setScanBf] = useState<number | null>(null);
  return (
    <SectionForm id="character" title="Character" subtitle="How your animated build looks. Scan a photo to match your skin tone.">
      <LookPicker
        value={look}
        onChange={setLook}
        extra={
          <div className="flex flex-wrap items-center gap-3">
            <PhotoScanButton
              onResult={(r) => {
                if (r.skinTone) setLook((l) => ({ ...l, skinTone: r.skinTone! }));
                if (r.bodyFatPct) setScanBf(r.bodyFatPct);
              }}
            />
            {scanBf && <span className="text-xs text-slate">Scan estimate {scanBf}% body fat (used only if your profile has none).</span>}
          </div>
        }
      />
      {scanBf && <input type="hidden" name="scan_body_fat" value={scanBf} />}
    </SectionForm>
  );
}

function GoalsCard({ settings, goals }: { settings: Settings; goals: Goals }) {
  const [c, setC] = useState(settings.macro_carbs);
  const [p, setP] = useState(settings.macro_protein);
  const [f, setF] = useState(settings.macro_fat);
  const [custom, setCustom] = useState(settings.calorie_goal_override != null);
  const total = c + p + f;
  const w = goals.unitSystem === "metric" ? "kg" : "lb";
  const rateLabel = (r: number) =>
    r === 0 ? "Maintain weight" : `${r < 0 ? "Lose" : "Gain"} ${Math.abs(r)} lb (${(Math.abs(r) * 0.4536).toFixed(2)} kg) per week`;
  return (
    <SectionForm id="goals" title="Goals & macros" subtitle="Like your fitness app's goals screen, with NutriGoal's safety limits applied.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold">
          Goal weight ({w})
          <input name="desired_weight" defaultValue={goals.desiredWeight} inputMode="decimal" className="input mt-1" required />
        </label>
        <label className="text-xs font-bold">
          Goal body fat % <span className="font-normal text-muted">(optional)</span>
          <input name="desired_body_fat_pct" defaultValue={goals.desiredBodyFat} inputMode="decimal" className="input mt-1" />
        </label>
        <label className="text-xs font-bold sm:col-span-2">
          Weekly goal
          <select name="weekly_rate_lb" defaultValue={String(goals.weeklyRateLb)} className="input mt-1">
            {WEEKLY_RATES_LB.map((r) => (
              <option key={r} value={r}>
                {rateLabel(r)}
                {r === -2 ? " (fastest; may be limited)" : ""}
              </option>
            ))}
          </select>
          <span className="hint block font-normal">If the pace is faster than is safe for your goal, NutriGoal uses the safe minimum timeline instead.</span>
        </label>
      </div>

      <div className="rounded-[2px] border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold">Daily calorie goal</span>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} className="accent-blue" /> Set a custom goal
          </label>
        </div>
        {custom ? (
          <label className="mt-2 block text-xs font-bold">
            Custom calories
            <input
              name="calorie_goal_override"
              inputMode="numeric"
              defaultValue={settings.calorie_goal_override ?? Math.round(goals.autoCalories)}
              className="input mt-1 max-w-[200px]"
            />
            <span className="hint block font-normal">Minimum {goals.minCalories.toLocaleString()} per day.</span>
          </label>
        ) : (
          <p className="mt-1 text-sm text-slate">
            Automatic: <strong className="text-navy">{Math.round(goals.autoCalories).toLocaleString()} kcal</strong> from your build and timeline.
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-bold">Macronutrient split</span>
          <span className={`text-xs font-bold ${total === 100 ? "text-good" : "text-alert"}`}>Total {total}%</span>
        </div>
        {[
          ["macro_carbs", "Carbohydrates", c, setC],
          ["macro_protein", "Protein", p, setP],
          ["macro_fat", "Fat", f, setF],
        ].map(([name, label, val, set]) => (
          <label key={name as string} className="mb-2 grid grid-cols-[110px_1fr_56px] items-center gap-3 text-sm">
            <span>{label as string}</span>
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              name={name as string}
              value={val as number}
              onChange={(e) => (set as (n: number) => void)(Number(e.target.value))}
              className="accent-blue"
            />
            <span className="text-right font-bold">{val as number}%</span>
          </label>
        ))}
      </div>
    </SectionForm>
  );
}

function Segmented({ name, value, options }: { name: string; value: string; options: [string, string][] }) {
  const [v, setV] = useState(value);
  return (
    <div className="inline-flex rounded-[2px] border border-line p-0.5 text-xs font-bold" role="radiogroup">
      <input type="hidden" name={name} value={v} />
      {options.map(([id, label]) => (
        <button key={id} type="button" role="radio" aria-checked={v === id} onClick={() => setV(id)} className={`rounded-[2px] px-3 py-1.5 ${v === id ? "bg-navy text-white" : "text-slate hover:text-navy"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function UnitsCard({ settings, unitSystem }: { settings: Settings; unitSystem: "imperial" | "metric" }) {
  return (
    <SectionForm id="units" title="Units">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="label">Weight & height</div>
          <Segmented name="unit_system" value={unitSystem} options={[["imperial", "lb · ft"], ["metric", "kg · cm"]]} />
        </div>
        <div>
          <div className="label">Energy</div>
          <Segmented name="energy_unit" value={settings.energy_unit} options={[["kcal", "Calories"], ["kJ", "Kilojoules"]]} />
        </div>
        <div>
          <div className="label">Water</div>
          <Segmented name="water_unit" value={settings.water_unit} options={[["oz", "Ounces"], ["ml", "Milliliters"]]} />
        </div>
      </div>
    </SectionForm>
  );
}

function DiaryCard({ settings }: { settings: Settings }) {
  const [names, setNames] = useState(settings.meal_names);
  return (
    <SectionForm id="diary" title="Meals & diary" subtitle="Rename or add meals. Your plan's per-meal targets follow these.">
      <ul className="space-y-2">
        {names.map((n, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 text-xs font-bold text-muted">{i + 1}</span>
            <input
              name="meal_name"
              value={n}
              maxLength={24}
              onChange={(e) => setNames((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
              className="input !py-2"
              aria-label={`Meal ${i + 1} name`}
            />
            <button type="button" className="btn-ghost !px-2 text-xs !text-muted" disabled={names.length <= 1} onClick={() => setNames((arr) => arr.filter((_, j) => j !== i))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      {names.length < 6 && (
        <button type="button" className="btn-ghost !px-2 text-xs" onClick={() => setNames((a) => [...a, `Meal ${a.length + 1}`])}>
          + Add a meal
        </button>
      )}
    </SectionForm>
  );
}

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[2px] border border-line px-4 py-3">
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-xs text-slate">{hint}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 accent-blue" />
    </label>
  );
}

function RemindersCard({ settings }: { settings: Settings }) {
  return (
    <SectionForm id="reminders" title="Reminders & nudges" subtitle="Daily Support Pack nudges are timed to your meals and never sent during quiet hours.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold">
          Weigh-in reminder
          <select name="weigh_in_reminder" defaultValue={settings.weigh_in_reminder} className="input mt-1">
            <option value="off">Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          Reminder time
          <input type="time" name="reminder_time" defaultValue={settings.reminder_time} className="input mt-1" />
        </label>
      </div>
      <Toggle name="nudges_enabled" label="Meal-timed nudges" hint="Protein, water and check-in reminders from your plan." defaultChecked={settings.nudges_enabled} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="text-xs font-bold">
          Nudges per day
          <select name="nudges_per_day" defaultValue={String(settings.nudges_per_day)} className="input mt-1">
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Quiet hours start
          <input type="time" name="quiet_start" defaultValue={settings.quiet_start} className="input mt-1" />
        </label>
        <label className="text-xs font-bold">
          Quiet hours end
          <input type="time" name="quiet_end" defaultValue={settings.quiet_end} className="input mt-1" />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Toggle name="channel_push" label="In-app & push" defaultChecked={settings.channel_push} />
        <Toggle name="channel_email" label="Email" defaultChecked={settings.channel_email} />
        <Toggle name="channel_sms" label="Text messages" hint="At most 1 a day" defaultChecked={settings.channel_sms} />
      </div>
    </SectionForm>
  );
}

function PrivacyCard({ settings }: { settings: Settings }) {
  return (
    <SectionForm id="privacy" title="Privacy & assistant">
      <Toggle
        name="share_progress_with_clinician"
        label="Share my progress with my clinicians"
        hint="Weigh-ins and trends appear next to your build when they review a ticket."
        defaultChecked={settings.share_progress_with_clinician}
      />
      <Toggle
        name="insights_opt_in"
        label="Contribute to anonymized research reports"
        hint="Group-level reports only, with names and IDs removed. Never sold for ad targeting. Off by default."
        defaultChecked={settings.insights_opt_in}
      />
      <Toggle name="assistant_enabled" label="NutriGoal Assistant" hint="The in-app AI helper for the marketplace and ticket follow-ups." defaultChecked={settings.assistant_enabled} />
      <Toggle name="voice_mode" label="Voice mode" hint="Show the microphone for speaking your tickets." defaultChecked={settings.voice_mode} />
    </SectionForm>
  );
}
