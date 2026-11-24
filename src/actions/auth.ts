"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, newId, nowIso } from "@/lib/db";
import { createSession, destroySession, homeFor, type User } from "@/lib/auth";
import { notify } from "@/lib/data";
import { GOAL_TYPES } from "@/lib/domain";

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

  const id = newId();
  db()
    .prepare("INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, 'member', ?)")
    .run(id, email, await bcrypt.hash(password, 10), name, nowIso());
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

// ---------- Clinicians and care managers ----------
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
  npi: z.string().trim().regex(/^(\d{10})?$/, "An NPI is 10 digits (or leave it blank).").optional(),
});

const managerSchema = z.object({
  ...staffBase,
  organization: z.string().trim().min(2, "Enter your organization.").max(100),
  title: z.string().trim().min(2, "Enter your job title.").max(80),
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
  if (!parsed.success) return issues(parsed.error);
  const d = parsed.data;
  if (db().prepare("SELECT 1 FROM users WHERE email = ?").get(d.email)) return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
  const specialties = fd.getAll("specialties").map(String).filter((s) => GOAL_TYPES.some((g) => g.id === s));
  const p = PROFESSION[d.clinician_type];
  const id = newId();
  db()
    .prepare(
      `INSERT INTO users (id, email, password_hash, name, role, clinician_type, credential, specialties, onboarding_complete, staff_status, license_info, created_at)
       VALUES (?, ?, ?, ?, 'clinician', ?, ?, ?, 1, 'pending', ?, ?)`,
    )
    .run(id, d.email, await bcrypt.hash(d.password, 10), d.name, p.type, p.credential, JSON.stringify(specialties.length ? specialties : ["fat_loss", "protein"]),
      JSON.stringify({ profession: d.clinician_type, license: d.license_number, state: d.license_state, npi: d.npi || null }), nowIso());
  notifyManagers("New clinician application", `${d.name} (${p.credential}, license ${d.license_state} ${d.license_number}) is waiting for approval.`);
  await createSession(id);
  redirect("/pending");
}

export async function signupManager(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = managerSchema.safeParse(Object.fromEntries(["name", "email", "password", "consent", "organization", "title"].map((k) => [k, fd.get(k) ?? undefined])));
  if (!parsed.success) return issues(parsed.error);
  const d = parsed.data;
  if (db().prepare("SELECT 1 FROM users WHERE email = ?").get(d.email)) return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
  const id = newId();
  db()
    .prepare(
      `INSERT INTO users (id, email, password_hash, name, role, credential, onboarding_complete, staff_status, organization, created_at)
       VALUES (?, ?, ?, ?, 'manager', ?, 1, 'pending', ?, ?)`,
    )
    .run(id, d.email, await bcrypt.hash(d.password, 10), d.name, d.title, d.organization, nowIso());
  notifyManagers("New care manager application", `${d.name} (${d.title}, ${d.organization}) is waiting for approval.`);
  await createSession(id);
  redirect("/pending");
}
