import { cookies } from "next/headers";
import { PROVIDERS, authorizationRequest, isProvider, safeMobileReturn } from "@/lib/oauth";
import { publicOrigin, redirectTo } from "@/lib/origin";

const COOKIE = "ng_oauth";

/** Begin "Continue with Google / Apple / SSO". ?next=/path, ?ref=CODE (referral), ?mobile_return=nutrigoal://auth (app). */
export async function GET(req: Request, ctx: RouteContext<"/auth/oauth/[provider]/start">) {
  const { provider } = await ctx.params;
  if (!isProvider(provider) || !PROVIDERS[provider].enabled()) return redirectTo(req, "/login?sso=unavailable");
  const url = new URL(req.url);
  const origin = publicOrigin(req);
  const redirectUri = `${origin}/auth/oauth/${provider}/callback`;
  let request;
  try {
    request = await authorizationRequest(provider, redirectUri);
  } catch {
    return redirectTo(req, "/login?sso=error");
  }
  const next = url.searchParams.get("next") ?? "";
  const jar = await cookies();
  const https = origin.startsWith("https");
  jar.set(
    COOKIE,
    JSON.stringify({
      p: provider, state: request.state, nonce: request.nonce, verifier: request.verifier,
      next: next.startsWith("/") && !next.startsWith("//") ? next : "", ref: (url.searchParams.get("ref") ?? "").slice(0, 20),
      mobile: safeMobileReturn(url.searchParams.get("mobile_return")),
    }),
    // Apple posts back cross-site, so the cookie must be SameSite=None (which requires Secure / https).
    { httpOnly: true, secure: https, sameSite: https ? "none" : "lax", path: "/auth/oauth", maxAge: 600 },
  );
  return Response.redirect(request.url, 302);
}
