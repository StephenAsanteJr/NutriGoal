// Example foods for members' macro targets, organized like a dietitian's exchange list: five broad
// food groups, each with a typical serving. A food is listed only if one serving matches the group's
// typical serving at least 80% on calories, protein, carbs and fat, so foods in a group can be swapped.
// No meals, just foods. Values are rounded, per serving, from USDA FoodData Central-style figures;
// packaged foods vary by brand. Pure module: safe on the server, in the browser and in the mobile API.

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
export type Food = Macros & { name: string; serving: string };
export type FoodGroupId = "protein" | "grains" | "produce" | "dairy" | "fats";
export type FoodGroup = { id: FoodGroupId; label: string; hint: string; typical: Macros & { serving: string }; foods: Food[] };

const f = (name: string, serving: string, kcal: number, protein: number, carbs: number, fat: number): Food => ({ name, serving, kcal, protein, carbs, fat });

export const FOOD_GROUPS: FoodGroup[] = [
  {
    id: "protein",
    label: "Protein foods",
    hint: "Lean meats, fish, seafood and plant proteins",
    typical: { serving: "3 oz cooked (palm-sized)", kcal: 115, protein: 22, carbs: 0, fat: 2.5 },
    foods: [
      f("Chicken breast, skinless", "3 oz cooked", 128, 26, 0, 2.7),
      f("Turkey breast", "3 oz cooked", 125, 25, 0, 2),
      f("Tuna, canned in water", "3 oz drained", 99, 22, 0, 0.7),
      f("Shrimp", "3 oz cooked", 84, 20, 0.2, 0.2),
      f("White fish, like cod or tilapia", "3 oz cooked", 100, 21, 0, 1.5),
      f("Pork tenderloin", "3 oz cooked", 122, 22, 0, 3),
      f("Lean ground beef, 95% lean", "3 oz cooked", 139, 22, 0, 5),
      f("Egg whites", "¾ cup", 95, 20, 1.4, 0.3),
      f("Seitan (wheat protein)", "3 oz", 105, 21, 4, 1),
      f("Salmon", "3 oz cooked", 175, 19, 0, 11),
    ],
  },
  {
    id: "grains",
    label: "Grains, starches & beans",
    hint: "Whole grains, starchy vegetables, beans and lentils",
    typical: { serving: "½ cup cooked (cupped hand)", kcal: 105, protein: 3.5, carbs: 21, fat: 0.8 },
    foods: [
      f("Brown rice", "½ cup cooked", 108, 2.5, 22.4, 0.9),
      f("Quinoa", "½ cup cooked", 111, 4, 19.7, 1.8),
      f("Whole-wheat pasta", "½ cup cooked", 87, 3.7, 18.6, 0.4),
      f("Rolled oats", "⅓ cup dry", 100, 3.5, 18, 1.8),
      f("Whole-grain bread", "1 slice", 80, 4, 14, 1),
      f("Sweet potato", "1 medium, baked", 103, 2.3, 23.6, 0.2),
      f("Potato", "1 small, baked", 128, 3.5, 29, 0.2),
      f("Corn tortillas", "2 small", 114, 3, 23, 1.5),
      f("Black beans", "½ cup cooked", 114, 7.6, 20.4, 0.5),
      f("Lentils", "½ cup cooked", 115, 9, 20, 0.4),
    ],
  },
  {
    id: "produce",
    label: "Fruits & vegetables",
    hint: "Fresh or frozen; leafy greens are extra and nearly free",
    typical: { serving: "1 cup fruit or 1–1½ cups vegetables", kcal: 50, protein: 1.5, carbs: 11.5, fat: 0.3 },
    foods: [
      f("Strawberries", "1 cup", 49, 1, 11.7, 0.5),
      f("Blueberries", "½ cup", 42, 0.5, 10.7, 0.2),
      f("Orange", "1 medium", 62, 1.2, 15.4, 0.2),
      f("Banana", "½ medium", 53, 0.7, 13.5, 0.2),
      f("Apple slices", "1 cup", 57, 0.3, 15, 0.2),
      f("Carrots", "1 cup chopped", 52, 1.2, 12.3, 0.3),
      f("Bell pepper", "1 large", 51, 1.6, 9.9, 0.5),
      f("Green beans", "1½ cups", 51, 3, 11.5, 0.2),
      f("Broccoli", "1½ cups florets", 46, 3.8, 9, 0.5),
    ],
  },
  {
    id: "dairy",
    label: "Dairy & alternatives",
    hint: "Milk, yogurt, cottage cheese and fortified alternatives",
    typical: { serving: "1 cup milk or ¾ cup yogurt", kcal: 105, protein: 11, carbs: 9, fat: 2.5 },
    foods: [
      f("Milk, 1%", "1 cup", 102, 8.2, 12.2, 2.4),
      f("Greek yogurt, plain 2%", "¾ cup", 124, 17, 6.8, 3.3),
      f("Cottage cheese, 2%", "½ cup", 92, 12, 5, 2.6),
      f("Kefir, low-fat plain", "1 cup", 104, 9.2, 11.7, 2.3),
      f("Ultra-filtered milk, 2%", "1 cup", 120, 13, 6, 4.5),
      f("Soy milk, unsweetened", "1 cup", 80, 7, 4, 4),
    ],
  },
  {
    id: "fats",
    label: "Healthy fats",
    hint: "Small portions of oils, nuts, seeds and avocado",
    typical: { serving: "1 tsp oil or a small handful of nuts", kcal: 45, protein: 0.5, carbs: 1, fat: 5 },
    foods: [
      f("Olive oil", "1 tsp", 40, 0, 0, 4.5),
      f("Avocado", "2 tbsp mashed", 48, 0.6, 2.6, 4.4),
      f("Almonds", "7 nuts", 49, 1.8, 1.8, 4.2),
      f("Walnuts", "4 halves", 52, 1.2, 1.1, 5.2),
      f("Peanut butter", "1½ tsp", 47, 2, 1.6, 4),
      f("Olives", "8 large", 40, 0.3, 2, 3.7),
    ],
  },
];

export const MIN_MATCH = 0.8;

/**
 * How closely one serving of a food matches another (0–1): compares the calories that come from
 * protein, carbs and fat. Same amounts = 1; twice the calories in the same proportions ≈ 0.67.
 */
export function similarity(a: Macros, b: Macros) {
  const va = [a.protein * 4, a.carbs * 4, a.fat * 9];
  const vb = [b.protein * 4, b.carbs * 4, b.fat * 9];
  const diff = va.reduce((s, x, i) => s + Math.abs(x - vb[i]), 0);
  const total = va.reduce((s, x) => s + x, 0) + vb.reduce((s, x) => s + x, 0);
  return total ? 1 - diff / total : 1;
}

/** Foods in a group that match its typical serving at least 80%, best match first. */
export function examplesFor(group: FoodGroup) {
  return group.foods
    .map((food) => ({ ...food, match: similarity(food, group.typical) }))
    .filter((x) => x.match >= MIN_MATCH)
    .sort((a, b) => b.match - a.match);
}

export type Targets = { kcal: number; protein: number; carbs: number; fat: number };
export type GuideRow = { group: FoodGroup; servings: number; examples: (Food & { match: number })[] };
export type FoodGuide = { rows: GuideRow[]; totals: Macros; match: { kcal: number; protein: number; carbs: number; fat: number; overall: number } };

const RANGES: Record<FoodGroupId, [number, number]> = { protein: [2, 10], grains: [1, 12], produce: [5, 10], dairy: [0, 4], fats: [0, 10] };

/** Daily servings per group whose totals land closest to the member's targets, with % match per nutrient. */
export function foodGuide(t: Targets): FoodGuide {
  const g = Object.fromEntries(FOOD_GROUPS.map((x) => [x.id, x])) as Record<FoodGroupId, FoodGroup>;
  const err = (a: number, b: number) => ((a - b) / Math.max(b, 1)) ** 2;
  let best: { s: Record<FoodGroupId, number>; score: number } | null = null;
  const [pr, gr, fv, da, fa] = (["protein", "grains", "produce", "dairy", "fats"] as const).map((k) => RANGES[k]);
  for (let p = pr[0]; p <= pr[1]; p++)
    for (let q = gr[0]; q <= gr[1]; q++)
      for (let v = fv[0]; v <= fv[1]; v++)
        for (let d = da[0]; d <= da[1]; d++)
          for (let o = fa[0]; o <= fa[1]; o++) {
            const s = { protein: p, grains: q, produce: v, dairy: d, fats: o };
            const tot = sum(s, g);
            // Protein counts double: it's the target members most often miss.
            const score = err(tot.kcal, t.kcal) + 2 * err(tot.protein, t.protein) + err(tot.carbs, t.carbs) + err(tot.fat, t.fat);
            if (!best || score < best.score) best = { s, score };
          }
  const s = best!.s;
  const totals = sum(s, g);
  const pct = (a: number, b: number) => Math.max(0, Math.round(100 - (Math.abs(a - b) / Math.max(b, 1)) * 100));
  const match = { kcal: pct(totals.kcal, t.kcal), protein: pct(totals.protein, t.protein), carbs: pct(totals.carbs, t.carbs), fat: pct(totals.fat, t.fat), overall: 0 };
  match.overall = Math.round((match.kcal + match.protein + match.carbs + match.fat) / 4);
  return { rows: FOOD_GROUPS.map((group) => ({ group, servings: s[group.id], examples: examplesFor(group) })), totals, match };
}

function sum(s: Record<FoodGroupId, number>, g: Record<FoodGroupId, FoodGroup>): Macros {
  const out = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const id of Object.keys(s) as FoodGroupId[]) {
    const m = g[id].typical;
    out.kcal += m.kcal * s[id];
    out.protein += m.protein * s[id];
    out.carbs += m.carbs * s[id];
    out.fat += m.fat * s[id];
  }
  return { kcal: Math.round(out.kcal), protein: Math.round(out.protein), carbs: Math.round(out.carbs), fat: Math.round(out.fat) };
}

/** Grams of carbs, protein and fat from a calorie target and a macro split (percentages). */
export function macroTargets(kcal: number, split: { carbs: number; protein: number; fat: number }, proteinFloorG?: number): Targets {
  const protein = Math.max(Math.round((kcal * split.protein) / 100 / 4), proteinFloorG ?? 0);
  return { kcal, protein, carbs: Math.round((kcal * split.carbs) / 100 / 4), fat: Math.round((kcal * split.fat) / 100 / 9) };
}

// ---------- Clinician food suggestions on a response ticket ----------

export type ClinicianFoods = Partial<Record<FoodGroupId, string[]>>;

/** Keep only known groups, up to 6 short entries each (catalog names or the clinician's own wording). */
export function cleanFoods(input: unknown): ClinicianFoods | null {
  if (!input || typeof input !== "object") return null;
  const out: ClinicianFoods = {};
  for (const g of FOOD_GROUPS) {
    const raw = (input as Record<string, unknown>)[g.id];
    if (!Array.isArray(raw)) continue;
    const items = [...new Set(raw.map((x) => String(x ?? "").trim().slice(0, 60)).filter(Boolean))].slice(0, 6);
    if (items.length) out[g.id] = items;
  }
  return Object.keys(out).length ? out : null;
}

/** Catalog details for a suggested food name, if it's one of ours. */
export function findFood(group: FoodGroupId, name: string) {
  return FOOD_GROUPS.find((g) => g.id === group)?.foods.find((x) => x.name === name) ?? null;
}
