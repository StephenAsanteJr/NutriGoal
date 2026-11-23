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
