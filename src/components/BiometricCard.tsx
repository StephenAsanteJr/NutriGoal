import type { BuildInput, BuildResult } from "@/lib/biometrics";
import { formatHeight, formatWeight } from "@/lib/biometrics";
import { stageLabel } from "@/lib/domain";
import { FlagList } from "./FlagList";

type Props = {
  name: string;
  memberId: string;
  input: BuildInput;
  build: BuildResult;
  units: "imperial" | "metric";
  medicationStage?: string | null;
  source?: string;
  updatedAt?: string;
  showFlags?: boolean;
};

const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

export function BiometricCard({ name, memberId, input, build, units, medicationStage, source, updatedAt, showFlags = true }: Props) {
  const w = (kg: number) => formatWeight(kg, units);
  const labs = [
    input.systolic && input.diastolic ? ["Blood pressure", `${input.systolic}/${input.diastolic}`, "mmHg"] : null,
    input.a1c != null ? ["A1C", `${input.a1c}`, "%"] : null,
    input.fastingGlucose != null ? ["Fasting glucose", `${input.fastingGlucose}`, "mg/dL"] : null,
    input.totalCholesterol != null ? ["Total cholesterol", `${input.totalCholesterol}`, "mg/dL"] : null,
    input.ldl != null ? ["LDL", `${input.ldl}`, "mg/dL"] : null,
    input.hdl != null ? ["HDL", `${input.hdl}`, "mg/dL"] : null,
    input.triglycerides != null ? ["Triglycerides", `${input.triglycerides}`, "mg/dL"] : null,
    input.vitaminD != null ? ["Vitamin D", `${input.vitaminD}`, "ng/mL"] : null,
  ].filter(Boolean) as [string, string, string][];

  const change = build.weightChangeKg;
  const changeText =
    Math.abs(change) < 0.5 ? "Maintain weight" : `${change < 0 ? "−" : "+"}${w(Math.abs(change))} over ${build.effectiveWeeks} wks`;

  return (
    <section className="card overflow-hidden" aria-label="Biometric card">
      <header className="bg-navy px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-bcg-fresh">Biometric card</div>
            <div className="font-display mt-1 text-2xl leading-tight">{name}</div>
            <div className="mt-1 text-xs text-white/70">
              {input.age} yrs · {input.sex === "male" ? "Male" : "Female"} · {formatHeight(input.heightCm, units)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs tracking-wider text-white/80">{memberId}</div>
            {source && (
              <div className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
                {source === "manual" ? "Self-reported" : source === "report+manual" ? "Report + self-reported" : "From report"}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px bg-line">
        <Metric label="BMI" value={fmt(build.bmi, 1)} sub={build.bmiCategory} />
        <Metric
          label="Body fat"
          value={`${fmt(build.bodyFatPct, 0)}%`}
          sub={`Goal ${fmt(build.goalBodyFatPct, 0)}%${build.bodyFatEstimated ? " · estimated" : ""}`}
        />
        <Metric label="Lean mass" value={w(build.leanMassKg)} sub={`Goal ${w(build.goalLeanMassKg)}`} />
        <Metric label="Fat mass" value={w(build.fatMassKg)} sub={`Goal ${w(build.goalFatMassKg)}`} />
        <Metric label="Resting energy (BMR)" value={`${fmt(build.bmr)} kcal`} sub={build.bmrMethod} />
        <Metric label="Daily burn (TDEE)" value={`${fmt(build.tdee)} kcal`} sub={build.activityLabel} />
        <Metric label="Daily target" value={`${fmt(build.targetCalories)} kcal`} sub={changeText} accent />
        <Metric label="Protein" value={`${fmt(build.proteinG)} g/day`} sub={`Water ${build.waterL} L/day`} accent />
        <Metric
          label="Meals"
          value={input.mealsPerDay ? `${input.mealsPerDay} a day` : "—"}
          sub={build.perMealCalories ? `~${fmt(build.perMealCalories)} kcal each` : undefined}
        />
        <Metric
          label="Est. intake today"
          value={input.estCalories ? `${fmt(input.estCalories)} kcal` : "—"}
          sub={
            build.intakeGap != null
              ? `${build.intakeGap > 0 ? "+" : "−"}${fmt(Math.abs(build.intakeGap))} vs. burn`
              : undefined
          }
        />
        <Metric
          label="Timeline"
          value={`${build.effectiveWeeks} weeks`}
          sub={`Safe range ${build.safe.minWeeks}–${build.safe.recommendedWeeks}+ wks`}
        />
        <Metric label="Medication" value={stageLabel(medicationStage)} small />
      </div>

      {labs.length > 0 && (
        <div className="border-t border-line px-5 py-4">
          <div className="eyebrow mb-2 !text-slate">Labs</div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {labs.map(([k, v, u]) => (
              <div key={k} className="flex items-baseline justify-between gap-2 border-b border-dashed border-line pb-1">
                <dt className="text-slate">{k}</dt>
                <dd className="font-bold">
                  {v} <span className="text-[11px] font-normal text-muted">{u}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {showFlags && build.flags.length > 0 && (
        <div className="border-t border-line px-5 py-4">
          <FlagList flags={build.flags} />
        </div>
      )}
      {updatedAt && (
        <div className="border-t border-line px-5 py-2 text-[11px] text-muted">
          Updated {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, sub, accent, small }: { label: string; value: string; sub?: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="bg-white px-5 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={`${small ? "text-sm" : "text-lg"} mt-0.5 font-bold ${accent ? "text-blue" : "text-navy"}`}>{value}</div>
      {sub && <div className="text-xs text-slate">{sub}</div>}
    </div>
  );
}
