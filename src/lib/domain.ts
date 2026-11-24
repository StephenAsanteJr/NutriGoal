// Shared domain constants for NutriGoal. Safe to import from client and server.

export const PRICES = {
  ticketOneTime: 1999, // $19.99 single ticket
  subscriptionMonthly: 2999, // $29.99 / month
  subscriptionYearly: 30000, // $300 / year
  extraTicketMember: 1499, // extra ticket for members once the monthly ticket is used
  supportPack: 799, // Daily Support Pack, $7.99 / month (included in membership)
} as const;

export const MEMBERSHIP = {
  ticketsPerMonth: 1,
  includesSupportPack: true,
  responseSlaHours: 48,
} as const;

export const GOAL_TYPES = [
  { id: "fat_loss", label: "Lose body fat" },
  { id: "muscle_gain", label: "Build muscle" },
  { id: "protein", label: "Hit a protein target" },
  { id: "blood_sugar", label: "Improve blood sugar / A1C" },
  { id: "heart_health", label: "Heart health & cholesterol" },
  { id: "glp1_side_effects", label: "Eat well through GLP-1 side effects" },
  { id: "keep_weight_off", label: "Keep the weight off" },
  { id: "budget_meals", label: "Healthy meals on a budget" },
] as const;
export type GoalType = (typeof GOAL_TYPES)[number]["id"];

export const MEDICATION_STAGES = [
  { id: "none", label: "No weight-loss medication" },
  { id: "considering", label: "Considering a GLP-1" },
  { id: "starting", label: "Starting a GLP-1 (first 3 months)" },
  { id: "on_glp1", label: "On a GLP-1" },
  { id: "coming_off", label: "Coming off a GLP-1" },
] as const;
export type MedicationStage = (typeof MEDICATION_STAGES)[number]["id"];

export const TICKET_STATUS = {
  awaiting_payment: { label: "Awaiting payment", tone: "warn" },
  assigned: { label: "With your clinician", tone: "info" },
  in_review: { label: "Clinician reviewing", tone: "info" },
  responded: { label: "Response ready", tone: "good" },
} as const;
export type TicketStatus = keyof typeof TICKET_STATUS;

export const PARTNER_CATEGORIES = [
  { id: "grocer", label: "Grocers", singular: "Grocer" },
  { id: "retailer", label: "Retailers", singular: "Retailer" },
  { id: "pharmacy", label: "Pharmacies", singular: "Pharmacy" },
  { id: "coach", label: "Fitness coaches", singular: "Fitness coach" },
] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number]["id"];

export const TIMEFRAME_PRESETS = [
  "Today",
  "Days 1–3",
  "Week 1",
  "Weeks 1–2",
  "Weeks 2–4",
  "Month 2",
  "Months 2–3",
  "Ongoing",
];

export function goalLabel(id: string | null | undefined) {
  return GOAL_TYPES.find((g) => g.id === id)?.label ?? "General nutrition";
}

export function stageLabel(id: string | null | undefined) {
  return MEDICATION_STAGES.find((s) => s.id === id)?.label ?? "Not shared";
}

export function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 && cents >= 10000 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ticketNumber(id: number) {
  return `NG-${1000 + id}`;
}

// ---------- Avatar (animated character) ----------
export const SKIN_TONES = [
  { id: "tone1", label: "Light", hex: "#f6dccb", shade: "#e6c0a8" },
  { id: "tone2", label: "Light-medium", hex: "#eec3a0", shade: "#dca883" },
  { id: "tone3", label: "Medium", hex: "#d8a27c", shade: "#c28862" },
  { id: "tone4", label: "Tan", hex: "#ba7f56", shade: "#a26a43" },
  { id: "tone5", label: "Brown", hex: "#8d5a39", shade: "#76482b" },
  { id: "tone6", label: "Dark brown", hex: "#63402a", shade: "#51321f" },
  { id: "tone7", label: "Deep", hex: "#432a1b", shade: "#331f13" },
] as const;
export type SkinToneId = (typeof SKIN_TONES)[number]["id"];

export const HAIR_STYLES = [
  { id: "short", label: "Short" },
  { id: "long", label: "Long" },
  { id: "curly", label: "Curly" },
  { id: "bun", label: "Bun" },
  { id: "buzz", label: "Buzz / none" },
] as const;
export type HairStyleId = (typeof HAIR_STYLES)[number]["id"];

export const HAIR_COLORS = [
  { id: "#120c0a", label: "Black" },
  { id: "#2b1b12", label: "Dark brown" },
  { id: "#5a3825", label: "Brown" },
  { id: "#7a3b1e", label: "Auburn" },
  { id: "#c9a45c", label: "Blonde" },
  { id: "#9a9a9a", label: "Gray" },
] as const;

export function skinTone(id: string | null | undefined) {
  return SKIN_TONES.find((t) => t.id === id) ?? SKIN_TONES[2];
}

/** Nearest palette tone to an RGB colour sampled from a photo. */
export function nearestSkinTone(r: number, g: number, b: number) {
  let best: (typeof SKIN_TONES)[number] = SKIN_TONES[2];
  let bestD = Infinity;
  for (const t of SKIN_TONES) {
    const tr = parseInt(t.hex.slice(1, 3), 16);
    const tg = parseInt(t.hex.slice(3, 5), 16);
    const tb = parseInt(t.hex.slice(5, 7), 16);
    // Weighted RGB distance (perceptual approximation)
    const d = 2 * (r - tr) ** 2 + 4 * (g - tg) ** 2 + 3 * (b - tb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

// ---------- Settings (MyFitnessPal-style) ----------
export type Settings = {
  skin_tone: SkinToneId;
  hair_style: HairStyleId;
  hair_color: string;
  energy_unit: "kcal" | "kJ";
  water_unit: "oz" | "ml";
  calorie_goal_override: number | null;
  macro_carbs: number;
  macro_protein: number;
  macro_fat: number;
  meal_names: string[];
  weigh_in_reminder: "off" | "daily" | "weekly";
  reminder_time: string;
  nudges_enabled: boolean;
  nudges_per_day: number;
  quiet_start: string;
  quiet_end: string;
  channel_push: boolean;
  channel_email: boolean;
  channel_sms: boolean;
  share_progress_with_clinician: boolean;
  insights_opt_in: boolean;
  voice_mode: boolean;
  assistant_enabled: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  skin_tone: "tone3",
  hair_style: "short",
  hair_color: "#2b1b12",
  energy_unit: "kcal",
  water_unit: "oz",
  calorie_goal_override: null,
  macro_carbs: 40,
  macro_protein: 30,
  macro_fat: 30,
  meal_names: ["Breakfast", "Lunch", "Dinner", "Snacks"],
  weigh_in_reminder: "weekly",
  reminder_time: "08:00",
  nudges_enabled: true,
  nudges_per_day: 3,
  quiet_start: "21:00",
  quiet_end: "08:00",
  channel_push: true,
  channel_email: true,
  channel_sms: false,
  share_progress_with_clinician: true,
  insights_opt_in: false,
  voice_mode: true,
  assistant_enabled: true,
};

/** MyFitnessPal-style weekly goal options (lb per week; negative = lose). */
export const WEEKLY_RATES_LB = [-2, -1.5, -1, -0.5, 0, 0.25, 0.5] as const;

export function energy(kcal: number, unit: "kcal" | "kJ") {
  return unit === "kJ" ? `${Math.round(kcal * 4.184).toLocaleString()} kJ` : `${Math.round(kcal).toLocaleString()} kcal`;
}

// ---------- Food-tracking app recommendations (independent; not sponsored) ----------
export const TRACKING_APPS = [
  {
    id: "myfitnesspal",
    name: "MyFitnessPal",
    bestFor: "Beginners: the biggest food database and barcode scanning make logging quick.",
    price: "Free; Premium $19.99/mo or $79.99/yr",
    export: "Premium → Settings → Export data. Upload the Nutrition CSV here.",
    url: "https://www.myfitnesspal.com",
    goals: ["fat_loss", "budget_meals", "keep_weight_off"],
  },
  {
    id: "cronometer",
    name: "Cronometer",
    bestFor: "Lab-driven goals: tracks micronutrients like fiber, sodium, iron and vitamin D in detail.",
    price: "Free; Gold $8.49/mo or $54.99/yr",
    export: "Web app → Settings → Account → Export Data → Daily Nutrition. Upload dailysummary.csv.",
    url: "https://cronometer.com",
    goals: ["blood_sugar", "heart_health", "glp1_side_effects", "protein"],
  },
  {
    id: "macrofactor",
    name: "MacroFactor",
    bestFor: "Body recomposition: targets adjust automatically to your weigh-ins and intake.",
    price: "Subscription with free trial",
    export: "More → Data Management → Data Export. Upload the nutrition CSV.",
    url: "https://macrofactorapp.com",
    goals: ["muscle_gain", "fat_loss", "protein"],
  },
  {
    id: "fatsecret",
    name: "FatSecret",
    bestFor: "Budget-friendly: a full-featured free tracker with a large food database.",
    price: "Free; Premium available",
    export: "Export your food diary to CSV, or send days to NutriGoal through our API.",
    url: "https://www.fatsecret.com",
    goals: ["budget_meals", "fat_loss"],
  },
  {
    id: "loseit",
    name: "Lose It!",
    bestFor: "Simplicity: a daily calorie budget, streaks and a clean interface.",
    price: "Free; Premium $79.99/yr",
    export: "Premium → Export data to CSV, then upload it here.",
    url: "https://www.loseit.com",
    goals: ["fat_loss", "keep_weight_off"],
  },
] as const;
export type TrackingAppId = (typeof TRACKING_APPS)[number]["id"];
