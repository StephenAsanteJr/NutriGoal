// Pure biometric calculations used for the member "build" and biometric card.
// All inputs are metric. Safe to import on client and server.

export type Sex = "female" | "male";

export type BuildInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number | null;
  mealsPerDay?: number | null;
  estCalories?: number | null;
  workoutMinPerDay?: number | null;
  desiredWeightKg?: number | null;
  desiredBodyFatPct?: number | null;
  timeframeWeeks?: number | null;
  // Optional lab values (usually from a medical checkup report)
  systolic?: number | null;
  diastolic?: number | null;
  a1c?: number | null;
  fastingGlucose?: number | null;
  ldl?: number | null;
  hdl?: number | null;
  triglycerides?: number | null;
  totalCholesterol?: number | null;
  vitaminD?: number | null;
};

export type Flag = { level: "info" | "warn" | "alert"; text: string };

export type SafeTimeframe = {
  direction: "lose" | "gain" | "maintain";
  minWeeks: number;
  recommendedWeeks: number;
  maxWeeks: number;
  explanation: string;
};

export type BuildResult = {
  bmi: number;
  bmiCategory: string;
  bodyFatPct: number;
  bodyFatEstimated: boolean;
  leanMassKg: number;
  fatMassKg: number;
  bmr: number;
  bmrMethod: string;
  activityFactor: number;
  activityLabel: string;
  tdee: number;
  goalWeightKg: number;
  goalBodyFatPct: number;
  goalLeanMassKg: number;
  goalFatMassKg: number;
  weightChangeKg: number;
  safe: SafeTimeframe;
  effectiveWeeks: number;
  timeframeAdjusted: boolean;
  dailyEnergyDelta: number;
  targetCalories: number;
  proteinG: number;
  waterL: number;
  perMealCalories: number | null;
  intakeGap: number | null;
  flags: Flag[];
};

const KCAL_PER_KG = 7700;

export function bmiOf(weightKg: number, heightCm: number) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(bmi: number) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obesity class I";
  if (bmi < 40) return "Obesity class II";
  return "Obesity class III";
}

/** Deurenberg (1991) adult estimate, used only when body fat is not provided. */
export function estimateBodyFat(bmi: number, age: number, sex: Sex) {
  const v = 1.2 * bmi + 0.23 * age - 10.8 * (sex === "male" ? 1 : 0) - 5.4;
  return clamp(v, sex === "male" ? 5 : 12, 60);
}

export function activityFromWorkout(min: number | null | undefined) {
  const m = min ?? 0;
  if (m <= 0) return { factor: 1.2, label: "Sedentary" };
  if (m <= 20) return { factor: 1.375, label: "Lightly active" };
  if (m <= 45) return { factor: 1.55, label: "Moderately active" };
  if (m <= 75) return { factor: 1.725, label: "Very active" };
  return { factor: 1.9, label: "Athlete level" };
}

/** Lowest goal weight the platform accepts (BMI 18.5). */
export function minHealthyWeightKg(heightCm: number) {
  const m = heightCm / 100;
  return 18.5 * m * m;
}

/** Lowest goal body fat the platform accepts. */
export function minGoalBodyFat(sex: Sex) {
  return sex === "male" ? 8 : 15;
}

/**
 * The platform's "reason" for a goal timeframe:
 *  - fat loss: at most 1% of body weight per week (recommended 0.75%)
 *  - muscle gain: at most 0.35% of body weight per week (recommended 0.25%)
 *  - body fat: at most 0.5 percentage points per week (recommended 0.35)
 */
export function safeTimeframe(input: {
  sex: Sex;
  weightKg: number;
  desiredWeightKg?: number | null;
  bodyFatPct: number;
  desiredBodyFatPct?: number | null;
}): SafeTimeframe {
  const goalW = input.desiredWeightKg ?? input.weightKg;
  const diff = goalW - input.weightKg;
  const bfDrop =
    input.desiredBodyFatPct != null
      ? Math.max(0, input.bodyFatPct - input.desiredBodyFatPct)
      : 0;

  let direction: SafeTimeframe["direction"] = "maintain";
  let minW = 4;
  let recW = 12;
  let explanation = "Maintenance goals are reviewed over at least 4 weeks.";

  if (diff < -0.5) {
    direction = "lose";
    const loss = -diff;
    minW = Math.ceil(loss / (0.01 * input.weightKg));
    recW = Math.ceil(loss / (0.0075 * input.weightKg));
    explanation =
      "Safe fat loss is up to 1% of body weight per week; 0.75% is easier to sustain and protects muscle.";
  } else if (diff > 0.5) {
    direction = "gain";
    minW = Math.ceil(diff / (0.0035 * input.weightKg));
    recW = Math.ceil(diff / (0.0025 * input.weightKg));
    explanation =
      "Lean gains of about 0.25% of body weight per week keep added fat low.";
  }

  if (bfDrop > 0) {
    minW = Math.max(minW, Math.ceil(bfDrop / 0.5));
    recW = Math.max(recW, Math.ceil(bfDrop / 0.35));
    if (direction === "maintain") {
      direction = "lose";
      explanation =
        "Body fat can drop about 0.35–0.5 percentage points per week while keeping muscle.";
    }
  }

  minW = Math.max(4, minW);
  recW = Math.max(minW, recW);
  return {
    direction,
    minWeeks: minW,
    recommendedWeeks: recW,
    maxWeeks: Math.max(recW * 2, 52),
    explanation,
  };
}

export function computeBuild(input: BuildInput): BuildResult {
  const flags: Flag[] = [];
  const bmi = bmiOf(input.weightKg, input.heightCm);
  const bfKnown = input.bodyFatPct != null && input.bodyFatPct > 0;
  const bodyFatPct = bfKnown
    ? input.bodyFatPct!
    : estimateBodyFat(bmi, input.age, input.sex);
  const fatMassKg = (input.weightKg * bodyFatPct) / 100;
  const leanMassKg = input.weightKg - fatMassKg;

  // Resting energy: Katch-McArdle when body fat is measured, else Mifflin-St Jeor.
  let bmr: number;
  let bmrMethod: string;
  if (bfKnown) {
    bmr = 370 + 21.6 * leanMassKg;
    bmrMethod = "Katch-McArdle (uses lean mass)";
  } else {
    bmr =
      10 * input.weightKg +
      6.25 * input.heightCm -
      5 * input.age +
      (input.sex === "male" ? 5 : -161);
    bmrMethod = "Mifflin-St Jeor";
  }

  const act = activityFromWorkout(input.workoutMinPerDay);
  const tdee = bmr * act.factor;

  const goalWeightKg = input.desiredWeightKg ?? input.weightKg;
  const goalBodyFatPct = input.desiredBodyFatPct ?? bodyFatPct;
  const goalFatMassKg = (goalWeightKg * goalBodyFatPct) / 100;
  const goalLeanMassKg = goalWeightKg - goalFatMassKg;
  const weightChangeKg = goalWeightKg - input.weightKg;

  const safe = safeTimeframe({
    sex: input.sex,
    weightKg: input.weightKg,
    desiredWeightKg: input.desiredWeightKg,
    bodyFatPct,
    desiredBodyFatPct: input.desiredBodyFatPct,
  });
  const requested = input.timeframeWeeks ?? safe.recommendedWeeks;
  const timeframeAdjusted = requested < safe.minWeeks;
  const effectiveWeeks = Math.max(requested, safe.minWeeks);

  let dailyEnergyDelta = (weightChangeKg * KCAL_PER_KG) / (effectiveWeeks * 7);
  if (dailyEnergyDelta < 0) dailyEnergyDelta = Math.max(dailyEnergyDelta, -0.25 * tdee, -1000);
  if (dailyEnergyDelta > 0) dailyEnergyDelta = Math.min(dailyEnergyDelta, 500);
  const floor = input.sex === "male" ? 1500 : 1200;
  const targetCalories = Math.max(floor, tdee + dailyEnergyDelta);

  const proteinG = roundTo(1.6 * goalWeightKg, 5);
  const waterL = Math.round(input.weightKg * 0.035 * 10) / 10;
  const meals = input.mealsPerDay && input.mealsPerDay > 0 ? input.mealsPerDay : null;
  const perMealCalories = meals ? targetCalories / meals : null;
  const intakeGap =
    input.estCalories != null && input.estCalories > 0 ? input.estCalories - tdee : null;

  // ---- Flags for members and clinicians ----
  if (bmi >= 40) flags.push({ level: "alert", text: `BMI ${bmi.toFixed(1)} (class III obesity range)` });
  else if (bmi >= 30) flags.push({ level: "warn", text: `BMI ${bmi.toFixed(1)} (obesity range)` });
  else if (bmi < 18.5) flags.push({ level: "warn", text: `BMI ${bmi.toFixed(1)} (below healthy range)` });

  if (input.a1c != null) {
    if (input.a1c >= 6.5) flags.push({ level: "alert", text: `A1C ${input.a1c}% (diabetes range)` });
    else if (input.a1c >= 5.7) flags.push({ level: "warn", text: `A1C ${input.a1c}% (prediabetes range)` });
  }
  if (input.fastingGlucose != null) {
    if (input.fastingGlucose >= 126)
      flags.push({ level: "alert", text: `Fasting glucose ${input.fastingGlucose} mg/dL` });
    else if (input.fastingGlucose >= 100)
      flags.push({ level: "warn", text: `Fasting glucose ${input.fastingGlucose} mg/dL (elevated)` });
  }
  if (input.systolic != null && input.diastolic != null) {
    const bp = `${input.systolic}/${input.diastolic}`;
    if (input.systolic >= 140 || input.diastolic >= 90)
      flags.push({ level: "alert", text: `Blood pressure ${bp} (stage 2 range)` });
    else if (input.systolic >= 130 || input.diastolic >= 80)
      flags.push({ level: "warn", text: `Blood pressure ${bp} (stage 1 range)` });
  }
  if (input.ldl != null) {
    if (input.ldl >= 190) flags.push({ level: "alert", text: `LDL ${input.ldl} mg/dL (very high)` });
    else if (input.ldl >= 160) flags.push({ level: "warn", text: `LDL ${input.ldl} mg/dL (high)` });
  }
  if (input.triglycerides != null && input.triglycerides >= 200)
    flags.push({ level: "warn", text: `Triglycerides ${input.triglycerides} mg/dL (high)` });
  if (input.hdl != null && input.hdl < (input.sex === "male" ? 40 : 50))
    flags.push({ level: "info", text: `HDL ${input.hdl} mg/dL (below target)` });
  if (input.vitaminD != null && input.vitaminD < 20)
    flags.push({ level: "warn", text: `Vitamin D ${input.vitaminD} ng/mL (deficient)` });
  if (input.estCalories != null && input.estCalories > 0 && input.estCalories < bmr * 0.9)
    flags.push({ level: "warn", text: "Estimated intake is below resting energy needs" });
  if (timeframeAdjusted)
    flags.push({
      level: "info",
      text: `Timeframe extended to ${safe.minWeeks} weeks (platform safe minimum)`,
    });
  if (!bfKnown) flags.push({ level: "info", text: "Body fat estimated from BMI, age and sex" });

  return {
    bmi,
    bmiCategory: bmiCategory(bmi),
    bodyFatPct,
    bodyFatEstimated: !bfKnown,
    leanMassKg,
    fatMassKg,
    bmr,
    bmrMethod,
    activityFactor: act.factor,
    activityLabel: act.label,
    tdee,
    goalWeightKg,
    goalBodyFatPct,
    goalLeanMassKg,
    goalFatMassKg,
    weightChangeKg,
    safe,
    effectiveWeeks,
    timeframeAdjusted,
    dailyEnergyDelta,
    targetCalories,
    proteinG,
    waterL,
    perMealCalories,
    intakeGap,
    flags,
  };
}

// ---- unit helpers ----
export const lbToKg = (lb: number) => lb * 0.45359237;
export const kgToLb = (kg: number) => kg / 0.45359237;
export const inToCm = (inch: number) => inch * 2.54;
export const cmToIn = (cm: number) => cm / 2.54;
export function cmToFtIn(cm: number) {
  const total = Math.round(cmToIn(cm));
  return { ft: Math.floor(total / 12), inch: total % 12 };
}
export function formatHeight(cm: number, units: "imperial" | "metric") {
  if (units === "metric") return `${Math.round(cm)} cm`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}′${inch}″`;
}
export function formatWeight(kg: number, units: "imperial" | "metric") {
  return units === "metric" ? `${kg.toFixed(1)} kg` : `${Math.round(kgToLb(kg))} lb`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function roundTo(v: number, step: number) {
  return Math.round(v / step) * step;
}
