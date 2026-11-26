import "server-only";
// "Continue with Google / Apple / SSO" (OpenID Connect). Each provider switches on when its
// credentials are set on the server; nothing is shown for a provider that isn't configured.
//   Google: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   Apple:  APPLE_CLIENT_ID (Services ID), APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8 contents)
//   SSO:    SSO_ISSUER (e.g. https://your-org.okta.com), SSO_CLIENT_ID, SSO_CLIENT_SECRET, SSO_LABEL (button text)
// Redirect URI to register with each provider: <APP_URL>/auth/oauth/<google|apple|sso>/callback

import crypto from "node:crypto";
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from "jose";

export type ProviderId = "google" | "apple" | "sso";
type Endpoints = { authorization_endpoint: string; token_endpoint: string; jwks_uri: string; issuer: string };
export type Identity = { provider: ProviderId; subject: string; email: string | null; emailVerified: boolean; name: string | null };

const env = (k: string) => process.env[k]?.trim() || "";

export const PROVIDERS: Record<ProviderId, { label: string; enabled: () => boolean }> = {
  google: { label: "Continue with Google", enabled: () => !!(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")) },
  apple: { label: "Continue with Apple", enabled: () => !!(env("APPLE_CLIENT_ID") && env("APPLE_TEAM_ID") && env("APPLE_KEY_ID") && env("APPLE_PRIVATE_KEY")) },
  sso: { label: env("SSO_LABEL") || "Continue with SSO", enabled: () => !!(env("SSO_ISSUER") && env("SSO_CLIENT_ID") && env("SSO_CLIENT_SECRET")) },
};

export function enabledProviders() {
  return (Object.keys(PROVIDERS) as ProviderId[]).filter((p) => PROVIDERS[p].enabled()).map((id) => ({ id, label: PROVIDERS[id].label }));
}
export const isProvider = (p: string): p is ProviderId => p === "google" || p === "apple" || p === "sso";

const discoveryCache = new Map<string, Promise<Endpoints>>();
function discover(issuer: string): Promise<Endpoints> {
  const key = issuer.replace(/\/$/, "");
  if (!discoveryCache.has(key)) {
    discoveryCache.set(
      key,
      fetch(`${key}/.well-known/openid-configuration`, { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`OIDC discovery failed (${r.status})`);
        return (await r.json()) as Endpoints;
      }),
    );
  }
  return discoveryCache.get(key)!;
}

async function endpoints(p: ProviderId): Promise<Endpoints> {
  if (p === "google") return discover("https://accounts.google.com");
  if (p === "sso") return discover(env("SSO_ISSUER"));
  return { authorization_endpoint: "https://appleid.apple.com/auth/authorize", token_endpoint: "https://appleid.apple.com/auth/token", jwks_uri: "https://appleid.apple.com/auth/keys", issuer: "https://appleid.apple.com" };
}

const clientId = (p: ProviderId) => (p === "google" ? env("GOOGLE_CLIENT_ID") : p === "apple" ? env("APPLE_CLIENT_ID") : env("SSO_CLIENT_ID"));

/** Apple's client secret is a short-lived ES256 JWT signed with the team's private key. */
async function clientSecret(p: ProviderId) {
  if (p === "google") return env("GOOGLE_CLIENT_SECRET");
  if (p === "sso") return env("SSO_CLIENT_SECRET");
  const key = await importPKCS8(env("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n"), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env("APPLE_KEY_ID") })
    .setIssuer(env("APPLE_TEAM_ID"))
    .setSubject(env("APPLE_CLIENT_ID"))
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
}

const b64url = (b: Buffer) => b.toString("base64url");

/** Build the provider's authorization URL plus the secrets we keep in a short-lived cookie. */
export async function authorizationRequest(p: ProviderId, redirectUri: string) {
  const ep = await endpoints(p);
  const state = b64url(crypto.randomBytes(24));
  const nonce = b64url(crypto.randomBytes(24));
  const verifier = b64url(crypto.randomBytes(32));
  const q = new URLSearchParams({ client_id: clientId(p), redirect_uri: redirectUri, response_type: "code", state, nonce });
  if (p === "apple") {
    // Apple returns name/email only with response_mode=form_post (a cross-site POST back to us).
    q.set("scope", "name email");
    q.set("response_mode", "form_post");
  } else {
    q.set("scope", "openid email profile");
    q.set("code_challenge", b64url(crypto.createHash("sha256").update(verifier).digest()));
    q.set("code_challenge_method", "S256");
    if (p === "google") q.set("prompt", "select_account");
  }
  return { url: `${ep.authorization_endpoint}?${q.toString()}`, state, nonce, verifier };
}

/** Exchange the code, verify the ID token's signature, issuer, audience and nonce, and return who signed in. */
export async function completeAuthorization(p: ProviderId, opts: { code: string; redirectUri: string; nonce: string; verifier: string; appleUser?: string | null }): Promise<Identity> {
  const ep = await endpoints(p);
  const body = new URLSearchParams({ grant_type: "authorization_code", code: opts.code, redirect_uri: opts.redirectUri, client_id: clientId(p), client_secret: await clientSecret(p) });
  if (p !== "apple") body.set("code_verifier", opts.verifier);
  const res = await fetch(ep.token_endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body, cache: "no-store" });
  const tok = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string; error_description?: string };
  if (!res.ok || !tok.id_token) throw new Error(tok.error_description || tok.error || `Token exchange failed (${res.status})`);
  const { payload } = await jwtVerify(tok.id_token, createRemoteJWKSet(new URL(ep.jwks_uri)), { issuer: ep.issuer, audience: clientId(p) });
  if (payload.nonce !== opts.nonce) throw new Error("Sign-in response didn't match this request (nonce).");
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  const verified = payload.email_verified === true || payload.email_verified === "true";
  let name = typeof payload.name === "string" ? payload.name : null;
  if (!name && opts.appleUser) {
    // Apple sends the person's name once, on first sign-in, as a JSON form field.
    try {
      const u = JSON.parse(opts.appleUser) as { name?: { firstName?: string; lastName?: string } };
      name = [u.name?.firstName, u.name?.lastName].filter(Boolean).join(" ") || null;
    } catch {}
  }
  if (!payload.sub) throw new Error("The provider didn't return an account ID.");
  return { provider: p, subject: payload.sub, email, emailVerified: verified, name };
}

/** Where the app may receive a one-time sign-in code: the NutriGoal app scheme, or Expo Go on a local network. */
export function safeMobileReturn(raw: string | null) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === "nutrigoal:") return raw;
    if (u.protocol === "exp:" && /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(u.hostname)) return raw;
  } catch {}
  return null;
}
