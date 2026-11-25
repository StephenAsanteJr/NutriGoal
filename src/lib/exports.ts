import "server-only";
// Dashboard exports. Excel: a formatted workbook (summary + one sheet per table). Tableau: a tidy,
// row-level CSV (one row per record, snake_case headers, ISO 8601 timestamps, plain numbers), the
// shape Tableau's Text File connector reads without any cleanup. Tableau can also open the .xlsx.

import ExcelJS from "exceljs";
import { RANGES, type Filters } from "./analytics";

export type Col = { key: string; header: string; width?: number; numFmt?: string; date?: boolean };
export type Sheet = { name: string; columns: Col[]; rows: Record<string, unknown>[] };

const NAVY = "FF051C2C";
const iso = (v: unknown) => {
  if (v == null || v === "") return null;
  const s = String(v);
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s.replace(" ", "T") : `${s.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function describeFilters(f: Filters, names: { clinician?: string | null; goal?: string | null } = {}) {
  return [
    `Period: ${RANGES.find((r) => r.id === f.range)?.label ?? f.range}`,
    names.clinician ? `Clinician: ${names.clinician}` : null,
    names.goal ? `Goal: ${names.goal}` : null,
    f.demo ? "Includes generated demo history" : "Real activity only (demo history excluded)",
  ].filter(Boolean) as string[];
}

export async function workbook(title: string, notes: string[], summary: [string, string | number | null][], sheets: Sheet[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NutriGoal";
  wb.created = new Date();
  const s = wb.addWorksheet("Summary", { properties: { tabColor: { argb: NAVY } } });
  s.columns = [{ width: 34 }, { width: 22 }];
  s.addRow([title]).font = { bold: true, size: 16, color: { argb: NAVY } };
  s.addRow([`Exported ${new Date().toLocaleString("en-US", { timeZone: "UTC" })} UTC`]).font = { color: { argb: "FF7B868E" } };
  for (const n of notes) s.addRow([n]).font = { italic: true, color: { argb: "FF4A5862" } };
  s.addRow([]);
  const head = s.addRow(["Metric", "Value"]);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }));
  for (const [k, v] of summary) s.addRow([k, v ?? "–"]);

  for (const sh of sheets) {
    const ws = wb.addWorksheet(sh.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = sh.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(12, c.header.length + 2), style: c.numFmt ? { numFmt: c.numFmt } : c.date ? { numFmt: "yyyy-mm-dd hh:mm" } : {} }));
    const hr = ws.getRow(1);
    hr.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hr.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }));
    for (const r of sh.rows) ws.addRow(Object.fromEntries(sh.columns.map((c) => [c.key, c.date ? iso(r[c.key]) : r[c.key] ?? null])));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sh.columns.length } };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** RFC 4180 CSV with ISO 8601 timestamps (UTC), true/false booleans and unformatted numbers. */
export function csv(columns: Col[], rows: Record<string, unknown>[]) {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => c.header).join(",")];
  for (const r of rows) lines.push(columns.map((c) => esc(c.date ? iso(r[c.key])?.toISOString() ?? null : r[c.key])).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function download(body: Buffer | string, filename: string, type: string) {
  return new Response(typeof body === "string" ? body : new Uint8Array(body), {
    headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}

export const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const CSV = "text/csv; charset=utf-8";
