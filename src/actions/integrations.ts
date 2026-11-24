"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRACKING_APPS } from "@/lib/domain";
import { parseNutritionCsv, recordSource, saveNutritionDays } from "@/lib/integrations/nutrition";
import { parseCcda, parseFhir, saveLabs } from "@/lib/integrations/fhir";
import { createToken, revokeToken } from "@/lib/integrations/tokens";
import { createShareLink } from "@/lib/integrations/trends";
import { nowIso } from "@/lib/db";

export type ImportState = { error?: string; ok?: string; token?: string; link?: string } | undefined;
const MAX = 8 * 1024 * 1024;

/** Upload a food-tracking app export (CSV). */
export async function importNutritionExport(_: ImportState, fd: FormData): Promise<ImportState> {
  const user = await requireMember();
  const file = fd.get("file");
  const app = String(fd.get("app") ?? "");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose your exported CSV file." };
  if (file.size > MAX) return { error: "That file is over 8 MB." };
  const text = await file.text();
  const parsed = parseNutritionCsv(text);
  if (parsed.error) return { error: parsed.error };
  const source = TRACKING_APPS.some((a) => a.id === app) ? app : (parsed.detected ?? "other");
  const n = saveNutritionDays(user.id, source, parsed.days);
  const name = TRACKING_APPS.find((a) => a.id === source)?.name ?? "Nutrition app";
  recordSource(user.id, { kind: source, label: `${name} export`, details: file.name.slice(0, 120), records: n });
  revalidatePath("/data");
  return { ok: `Imported ${n} day${n === 1 ? "" : "s"} of nutrition from ${name} (${parsed.days[0]?.day} to ${parsed.days[parsed.days.length - 1]?.day}).` };
}

/** Upload a health record export: FHIR R4 JSON (Epic and others) or C-CDA XML. */
export async function importHealthRecord(_: ImportState, fd: FormData): Promise<ImportState> {
  const user = await requireMember();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose your exported record file." };
  if (file.size > MAX) return { error: "That file is over 8 MB." };
  const text = await file.text();
  let items;
  let kind: string;
  if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
    try {
      items = parseFhir(JSON.parse(text));
    } catch {
      return { error: "That JSON file couldn't be read." };
    }
    kind = "fhir_file";
  } else if (/<ClinicalDocument|<observation/i.test(text)) {
    items = parseCcda(text);
    kind = "ccda_file";
  } else return { error: "Upload a FHIR JSON or C-CDA XML export. For PDFs, use the checkup report upload." };
  if (!items.length) return { error: "We didn't find labs or vitals we recognise (A1C, lipids, glucose, vitamin D, BP, weight) in that file." };
  const r = saveLabs(user.id, items, kind);
  recordSource(user.id, { kind, label: kind === "fhir_file" ? "FHIR health record export" : "C-CDA health summary", details: file.name.slice(0, 120), records: r.added });
  revalidatePath("/data");
  revalidatePath("/dashboard");
  return { ok: `Read ${r.total} results; ${r.added} new. Your build now uses the latest values.` };
}

/** Save a link the member was given by a provider or app (e.g. a MyChart "Share Everywhere" code). */
export async function addSharedLink(_: ImportState, fd: FormData): Promise<ImportState> {
  const user = await requireMember();
  const kind = String(fd.get("kind") ?? "link");
  const url = String(fd.get("url") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim().slice(0, 200);
  const isUrl = /^https:\/\/[^\s]+$/i.test(url);
  const isCode = /^[A-Za-z0-9-]{6,40}$/.test(url);
  if (!isUrl && !isCode) return { error: "Paste an https:// link or a share code." };
  recordSource(user.id, { kind: `link_${kind}`, label: note || (kind === "mychart" ? "MyChart Share Everywhere" : "Shared link"), url: url.slice(0, 500), records: 0 });
  revalidatePath("/data");
  return { ok: "Saved. Your clinicians can open it from your profile when they review a ticket." };
}

export async function removeSource(fd: FormData) {
  const user = await requireMember();
  db().prepare("DELETE FROM data_sources WHERE id = ? AND user_id = ?").run(String(fd.get("id")), user.id);
  revalidatePath("/data");
}

export async function createApiToken(_: ImportState, fd: FormData): Promise<ImportState> {
  const user = await requireMember();
  const name = String(fd.get("name") ?? "").trim() || "My integration";
  return { token: createToken(user.id, name, "integrations"), ok: "Copy this token now. It won't be shown again." };
}

export async function revokeApiToken(fd: FormData) {
  const user = await requireMember();
  revokeToken(user.id, String(fd.get("id")));
  revalidatePath("/data");
}

/** Create a read-only, expiring link to a nutrition report the member can give to their own doctor, dietitian or trainer. */
export async function createReport(_: ImportState, fd: FormData): Promise<ImportState> {
  const user = await requireMember();
  const days = [14, 30, 90].includes(Number(fd.get("days"))) ? Number(fd.get("days")) : 30;
  const expires = [7, 30].includes(Number(fd.get("expires"))) ? Number(fd.get("expires")) : 7;
  const include = { build: fd.get("build") === "on", nutrition: fd.get("nutrition") === "on", labs: fd.get("labs") === "on", weight: fd.get("weight") === "on" };
  if (!Object.values(include).some(Boolean)) return { error: "Choose at least one section to include." };
  const label = String(fd.get("label") ?? "").trim() || "Nutrition report";
  const token = createShareLink(user.id, { label, days, include, expiresInDays: expires });
  revalidatePath("/data");
  return { ok: "Link created.", link: `/share/${token}` };
}

export async function revokeReport(fd: FormData) {
  const user = await requireMember();
  db().prepare("UPDATE share_links SET revoked_at = ? WHERE token = ? AND user_id = ?").run(nowIso(), String(fd.get("token")), user.id);
  revalidatePath("/data");
}
