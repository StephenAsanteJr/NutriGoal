import { json, preflight, userFromRequest } from "@/lib/integrations/tokens";

/** GET /api/v1/me — check a token works. */
export async function GET(req: Request) {
  const user = userFromRequest(req, "integrations");
  if (!user) return json({ error: "Invalid or missing API token." }, 401);
  return json({ id: user.id, name: user.name, role: user.role });
}

export const OPTIONS = preflight;
