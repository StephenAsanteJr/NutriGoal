import { z } from "zod";
import { json, preflight, userFromRequest } from "@/lib/integrations/tokens";
import { recordSource, saveNutritionDays } from "@/lib/integrations/nutrition";

const Day = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  calories: z.number().min(0).max(20000).nullish(),
  protein_g: z.number().min(0).max(1000).nullish(),
  carbs_g: z.number().min(0).max(2000).nullish(),
  fat_g: z.number().min(0).max(1000).nullish(),
  fiber_g: z.number().min(0).max(500).nullish(),
  sugar_g: z.number().min(0).max(1000).nullish(),
  sodium_mg: z.number().min(0).max(50000).nullish(),
});
const Body = z.object({ source: z.string().regex(/^[a-z0-9_-]{2,30}$/), days: z.array(Day).min(1).max(731) });

/** POST /api/v1/nutrition — daily nutrition totals from a tracker or automation. */
export async function POST(req: Request) {
  const user = userFromRequest(req, "integrations");
  if (!user) return json({ error: "Invalid or missing API token." }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid body.", issues: parsed.error.issues.slice(0, 5) }, 400);
  const { source, days } = parsed.data;
  const n = saveNutritionDays(
    user.id,
    source,
    days.map((d) => ({ day: d.date, calories: d.calories ?? null, protein_g: d.protein_g ?? null, carbs_g: d.carbs_g ?? null, fat_g: d.fat_g ?? null, fiber_g: d.fiber_g ?? null, sugar_g: d.sugar_g ?? null, sodium_mg: d.sodium_mg ?? null })),
  );
  recordSource(user.id, { kind: source, label: `${source} via API`, details: "NutriGoal API", records: n });
  return json({ saved: n });
}

export const OPTIONS = preflight;
