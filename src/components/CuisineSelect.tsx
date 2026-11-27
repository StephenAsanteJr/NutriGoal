"use client";

import { CUISINES, REGIONS, cuisineById } from "@/lib/cuisines";

/**
 * Pick which culture's ingredients to show: "Everyday" (general list), the member's own cuisines as
 * quick chips, and every other cuisine in a menu grouped by region.
 */
export function CuisineSelect({ value, onChange, quick = [], id = "cuisine-select", label = "Show ingredients from" }: { value: string; onChange: (id: string) => void; quick?: string[]; id?: string; label?: string }) {
  const chips = ["everyday", ...quick.filter((q) => cuisineById(q))];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      {chips.map((c) => {
        const on = value === c;
        return (
          <button
            key={c}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${on ? "border-bain bg-bain text-white" : "border-line bg-white text-ink hover:border-ink"}`}
          >
            {c === "everyday" ? "Everyday" : cuisineById(c)!.label}
          </button>
        );
      })}
      <label htmlFor={id} className="sr-only">More cuisines</label>
      <select id={id} value={chips.includes(value) ? "" : value} onChange={(e) => e.target.value && onChange(e.target.value)} className="input !w-auto !py-1 text-xs">
        <option value="">More cuisines ({CUISINES.length})…</option>
        {REGIONS.map((r) => (
          <optgroup key={r} label={r}>
            {CUISINES.filter((c) => c.region === r).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
