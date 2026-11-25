import "server-only";
import type { User } from "@/lib/auth";
import { AiError, aiAvailable, structureResponseTranscript, structureTicketTranscript } from "@/lib/ai";
import { fallbackResponse, fallbackTicket } from "@/lib/voice-fallback";
import { getTicket } from "@/lib/data";
import { goalLabel } from "@/lib/domain";

type VoiceRequest = { kind?: unknown; transcript?: unknown; ticketId?: unknown } | null;

/**
 * Voice mode, shared by the website (/api/voice) and the mobile app (/api/mobile/voice):
 * turn a spoken transcript into form fields.
 *  kind "ticket"   (members)    → goal ticket fields
 *  kind "response" (clinicians) → recommendation + 5–6 timed steps (wording help only; the clinician reviews and signs)
 * Without an AI key it uses simple keyword rules, so it always returns something to review.
 */
export async function runVoiceMode(user: User, body: VoiceRequest): Promise<{ status: number; body: Record<string, unknown> }> {
  const transcript = String(body?.transcript ?? "").trim();
  if (transcript.length < 10) return { status: 400, body: { error: "We didn't catch enough. Try speaking for a little longer." } };

  if (body?.kind === "ticket") {
    if (user.role !== "member") return { status: 403, body: { error: "Members only." } };
    if (!aiAvailable()) return { status: 200, body: { fields: fallbackTicket(transcript), ai: false } };
    try {
      return { status: 200, body: { fields: await structureTicketTranscript(transcript), ai: true } };
    } catch (e) {
      return { status: 200, body: { fields: fallbackTicket(transcript), ai: false, note: e instanceof AiError ? e.message : undefined } };
    }
  }

  if (body?.kind === "response") {
    if (user.role !== "clinician") return { status: 403, body: { error: "Clinicians only." } };
    const t = body.ticketId ? getTicket(Number(body.ticketId)) : null;
    if (!t || t.assigned_clinician_id !== user.id) return { status: 403, body: { error: "This ticket isn't assigned to you." } };
    const summary = `Goal (${goalLabel(t.goal_type)}): ${t.goal_statement}\nTarget: ${t.specific_target}\nSetbacks: ${t.setbacks}`;
    if (!aiAvailable()) return { status: 200, body: { draft: fallbackResponse(transcript), ai: false } };
    try {
      return { status: 200, body: { draft: await structureResponseTranscript(transcript, summary), ai: true } };
    } catch (e) {
      return { status: 200, body: { draft: fallbackResponse(transcript), ai: false, note: e instanceof AiError ? e.message : undefined } };
    }
  }

  return { status: 400, body: { error: "Unknown voice request." } };
}
