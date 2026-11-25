import "server-only";
// Writing and signing a response ticket. Shared by the web composer and the mobile app.

import { db, newId, nowIso } from "./db";
import { getTicket, getUserById, notify, type Step } from "./data";
import { ticketNumber } from "./domain";
import { cleanFoods } from "./foods";
import type { User } from "./auth";

export type ResponseInput = { recommendation: string; steps: { title: string; detail: string; timeframe: string }[]; aiAssist: "none" | "wording"; foods?: unknown };
export type ResponseResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function startReviewFor(user: User, ticketId: number) {
  const t = getTicket(ticketId);
  if (!t || user.role !== "clinician" || t.assigned_clinician_id !== user.id) return false;
  db().prepare("UPDATE tickets SET status = 'in_review' WHERE id = ? AND status = 'assigned'").run(ticketId);
  return true;
}

/** Only the assigned clinician can write and sign. 5–6 complete steps are required. */
export function saveResponse(user: User, ticketId: number, input: ResponseInput): ResponseResult {
  const t = getTicket(ticketId);
  if (!t) return { ok: false, error: "Ticket not found." };
  if (user.role !== "clinician" || t.assigned_clinician_id !== user.id) return { ok: false, error: "Only the assigned clinician can write and sign this response." };
  if (t.status === "responded") return { ok: false, error: "This ticket already has a response." };

  const recommendation = input.recommendation.trim();
  const fieldErrors: Record<string, string> = {};
  if (recommendation.length < 30) fieldErrors.recommendation = "Write a concise recommendation (at least 30 characters).";
  if (recommendation.length > 420) fieldErrors.recommendation = "Keep the recommendation concise: 420 characters or fewer.";
  const steps: Step[] = [];
  input.steps.forEach((s, i) => {
    const title = (s.title ?? "").trim();
    const detail = (s.detail ?? "").trim();
    const timeframe = (s.timeframe ?? "").trim();
    if (!title && !detail && !timeframe) return;
    if (!title || !detail || !timeframe) fieldErrors[`step_${i}`] = "Give this step a title, details and a timeframe.";
    steps.push({ title: title.slice(0, 80), detail: detail.slice(0, 400), timeframe: timeframe.slice(0, 40) });
  });
  if (steps.length < 5 || steps.length > 6) fieldErrors.steps = "A response ticket needs 5 or 6 actionable steps.";
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Please complete the response before sending.", fieldErrors };

  const now = nowIso();
  const foods = cleanFoods(input.foods);
  db().transaction(() => {
    db()
      .prepare("INSERT INTO ticket_responses (id, ticket_id, clinician_id, recommendation, steps_json, ai_assist, foods_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(newId(), ticketId, user.id, recommendation, JSON.stringify(steps), input.aiAssist === "wording" ? "wording" : "none", foods ? JSON.stringify(foods) : null, now);
    db().prepare("UPDATE tickets SET status = 'responded', responded_at = ? WHERE id = ?").run(now, ticketId);
  })();
  const clinician = getUserById(user.id);
  notify(t.user_id, "Your response ticket is ready", `${clinician?.name ?? "Your clinician"} answered ${ticketNumber(ticketId)}: ${t.goal_statement.slice(0, 80)}`, `/tickets/${ticketId}`);
  return { ok: true };
}
