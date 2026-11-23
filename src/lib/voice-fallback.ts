// Rule-based fallback for voice mode when no AI model is configured.
// Splits a spoken transcript into ticket fields or clinician-response steps
// using simple keyword cues. Pure functions; safe on client and server.

import { GOAL_TYPES } from "./domain";

const sentences = (t: string) =>
  t
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\s+(?=(?:also|and then|then|next|after that|finally|second|third|fourth|fifth|sixth)\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const GOAL_KEYWORDS: [string, RegExp][] = [
  ["glp1_side_effects", /nause|side effect|ozempic|wegovy|zepbound|mounjaro|glp/i],
  ["blood_sugar", /a1c|blood sugar|glucose|diabet|insulin/i],
  ["heart_health", /cholesterol|ldl|triglycer|blood pressure|heart/i],
  ["protein", /protein/i],
  ["muscle_gain", /muscle|bulk|gain weight|strength/i],
  ["keep_weight_off", /keep (the )?weight off|maintain|coming off|regain/i],
  ["budget_meals", /budget|cheap|afford|money|\$\d+/i],
  ["fat_loss", /lose|fat|weight loss|slim/i],
];

export function fallbackTicket(transcript: string) {
  const parts = sentences(transcript);
  const goalType = GOAL_KEYWORDS.find(([, re]) => re.test(transcript))?.[0] ?? GOAL_TYPES[0].id;
  const pick = (re: RegExp) => parts.filter((s) => re.test(s));
  const diet = pick(/\b(eat|ate|breakfast|lunch|dinner|snack|drink|meal|usually have|coffee|cook)\b/i);
  const setbacks = pick(/\b(struggle|hard|problem|setback|can't|cannot|don't have time|busy|craving|nause|skip|stress|travel|picky)\b/i);
  const target = pick(/\b(\d+\s?(g|grams|lb|lbs|pounds|kg|%|percent)|under|below|by (january|february|march|april|may|june|july|august|september|october|november|december|next|the end)|target|goal is)\b/i);
  const used = new Set([...diet, ...setbacks, ...target]);
  const goal = parts.find((s) => /\b(want|goal|trying|hoping|need|would like)\b/i.test(s) && !used.has(s)) ?? parts.find((s) => !used.has(s)) ?? parts[0] ?? "";
  return {
    goal_type: goalType,
    goal_statement: cap(goal).slice(0, 200),
    typical_diet: diet.map(cap).join(" "),
    setbacks: setbacks.filter((s) => !diet.includes(s)).map(cap).join(" "),
    specific_target: target.filter((s) => s !== goal).map(cap).join(" ").slice(0, 300),
    extra_context: "",
  };
}

const TIMEFRAMES: [RegExp, string][] = [
  [/\b(today|tonight|right away|immediately)\b/i, "Today"],
  [/\b(first (few|three|3) days|days? (one|1) (to|through|-) (three|3)|next (few|couple of) days)\b/i, "Days 1–3"],
  [/\b(this week|week (one|1)|first week|within a week)\b/i, "Week 1"],
  [/\b(two weeks|2 weeks|weeks? (one|1) (to|through|-) (two|2))\b/i, "Weeks 1–2"],
  [/\b(weeks? (two|2) (to|through|-) (four|4)|by week four|three weeks|this month|four weeks|4 weeks)\b/i, "Weeks 2–4"],
  [/\b(month two|second month|next month|in a month)\b/i, "Month 2"],
  [/\b(three months|3 months|12 weeks|twelve weeks|months? (two|2) (to|through|-) (three|3))\b/i, "Months 2–3"],
  [/\b(ongoing|every day|daily|always|long term|keep doing)\b/i, "Ongoing"],
];

export function fallbackResponse(transcript: string) {
  const parts = sentences(transcript);
  const isStepStart = (s: string) => /^(step|first|second|third|fourth|fifth|sixth|next|then|also|finally|after that|number)\b/i.test(s);
  const firstStep = parts.findIndex(isStepStart);
  const recParts = firstStep > 0 ? parts.slice(0, firstStep) : parts.slice(0, 1);
  const rest = firstStep > 0 ? parts.slice(firstStep) : parts.slice(1);
  const steps = rest
    .map((s) => s.replace(/^(step (one|two|three|four|five|six|\d)|first(ly)?|second(ly)?|third(ly)?|fourth|fifth|sixth|next|then|also|finally|after that|number \w+)[,:]?\s*/i, ""))
    .filter((s) => s.length > 3)
    .slice(0, 6)
    .map((s) => {
      const tf = TIMEFRAMES.find(([re]) => re.test(s))?.[1] ?? "Week 1";
      const words = s.replace(/[.!?]$/, "").split(" ");
      return { title: cap(words.slice(0, 6).join(" ")).slice(0, 60), detail: cap(s).slice(0, 300), timeframe: tf };
    });
  return { recommendation: cap(recParts.join(" ")).slice(0, 400), steps };
}
