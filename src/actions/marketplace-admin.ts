"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { GOAL_TYPES, PARTNER_CATEGORIES } from "@/lib/domain";
import { METROS } from "@/lib/geo-data";

export type AdminState = { error?: string; ok?: string } | undefined;

const text = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const goals = (fd: FormData) => fd.getAll("goal_types").map(String).filter((g) => GOAL_TYPES.some((x) => x.id === g));
const today = () => new Date().toISOString().slice(0, 10);
const refresh = () => {
  revalidatePath("/staff/marketplace");
  revalidatePath("/marketplace");
};

/** Managers list a partner after checking its license, certificate or business registration. */
export async function addPartner(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireStaff(["manager"]);
  const name = text(fd, "name", 80);
  const category = text(fd, "category", 20);
  const verification = text(fd, "verification", 120);
  if (name.length < 2) return { error: "Enter the partner's name." };
  if (!PARTNER_CATEGORIES.some((c) => c.id === category)) return { error: "Choose a category." };
  if (verification.length < 5) return { error: "Say what you verified (for example: state pharmacy license #, checked on the state board site)." };
  const website = text(fd, "website", 200);
  if (website && !/^https:\/\//.test(website)) return { error: "Use a full https:// website address." };
  db()
    .prepare(
      `INSERT INTO partners (id, name, category, tagline, description, verification, verified_on, location, tags, offer, rating, goal_types, kind, website, sort_rank)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'partner', ?, 100)`,
    )
    .run(
      `p_${crypto.randomUUID().slice(0, 8)}`, name, category, text(fd, "tagline", 120) || name, text(fd, "description", 600) || text(fd, "tagline", 120) || name, verification, today(),
      text(fd, "location", 80) || "Online", JSON.stringify(text(fd, "tags", 120).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5)), text(fd, "offer", 120) || null,
      JSON.stringify(goals(fd)), website || null,
    );
  refresh();
  return { ok: `${name} is now listed in the marketplace.` };
}

export async function removePartner(fd: FormData) {
  await requireStaff(["manager"]);
  const id = text(fd, "id", 40);
  const conn = db();
  conn.transaction(() => {
    conn.prepare("DELETE FROM user_addons WHERE addon_id IN (SELECT id FROM addons WHERE partner_id = ?)").run(id);
    conn.prepare("DELETE FROM addons WHERE partner_id = ?").run(id);
    conn.prepare("DELETE FROM partner_connections WHERE partner_id = ?").run(id);
    conn.prepare("DELETE FROM partners WHERE id = ? AND kind = 'partner'").run(id);
  })();
  refresh();
}

/** Managers list a trainer after checking their certification (and background check, per your policy). */
export async function addTrainer(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireStaff(["manager"]);
  const name = text(fd, "name", 80);
  const certification = text(fd, "certification", 60);
  const metro = METROS.find((m) => m.id === text(fd, "metro", 10));
  if (name.length < 2) return { error: "Enter the trainer's name." };
  if (certification.length < 2) return { error: "Enter the certification you verified (e.g. NASM-CPT, NSCA-CSCS)." };
  if (!metro) return { error: "Choose the trainer's metro area." };
  const lat = Number(fd.get("lat"));
  const lng = Number(fd.get("lng"));
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const price = Math.round(Number(fd.get("price")) * 100);
  db()
    .prepare(
      `INSERT INTO trainers (id, name, certification, specialty, studio, metro, lat, lng, price_cents, modes, goal_types, rating, verified_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    )
    .run(
      `tr_${crypto.randomUUID().slice(0, 8)}`, name, certification, text(fd, "specialty", 80) || "Personal training", text(fd, "studio", 80) || "Independent",
      metro.id, hasPoint ? lat : metro.lat, hasPoint ? lng : metro.lng, Number.isFinite(price) && price > 0 ? price : 0,
      ["In person", "Virtual", "In person + virtual"].includes(text(fd, "modes", 30)) ? text(fd, "modes", 30) : "In person", JSON.stringify(goals(fd)), today(),
    );
  refresh();
  return { ok: `${name} is now listed for members near ${metro.name}.` };
}

export async function removeTrainer(fd: FormData) {
  await requireStaff(["manager"]);
  const id = text(fd, "id", 40);
  db().transaction(() => {
    db().prepare("DELETE FROM trainer_saves WHERE trainer_id = ?").run(id);
    db().prepare("DELETE FROM trainers WHERE id = ?").run(id);
  })();
  refresh();
}
