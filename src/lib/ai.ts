import "server-only";
// Claude integration. Everything here degrades gracefully: when no Anthropic
// credentials are configured, callers fall back to non-AI behaviour.
//
// Model: Claude Opus 5.5 via the Messages API, with server-side refusal
// fallbacks enabled (beta "server-side-fallback-2026-07-01", fallbacks: "default").

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { GOAL_TYPES, TIMEFRAME_PRESETS } from "./domain";

export const AI_MODEL = "claude-opus-5-5";
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function aiAvailable() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.NUTRIGOAL_AI === "on");
}

let _client: Anthropic | null = null;
export function claude() {
  if (!_client) _client = new Anthropic(); // resolves credentials from the environment
  return _client;
}

export class AiError extends Error {}

/** One structured-output call; returns the parsed object or throws AiError with a user-safe message. */
async function structured<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[] | string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<T>> {
  if (!aiAvailable()) throw new AiError("AI features are not configured on this server.");
  try {
    const res = await claude().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: opts.system,
      output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
      messages: [{ role: "user", content: opts.content }],
    });
    if (res.stop_reason === "refusal") throw new AiError("The assistant couldn't help with that request.");
    if (!res.parsed_output) throw new AiError("The assistant returned an unexpected response. Please try again.");
    return res.parsed_output as z.infer<T>;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("The AI service key is invalid.");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("The AI service is busy. Please try again in a minute.");
    if (e instanceof Anthropic.APIError) throw new AiError(`The AI service returned an error (${e.status ?? "network"}).`);
    throw new AiError("The AI service could not be reached.");
  }
}

// ---------- Photo body scan ----------
export const BodyScanSchema = z.object({
  usable: z.boolean().describe("False if the photo does not clearly show one adult's body from roughly head to hips or knees."),
  reason_if_unusable: z.string(),
  body_fat_low: z.number().describe("Lower bound of the estimated body fat percentage"),
  body_fat_high: z.number().describe("Upper bound of the estimated body fat percentage"),
  body_shape: z.enum(["lean", "athletic", "average", "soft", "higher body fat"]),
  confidence: z.enum(["low", "medium"]),
  notes: z.string().describe("One or two neutral, non-judgmental sentences about what the estimate is based on."),
});
export type BodyScan = z.infer<typeof BodyScanSchema>;

export async function estimateBodyFromPhoto(base64: string, mediaType: "image/jpeg" | "image/png" | "image/webp", sex: string | null) {
  return structured({
    schema: BodyScanSchema,
    effort: "medium",
    system:
      "You help a nutrition app's members personalise a cartoon avatar of their body. Look at the member's own photo and give a broad, " +
      "visual body-fat range (a range at least 6 points wide), a body-shape label and low or medium confidence. This is a rough visual " +
      "estimate for an illustration, never a diagnosis: no medical claims, no comments on attractiveness, and neutral wording. " +
      "Mark the photo unusable if it shows no person, more than one person, a person who may be under 18, or too little of the body.",
    content: [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: `Estimate a body-fat range for this member's avatar.${sex ? ` They describe their sex as ${sex}.` : ""}` },
    ],
  });
}

// ---------- Voice mode: member ticket ----------
const goalIds = GOAL_TYPES.map((g) => g.id) as [string, ...string[]];
export const TicketDraftSchema = z.object({
  goal_type: z.enum(goalIds),
  goal_statement: z.string().describe("The member's single nutrition goal as one first-person sentence, under 200 characters."),
  typical_diet: z.string().describe("What they typically eat, in their own words, tidied into short sentences."),
  setbacks: z.string().describe("Setbacks or obstacles they mentioned. Empty string if none."),
  specific_target: z.string().describe("The measurable target they want to hit (number, lab value or date). Empty string if none."),
  extra_context: z.string().describe("Medicines, allergies, budget or anything else useful. Empty string if none."),
});

export async function structureTicketTranscript(transcript: string) {
  return structured({
    schema: TicketDraftSchema,
    system:
      "You turn a member's spoken description of a nutrition goal into the fields of a goal ticket. Keep their meaning and wording; " +
      "fix only speech-to-text errors, filler words and ordering. Never add advice, facts or numbers they did not say. " +
      `Pick goal_type from: ${GOAL_TYPES.map((g) => `${g.id} (${g.label})`).join(", ")}.`,
    content: `Spoken ticket transcript:\n"""${transcript.slice(0, 6000)}"""`,
  });
}

// ---------- Voice mode: clinician response ----------
export const ResponseDraftSchema = z.object({
  recommendation: z.string().describe("The clinician's concise recommendation, 1-3 sentences, under 400 characters."),
  steps: z
    .array(
      z.object({
        title: z.string().describe("Short imperative step title, under 60 characters"),
        detail: z.string().describe("What exactly to do, in the clinician's words, under 300 characters"),
        timeframe: z.string().describe(`When to do it, e.g. one of: ${TIMEFRAME_PRESETS.join(", ")}`),
      }),
    )
    .describe("The 5 or 6 actionable steps the clinician dictated, in order."),
});

export async function structureResponseTranscript(transcript: string, ticketSummary: string) {
  return structured({
    schema: ResponseDraftSchema,
    maxTokens: 6000,
    system:
      "You are a wording assistant for a licensed physician or dietitian. Format their dictated response to a member's nutrition ticket " +
      "into a concise recommendation and 5-6 timed action steps. Use only the clinical content the clinician dictated: do not add, remove " +
      "or change any recommendation, dose, number or timeframe. If they dictated fewer than 5 steps, split their content into clear steps " +
      "without inventing new advice; if more than 6, merge the closest ones. The clinician reviews and signs the result.",
    content: `Ticket context (for wording only):\n${ticketSummary.slice(0, 1500)}\n\nClinician dictation:\n"""${transcript.slice(0, 8000)}"""`,
  });
}
