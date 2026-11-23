"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, newId, nowIso } from "@/lib/db";
import { createSession, destroySession, homeFor, type User } from "@/lib/auth";

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
