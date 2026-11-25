import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { EPIC_FHIR_BASE, EPIC_SCOPES, epicEnabled, pkce, smartEndpoints } from "@/lib/integrations/epic";
import { publicOrigin } from "@/lib/origin";

/** Start "Connect Epic MyChart": redirect the member to their health system's login. */
export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const user = await getCurrentUser();
  if (!user || user.role !== "member") return Response.redirect(new URL("/login", origin), 303);
  if (!epicEnabled()) return Response.redirect(new URL("/data?tab=connect&epic=off", origin), 303);
  const { verifier, challenge, state } = pkce();
  const { authorize } = await smartEndpoints();
  const jar = await cookies();
  jar.set("ng_epic", JSON.stringify({ state, verifier, uid: user.id }), { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), path: "/", maxAge: 600 });
  const q = new URLSearchParams({
    response_type: "code",
    client_id: process.env.EPIC_CLIENT_ID!,
    redirect_uri: `${origin}/api/integrations/epic/callback`,
    scope: EPIC_SCOPES,
    state,
    aud: EPIC_FHIR_BASE,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return Response.redirect(`${authorize}?${q}`, 303);
}
