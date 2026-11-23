import "server-only";
// Nudges: a polite "please review this ticket" ping to the assigned clinician.
// Members (directly or through the assistant) can nudge an open ticket at most
// once every 6 hours; managers can nudge any time.

import { db, newId, nowIso } from "./db";
import { getTicket, notify } from "./data";
import { ticketNumber } from "./domain";

const MEMBER_COOLDOWN_H = 6;

export type NudgeResult = { ok: true; message: string } | { ok: false; message: string };

export function nudgeClinician(opts: {
  ticketId: number;
  actor: { id: string; role: string; name: string };
  source: "member" | "assistant" | "manager";
  note?: string;
}): NudgeResult {
  const t = getTicket(opts.ticketId);
  if (!t) return { ok: false, message: "That ticket doesn't exist." };
  if (opts.actor.role === "member" && t.user_id !== opts.actor.id) return { ok: false, message: "That ticket doesn't exist." };
  if (t.status === "responded") return { ok: false, message: `${ticketNumber(t.id)} already has a response ticket.` };
  if (t.status === "awaiting_payment" || !t.assigned_clinician_id) return { ok: false, message: `${ticketNumber(t.id)} hasn't been submitted yet.` };

  if (opts.source !== "manager") {
    const last = db()
      .prepare("SELECT created_at FROM nudges WHERE ticket_id = ? AND source != 'manager' ORDER BY created_at DESC LIMIT 1")
      .get(t.id) as { created_at: string } | undefined;
    if (last) {
      const hours = (Date.now() - new Date(last.created_at).getTime()) / 3600_000;
      if (hours < MEMBER_COOLDOWN_H) {
        const mins = Math.max(1, Math.round(hours * 60));
        const ago = mins < 60 ? `${mins} minute${mins === 1 ? "" : "s"}` : `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
        const wait = Math.ceil(MEMBER_COOLDOWN_H - hours);
        return {
          ok: false,
          message: `${t.clinician_name} was already nudged about ${ticketNumber(t.id)} ${ago} ago, so I didn't send another. You can nudge again in about ${wait} hour${wait === 1 ? "" : "s"}.`,
        };
      }
    }
  }

  const note = opts.note?.trim().slice(0, 240) || null;
  db()
    .prepare("INSERT INTO nudges (id, ticket_id, member_id, clinician_id, source, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(newId(), t.id, t.user_id, t.assigned_clinician_id, opts.source, note, nowIso());

  const due = t.due_at ? new Date(t.due_at) : null;
  const dueText = due ? (due < new Date() ? "now overdue" : `due ${due.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`) : "";
  const who = opts.source === "manager" ? `${opts.actor.name} (operations)` : `${t.member_name}${opts.source === "assistant" ? " via NutriGoal Assistant" : ""}`;
  notify(
    t.assigned_clinician_id,
    `Nudge: please review ${ticketNumber(t.id)}`,
    `${who} asked for an update on “${t.goal_statement.slice(0, 70)}”${dueText ? ` (${dueText})` : ""}.${note ? ` Note: ${note}` : ""}`,
    `/staff/tickets/${t.id}`,
  );
  return {
    ok: true,
    message: `Done. I've nudged ${t.clinician_name} to review ${ticketNumber(t.id)}${dueText ? ` (${dueText})` : ""}.`,
  };
}
