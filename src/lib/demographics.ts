import "server-only";
import { db, nowIso } from "./db";
import { CUISINES } from "./cuisines";
import { COOKING, DIETARY_PATTERNS, GENDERS, HOUSEHOLD, PRACTICE_SETTINGS, WORK_PATTERNS, label, type Demographics } from "./demographics-options";

type Row = Omit<Demographics, "household" | "cuisines"> & { household_json: string | null; cuisines_json: string | null; updated_at: string };

const list = (json: string | null) => {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

export function getDemographics(userId: string): Demographics | null {
  const r = db().prepare("SELECT * FROM demographics WHERE user_id = ?").get(userId) as Row | undefined;
  if (!r) return null;
  const { household_json, cuisines_json, updated_at: _u, ...rest } = r;
  void _u;
  return { ...rest, household: list(household_json), cuisines: list(cuisines_json) };
}

export const preferredCuisines = (userId: string) => getDemographics(userId)?.cuisines ?? [];

const text = (fd: FormData, k: string, max = 80) => {
  const v = String(fd.get(k) ?? "").trim().slice(0, max);
  return v || null;
};
const int = (fd: FormData, k: string) => {
  const raw = String(fd.get(k) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : NaN;
};

/** Read and check the demographics fields from a form. `kind` decides which fields are required. */
export function parseDemographics(fd: FormData, kind: "member" | "clinician") {
  const errors: Record<string, string> = {};
  const age = int(fd, "age");
  if (kind === "member" && age == null) errors.age = "Enter your age.";
  else if (age != null && (Number.isNaN(age) || age < (kind === "member" ? 18 : 21) || age > 100)) errors.age = kind === "member" ? "NutriGoal is for adults 18 to 100." : "Enter an age between 21 and 100.";
  const gender = text(fd, "gender");
  if (gender && !GENDERS.includes(gender as (typeof GENDERS)[number])) errors.gender = "Choose an option.";
  const work = text(fd, "work_pattern");
  if (work && !WORK_PATTERNS.some((w) => w.id === work)) errors.work_pattern = "Choose an option.";
  const city = text(fd, "city");
  const region = text(fd, "region");
  const country = text(fd, "country");
  if (!country) errors.country = "Enter the country you live in.";
  if (kind === "member" && !city) errors.city = "Enter your city or town.";
  const size = int(fd, "household_size");
  if (size != null && (Number.isNaN(size) || size < 1 || size > 20)) errors.household_size = "Between 1 and 20.";
  const household = fd.getAll("household").map(String).filter((h) => HOUSEHOLD.some((x) => x.id === h));
  const cooking = text(fd, "cooking");
  if (cooking && !COOKING.some((c) => c.id === cooking)) errors.cooking = "Choose an option.";
  const cuisines = [...new Set(fd.getAll("cuisines").map(String).filter((c) => CUISINES.some((x) => x.id === c)))].slice(0, 8);
  const diet = text(fd, "dietary_pattern");
  if (diet && !DIETARY_PATTERNS.includes(diet as (typeof DIETARY_PATTERNS)[number])) errors.dietary_pattern = "Choose an option.";
  const years = int(fd, "years_in_practice");
  if (kind === "clinician" && (years == null || Number.isNaN(years) || years < 0 || years > 60)) errors.years_in_practice = "Enter your years in practice (0–60).";
  const setting = text(fd, "practice_setting");
  if (setting && !PRACTICE_SETTINGS.includes(setting as (typeof PRACTICE_SETTINGS)[number])) errors.practice_setting = "Choose an option.";

  const value: Demographics = {
    age: age != null && !Number.isNaN(age) ? age : null,
    gender,
    occupation: text(fd, "occupation"),
    work_pattern: work,
    city,
    region,
    country,
    household_size: size != null && !Number.isNaN(size) ? size : null,
    household: household.includes("alone") ? ["alone"] : household,
    cooking,
    languages: text(fd, "languages", 120),
    cultural_background: text(fd, "cultural_background", 120),
    cuisines,
    dietary_pattern: diet,
    years_in_practice: years != null && !Number.isNaN(years) ? years : null,
    practice_setting: setting,
    populations: text(fd, "populations", 200),
  };
  return { value, errors };
}

export function saveDemographics(userId: string, d: Demographics) {
  db()
    .prepare(
      `INSERT INTO demographics (user_id, age, gender, occupation, work_pattern, city, region, country, household_size, household_json, cooking,
         languages, cultural_background, cuisines_json, dietary_pattern, years_in_practice, practice_setting, populations, updated_at)
       VALUES (@user_id, @age, @gender, @occupation, @work_pattern, @city, @region, @country, @household_size, @household_json, @cooking,
         @languages, @cultural_background, @cuisines_json, @dietary_pattern, @years_in_practice, @practice_setting, @populations, @updated_at)
       ON CONFLICT(user_id) DO UPDATE SET age = excluded.age, gender = excluded.gender, occupation = excluded.occupation, work_pattern = excluded.work_pattern,
         city = excluded.city, region = excluded.region, country = excluded.country, household_size = excluded.household_size, household_json = excluded.household_json,
         cooking = excluded.cooking, languages = excluded.languages, cultural_background = excluded.cultural_background, cuisines_json = excluded.cuisines_json,
         dietary_pattern = excluded.dietary_pattern, years_in_practice = excluded.years_in_practice, practice_setting = excluded.practice_setting,
         populations = excluded.populations, updated_at = excluded.updated_at`,
    )
    .run({ ...d, user_id: userId, household_json: JSON.stringify(d.household), cuisines_json: JSON.stringify(d.cuisines), updated_at: nowIso() });
}

/** One-line summaries for clinicians reviewing a member's ticket (care context, not identity). */
export function demographicsSummary(d: Demographics | null) {
  if (!d) return [];
  const cuisines = d.cuisines.map((id) => CUISINES.find((c) => c.id === id)?.label).filter(Boolean).join(", ");
  const household = d.household.map((h) => label(HOUSEHOLD, h)).filter(Boolean).join(", ");
  return [
    ["Age", d.age != null ? String(d.age) : null],
    ["Gender", d.gender],
    ["Occupation", [d.occupation, label(WORK_PATTERNS, d.work_pattern)].filter(Boolean).join(" · ") || null],
    ["Lives in", [d.city, d.region, d.country].filter(Boolean).join(", ") || null],
    ["Household", [d.household_size ? `${d.household_size} ${d.household_size === 1 ? "person" : "people"}` : null, household].filter(Boolean).join(" · ") || null],
    ["Who cooks", label(COOKING, d.cooking)],
    ["Cuisines", cuisines || null],
    ["Eating pattern", d.dietary_pattern],
    ["Languages", d.languages],
    ["Cultural background", d.cultural_background],
  ].filter((x): x is [string, string] => !!x[1]);
}
