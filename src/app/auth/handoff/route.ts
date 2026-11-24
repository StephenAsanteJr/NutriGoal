import { createSession } from "@/lib/auth";
import { redeemHandoff } from "@/lib/integrations/tokens";

/** Mobile app → website: redeem a one-time code, start a web session, continue to `next`. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = redeemHandoff(url.searchParams.get("code") ?? "");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (!userId) return Response.redirect(new URL(`/login?next=${encodeURIComponent(safe)}`, url.origin), 303);
  await createSession(userId);
  return Response.redirect(new URL(safe, url.origin), 303);
}
