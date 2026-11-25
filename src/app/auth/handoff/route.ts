import { createSession } from "@/lib/auth";
import { redeemHandoff } from "@/lib/integrations/tokens";
import { redirectTo } from "@/lib/origin";

/** Mobile app → website: redeem a one-time code, start a web session, continue to `next`. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = redeemHandoff(url.searchParams.get("code") ?? "");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (!userId) return redirectTo(req, `/login?next=${encodeURIComponent(safe)}`);
  await createSession(userId);
  return redirectTo(req, safe);
}
