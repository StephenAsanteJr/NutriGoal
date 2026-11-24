import { json, preflight, userFromRequest } from "@/lib/integrations/tokens";
import { computeTrends } from "@/lib/integrations/trends";

/** GET /api/v1/trends?days=30 — the member's nutrition trends, targets, insights and labs. */
export async function GET(req: Request) {
  const user = userFromRequest(req, "integrations");
  if (!user) return json({ error: "Invalid or missing API token." }, 401);
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  const t = computeTrends(user.id, [7, 14, 30, 90].includes(days) ? days : 30);
  return json({ days: t.days, averages: t.averages, targets: t.targets, macro_split_pct: t.split, insights: t.insights, labs: t.labs.map((l) => ({ code: l.code, label: l.label, value: l.value, unit: l.unit, date: l.date, previous: l.previous, source: l.source })), daily: t.current });
}

export const OPTIONS = preflight;
