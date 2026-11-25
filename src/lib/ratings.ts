import "server-only";
import { db, nowIso } from "./db";
import { getTicket } from "./data";

/** Members rate the response on their own ticket, 1–5 stars, with an optional short comment. They can change it. */
export function rateResponseFor(userId: string, ticketId: number, rating: number, comment: string): { ok: true } | { ok: false; error: string } {
  const t = getTicket(ticketId);
  if (!t || t.user_id !== userId) return { ok: false, error: "Ticket not found." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Choose 1 to 5 stars." };
  const res = db()
    .prepare("UPDATE ticket_responses SET rating = ?, rating_comment = ?, rated_at = ? WHERE ticket_id = ?")
    .run(rating, comment.trim().slice(0, 300) || null, nowIso(), ticketId);
  if (!res.changes) return { ok: false, error: "This ticket doesn't have a response to rate yet." };
  return { ok: true };
}
