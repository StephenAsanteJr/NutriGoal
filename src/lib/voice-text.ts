// Plain-text scripts for the "Listen" (read aloud) buttons. Pure functions: safe on server and client.

/** A response plan as one paragraph to read aloud. */
export function planScript(p: { recommendation: string; steps: { title: string; detail: string; timeframe: string }[]; clinician?: string; foods?: Record<string, string[] | undefined> | null }) {
  const steps = p.steps.map((s, i) => `Step ${i + 1}, ${s.timeframe}: ${s.title}. ${s.detail}`).join(" ");
  const foods = p.foods ? Object.values(p.foods).flat().filter(Boolean) : [];
  return `${p.clinician ? `Your plan from ${p.clinician}. ` : ""}Recommendation: ${p.recommendation} ${steps}${foods.length ? ` Suggested foods: ${foods.join(", ")}.` : ""}`;
}
