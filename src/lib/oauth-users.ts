import "server-only";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db, newId, nowIso } from "./db";
import type { Identity } from "./oauth";

export type Resolved = { ok: true; userId: string; created: boolean } | { ok: false; error: string };

/**
 * Find or create the NutriGoal account for a Google / Apple / SSO sign-in.
 *  1. Known identity → that account.
 *  2. Verified email that matches an existing account → link the identity to it (members and staff alike).
 *  3. Otherwise → new member account (clinicians and managers still apply through the sign-up form,
 *     then can sign in with Google/Apple/SSO using the same email).
 */
export function resolveIdentity(id: Identity, opts: { referral?: string | null } = {}): Resolved {
  const conn = db();
  const known = conn.prepare("SELECT user_id FROM auth_identities WHERE provider = ? AND subject = ?").get(id.provider, id.subject) as { user_id: string } | undefined;
  if (known) {
    conn.prepare("UPDATE auth_identities SET last_used_at = ? WHERE provider = ? AND subject = ?").run(nowIso(), id.provider, id.subject);
    return { ok: true, userId: known.user_id, created: false };
  }
  if (!id.email) return { ok: false, error: "Your account didn't share an email address, so we can't set up NutriGoal with it. Try another sign-in option." };
  const existing = conn.prepare("SELECT id FROM users WHERE email = ?").get(id.email) as { id: string } | undefined;
  if (existing) {
    if (!id.emailVerified) return { ok: false, error: "An account with this email already exists. Sign in with your password, since this provider didn't confirm the email." };
    link(existing.id, id);
    return { ok: true, userId: existing.id, created: false };
  }
  const ref = (opts.referral ?? "").trim().toUpperCase();
  const referrer = ref ? (conn.prepare("SELECT id FROM users WHERE referral_code = ? AND role = 'clinician' AND staff_status = 'active'").get(ref) as { id: string } | undefined) : undefined;
  const userId = newId();
  // No usable password: this account signs in with its provider (a password can't match a random hash).
  const unusable = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 8);
  conn
    .prepare("INSERT INTO users (id, email, password_hash, name, role, created_at, referred_by) VALUES (?, ?, ?, ?, 'member', ?, ?)")
    .run(userId, id.email, unusable, (id.name || id.email.split("@")[0]).slice(0, 80), nowIso(), referrer?.id ?? null);
  link(userId, id);
  return { ok: true, userId, created: true };
}

function link(userId: string, id: Identity) {
  db()
    .prepare("INSERT OR IGNORE INTO auth_identities (provider, subject, user_id, email, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id.provider, id.subject, userId, id.email, nowIso(), nowIso());
}
