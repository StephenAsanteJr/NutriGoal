// The signed-in "home" payload, loaded once by the tab layout and shared with every tab
// (home, build, team, account and the tab badges), so switching tabs doesn't refetch it.
import { createContext, useContext } from "react";
import type { Look } from "@/components/Character";

export type TicketSummary = {
  id: number;
  number: string;
  goal: string;
  goalType: string;
  status: string;
  statusLabel: string;
  member: string;
  clinician: string | null;
  dueAt: string | null;
  respondedAt: string | null;
  nudges: number;
};

export type FoodExample = { name: string; serving: string; kcal: number; protein: number; carbs: number; fat: number; match: number };
export type CuisineRef = { id: string; label: string; region: string };
export type FoodGuideData = {
  preferred?: string[];
  cuisines?: CuisineRef[];
  match: { kcal: number; protein: number; carbs: number; fat: number; overall: number };
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  rows: { id: string; label: string; hint: string; servings: number; typical: { serving: string }; examples: FoodExample[] }[];
};
/** Foods a clinician suggested on a response, by food group id. */
export type ClinicianFoods = Partial<Record<"protein" | "grains" | "produce" | "dairy" | "fats", string[]>>;
export const FOOD_GROUP_LABELS: Record<keyof ClinicianFoods, string> = {
  protein: "Protein foods", grains: "Grains, starches & beans", produce: "Fruits & vegetables", dairy: "Dairy & alternatives", fats: "Healthy fats",
};

export type MemberHome = {
  role: "member";
  name: string;
  unread: number;
  units: "imperial" | "metric";
  build: {
    weightKg: number; goalWeightKg: number; bodyFatPct: number; goalBodyFatPct: number; bmi: number;
    targetKcal: number; proteinG: number; weeks: number; sex: "male" | "female"; heightCm: number;
  } | null;
  look: Look;
  membership: { plan: string; credits: number } | null;
  marketplace: boolean;
  nutrition: { avgKcal: number | null; avgProtein: number | null; insights: string[] } | null;
  tickets: TicketSummary[];
  foodGuide?: FoodGuideData | null;
};

export type ClinicianHome = {
  role: "clinician";
  name: string;
  credential: string | null;
  unread: number;
  counts: { open: number; dueSoon: number; nudged: number; responded: number };
  queue: TicketSummary[];
  stats?: {
    utilization: number; thisWeek: number; capacity: number; earnings: number; earningsAllTime: number; plans: number;
    retention: number | null; retained: number; served: number; rating: number | null; ratings: number;
    referralRate: number | null; referralSignups: number; referralConverted: number; referralLink: string | null;
  } | null;
};

export type ManagerHome = {
  role: "manager";
  name: string;
  unread: number;
  kpis: { open: number; dueSoon: number; revenue30: string; members: number };
  clinicians: { id: string; name: string; credential: string; open: number; done: number }[];
  queue: TicketSummary[];
  dashboards?: {
    ops: { submitted: number; responded: number; avgHours: number | null; sla: number | null; overdue: number; rating: number | null; newMembers: number; clinicians: number };
    finance: { revenue: number; payouts: number; margin: number; marginPct: number | null; mrr: number; activeSubs: number; churn: number | null };
  };
};

/** Organizational manager: de-identified group totals only (no names, tickets or health data). */
export type OrgHome = {
  role: "org_manager";
  name: string;
  unread: number;
  org: {
    name: string; plan: string; status: string; eligible: number; enrolled: number; enrollmentRate: number | null;
    suppressed: boolean; activePct: number | null; wellnessIndex: number | null;
    directions: { id: "closer" | "holding" | "straying" | "no_data"; label: string; pct: number | null }[];
    plans30: number | null; monthlyBill: string; inviteCode: string; inviteLink: string;
  } | null;
};

export type Home = MemberHome | ClinicianHome | ManagerHome | OrgHome;

type HomeState = { data: Home | null; error: string | null; loading: boolean; reload: () => Promise<void> };

export const HomeContext = createContext<HomeState>({ data: null, error: null, loading: true, reload: async () => {} });
export const useHome = () => useContext(HomeContext);

export const hoursUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 3600_000);

/** "due in 6 h", "overdue 3 h"; urgent = under 12 hours or overdue (shown in Bain red). */
export function dueText(iso: string | null) {
  if (!iso) return null;
  const h = hoursUntil(iso);
  return { text: h < 0 ? `overdue ${-h} h` : `due in ${h} h`, urgent: h < 12 };
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function firstName(name: string) {
  // "Dr. Nadia Okafor" → "Dr. Okafor"; "Jordan Taylor" → "Jordan"
  return name.startsWith("Dr. ") ? `Dr. ${name.split(" ").at(-1)}` : name.split(" ")[0];
}

export function initials(name: string) {
  return name.replace(/^Dr\.\s+/, "").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
