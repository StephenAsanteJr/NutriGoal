import { computeBuild, formatHeight, formatWeight, type BuildInput } from "@/lib/biometrics";
import { AvatarBuild, type AvatarLook } from "./AvatarBuild";
import { BiometricCard } from "./BiometricCard";

/** Physical build (left) with the biometric card beside it. */
export function BuildPanel(props: {
  name: string;
  memberId: string;
  input: BuildInput;
  units: "imperial" | "metric";
  medicationStage?: string | null;
  source?: string;
  updatedAt?: string;
  look: AvatarLook;
}) {
  const build = computeBuild(props.input);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="card flex flex-col self-start p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="eyebrow">Physical build</div>
          <div className="text-[11px] text-muted">Animated mock · not to scale</div>
        </div>
        <AvatarBuild
          className="mx-auto w-full max-w-[300px]"
          sex={props.input.sex}
          heightCm={props.input.heightCm}
          weightKg={props.input.weightKg}
          bodyFatPct={build.bodyFatPct}
          goalWeightKg={build.goalWeightKg}
          goalBodyFatPct={build.goalBodyFatPct}
          weeks={build.effectiveWeeks}
          units={props.units}
          heightLabel={formatHeight(props.input.heightCm, props.units)}
          look={props.look}
        />
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-muted">
              <th className="py-1.5 font-bold"> </th>
              <th className="py-1.5 font-bold">Now</th>
              <th className="py-1.5 font-bold">Goal</th>
              <th className="py-1.5 text-right font-bold">Change</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Weight", props.input.weightKg, build.goalWeightKg],
              ["Fat mass", build.fatMassKg, build.goalFatMassKg],
              ["Lean mass", build.leanMassKg, build.goalLeanMassKg],
            ].map(([label, now, goal]) => {
              const d = (goal as number) - (now as number);
              return (
                <tr key={label as string} className="border-b border-line last:border-0">
                  <td className="py-2 text-slate">{label}</td>
                  <td className="py-2 font-bold">{formatWeight(now as number, props.units)}</td>
                  <td className="py-2 font-bold text-bcg-deep">{formatWeight(goal as number, props.units)}</td>
                  <td className={`py-2 text-right text-xs font-bold ${Math.abs(d) < 0.3 ? "text-muted" : d < 0 ? "text-ink" : "text-good"}`}>
                    {Math.abs(d) < 0.3 ? "—" : `${d < 0 ? "−" : "+"}${formatWeight(Math.abs(d), props.units)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <BiometricCard
        name={props.name}
        memberId={props.memberId}
        input={props.input}
        build={build}
        units={props.units}
        medicationStage={props.medicationStage}
        source={props.source}
        updatedAt={props.updatedAt}
      />
    </div>
  );
}

export function memberCode(userId: string) {
  let h = 0;
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `NG-M-${String(h % 100000).padStart(5, "0")}`;
}

export function lookFrom(settings: { skin_tone: string; hair_style: string; hair_color: string; facial_hair?: string }): AvatarLook {
  return { skinTone: settings.skin_tone, hairStyle: settings.hair_style, hairColor: settings.hair_color, facialHair: settings.facial_hair ?? "none" };
}
