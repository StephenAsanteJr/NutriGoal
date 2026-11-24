import { z } from "zod";
import { json, preflight, userFromRequest } from "@/lib/integrations/tokens";
import { parseFhir, saveLabs, type LabItem } from "@/lib/integrations/fhir";
import { recordSource } from "@/lib/integrations/nutrition";

const Simple = z.object({
  observations: z
    .array(z.object({ loinc: z.string().regex(/^[\d-]{3,10}$/), value: z.number(), unit: z.string().max(20), date: z.string().regex(/^\d{4}-\d{2}-\d{2}/) }))
    .min(1)
    .max(1000),
});

/**
 * POST /api/v1/health-records — provider results as a FHIR R4 Bundle/Observation
 * (e.g. from Epic) or a simple { observations: [{ loinc, value, unit, date }] } list.
 */
export async function POST(req: Request) {
  const user = userFromRequest(req, "integrations");
  if (!user) return json({ error: "Invalid or missing API token." }, 401);
  const body = await req.json().catch(() => null);
  let items: LabItem[] = [];
  if (body && (body.resourceType || Array.isArray(body))) items = parseFhir(body);
  else {
    const s = Simple.safeParse(body);
    if (!s.success) return json({ error: "Send a FHIR Bundle/Observation or { observations: [...] }." }, 400);
    items = parseFhir(
      s.data.observations.map((o) => ({
        resourceType: "Observation",
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: o.loinc }] },
        valueQuantity: { value: o.value, unit: o.unit },
        effectiveDateTime: o.date,
      })),
    );
  }
  if (!items.length) return json({ saved: 0, note: "No supported LOINC codes found." });
  const r = saveLabs(user.id, items, "api");
  recordSource(user.id, { kind: "api_records", label: "Health records via API", details: "NutriGoal API", records: r.added });
  return json({ received: r.total, saved: r.added });
}

export const OPTIONS = preflight;
