"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, nowIso } from "@/lib/db";
import { requireMember, requireOrgManager, requireStaff } from "@/lib/auth";
import { notify } from "@/lib/data";
import { INDUSTRIES, TIERS } from "@/lib/enterprise";
import { getOrgByCode, getOrgForManager, inviteCode, memberOrg } from "@/lib/org-wellness";

export type OrgFormState = { error?: string; ok?: string; fieldErrors?: Record<string, string> } | undefined;

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Enter the organization's name.").max(120),
  industry: z.enum(INDUSTRIES),
  eligible: z.coerce.number().int("Whole number, please.").min(1, "At least 1.").max(2_000_000),
  plan: z.enum(TIERS.map((t) => t.id) as [string, ...string[]]),
});

/** Organizational manager: update the organization's details and requested plan. */
export async function updateOrgSettings(_: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const user = await requireOrgManager();
  const org = getOrgForManager(user.id);
  if (!org) return { error: "No organization found for this account." };
  const parsed = settingsSchema.safeParse({ name: fd.get("name"), industry: fd.get("industry"), eligible: fd.get("eligible"), plan: fd.get("plan") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  db().prepare("UPDATE organizations SET name = ?, industry = ?, eligible_count = ?, plan = ? WHERE id = ?").run(d.name, d.industry, d.eligible, d.plan, org.id);
  if (d.plan !== org.plan) notifyManagement("Enterprise plan change", `${d.name} switched to the ${TIERS.find((t) => t.id === d.plan)?.name} plan.`);
  revalidatePath("/org", "layout");
  return { ok: "Saved." };
}

/** Organizational manager: issue a new invite code (the old link stops working; members already in stay in). */
export async function regenerateInviteCode() {
  const user = await requireOrgManager();
  const org = getOrgForManager(user.id);
  if (!org) return;
  db().prepare("UPDATE organizations SET invite_code = ? WHERE id = ?").run(inviteCode(), org.id);
  revalidatePath("/org", "layout");
}

/** Member: join an organization with its invite code. */
export async function joinOrganization(_: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  if (fd.get("consent") !== "on") return { error: "Please confirm you understand what your organization can see." };
  const org = code ? getOrgByCode(code) : undefined;
  if (!org) return { error: "That invite code isn't valid. Check it with your organization." };
  const current = memberOrg(user.id);
  if (current?.id === org.id) return { ok: `You're already in ${org.name}.` };
  db().transaction(() => {
    db().prepare("DELETE FROM org_enrollments WHERE user_id = ?").run(user.id);
    db().prepare("INSERT INTO org_enrollments (org_id, user_id, joined_at) VALUES (?, ?, ?)").run(org.id, user.id, nowIso());
  })();
  revalidatePath("/membership");
  const next = String(fd.get("next") ?? "");
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  return { ok: `You joined ${org.name}.` };
}

/** Member: leave their organization. Their history stays theirs; future reports no longer include them. */
export async function leaveOrganization() {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  db().prepare("DELETE FROM org_enrollments WHERE user_id = ?").run(user.id);
  revalidatePath("/membership");
}

/** NutriGoal management: change an organization's status or plan. */
export async function manageOrganization(fd: FormData) {
  await requireStaff(["manager"]);
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  const plan = String(fd.get("plan") ?? "");
  if (["pilot", "active", "paused"].includes(status)) db().prepare("UPDATE organizations SET status = ? WHERE id = ?").run(status, id);
  if (TIERS.some((t) => t.id === plan)) db().prepare("UPDATE organizations SET plan = ? WHERE id = ?").run(plan, id);
  const admins = db().prepare("SELECT user_id FROM org_admins WHERE org_id = ?").all(id) as { user_id: string }[];
  for (const a of admins) notify(a.user_id, "Your NutriGoal plan was updated", `Status: ${status || "unchanged"}. Plan: ${TIERS.find((t) => t.id === plan)?.name ?? "unchanged"}.`, "/org/plan");
  revalidatePath("/staff/organizations");
}

function notifyManagement(title: string, body: string) {
  const managers = db().prepare("SELECT id FROM users WHERE role = 'manager' AND staff_status = 'active'").all() as { id: string }[];
  for (const m of managers) notify(m.id, title, body, "/staff/organizations");
}
