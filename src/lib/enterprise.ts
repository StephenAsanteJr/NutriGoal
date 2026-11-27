// Theoretical enterprise plans for organizations (employers, health plans, schools, unions…) that
// sponsor NutriGoal for their people, and the cost rundown behind each one. Safe for client and server.
//
// Pricing is per enrolled member per month (PMPM): an organization pays only for people who join,
// plus a platform fee for the de-identified reporting, invitations and support. Every figure here is
// illustrative and meant for planning conversations, not a quote.

import { CLINICIAN_PAYOUT_CENTS, PRICES } from "./domain";

export type TierId = "pilot" | "team" | "growth" | "enterprise";

export type Tier = {
  id: TierId;
  name: string;
  /** Enrolled members this tier is built for. */
  minEnrolled: number;
  maxEnrolled: number | null;
  pmpmCents: number;
  platformMonthlyCents: number;
  implementationCents: number;
  /** Clinician plans (response tickets) included per enrolled member per year. */
  plansPerYear: number;
  /** Fixed term in months (the pilot); null = annual, renewing. */
  termMonths: number | null;
  /** Flat fee instead of PMPM + platform (the pilot). */
  flatCents?: number;
  report: string;
  features: string[];
};

export const EXTRA_PLAN_CENTS = 1400; // plans beyond what's included, vs $19.99 retail
export const MIN_GROUP = 5; // smallest group any organization report will describe

export const TIERS: Tier[] = [
  {
    id: "pilot",
    name: "Pilot",
    minEnrolled: 10,
    maxEnrolled: 100,
    pmpmCents: 0,
    platformMonthlyCents: 0,
    implementationCents: 0,
    flatCents: 500000,
    plansPerYear: 4, // one plan in the 90 days
    termMonths: 3,
    report: "One de-identified wellness report at day 90",
    features: ["Up to 100 members for 90 days", "1 clinician plan per member", "Daily Support Pack", "Invite link and code", "Credited toward a first-year contract"],
  },
  {
    id: "team",
    name: "Team",
    minEnrolled: 25,
    maxEnrolled: 499,
    pmpmCents: 1600,
    platformMonthlyCents: 50000,
    implementationCents: 250000,
    plansPerYear: 4,
    termMonths: null,
    report: "Quarterly de-identified wellness report",
    features: ["1 clinician plan per member each quarter", "Daily Support Pack and marketplace access", "Live wellness dashboard (groups of 5+)", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    minEnrolled: 500,
    maxEnrolled: 2499,
    pmpmCents: 1300,
    platformMonthlyCents: 200000,
    implementationCents: 750000,
    plansPerYear: 6,
    termMonths: null,
    report: "Monthly de-identified wellness report",
    features: ["1 clinician plan per member every 2 months", "Everything in Team", "Single sign-on (SSO) for members", "Eligibility file upload", "Named success manager"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    minEnrolled: 2500,
    maxEnrolled: null,
    pmpmCents: 1000,
    platformMonthlyCents: 500000,
    implementationCents: 1500000,
    plansPerYear: 6,
    termMonths: null,
    report: "Monthly report and quarterly business review",
    features: ["1 clinician plan per member every 2 months", "Everything in Growth", "HRIS and benefits-platform integration", "Epic / EHR connection for members who opt in", "Data processing agreement and BAA"],
  },
];

export const tierById = (id: string | null | undefined) => TIERS.find((t) => t.id === id) ?? TIERS[2];

/** The annual tier sized for an enrolled headcount (the pilot is chosen, never suggested). */
export function suggestedTier(enrolled: number): Tier {
  const annual = TIERS.filter((t) => t.id !== "pilot");
  return annual.find((t) => enrolled >= t.minEnrolled && (t.maxEnrolled == null || enrolled <= t.maxEnrolled)) ?? (enrolled < 25 ? annual[0] : annual[annual.length - 1]);
}

export type CostInputs = {
  eligible: number; // people the organization offers NutriGoal to
  enrollmentPct: number; // share who join (0-100)
  utilizationPct: number; // share of included plans members actually use (0-100)
  extraPlansPerMember: number; // extra plans per enrolled member per year
  physicianPct: number; // share of plans written by physicians (vs dietitians / nutritionists)
  tier?: TierId; // override; default = sized to enrollment
};

export const DEFAULT_INPUTS: CostInputs = { eligible: 1000, enrollmentPct: 35, utilizationPct: 70, extraPlansPerMember: 0.5, physicianPct: 30 };

export type CostRundown = ReturnType<typeof costRundown>;

/** The full cost rundown for one organization for one year (or the pilot term). */
export function costRundown(input: CostInputs) {
  const eligible = Math.max(0, Math.round(input.eligible));
  const enrolled = Math.round((eligible * Math.min(100, Math.max(0, input.enrollmentPct))) / 100);
  const tier = input.tier ? tierById(input.tier) : suggestedTier(enrolled);
  const months = tier.termMonths ?? 12;
  const pilot = tier.id === "pilot";
  const seats = pilot ? Math.min(enrolled, tier.maxEnrolled ?? enrolled) : enrolled;

  const membership = pilot ? 0 : seats * tier.pmpmCents * months;
  const platform = tier.platformMonthlyCents * months;
  const implementation = tier.implementationCents;
  const flat = tier.flatCents ?? 0;
  const includedPlans = seats * tier.plansPerYear * (months / 12);
  const usedPlans = Math.round((includedPlans * Math.min(100, Math.max(0, input.utilizationPct))) / 100);
  const extraPlans = pilot ? 0 : Math.round(seats * Math.max(0, input.extraPlansPerMember));
  const extras = extraPlans * EXTRA_PLAN_CENTS;
  const total = flat + membership + platform + implementation + extras;
  const renewal = pilot ? null : membership + platform + extras; // year 2 onward, no implementation

  // What the same people would pay on their own: an annual membership each (one plan a month,
  // Daily Support Pack), plus any extra plans at the member price.
  const retail = Math.round(seats * PRICES.subscriptionYearly * (months / 12) + extraPlans * PRICES.extraTicketMember);

  // NutriGoal's side: clinicians are paid per signed plan.
  const plansDelivered = usedPlans + extraPlans;
  const md = Math.min(100, Math.max(0, input.physicianPct)) / 100;
  const blendedPayout = md * CLINICIAN_PAYOUT_CENTS.MD + (1 - md) * CLINICIAN_PAYOUT_CENTS.RD;
  const payouts = Math.round(plansDelivered * blendedPayout);
  const contribution = total - payouts;

  return {
    tier,
    months,
    eligible,
    enrolled: seats,
    lines: [
      ...(pilot ? [{ id: "flat", label: `Pilot fee (${months} months, up to ${tier.maxEnrolled} members)`, cents: flat }] : []),
      ...(!pilot ? [{ id: "membership", label: `Members: ${seats.toLocaleString()} × ${fmtCents(tier.pmpmCents)} × ${months} months`, cents: membership }] : []),
      ...(!pilot ? [{ id: "platform", label: `Platform and reporting: ${fmtCents(tier.platformMonthlyCents)} × ${months} months`, cents: platform }] : []),
      ...(!pilot ? [{ id: "implementation", label: "Implementation (first year only)", cents: implementation }] : []),
      ...(!pilot ? [{ id: "extras", label: `Extra plans: ${extraPlans.toLocaleString()} × ${fmtCents(EXTRA_PLAN_CENTS)}`, cents: extras }] : []),
    ],
    total,
    renewal,
    perEnrolledMonthly: seats ? total / seats / months : 0,
    perEligibleMonthly: eligible ? total / eligible / months : 0,
    retail,
    savings: retail - total,
    savingsPct: retail ? ((retail - total) / retail) * 100 : 0,
    plans: { included: Math.round(includedPlans), used: usedPlans, extra: extraPlans, delivered: plansDelivered },
    nutrigoal: { payouts, contribution, contributionPct: total ? (contribution / total) * 100 : 0, blendedPayout },
  };
}

/** Monthly bill for an organization today, from its tier and current enrollment. */
export function monthlyBill(tierId: string, enrolled: number) {
  const t = tierById(tierId);
  if (t.id === "pilot") return (t.flatCents ?? 0) / (t.termMonths ?? 3);
  return enrolled * t.pmpmCents + t.platformMonthlyCents;
}

export function fmtCents(c: number, digits = 0) {
  return (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const INDUSTRIES = [
  "Employer (office)",
  "Employer (frontline / shift work)",
  "Health plan or insurer",
  "Hospital or health system",
  "School or university",
  "Government or public sector",
  "Union or association",
  "Fitness or wellness business",
  "Other",
] as const;
