import { getCurrentUser } from "@/lib/auth";
import { AiError, aiAvailable, structureResponseTranscript, structureTicketTranscript } from "@/lib/ai";
import { fallbackResponse, fallbackTicket } from "@/lib/voice-fallback";
import { getTicket } from "@/lib/data";
import { goalLabel } from "@/lib/domain";

/**
 * Voice mode: turn a spoken transcript into form fields.
 *  kind "ticket"   (members)    → goal ticket fields
 *  kind "response" (clinicians) → recommendation + 5–6 timed steps (wording help only; the clinician reviews and signs)
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { kind?: string; transcript?: string; ticketId?: number } | null;
  const transcript = String(body?.transcript ?? "").trim();
  if (transcript.length < 10) return Response.json({ error: "We didn't catch enough. Try speaking for a little longer." }, { status: 400 });

  if (body?.kind === "ticket") {
    if (user.role !== "member") return Response.json({ error: "Members only." }, { status: 403 });
    if (!aiAvailable()) return Response.json({ fields: fallbackTicket(transcript), ai: false });
    try {
      return Response.json({ fields: await structureTicketTranscript(transcript), ai: true });
    } catch (e) {
      return Response.json({ fields: fallbackTicket(transcript), ai: false, note: e instanceof AiError ? e.message : undefined });
    }
  }

  if (body?.kind === "response") {
    if (user.role !== "clinician") return Response.json({ error: "Clinicians only." }, { status: 403 });
    const t = body.ticketId ? getTicket(Number(body.ticketId)) : null;
    if (!t || t.assigned_clinician_id !== user.id) return Response.json({ error: "This ticket isn't assigned to you." }, { status: 403 });
    const summary = `Goal (${goalLabel(t.goal_type)}): ${t.goal_statement}\nTarget: ${t.specific_target}\nSetbacks: ${t.setbacks}`;
    if (!aiAvailable()) return Response.json({ draft: fallbackResponse(transcript), ai: false });
    try {
      return Response.json({ draft: await structureResponseTranscript(transcript, summary), ai: true });
    } catch (e) {
      return Response.json({ draft: fallbackResponse(transcript), ai: false, note: e instanceof AiError ? e.message : undefined });
    }
  }

  return Response.json({ error: "Unknown voice request." }, { status: 400 });
}
