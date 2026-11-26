import "server-only";
// Plain if-then routing rules (no AI reads, scores or answers a ticket).
// Goal group = medication stage × goal type. The group decides whether a
// physician (MD) or dietitian (RD) takes the ticket; then the clinician with
// a matching specialty and the shortest open queue is picked.

import { db, nowIso } from "./db";
import { computeBuild } from "./biometrics";
import { getProfile, listClinicians, notify, toBuildInput } from "./data";
import { goalLabel, MEMBERSHIP, ticketNumber } from "./domain";

const MD_STAGES = new Set(["starting", "on_glp1", "coming_off"]);
const MD_GOALS = new Set(["glp1_side_effects", "blood_sugar"]);

export function routeTicket(ticketId: number) {
  const conn = db();
  const ticket = conn.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId) as
    | { id: number; user_id: string; goal_type: string; goal_statement: string }
    | undefined;
  if (!ticket) throw new Error("Ticket not found");

  const profile = getProfile(ticket.user_id);
  const stage = profile?.medication_stage ?? "none";
  const input = toBuildInput(profile);
  const build = input ? computeBuild(input) : null;
  const alertFlag = build?.flags.find((f) => f.level === "alert");

  const reasons: string[] = [];
  let needType: "MD" | "RD";
  if (alertFlag) {
    needType = "MD";
    reasons.push(`Lab flag (${alertFlag.text}) → physician`);
  } else if (MD_STAGES.has(stage) && MD_GOALS.has(ticket.goal_type)) {
    needType = "MD";
    reasons.push(`GLP-1 stage + ${goalLabel(ticket.goal_type).toLowerCase()} → physician`);
  } else {
    needType = "RD";
    reasons.push("No high-risk flags → dietitian");
  }

  const clinicians = listClinicians();
  const specialtyOf = (s: string | null) => (s ? (JSON.parse(s) as string[]) : []);
  const byQueue = <T extends { open_count: number; name: string }>(a: T, b: T) =>
    a.open_count - b.open_count || a.name.localeCompare(b.name);

  let pool = clinicians.filter(
    (c) => c.clinician_type === needType && specialtyOf(c.specialties).includes(ticket.goal_type),
  );
  if (pool.length) reasons.push(`Specialty match: ${goalLabel(ticket.goal_type).toLowerCase()}`);
  if (!pool.length) {
    pool = clinicians.filter((c) => c.clinician_type === needType);
    if (pool.length) reasons.push("No specialty match; any clinician of that type");
  }
  if (!pool.length) {
    pool = clinicians;
    reasons.push("Fallback: any available clinician");
  }
  const chosen = [...pool].sort(byQueue)[0];
  const now = new Date();
  const existingDue = (conn.prepare("SELECT due_at FROM tickets WHERE id = ?").get(ticketId) as { due_at: string | null } | undefined)?.due_at;
  const due = existingDue ? new Date(existingDue) : new Date(now.getTime() + MEMBERSHIP.responseSlaHours * 3600_000);

  // No approved clinician yet (e.g. right after launch): the paid ticket waits in the queue,
  // the 48-hour clock keeps running, managers are alerted, and it's routed as soon as a clinician is approved.
  if (!chosen) {
    conn
      .prepare("UPDATE tickets SET status = 'queued', goal_group = ?, routing_reason = ?, assigned_clinician_id = NULL, due_at = ? WHERE id = ?")
      .run(`${stage} × ${ticket.goal_type}`, reasons.concat("Waiting for an approved clinician").join(". ") + ".", due.toISOString(), ticketId);
    const managers = conn.prepare("SELECT id FROM users WHERE role = 'manager' AND staff_status = 'active'").all() as { id: string }[];
    for (const m of managers)
      notify(m.id, `Ticket ${ticketNumber(ticketId)} is waiting for a clinician`, "No approved clinician is available. Approve a clinician application or assign it from the ticket page.", `/staff/tickets/${ticketId}`);
    return null;
  }
  reasons.push(`Lowest open queue (${chosen.open_count})`);
  conn
    .prepare(
      `UPDATE tickets SET status = 'assigned', goal_group = ?, routing_reason = ?, assigned_clinician_id = ?,
       assigned_at = ?, due_at = ? WHERE id = ?`,
    )
    .run(`${stage} × ${ticket.goal_type}`, reasons.join(". ") + ".", chosen.id, nowIso(), due.toISOString(), ticketId);

  notify(
    chosen.id,
    `New ticket ${ticketNumber(ticketId)} assigned to you`,
    `${goalLabel(ticket.goal_type)}: "${ticket.goal_statement.slice(0, 90)}". Due within ${MEMBERSHIP.responseSlaHours} hours.`,
    `/staff/tickets/${ticketId}`,
  );
  return chosen;
}

/** Route every queued ticket (oldest first). Called when a clinician is approved. Returns how many were assigned. */
export function routeQueuedTickets() {
  const queued = db().prepare("SELECT id FROM tickets WHERE status = 'queued' ORDER BY paid_at").all() as { id: number }[];
  let n = 0;
  for (const t of queued) if (routeTicket(t.id)) n++;
  return n;
}
