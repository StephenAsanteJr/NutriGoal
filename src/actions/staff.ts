"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, newId, nowIso } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getTicket, getUserById, notify, type Step } from "@/lib/data";
import { ticketNumber } from "@/lib/domain";

export type ResponseFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

// Only the assigned clinician reads, writes and signs a response. Managers reassign.
function canWork(user: { id: string; role: string }, ticket: { assigned_clinician_id: string | null }) {
  return user.role === "clinician" && ticket.assigned_clinician_id === user.id;
}

export async function startReview(fd: FormData) {
  const user = await requireStaff();
  const id = Number(fd.get("ticket_id"));
  const t = getTicket(id);
  if (!t || !canWork(user, t)) redirect("/staff");
  db().prepare("UPDATE tickets SET status = 'in_review' WHERE id = ? AND status = 'assigned'").run(id);
  revalidatePath(`/staff/tickets/${id}`);
}

export async function submitResponse(_: ResponseFormState, fd: FormData): Promise<ResponseFormState> {
  const user = await requireStaff();
  const id = Number(fd.get("ticket_id"));
  const t = getTicket(id);
  if (!t) return { error: "Ticket not found." };
  if (!canWork(user, t)) return { error: "Only the assigned clinician can write and sign this response." };
  if (t.status === "responded") return { error: "This ticket already has a response." };

  const recommendation = String(fd.get("recommendation") ?? "").trim();
  const titles = fd.getAll("step_title").map((v) => String(v).trim());
  const details = fd.getAll("step_detail").map((v) => String(v).trim());
  const frames = fd.getAll("step_timeframe").map((v) => String(v).trim());
  const aiAssist = fd.get("ai_assist") === "wording" ? "wording" : "none";

  const fieldErrors: Record<string, string> = {};
  if (recommendation.length < 30) fieldErrors.recommendation = "Write a concise recommendation (at least 30 characters).";
  if (recommendation.length > 420) fieldErrors.recommendation = "Keep the recommendation concise: 420 characters or fewer.";

  const steps: Step[] = [];
  titles.forEach((title, i) => {
    const detail = details[i] ?? "";
    const timeframe = frames[i] ?? "";
    if (!title && !detail && !timeframe) return; // blank optional row
    if (!title || !detail || !timeframe) fieldErrors[`step_${i}`] = "Give this step a title, details and a timeframe.";
    steps.push({ title: title.slice(0, 80), detail: detail.slice(0, 400), timeframe: timeframe.slice(0, 40) });
  });
  if (steps.length < 5 || steps.length > 6) fieldErrors.steps = "A response ticket needs 5 or 6 actionable steps.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Please complete the response before sending." };

  const clinicianId = user.id;
  const now = nowIso();
  db().transaction(() => {
    db()
      .prepare(
        `INSERT INTO ticket_responses (id, ticket_id, clinician_id, recommendation, steps_json, ai_assist, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(newId(), id, clinicianId, recommendation, JSON.stringify(steps), aiAssist, now);
    db().prepare("UPDATE tickets SET status = 'responded', responded_at = ? WHERE id = ?").run(now, id);
  })();

  const clinician = getUserById(clinicianId);
  notify(
    t.user_id,
    "Your response ticket is ready",
    `${clinician?.name ?? "Your clinician"} answered ${ticketNumber(id)}: ${t.goal_statement.slice(0, 80)}`,
    `/tickets/${id}`,
  );
  revalidatePath("/staff");
  redirect(`/staff/tickets/${id}?sent=1`);
}

export async function reassignTicket(fd: FormData) {
  const user = await requireStaff(["manager"]);
  const id = Number(fd.get("ticket_id"));
  const clinicianId = String(fd.get("clinician_id") ?? "");
  const t = getTicket(id);
  const clinician = getUserById(clinicianId);
  if (!t || !clinician || clinician.role !== "clinician" || t.status === "responded") redirect(`/staff/tickets/${id}`);
  db()
    .prepare(
      `UPDATE tickets SET assigned_clinician_id = ?, status = 'assigned', assigned_at = ?,
       routing_reason = COALESCE(routing_reason, '') || ' Reassigned by ' || ? || '.' WHERE id = ?`,
    )
    .run(clinicianId, nowIso(), user.name, id);
  notify(clinicianId, `Ticket ${ticketNumber(id)} reassigned to you`, `${user.name} moved this ticket to your queue.`, `/staff/tickets/${id}`);
  revalidatePath(`/staff/tickets/${id}`);
  revalidatePath("/staff");
}

export async function addStaffNote(fd: FormData) {
  const user = await requireStaff();
  const memberId = String(fd.get("member_id") ?? "");
  const body = String(fd.get("body") ?? "").trim().slice(0, 1000);
  const back = String(fd.get("back") ?? `/staff/members/${memberId}`);
  if (body && getUserById(memberId)?.role === "member") {
    db()
      .prepare("INSERT INTO staff_notes (id, member_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(newId(), memberId, user.id, body, nowIso());
  }
  revalidatePath(back);
  redirect(back.startsWith("/staff") ? back : "/staff");
}
