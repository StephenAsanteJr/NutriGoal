import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { cache } from "react";
import { db, DATA_DIR } from "./db";

export type Role = "member" | "clinician" | "manager";

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
        `SELECT id, email, name, role, clinician_type, credential, specialties, bio, onboarding_complete, created_at
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
  if (user.role !== "member") redirect("/staff");
  if (!opts.allowIncompleteOnboarding && !user.onboarding_complete) redirect("/onboarding");
  return user;
}

/** For staff pages: clinicians and managers. */
export async function requireStaff(roles: Role[] = ["clinician", "manager"]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(user.role === "member" ? "/dashboard" : "/staff");
  return user;
}

export function homeFor(user: Pick<User, "role" | "onboarding_complete">) {
  if (user.role !== "member") return "/staff";
  return user.onboarding_complete ? "/dashboard" : "/onboarding";
}
