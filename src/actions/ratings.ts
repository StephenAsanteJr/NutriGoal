"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { rateResponseFor } from "@/lib/ratings";

export type RateState = { error?: string; ok?: string } | undefined;

/** A member rates the response ticket they received (1–5 stars, optional comment). */
export async function rateResponse(_: RateState, fd: FormData): Promise<RateState> {
  const user = await requireMember();
  const r = rateResponseFor(user.id, Number(fd.get("ticket_id")), Number(fd.get("rating")), String(fd.get("comment") ?? ""));
  if (!r.ok) return { error: r.error };
  revalidatePath(`/tickets/${Number(fd.get("ticket_id"))}`);
  return { ok: "Thanks. Your rating goes to your clinician and helps us keep plans useful." };
}
