import "server-only";
// Personal access tokens for the NutriGoal API (integrations) and the mobile app.
// Only a SHA-256 hash is stored; the plain token is shown once.

import crypto from "node:crypto";
import { db, newId, nowIso } from "../db";
import type { User } from "../auth";

export type TokenScope = "integrations" | "mobile" | "handoff";

export function createToken(userId: string, name: string, scope: TokenScope) {
  const raw = `ng_${scope === "mobile" ? "mob" : scope === "handoff" ? "hof" : "live"}_${crypto.randomBytes(24).toString("base64url")}`;
  db()
    .prepare("INSERT INTO api_tokens (id, user_id, name, scope, token_hash, prefix, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(newId(), userId, name.slice(0, 60), scope, hash(raw), raw.slice(0, 12), nowIso());
  return raw;
}

const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

/** Resolve "Authorization: Bearer <token>" to a user, if the token is valid for the scope. */
export function userFromRequest(req: Request, scope: TokenScope): User | null {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(ng_[A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const row = db()
    .prepare(
      `SELECT t.id AS token_id, u.id, u.email, u.name, u.role, u.clinician_type, u.credential, u.specialties, u.bio, u.onboarding_complete, u.created_at, u.staff_status
       FROM api_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.scope = ? AND t.revoked_at IS NULL`,
    )
    .get(hash(m[1]), scope) as (User & { token_id: string }) | undefined;
  if (!row) return null;
  if (row.role !== "member" && row.staff_status !== "active") return null;
  db().prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?").run(nowIso(), row.token_id);
  const { token_id: _ignored, ...user } = row;
  void _ignored;
  return user as User;
}

export function revokeTokenByValue(req: Request) {
  const m = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(ng_[A-Za-z0-9_-]+)$/);
  if (m) db().prepare("UPDATE api_tokens SET revoked_at = ? WHERE token_hash = ?").run(nowIso(), hash(m[1]));
}

export function listTokens(userId: string, scope: TokenScope) {
  return db()
    .prepare("SELECT id, name, prefix, created_at, last_used_at FROM api_tokens WHERE user_id = ? AND scope = ? AND revoked_at IS NULL ORDER BY created_at DESC")
    .all(userId, scope) as { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null }[];
}

export function revokeToken(userId: string, id: string) {
  db().prepare("UPDATE api_tokens SET revoked_at = ? WHERE id = ? AND user_id = ?").run(nowIso(), id, userId);
}

/** CORS for the public API and the mobile app (which may run on Expo web during development). */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, init: number | ResponseInit = 200) {
  const base = typeof init === "number" ? { status: init } : init;
  return Response.json(data, { ...base, headers: { ...CORS_HEADERS, ...(base.headers ?? {}) } });
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** One-time, 2-minute code that signs the mobile user into the website (e.g. to pay in checkout). */
export function redeemHandoff(code: string) {
  if (!/^ng_hof_[A-Za-z0-9_-]+$/.test(code)) return null;
  const row = db()
    .prepare("SELECT id, user_id, created_at FROM api_tokens WHERE token_hash = ? AND scope = 'handoff' AND revoked_at IS NULL")
    .get(hash(code)) as { id: string; user_id: string; created_at: string } | undefined;
  if (!row) return null;
  db().prepare("UPDATE api_tokens SET revoked_at = ? WHERE id = ?").run(nowIso(), row.id);
  if (Date.now() - new Date(row.created_at).getTime() > 120_000) return null;
  return row.user_id;
}
