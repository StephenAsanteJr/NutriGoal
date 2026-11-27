import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { cache } from "react";
import { db, DATA_DIR } from "./db";

/**
 * member       — consumers who send goal tickets
 * clinician    — physicians, dietitians and nutritionists who write plans
 * manager      — NutriGoal management (internal operations: tickets, clinicians, finance, marketplace)
 * org_manager  — organizational managers (employers, health plans, schools) who sponsor members and see
 *                de-identified group totals only; never member names, tickets, plans or health data
 */
export type Role = "member" | "clinician" | "manager" | "org_manager";

/** Roles that may see member health information (tickets, plans, builds, reports). */
export const isCareTeam = (role: Role | string) => role === "clinician" || role === "manager";

export const ROLE_LABEL: Record<Role, string> = {
  member: "Member",
  clinician: "Clinician",
  manager: "NutriGoal management",
  org_manager: "Organizational manager",
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  clinician_type: "MD" | "RD" | null;
  credential: string | null;
  specialties: string | null;
  bio: string | null;
  onboarding_complete: number;
  created_at: string;
  staff_status: "active" | "pending" | "rejected";
};

const COOKIE = "ng_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Local development fallback: generate once and keep it beside the database.
    const file = path.join(DATA_DIR, ".session-secret");
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
    secret = fs.readFileSync(file, "utf8").trim();
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    const user = db()
      .prepare(
        `SELECT id, email, name, role, clinician_type, credential, specialties, bio, onboarding_complete, created_at, staff_status
         FROM users WHERE id = ?`,
      )
      .get(payload.sub) as User | undefined;
    return user ?? null;
  } catch {
    return null;
  }
});

/** For member pages: must be signed in as a member. Staff are sent to their portal. */
export async function requireMember(opts: { allowIncompleteOnboarding?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "member") redirect(homeFor(user));
  if (!opts.allowIncompleteOnboarding && !user.onboarding_complete) redirect("/onboarding");
  return user;
}

/** For care-team pages: clinicians and NutriGoal management (never organizational managers). */
export async function requireStaff(roles: ("clinician" | "manager")[] = ["clinician", "manager"]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isCareTeam(user.role)) redirect(homeFor(user));
  if (user.staff_status !== "active") redirect("/pending");
  if (!(roles as Role[]).includes(user.role)) redirect("/staff");
  return user;
}

/** For the organization portal: organizational managers only. */
export async function requireOrgManager() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "org_manager") redirect(homeFor(user));
  if (user.staff_status !== "active") redirect("/pending");
  return user;
}

export function homeFor(user: Pick<User, "role" | "onboarding_complete"> & { staff_status?: string }) {
  if (user.role === "member") return user.onboarding_complete ? "/dashboard" : "/onboarding";
  if (user.staff_status && user.staff_status !== "active") return "/pending";
  return user.role === "org_manager" ? "/org" : "/staff";
}
