"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, nowIso } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { parseDemographics, saveDemographics } from "@/lib/demographics";

export type DemographicsState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

/** Members: the "About you" step, before biometrics. Age also feeds the biometric profile. */
export async function saveMemberDemographics(_: DemographicsState, fd: FormData): Promise<DemographicsState> {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  const { value, errors } = parseDemographics(fd, "member");
  if (Object.keys(errors).length) return { fieldErrors: errors, error: "Please check the highlighted fields." };
  saveDemographics(user.id, value);
  if (value.age != null) {
    const has = db().prepare("SELECT 1 FROM profiles WHERE user_id = ?").get(user.id);
    if (has) db().prepare("UPDATE profiles SET age = ?, updated_at = ? WHERE user_id = ?").run(value.age, nowIso(), user.id);
  }
  revalidatePath("/membership");
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : user.onboarding_complete ? "/membership?tab=settings#about" : "/onboarding");
}
