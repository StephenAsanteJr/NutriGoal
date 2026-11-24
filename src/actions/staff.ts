"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, newId, nowIso } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getTicket, getUserById, notify } from "@/lib/data";
import { ticketNumber } from "@/lib/domain";
import { nudgeClinician } from "@/lib/nudges";
import { saveResponse, startReviewFor } from "@/lib/responses";

export type ResponseFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;


export async function startReview(fd: FormData) {
  const user = await requireStaff();
  const id = Number(fd.get("ticket_id"));
  if (!startReviewFor(user, id)) redirect("/staff");
  revalidatePath(`/staff/tickets/${id}`);
}

export async function submitResponse(_: ResponseFormState, fd: FormData): Promise<ResponseFormState> {
  const user = await requireStaff();
  const id = Number(fd.get("ticket_id"));
  const titles = fd.getAll("step_title").map(String);
  const details = fd.getAll("step_detail").map(String);
  const frames = fd.getAll("step_timeframe").map(String);
  const r = saveResponse(user, id, {
    recommendation: String(fd.get("recommendation") ?? ""),
    steps: titles.map((title, i) => ({ title, detail: details[i] ?? "", timeframe: frames[i] ?? "" })),
    aiAssist: fd.get("ai_assist") === "wording" ? "wording" : "none",
  });
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
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

export async function managerNudge(fd: FormData) {
  const user = await requireStaff(["manager"]);
  const id = Number(fd.get("ticket_id"));
  nudgeClinician({ ticketId: id, actor: user, source: "manager" });
  revalidatePath(`/staff/tickets/${id}`);
  revalidatePath("/staff");
}
