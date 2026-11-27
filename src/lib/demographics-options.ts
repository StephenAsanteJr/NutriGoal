// Options for the demographics section (asked before biometrics). Safe for client and server.

export const GENDERS = ["Woman", "Man", "Non-binary", "Prefer to self-describe", "Prefer not to say"] as const;

export const WORK_PATTERNS = [
  { id: "desk", label: "Mostly sitting (desk, driving)" },
  { id: "feet", label: "On my feet (retail, teaching, healthcare)" },
  { id: "physical", label: "Physical work (trades, warehouse, farming)" },
  { id: "shift", label: "Shift or night work" },
  { id: "student", label: "Student" },
  { id: "home", label: "Caregiver or homemaker" },
  { id: "retired", label: "Retired" },
  { id: "other", label: "Other / between jobs" },
] as const;

export const HOUSEHOLD = [
  { id: "alone", label: "I live alone" },
  { id: "partner", label: "Partner or spouse" },
  { id: "children", label: "Children under 12" },
  { id: "teens", label: "Teenagers" },
  { id: "adult_children", label: "Adult children" },
  { id: "parents", label: "Parents or older relatives" },
  { id: "roommates", label: "Roommates" },
  { id: "other", label: "Other family" },
] as const;

export const COOKING = [
  { id: "me", label: "Mostly me" },
  { id: "shared", label: "Shared" },
  { id: "someone_else", label: "Someone else" },
  { id: "eat_out", label: "We mostly eat out or order in" },
] as const;

export const DIETARY_PATTERNS = [
  "No particular pattern",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Halal",
  "Kosher",
  "Hindu vegetarian (no egg)",
  "Jain",
  "Gluten-free",
  "Dairy-free",
  "Low-carb or keto",
  "Other",
] as const;

export const PRACTICE_SETTINGS = [
  "Hospital or health system",
  "Outpatient clinic",
  "Private practice",
  "Telehealth",
  "Community or public health",
  "Academic or research",
  "Sports or performance",
  "Long-term care",
] as const;

export const COUNTRIES = [
  "United States", "Canada", "Mexico", "Brazil", "United Kingdom", "Ireland", "France", "Germany", "Italy", "Spain", "Portugal", "Greece",
  "Netherlands", "Sweden", "Norway", "Poland", "Ukraine", "Turkey", "Lebanon", "Israel", "Iran", "Egypt", "Morocco", "Nigeria", "Ghana",
  "Senegal", "Ethiopia", "Kenya", "South Africa", "India", "Pakistan", "Bangladesh", "Sri Lanka", "China", "Japan", "South Korea",
  "Philippines", "Vietnam", "Thailand", "Indonesia", "Malaysia", "Australia", "New Zealand", "Jamaica", "Haiti", "Trinidad and Tobago",
  "Dominican Republic", "Puerto Rico", "Colombia", "Peru", "Argentina", "Chile",
] as const;

export type Demographics = {
  age: number | null;
  gender: string | null;
  occupation: string | null;
  work_pattern: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  household_size: number | null;
  household: string[];
  cooking: string | null;
  languages: string | null;
  cultural_background: string | null;
  cuisines: string[];
  dietary_pattern: string | null;
  years_in_practice: number | null;
  practice_setting: string | null;
  populations: string | null;
};

export const label = <T extends { id: string; label: string }>(list: readonly T[], id: string | null | undefined) => list.find((x) => x.id === id)?.label ?? null;
