import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { fetchObservations, smartEndpoints } from "@/lib/integrations/epic";
import { parseFhir, saveLabs } from "@/lib/integrations/fhir";
import { recordSource } from "@/lib/integrations/nutrition";
import { publicOrigin, redirectTo } from "@/lib/origin";

/** SMART on FHIR redirect: exchange the code, read Observations once, store results. Tokens are not kept. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = (q: string) => redirectTo(req, `/data?tab=connect&${q}`);
  const user = await getCurrentUser();
  const jar = await cookies();
  const saved = jar.get("ng_epic")?.value;
  jar.delete("ng_epic");
  if (!user || !saved) return to("epic=expired");
  const { state, verifier, uid } = JSON.parse(saved) as { state: string; verifier: string; uid: string };
  if (uid !== user.id || url.searchParams.get("state") !== state) return to("epic=state");
  const code = url.searchParams.get("code");
  if (!code) return to("epic=denied");

  try {
    const { token } = await smartEndpoints();
    const tr = await fetch(token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${publicOrigin(req)}/api/integrations/epic/callback`,
        client_id: process.env.EPIC_CLIENT_ID!,
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!tr.ok) return to("epic=token");
    const t = (await tr.json()) as { access_token?: string; patient?: string };
    if (!t.access_token || !t.patient) return to("epic=token");
    const bundles = await fetchObservations(t.access_token, t.patient);
    const items = bundles.flatMap((b) => parseFhir(b));
    const r = saveLabs(user.id, items, "epic_fhir");
    recordSource(user.id, { kind: "epic", label: "Epic MyChart", details: "SMART on FHIR · Observations", records: r.added });
    return to(`epic=ok&n=${r.added}`);
  } catch {
    return to("epic=error");
  }
}
