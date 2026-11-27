"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, newId, nowIso } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getTicket, getUserById, notify } from "@/lib/data";
import { ticketNumber } from "@/lib/domain";
import { nudgeClinician } from "@/lib/nudges";
import { saveResponse, startReviewFor } from "@/lib/responses";
import { routeQueuedTickets } from "@/lib/routing";
import { readVerification, saveVerification, verifyLicense, type Profession } from "@/lib/licensing";

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
    foods: (() => {
      try {
        return JSON.parse(String(fd.get("foods_json") ?? "null"));
      } catch {
        return null;
      }
    })(),
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
  if (!t || !clinician || clinician.role !== "clinician" || clinician.staff_status !== "active" || t.status === "responded" || t.status === "awaiting_payment") redirect(`/staff/tickets/${id}`);
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

/** NutriGoal management approves or declines clinician and management applications. */
export async function reviewApplication(fd: FormData) {
  const manager = await requireStaff(["manager"]);
  const id = String(fd.get("user_id") ?? "");
  const decision = fd.get("decision") === "approve" ? "active" : "rejected";
  const applicant = db().prepare("SELECT id, name, role, staff_status FROM users WHERE id = ? AND role != 'member'").get(id) as { id: string; name: string; role: string; staff_status: string } | undefined;
  if (!applicant || applicant.staff_status !== "pending") redirect("/staff/team");
  db().prepare("UPDATE users SET staff_status = ? WHERE id = ?").run(decision, id);
  notify(
    id,
    decision === "active" ? "Your NutriGoal account is approved" : "Your NutriGoal application",
    decision === "active" ? `${manager.name} approved your account. Welcome to the care team.` : "Your application wasn't approved. Contact NutriGoal operations if you think this is a mistake.",
    decision === "active" ? "/staff" : "/pending",
  );
  // A newly approved clinician picks up any paid tickets that were waiting for one.
  if (decision === "active" && applicant.role === "clinician") routeQueuedTickets();
  revalidatePath("/staff/team");
  revalidatePath("/staff");
}

/** Re-run the NPI Registry check for an applicant (or an active clinician). */
export async function rerunLicenseCheck(fd: FormData) {
  await requireStaff(["manager"]);
  const id = String(fd.get("user_id") ?? "");
  const u = db().prepare("SELECT id, name, license_info, license_verification FROM users WHERE id = ? AND role = 'clinician'").get(id) as
    | { id: string; name: string; license_info: string | null; license_verification: string | null }
    | undefined;
  if (!u?.license_info) return;
  const lic = JSON.parse(u.license_info) as { profession: Profession; license: string; state: string; npi: string | null };
  const v = await verifyLicense({ profession: lic.profession, name: u.name, license: lic.license, state: lic.state, npi: lic.npi });
  v.manual = readVerification(u.license_verification)?.manual;
  saveVerification(id, v);
  revalidatePath("/staff/team");
}

/** A manager records that they confirmed the license on the issuing state board's site. */
export async function confirmStateLicense(fd: FormData) {
  const manager = await requireStaff(["manager"]);
  const id = String(fd.get("user_id") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 160);
  const u = db().prepare("SELECT license_info, license_verification FROM users WHERE id = ? AND role = 'clinician'").get(id) as { license_info: string | null; license_verification: string | null } | undefined;
  if (!u || !note) return;
  const lic = u.license_info ? (JSON.parse(u.license_info) as { state: string; license: string }) : null;
  const v = readVerification(u.license_verification);
  if (!v) return;
  v.manual = [...(v.manual ?? []), { by: manager.name, at: nowIso(), note: `State board (${lic?.state ?? "?"} ${lic?.license ?? ""}) checked: ${note}` }];
  db().prepare("UPDATE users SET license_verification = ?, license_verified_at = ? WHERE id = ?").run(JSON.stringify(v), nowIso(), id);
  revalidatePath("/staff/team");
}
