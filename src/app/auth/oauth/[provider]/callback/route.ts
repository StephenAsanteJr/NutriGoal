import { cookies } from "next/headers";
import { createSession, homeFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { createToken } from "@/lib/integrations/tokens";
import { completeAuthorization, isProvider } from "@/lib/oauth";
import { resolveIdentity } from "@/lib/oauth-users";
import { publicOrigin, redirectTo } from "@/lib/origin";

type Pending = { p: string; state: string; nonce: string; verifier: string; next: string; ref: string; mobile: string | null };

async function finish(req: Request, provider: string, params: URLSearchParams) {
  const jar = await cookies();
  const raw = jar.get("ng_oauth")?.value;
  jar.delete({ name: "ng_oauth", path: "/auth/oauth" });
  let pending: Pending | null = null;
  try {
    pending = raw ? (JSON.parse(raw) as Pending) : null;
  } catch {}
  const fail = (why: string, mobile?: string | null) =>
    mobile ? Response.redirect(`${mobile}${mobile.includes("?") ? "&" : "?"}error=${encodeURIComponent(why)}`, 302) : redirectTo(req, `/login?sso=error&reason=${encodeURIComponent(why)}`);

  if (!isProvider(provider) || !pending || pending.p !== provider || !params.get("state") || params.get("state") !== pending.state) return fail("Sign-in expired or didn't match. Please try again.", pending?.mobile);
  if (params.get("error")) return fail(params.get("error_description") || "Sign-in was cancelled.", pending.mobile);
  const code = params.get("code");
  if (!code) return fail("The provider didn't return a sign-in code.", pending.mobile);

  let resolved;
  try {
    const identity = await completeAuthorization(provider, { code, redirectUri: `${publicOrigin(req)}/auth/oauth/${provider}/callback`, nonce: pending.nonce, verifier: pending.verifier, appleUser: params.get("user") });
    resolved = resolveIdentity(identity, { referral: pending.ref });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Sign-in failed.", pending.mobile);
  }
  if (!resolved.ok) return fail(resolved.error, pending.mobile);

  const user = db().prepare("SELECT id, role, onboarding_complete, staff_status FROM users WHERE id = ?").get(resolved.userId) as { id: string; role: "member" | "clinician" | "manager" | "org_manager"; onboarding_complete: number; staff_status: string };
  if (pending.mobile) {
    // App sign-in: hand the app a one-time code (2 minutes); it trades the code for its own token.
    const oneTime = createToken(user.id, "App sign-in (SSO)", "handoff");
    return Response.redirect(`${pending.mobile}${pending.mobile.includes("?") ? "&" : "?"}code=${encodeURIComponent(oneTime)}`, 302);
  }
  await createSession(user.id);
  return redirectTo(req, resolved.created ? "/onboarding" : pending.next || homeFor(user));
}

export async function GET(req: Request, ctx: RouteContext<"/auth/oauth/[provider]/callback">) {
  return finish(req, (await ctx.params).provider, new URL(req.url).searchParams);
}

/** Apple (response_mode=form_post) posts the result here. */
export async function POST(req: Request, ctx: RouteContext<"/auth/oauth/[provider]/callback">) {
  const form = await req.formData();
  const params = new URLSearchParams();
  for (const [k, v] of form.entries()) if (typeof v === "string") params.set(k, v);
  return finish(req, (await ctx.params).provider, params);
}
