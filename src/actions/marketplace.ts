"use server";

import { revalidatePath } from "next/cache";
import { db, nowIso } from "@/lib/db";
import { getCurrentUser, requireMember } from "@/lib/auth";
import { getActiveSubscription, getAddon, notify } from "@/lib/data";
import { cardFromForm, charge } from "@/lib/payments";

export type UnlockState = { error?: string; ok?: boolean } | undefined;

export async function togglePartner(fd: FormData) {
  const user = await requireMember();
  const partnerId = String(fd.get("partner_id") ?? "");
  const exists = db().prepare("SELECT 1 FROM partner_connections WHERE user_id = ? AND partner_id = ?").get(user.id, partnerId);
  if (exists) {
    db().prepare("DELETE FROM partner_connections WHERE user_id = ? AND partner_id = ?").run(user.id, partnerId);
  } else if (db().prepare("SELECT 1 FROM partners WHERE id = ?").get(partnerId)) {
    db().prepare("INSERT INTO partner_connections (user_id, partner_id, connected_at) VALUES (?, ?, ?)").run(user.id, partnerId, nowIso());
  }
  revalidatePath("/marketplace");
}

export async function unlockAddon(_: UnlockState, fd: FormData): Promise<UnlockState> {
  const user = await requireMember();
  const addon = getAddon(String(fd.get("addon_id") ?? ""));
  if (!addon) return { error: "Add-on not found." };
  const already = db().prepare("SELECT 1 FROM user_addons WHERE user_id = ? AND addon_id = ?").get(user.id, addon.id);
  if (already) return { ok: true };

  const member = getActiveSubscription(user.id);
  if (!(addon.included_with_membership && member)) {
    const res = charge({
      userId: user.id,
      card: cardFromForm(fd),
      amountCents: addon.price_cents,
      kind: "addon",
      description: `${addon.name}${addon.interval === "month" ? " · monthly" : ""}`,
    });
    if (!res.ok) return { error: res.error };
  }
  db().prepare("INSERT INTO user_addons (user_id, addon_id, unlocked_at) VALUES (?, ?, ?)").run(user.id, addon.id, nowIso());
  notify(user.id, `${addon.name} unlocked`, addon.description, "/marketplace#addons");
  revalidatePath("/marketplace");
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  db().prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(nowIso(), user.id);
  revalidatePath("/", "layout");
}
