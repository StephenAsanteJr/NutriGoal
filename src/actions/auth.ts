"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, newId, nowIso } from "@/lib/db";
import { createSession, destroySession, homeFor, type User } from "@/lib/auth";
import { notify } from "@/lib/data";
import { GOAL_TYPES } from "@/lib/domain";
import { referralCode } from "@/lib/referrals";
import { hasActiveManager } from "@/lib/setup";
import { isState, saveVerification, validNpi, verifyLicense } from "@/lib/licensing";
import { INDUSTRIES, TIERS, suggestedTier } from "@/lib/enterprise";
import { createOrganization, getOrgByCode } from "@/lib/org-wellness";
import { parseDemographics, saveDemographics } from "@/lib/demographics";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  consent: z.literal("on", { message: "Please agree to continue." }),
});

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    consent: fd.get("consent") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const { name, email, password } = parsed.data;
  const exists = db().prepare("SELECT 1 FROM users WHERE email = ?").get(email);
  if (exists) return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };

  // Referral link (/signup?ref=CODE): credit the clinician who shared it, if the code is real.
  const ref = String(fd.get("ref") ?? "").trim().toUpperCase();
  const referrer = ref
    ? (db().prepare("SELECT id FROM users WHERE referral_code = ? AND role = 'clinician' AND staff_status = 'active'").get(ref) as { id: string } | undefined)
    : undefined;
  const id = newId();
  db()
    .prepare("INSERT INTO users (id, email, password_hash, name, role, created_at, referred_by) VALUES (?, ?, ?, ?, 'member', ?, ?)")
    .run(id, email, await bcrypt.hash(password, 10), name, nowIso(), referrer?.id ?? null);
  // Invited by an organization (/join/CODE): enroll only if the member ticked the join box.
  const org = fd.get("org_consent") === "on" ? getOrgByCode(String(fd.get("org") ?? "")) : undefined;
  if (org) db().prepare("INSERT INTO org_enrollments (org_id, user_id, joined_at) VALUES (?, ?, ?)").run(org.id, id, nowIso());
  await createSession(id);
  redirect("/onboarding");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const row = db().prepare("SELECT * FROM users WHERE email = ?").get(email) as (User & { password_hash: string }) | undefined;
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return { error: "That email and password don't match an account." };
  }
  await createSession(row.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(row));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------- Clinicians, NutriGoal management and organizational managers ----------
// Staff accounts start "pending": they can't see members or tickets until an active
// manager approves them on the Clinicians page.

const staffBase = {
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters for a staff account.").max(128),
  consent: z.literal("on", { message: "Please agree to continue." }),
};

const clinicianSchema = z.object({
  ...staffBase,
  clinician_type: z.enum(["MD", "DO", "RD", "CNS", "NUT"], { message: "Choose your profession." }),
  license_number: z.string().trim().min(3, "Enter your license or registration number.").max(40),
  license_state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use the 2-letter state code."),
  npi: z.string().trim().regex(/^(\d{10})?$/, "An NPI is 10 digits.").optional(),
}).superRefine((d, ctx) => {
  const needsNpi = d.clinician_type === "MD" || d.clinician_type === "DO" || d.clinician_type === "RD";
  if (needsNpi && !d.npi) ctx.addIssue({ code: "custom", path: ["npi"], message: "Physicians and registered dietitians need an NPI. Look it up above." });
  else if (d.npi && !validNpi(d.npi)) ctx.addIssue({ code: "custom", path: ["npi"], message: "That NPI isn't valid. Check the digits." });
  if (!isState(d.license_state)) ctx.addIssue({ code: "custom", path: ["license_state"], message: "Use a U.S. state code like NY." });
});

const managerSchema = z.object({
  ...staffBase,
  organization: z.string().trim().min(2, "Enter your team.").max(100),
  title: z.string().trim().min(2, "Enter your job title.").max(80),
});

const orgManagerSchema = z.object({
  ...staffBase,
  organization: z.string().trim().min(2, "Enter your organization's name.").max(120),
  title: z.string().trim().min(2, "Enter your job title.").max(80),
  industry: z.enum(INDUSTRIES, { message: "Choose the closest match." }),
  eligible: z.coerce.number({ message: "Enter a number." }).int("Whole number, please.").min(1, "At least 1.").max(2_000_000, "That looks too high."),
  plan: z.enum(TIERS.map((t) => t.id) as [string, ...string[]]).optional(),
});

const PROFESSION: Record<string, { type: "MD" | "RD"; credential: string }> = {
  MD: { type: "MD", credential: "MD" },
  DO: { type: "MD", credential: "DO" },
  RD: { type: "RD", credential: "RD" },
  CNS: { type: "RD", credential: "CNS, Certified Nutrition Specialist" },
  NUT: { type: "RD", credential: "Licensed Nutritionist" },
};

function issues(e: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) fieldErrors[String(i.path[0])] ??= i.message;
  return { fieldErrors };
}

function notifyManagers(title: string, body: string) {
  const managers = db().prepare("SELECT id FROM users WHERE role = 'manager' AND staff_status = 'active'").all() as { id: string }[];
  for (const m of managers) notify(m.id, title, body, "/staff/team#applications");
}

export async function signupClinician(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = clinicianSchema.safeParse(Object.fromEntries(["name", "email", "password", "consent", "clinician_type", "license_number", "license_state", "npi"].map((k) => [k, fd.get(k) ?? undefined])));
  const about = parseDemographics(fd, "clinician");
  if (!parsed.success) return { fieldErrors: { ...about.errors, ...issues(parsed.error).fieldErrors } };
  if (Object.keys(about.errors).length) return { fieldErrors: about.errors };
  const d = parsed.data;
  if (db().prepare("SELECT 1 FROM users WHERE email = ?").get(d.email)) return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
  const specialties = fd.getAll("specialties").map(String).filter((s) => GOAL_TYPES.some((g) => g.id === s));
  const p = PROFESSION[d.clinician_type];
  const id = newId();
  db()
    .prepare(
      `INSERT INTO users (id, email, password_hash, name, role, clinician_type, credential, specialties, onboarding_complete, staff_status, license_info, created_at, referral_code)
       VALUES (?, ?, ?, ?, 'clinician', ?, ?, ?, 1, 'pending', ?, ?, ?)`,
    )
    .run(id, d.email, await bcrypt.hash(d.password, 10), d.name, p.type, p.credential, JSON.stringify(specialties.length ? specialties : ["fat_loss", "protein"]),
      JSON.stringify({ profession: d.clinician_type, license: d.license_number, state: d.license_state, npi: d.npi || null }), nowIso(), referralCode(d.name));
  saveDemographics(id, about.value);
  // Pull the applicant's NPI Registry record and check it against what they entered.
  const verification = await verifyLicense({ profession: d.clinician_type, name: d.name, license: d.license_number, state: d.license_state, npi: d.npi || null });
  saveVerification(id, verification);
  const statusText = { verified: "NPI record matches", needs_review: "needs a manual check", mismatch: "NPI record doesn't match", not_found: "NPI not found", unavailable: "registry check pending" }[verification.status];
  notifyManagers("New clinician application", `${d.name} (${p.credential}, license ${d.license_state} ${d.license_number}): ${statusText}. Waiting for approval.`);
  await createSession(id);
  redirect("/pending");
}

export async function signupManager(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = managerSchema.safeParse(Object.fromEntries(["name", "email", "password", "consent", "organization", "title"].map((k) => [k, fd.get(k) ?? undefined])));
  if (!parsed.success) return issues(parsed.error);
  const d = parsed.data;
  if (db().prepare("SELECT 1 FROM users WHERE email = ?").get(d.email)) return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
  // Fresh install: while no approved NutriGoal management account exists, the first one to sign up
  // becomes the owner (approved automatically). Everyone after that is approved by an existing one.
  const owner = !hasActiveManager();
  const id = newId();
  db()
    .prepare(
      `INSERT INTO users (id, email, password_hash, name, role, credential, onboarding_complete, staff_status, organization, created_at)
       VALUES (?, ?, ?, ?, 'manager', ?, 1, ?, ?, ?)`,
    )
    .run(id, d.email, await bcrypt.hash(d.password, 10), d.name, d.title, owner ? "active" : "pending", d.organization, nowIso());
  if (!owner) notifyManagers("New NutriGoal management application", `${d.name} (${d.title}, ${d.organization}) is waiting for approval.`);
  await createSession(id);
  redirect(owner ? "/staff/ops" : "/pending");
}

/**
 * Organizational managers (employers, health plans, schools…) open right away: their portal shows only
 * de-identified totals for members who chose to join with the organization's invite code. The
 * organization starts as a pilot; NutriGoal management moves it to an active plan.
 */
export async function signupOrgManager(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = orgManagerSchema.safeParse(
    Object.fromEntries(["name", "email", "password", "consent", "organization", "title", "industry", "eligible", "plan"].map((k) => [k, fd.get(k) || undefined])),
  );
  if (!parsed.success) return issues(parsed.error);
  const d = parsed.data;
  if (db().prepare("SELECT 1 FROM users WHERE email = ?").get(d.email)) return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
  const id = newId();
  db()
    .prepare(
      `INSERT INTO users (id, email, password_hash, name, role, credential, onboarding_complete, staff_status, organization, created_at)
       VALUES (?, ?, ?, ?, 'org_manager', ?, 1, 'active', ?, ?)`,
    )
    .run(id, d.email, await bcrypt.hash(d.password, 10), d.name, d.title, d.organization, nowIso());
  const plan = d.plan ?? suggestedTier(Math.round(d.eligible * 0.35)).id;
  createOrganization({ name: d.organization, industry: d.industry, eligible: d.eligible, plan, managerId: id, title: d.title });
  const managers = db().prepare("SELECT id FROM users WHERE role = 'manager' AND staff_status = 'active'").all() as { id: string }[];
  for (const m of managers) notify(m.id, "New organization", `${d.organization} (${d.industry}, ${d.eligible.toLocaleString()} eligible) started a pilot. Contact: ${d.name}, ${d.title}.`, "/staff/organizations");
  await createSession(id);
  redirect("/org?welcome=1");
}
