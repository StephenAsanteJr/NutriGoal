// Number formatting shared by dashboards (server and client) and exports.
export type FmtKind = "int" | "money" | "moneyCents" | "moneyCompact" | "pct" | "hours" | "rating" | "decimal";

export function fmt(v: number | null | undefined, kind: FmtKind = "int"): string {
  if (v == null || !Number.isFinite(v)) return "–";
  switch (kind) {
    case "money":
      return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v >= 1000 ? 0 : 2 });
    case "moneyCents":
      return fmt(v / 100, "money");
    case "moneyCompact": {
      const d = v / 100;
      return Math.abs(d) >= 1000 ? `$${(d / 1000).toFixed(d >= 10000 ? 0 : 1)}k` : fmt(d, "money");
    }
    case "pct":
      return `${v.toFixed(v >= 10 || v === 0 ? 0 : 1)}%`;
    case "hours":
      return `${v.toFixed(v >= 10 ? 0 : 1)} h`;
    case "rating":
      return `${v.toFixed(2)} ★`;
    case "decimal":
      return v.toFixed(1);
    default:
      return Math.round(v).toLocaleString("en-US");
  }
}

/** Change vs the previous period, as a percentage (null when there's nothing to compare). */
export function delta(cur: number | null | undefined, prev: number | null | undefined) {
  if (cur == null || prev == null || !Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
