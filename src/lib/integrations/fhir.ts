import "server-only";
// Health records from providers: FHIR R4 (Epic and other EHRs via SMART on FHIR or a
// member's exported Bundle) and C-CDA XML documents. Observations are matched by LOINC.

import { db, newId, nowIso } from "../db";
import { addWeighIn, getProfile } from "../data";

export type LabCode =
  | "a1c" | "fasting_glucose" | "total_cholesterol" | "ldl" | "hdl" | "triglycerides" | "vitamin_d"
  | "systolic" | "diastolic" | "weight_kg" | "height_cm" | "body_fat_pct" | "bmi";

export type LabItem = { code: LabCode; loinc: string; value: number; unit: string; date: string };

const LOINC: Record<string, LabCode> = {
  "4548-4": "a1c", "17856-6": "a1c", "4549-2": "a1c",
  "1558-6": "fasting_glucose", "76629-5": "fasting_glucose",
  "2093-3": "total_cholesterol",
  "13457-7": "ldl", "18262-6": "ldl", "2089-1": "ldl",
  "2085-9": "hdl",
  "2571-8": "triglycerides",
  "1989-3": "vitamin_d", "62292-8": "vitamin_d", "14635-7": "vitamin_d",
  "8480-6": "systolic", "8462-4": "diastolic",
  "29463-7": "weight_kg", "3141-9": "weight_kg",
  "8302-2": "height_cm", "8306-3": "height_cm",
  "41982-0": "body_fat_pct",
  "39156-5": "bmi",
};

export const LAB_LABELS: Record<LabCode, { label: string; unit: string }> = {
  a1c: { label: "A1C", unit: "%" },
  fasting_glucose: { label: "Fasting glucose", unit: "mg/dL" },
  total_cholesterol: { label: "Total cholesterol", unit: "mg/dL" },
  ldl: { label: "LDL", unit: "mg/dL" },
  hdl: { label: "HDL", unit: "mg/dL" },
  triglycerides: { label: "Triglycerides", unit: "mg/dL" },
  vitamin_d: { label: "Vitamin D", unit: "ng/mL" },
  systolic: { label: "Blood pressure (systolic)", unit: "mmHg" },
  diastolic: { label: "Blood pressure (diastolic)", unit: "mmHg" },
  weight_kg: { label: "Weight", unit: "kg" },
  height_cm: { label: "Height", unit: "cm" },
  body_fat_pct: { label: "Body fat", unit: "%" },
  bmi: { label: "BMI", unit: "kg/m2" },
};

/** Convert to the units NutriGoal stores. Returns null for values we can't interpret. */
function normalise(code: LabCode, value: number, unit: string): number | null {
  const u = unit.toLowerCase().replace(/\s/g, "");
  switch (code) {
    case "fasting_glucose":
      return u.includes("mmol") ? value * 18.016 : value;
    case "total_cholesterol":
    case "ldl":
    case "hdl":
      return u.includes("mmol") ? value * 38.67 : value;
    case "triglycerides":
      return u.includes("mmol") ? value * 88.57 : value;
    case "vitamin_d":
      return u.includes("nmol") ? value / 2.496 : value;
    case "weight_kg":
      return u.includes("lb") || u.includes("[lb_av]") ? value * 0.45359237 : u === "g" ? value / 1000 : value;
    case "height_cm":
      return u.includes("in") || u.includes("[in_i]") ? value * 2.54 : u === "m" ? value * 100 : value;
    case "a1c":
      return u.includes("mmol/mol") ? value * 0.0915 + 2.15 : value; // IFCC → NGSP
    default:
      return value;
  }
}

const round = (v: number) => Math.round(v * 10) / 10;

type Coding = { system?: string; code?: string };
type Quantity = { value?: number; unit?: string; code?: string };
type Observation = {
  resourceType?: string;
  code?: { coding?: Coding[] };
  valueQuantity?: Quantity;
  component?: { code?: { coding?: Coding[] }; valueQuantity?: Quantity }[];
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string };
  issued?: string;
  status?: string;
};

function loincOf(c?: { coding?: Coding[] }) {
  return c?.coding?.find((x) => !x.system || x.system.includes("loinc"))?.code;
}

/** Observations from a FHIR Bundle, a searchset, an array, or a single Observation. */
export function parseFhir(json: unknown): LabItem[] {
  const resources: Observation[] = [];
  const collect = (r: unknown) => {
    if (!r || typeof r !== "object") return;
    const o = r as { resourceType?: string; entry?: { resource?: unknown }[] };
    if (o.resourceType === "Bundle" && Array.isArray(o.entry)) o.entry.forEach((e) => collect(e.resource));
    else if (o.resourceType === "Observation") resources.push(o as Observation);
  };
  if (Array.isArray(json)) json.forEach(collect);
  else collect(json);

  const out: LabItem[] = [];
  for (const o of resources) {
    if (o.status && ["entered-in-error", "cancelled"].includes(o.status)) continue;
    const date = (o.effectiveDateTime ?? o.effectivePeriod?.start ?? o.issued ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const push = (loinc: string | undefined, q?: Quantity) => {
      if (!loinc || q?.value == null) return;
      const code = LOINC[loinc];
      if (!code) return;
      const v = normalise(code, Number(q.value), q.unit ?? q.code ?? "");
      if (v == null || !Number.isFinite(v)) return;
      out.push({ code, loinc, value: round(v), unit: LAB_LABELS[code].unit, date });
    };
    push(loincOf(o.code), o.valueQuantity);
    for (const c of o.component ?? []) push(loincOf(c.code), c.valueQuantity); // e.g. blood pressure panel 85354-9
  }
  return out;
}

/** Observations from a C-CDA (Consolidated CDA) XML document. */
export function parseCcda(xml: string): LabItem[] {
  const out: LabItem[] = [];
  const blocks = xml.match(/<observation\b[\s\S]*?<\/observation>/gi) ?? [];
  for (const b of blocks) {
    const code = b.match(/<code\b[^>]*\bcode="([\d-]+)"[^>]*codeSystem="2\.16\.840\.1\.113883\.6\.1"/i)?.[1] ?? b.match(/<code\b[^>]*codeSystem="2\.16\.840\.1\.113883\.6\.1"[^>]*\bcode="([\d-]+)"/i)?.[1];
    const val = b.match(/<value\b[^>]*\bvalue="([\d.]+)"[^>]*?(?:\bunit="([^"]*)")?[^>]*\/?>/i);
    const unit = val?.[2] ?? b.match(/<value\b[^>]*\bunit="([^"]*)"/i)?.[1] ?? "";
    const time = b.match(/<effectiveTime\b[^>]*\bvalue="(\d{8})/i)?.[1] ?? b.match(/<low\b[^>]*\bvalue="(\d{8})/i)?.[1];
    if (!code || !val || !time) continue;
    const lab = LOINC[code];
    if (!lab) continue;
    const v = normalise(lab, Number(val[1]), unit);
    if (v == null) continue;
    out.push({ code: lab, loinc: code, value: round(v), unit: LAB_LABELS[lab].unit, date: `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}` });
  }
  return out;
}

const PROFILE_COLUMN: Partial<Record<LabCode, string>> = {
  a1c: "a1c", fasting_glucose: "fasting_glucose", total_cholesterol: "total_cholesterol", ldl: "ldl", hdl: "hdl",
  triglycerides: "triglycerides", vitamin_d: "vitamin_d", systolic: "systolic", diastolic: "diastolic", body_fat_pct: "body_fat_pct",
};

/** Store lab results and bring the member's build up to date with the newest values. */
export function saveLabs(userId: string, items: LabItem[], source: string) {
  const ins = db().prepare(`INSERT OR IGNORE INTO lab_results (id, user_id, code, loinc, value, unit, observed_on, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let added = 0;
  db().transaction(() => {
    for (const i of items) added += ins.run(newId(), userId, i.code, i.loinc, i.value, i.unit, i.date, source, nowIso()).changes;
  })();

  const profile = getProfile(userId);
  if (profile) {
    const latest = new Map<LabCode, LabItem>();
    for (const i of items) if (!latest.has(i.code) || latest.get(i.code)!.date < i.date) latest.set(i.code, i);
    for (const [code, item] of latest) {
      const col = PROFILE_COLUMN[code];
      if (col) db().prepare(`UPDATE profiles SET ${col} = ?, updated_at = ? WHERE user_id = ?`).run(code === "systolic" || code === "diastolic" ? Math.round(item.value) : item.value, nowIso(), userId);
    }
    const w = latest.get("weight_kg");
    if (w && !db().prepare("SELECT 1 FROM weigh_ins WHERE user_id = ? AND logged_on = ?").get(userId, w.date)) {
      addWeighIn(userId, { logged_on: w.date, weight_kg: w.value, note: `From ${source === "epic_fhir" ? "Epic MyChart" : "health record"}` });
    }
    if (profile.source === "manual") db().prepare("UPDATE profiles SET source = 'report+manual' WHERE user_id = ?").run(userId);
  }
  return { added, total: items.length };
}

export function listLabHistory(userId: string) {
  return db()
    .prepare("SELECT code, value, unit, observed_on, source FROM lab_results WHERE user_id = ? ORDER BY code, observed_on")
    .all(userId) as { code: LabCode; value: number; unit: string; observed_on: string; source: string }[];
}
