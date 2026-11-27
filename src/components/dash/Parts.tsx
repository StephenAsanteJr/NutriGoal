"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fmt, delta, type FmtKind } from "@/lib/fmt";

/** KPI tile with change vs the previous period. `goodWhen` says which direction is good. */
export function Kpi({ label, value, format = "int", prev, goodWhen = "up", sub, tone }: { label: string; value: number | null; format?: FmtKind; prev?: number | null; goodWhen?: "up" | "down"; sub?: string; tone?: "alert" | "good" }) {
  const d = delta(value, prev);
  const good = d == null ? null : goodWhen === "up" ? d >= 0 : d <= 0;
  return (
    <div className="bg-white px-5 py-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display mt-1 text-3xl ${tone === "alert" ? "text-alert" : tone === "good" ? "text-bcg-deep" : "text-ink"}`}>{fmt(value, format)}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
        {d != null && (
          <span className={`font-bold ${good ? "text-bcg-deep" : "text-alert"}`} title="Change vs. the previous period of the same length">
            {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(Math.abs(d) >= 10 ? 0 : 1)}%
          </span>
        )}
        {sub && <span className="text-slate">{sub}</span>}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card min-w-0 p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-slate">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export type Column = { key: string; label: string; format?: FmtKind | "text" | "date" | "bool"; align?: "left" | "right" };

/** Sortable, searchable table. Click a header to sort; with `filterParam`, clicking a row filters the dashboard. */
export function DataTable({ columns, rows, initialSort, pageSize = 15, filterParam, rowKey = "id", selected, searchable = true }: {
  columns: Column[]; rows: Record<string, unknown>[]; initialSort?: { key: string; dir: "asc" | "desc" }; pageSize?: number; filterParam?: string; rowKey?: string; selected?: string | null; searchable?: boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: "asc" as const });
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(pageSize);
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? rows.filter((r) => columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(needle))) : rows;
    return [...list].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const cmp = x == null ? 1 : y == null ? -1 : typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sort, q]);
  const cell = (c: Column, v: unknown) => {
    if (v == null || v === "") return "–";
    if (c.format === "date") return new Date(String(v).includes("T") ? String(v) : `${String(v).replace(" ", "T")}Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (c.format === "bool") return v ? "Yes" : "No";
    if (!c.format || c.format === "text") return String(v);
    return fmt(Number(v), c.format);
  };
  const pick = (r: Record<string, unknown>) => {
    if (!filterParam) return;
    const q2 = new URLSearchParams(sp.toString());
    const v = String(r[rowKey]);
    if (q2.get(filterParam) === v) q2.delete(filterParam);
    else q2.set(filterParam, v);
    router.replace(`${path}?${q2.toString()}`, { scroll: false });
  };
  return (
    <div className="min-w-0">
      {searchable && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this table" className="input max-w-xs !py-1.5 text-sm" aria-label="Search table" />
          <span className="text-xs text-muted">{filtered.length.toLocaleString()} rows</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
              {columns.map((c) => (
                <th key={c.key} className={`px-2 py-2 font-bold ${c.align === "right" || (c.format && !["text", "date", "bool"].includes(c.format)) ? "text-right" : ""}`}>
                  <button type="button" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "desc" ? "asc" : "desc" }))} className="inline-flex items-center gap-1 hover:text-ink" aria-label={`Sort by ${c.label}`}>
                    {c.label} {sort.key === c.key ? (sort.dir === "desc" ? "↓" : "↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.slice(0, limit).map((r, i) => {
              const active = selected != null && String(r[rowKey]) === selected;
              return (
                <tr key={String(r[rowKey] ?? i)} onClick={() => pick(r)} className={`${filterParam ? "cursor-pointer hover:bg-mist" : ""} ${active ? "bg-bcg-tint" : ""}`} title={filterParam ? (active ? "Click to clear this filter" : "Click to filter the dashboard") : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-2 py-2 ${c.align === "right" || (c.format && !["text", "date", "bool"].includes(c.format)) ? "text-right tabular-nums" : ""} ${c.key === columns[0].key ? "font-bold text-ink" : "text-slate"}`}>
                      {cell(c, r[c.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > limit && (
        <button type="button" className="btn-ghost mt-2 !px-2 text-xs" onClick={() => setLimit((l) => l + pageSize * 2)}>
          Show more ({(filtered.length - limit).toLocaleString()} left)
        </button>
      )}
    </div>
  );
}

/** Filter bar: time range, optional clinician and goal pickers, demo-data switch, and exports. */
export function FilterBar({ ranges, clinicians, goals, exportBase, showDemo = true, defaultRange = "30d" }: {
  ranges: { id: string; label: string }[]; clinicians?: { id: string; name: string }[]; goals?: { id: string; label: string }[]; exportBase?: string; showDemo?: boolean; defaultRange?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const set = (k: string, v: string | null) => {
    const q = new URLSearchParams(sp.toString());
    if (v == null || v === "") q.delete(k);
    else q.set(k, v);
    router.replace(`${path}?${q.toString()}`, { scroll: false });
  };
  const range = sp.get("range") ?? defaultRange;
  const demo = sp.get("demo") !== "0";
  const active = [sp.get("clinician") && "clinician", sp.get("goal") && "goal"].filter(Boolean).length;
  const qs = sp.toString();
  return (
    <div className="card flex flex-wrap items-center gap-3 p-3">
      <div className="flex overflow-hidden rounded-[2px] border border-line" role="group" aria-label="Time range">
        {ranges.map((r) => (
          <button key={r.id} type="button" onClick={() => set("range", r.id)} aria-pressed={range === r.id} className={`px-3 py-1.5 text-xs font-bold ${range === r.id ? "bg-bain text-white" : "bg-white text-ink hover:bg-mist"}`}>
            {r.label}
          </button>
        ))}
      </div>
      {clinicians && (
        <select value={sp.get("clinician") ?? ""} onChange={(e) => set("clinician", e.target.value || null)} className="input !w-auto !py-1.5 text-xs" aria-label="Clinician">
          <option value="">All clinicians</option>
          {clinicians.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      {goals && (
        <select value={sp.get("goal") ?? ""} onChange={(e) => set("goal", e.target.value || null)} className="input !w-auto !py-1.5 text-xs" aria-label="Goal type">
          <option value="">All goal types</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
      )}
      {showDemo && (
        <label className="flex items-center gap-2 text-xs text-slate" title="Generated demo history (flagged in the data). Turn off to see real activity only.">
          <input type="checkbox" checked={demo} onChange={(e) => set("demo", e.target.checked ? null : "0")} className="accent-bcg-deep" />
          Include demo history
        </label>
      )}
      {active > 0 && (
        <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => router.replace(`${path}?${new URLSearchParams({ range, ...(demo ? {} : { demo: "0" }) }).toString()}`, { scroll: false })}>
          Clear filters ({active})
        </button>
      )}
      {exportBase && (
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={`${exportBase}?${qs}${qs ? "&" : ""}format=xlsx`} className="btn-outline !px-3 !py-1.5 text-xs" title="Excel workbook: a summary sheet plus every table on this page">
            Export to Excel
          </a>
          <a href={`${exportBase}?${qs}${qs ? "&" : ""}format=tableau`} className="btn-dark !px-3 !py-1.5 text-xs" title="Tableau-ready CSV: one row per record, clean headers, ISO dates">
            Export for Tableau
          </a>
        </div>
      )}
    </div>
  );
}
