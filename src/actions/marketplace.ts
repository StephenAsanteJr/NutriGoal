"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, nowIso } from "@/lib/db";
import { getCurrentUser, requireMember } from "@/lib/auth";
import { getActiveSubscription, getAddon } from "@/lib/data";
import { unlockAddonFor } from "@/lib/fulfillment";
import { createCheckout, stripeEnabled } from "@/lib/stripe";
import { cardFromForm, charge } from "@/lib/payments";
import { hasMarketplaceAccess } from "@/lib/access";
import { saveLocation, setRadius } from "@/lib/trainers";
import { locateZip, nearestMetro } from "@/lib/geo-data";

export type UnlockState = { error?: string; ok?: boolean; paymentId?: string } | undefined;

export async function togglePartner(fd: FormData) {
  const user = await requireMember();
  if (!hasMarketplaceAccess(user.id)) redirect("/marketplace");
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
  if (!hasMarketplaceAccess(user.id)) return { error: "The marketplace is for members and ticket holders." };
  const addon = getAddon(String(fd.get("addon_id") ?? ""));
  if (!addon) return { error: "Add-on not found." };
  const already = db().prepare("SELECT 1 FROM user_addons WHERE user_id = ? AND addon_id = ?").get(user.id, addon.id);
  if (already) return { ok: true };

  const member = getActiveSubscription(user.id);
  if (addon.included_with_membership && member) {
    unlockAddonFor(user.id, addon.id);
    return { ok: true };
  }
  const description = `${addon.name}${addon.interval === "month" ? " · monthly" : ""}`;
  if (stripeEnabled()) {
    let url: string;
    try {
      url = await createCheckout({
        userId: user.id,
        email: user.email,
        kind: "addon",
        description,
        amountCents: addon.price_cents,
        addonId: addon.id,
        interval: addon.interval === "month" ? "month" : undefined,
        cancelPath: "/marketplace?canceled=1#addons",
      });
    } catch {
      return { error: "We couldn't start a secure Stripe checkout. Please try again." };
    }
    redirect(url);
  }
  const res = charge({ userId: user.id, card: cardFromForm(fd), amountCents: addon.price_cents, kind: "addon", description, addonId: addon.id });
  if (!res.ok) return { error: res.error };
  unlockAddonFor(user.id, addon.id);
  return { ok: true, paymentId: res.paymentId };
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  db().prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(nowIso(), user.id);
  revalidatePath("/", "layout");
}

// ---------- Trainers near me ----------
export type LocationState = { error?: string } | undefined;

export async function setLocationByZip(_: LocationState, fd: FormData): Promise<LocationState> {
  const user = await requireMember();
  const zip = String(fd.get("zip") ?? "").trim();
  if (!/^\d{5}$/.test(zip)) return { error: "Enter a 5-digit ZIP code." };
  const loc = locateZip(zip);
  if (!loc) return { error: "We don't have trainers near that ZIP yet. Try “Use my location”, or a ZIP in a covered metro." };
  saveLocation(user.id, loc);
  revalidatePath("/marketplace");
  return undefined;
}

export async function setLocationByCoords(lat: number, lng: number) {
  const user = await requireMember();
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
  const { metro, miles } = nearestMetro(lat, lng);
  saveLocation(user.id, { lat, lng, label: miles < 40 ? `Near ${metro.name}` : "Your current location" });
  revalidatePath("/marketplace");
}

export async function changeTrainerRadius(fd: FormData) {
  const user = await requireMember();
  setRadius(user.id, Number(fd.get("radius")));
  revalidatePath("/marketplace");
}

export async function toggleTrainer(fd: FormData) {
  const user = await requireMember();
  if (!hasMarketplaceAccess(user.id)) redirect("/marketplace");
  const id = String(fd.get("trainer_id") ?? "").slice(0, 200);
  const label = String(fd.get("label") ?? "").slice(0, 120) || null;
  const source = id.startsWith("g_") ? "google" : "nutrigoal";
  if (!id) return;
  const exists = db().prepare("SELECT 1 FROM trainer_saves WHERE user_id = ? AND trainer_id = ?").get(user.id, id);
  if (exists) db().prepare("DELETE FROM trainer_saves WHERE user_id = ? AND trainer_id = ?").run(user.id, id);
  else db().prepare("INSERT INTO trainer_saves (user_id, trainer_id, source, label, saved_at) VALUES (?, ?, ?, ?, ?)").run(user.id, id, source, label, nowIso());
  revalidatePath("/marketplace");
}
