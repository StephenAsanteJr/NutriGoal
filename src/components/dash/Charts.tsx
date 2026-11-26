"use client";

// Interactive dashboard charts: hover for exact values, click bars to filter (where enabled).
// Colors follow one job each: categorical series use a validated blue / green / cyan set;
// Bain red is reserved for "late / overdue" and always comes with a label.

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fmt, type FmtKind } from "@/lib/fmt";

export const SERIES = ["#2251ff", "#197a56", "#cc0000"]; // McKinsey blue · BCG green · Bain red
const LATE = "#cc0000";
const GRID = "#e6ebef";
const AXIS = "#7b868e";

/** Set or clear a URL filter (e.g. goal, clinician) and re-render the server page. */
function useFilterLink() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (param: string, value: string | null) => {
    const q = new URLSearchParams(sp.toString());
    if (value == null || q.get(param) === value) q.delete(param);
    else q.set(param, value);
    router.replace(`${path}?${q.toString()}`, { scroll: false });
  };
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Legend({ items }: { items: { name: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate">
      {items.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded" style={{ background: s.dashed ? `repeating-linear-gradient(90deg, ${s.color} 0 4px, transparent 4px 7px)` : s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

const W = 640;
const H = 220;
const M = { top: 12, right: 16, bottom: 26, left: 52 };

/** Line chart for up to three series over time, with a crosshair tooltip. */
export function LineChart({ labels, series, format = "int", height = H }: { labels: string[]; series: { name: string; values: number[]; dashed?: boolean }[]; format?: FmtKind; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const hi = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const iw = W - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const x = (i: number) => M.left + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => M.top + (1 - v / hi) * ih;
  const ticks = [0, 0.5, 1].map((f) => hi * f);
  const every = Math.ceil(labels.length / 6);
  return (
    <div className="relative">
      <Legend items={series.map((s, i) => ({ name: s.name, color: SERIES[i], dashed: s.dashed }))} />
      <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" role="img" aria-label={series.map((s) => `${s.name}: latest ${fmt(s.values.at(-1), format)}`).join("; ")} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={M.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill={AXIS}>{fmt(t, format === "moneyCents" ? "moneyCompact" : format)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % every === 0 || i === labels.length - 1 ? <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill={AXIS}>{l}</text> : null))}
        {series.map((s, si) => (
          <polyline key={s.name} fill="none" stroke={SERIES[si]} strokeWidth="2" strokeLinejoin="round" strokeDasharray={s.dashed ? "5 4" : undefined} points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
        ))}
        {hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} stroke="#051c2c" strokeOpacity="0.3" />
            {series.map((s, si) => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill={SERIES[si]} stroke="#fff" strokeWidth="2" />)}
          </>
        )}
        {labels.map((_, i) => (
          <rect key={i} x={x(i) - iw / Math.max(1, labels.length - 1) / 2} y={M.top} width={iw / Math.max(1, labels.length - 1)} height={ih} fill="transparent" onPointerEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-6 z-10 -translate-x-1/2 rounded-[2px] border border-line bg-white px-3 py-2 text-xs shadow-lg" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <div className="font-bold">{labels[hover]}</div>
          {series.map((s, si) => (
            <div key={s.name} className="flex items-center gap-2 text-slate">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: SERIES[si] }} />
              {s.name}: <span className="font-bold text-navy">{fmt(s.values[hover], format)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Stacked columns (e.g. revenue by product per week), tooltip with breakdown and total. */
export function StackedColumns({ labels, series, format = "moneyCents", height = H }: { labels: string[]; series: { name: string; values: number[] }[]; format?: FmtKind; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = labels.map((_, i) => series.reduce((n, s) => n + s.values[i], 0));
  const hi = niceMax(Math.max(1, ...totals));
  const iw = W - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const step = iw / labels.length;
  const bw = Math.max(2, step - 2);
  const y = (v: number) => M.top + (1 - v / hi) * ih;
  const every = Math.ceil(labels.length / 6);
  return (
    <div className="relative">
      <Legend items={series.map((s, i) => ({ name: s.name, color: SERIES[i] }))} />
      <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" role="img" aria-label={`Total ${fmt(totals.reduce((a, b) => a + b, 0), format)}`} onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.left} x2={W - M.right} y1={y(hi * f)} y2={y(hi * f)} stroke={GRID} />
            <text x={M.left - 6} y={y(hi * f) + 4} textAnchor="end" fontSize="10" fill={AXIS}>{fmt(hi * f, format === "moneyCents" ? "moneyCompact" : format)}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          let acc = 0;
          const x0 = M.left + i * step + 1;
          return (
            <g key={i} onPointerEnter={() => setHover(i)} opacity={hover == null || hover === i ? 1 : 0.55}>
              <rect x={M.left + i * step} y={M.top} width={step} height={ih} fill="transparent" />
              {series.map((s, si) => {
                const v = s.values[i];
                if (!v) return null;
                const top = y(acc + v);
                const bottom = y(acc);
                acc += v;
                const isTop = series.slice(si + 1).every((o) => !o.values[i]);
                return <rect key={s.name} x={x0} y={top} width={bw} height={Math.max(0, bottom - top - (si ? 1 : 0))} rx={isTop ? Math.min(4, bw / 3) : 0} fill={SERIES[si]} />;
              })}
              {(i % every === 0 || i === labels.length - 1) && <text x={x0 + bw / 2} y={height - 8} textAnchor="middle" fontSize="10" fill={AXIS}>{l}</text>}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-6 z-10 -translate-x-1/2 rounded-[2px] border border-line bg-white px-3 py-2 text-xs shadow-lg" style={{ left: `${((M.left + hover * step + step / 2) / W) * 100}%` }}>
          <div className="font-bold">{labels[hover]} · {fmt(totals[hover], format)}</div>
          {series.map((s, si) => (
            <div key={s.name} className="flex items-center gap-2 text-slate">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: SERIES[si] }} />
              {s.name}: <span className="font-bold text-navy">{fmt(s.values[hover], format)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Item = { key: string; label: string; value: number; late?: boolean; note?: string };

/** Horizontal bars. With `filterParam`, clicking a bar filters the dashboard (click again to clear). */
export function BarList({ items, format = "int", filterParam, selected, color = SERIES[0], showShare = true }: { items: Item[]; format?: FmtKind; filterParam?: string; selected?: string | null; color?: string; showShare?: boolean }) {
  const setFilter = useFilterLink();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((n, i) => n + i.value, 0);
  return (
    <ul className="space-y-1.5">
      {items.map((it) => {
        const active = selected === it.key;
        const dim = selected && !active;
        const Tag = filterParam ? "button" : "div";
        return (
          <li key={it.key}>
            <Tag
              {...(filterParam ? { type: "button" as const, onClick: () => setFilter(filterParam, it.key), "aria-pressed": active, title: active ? "Click to clear this filter" : "Click to filter the dashboard" } : {})}
              onPointerEnter={() => setHover(it.key)}
              onPointerLeave={() => setHover(null)}
              className={`grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded-[2px] px-1 py-0.5 text-left text-xs ${filterParam ? "hover:bg-mist" : ""} ${active ? "bg-blue-tint" : ""}`}
            >
              <span className={`truncate ${active ? "font-bold text-blue" : "text-navy"}`}>{it.label}</span>
              <span className="relative h-3 rounded-r-[4px]">
                <span className="absolute inset-y-0 left-0 rounded-r-[4px] transition-all" style={{ width: `${(it.value / max) * 100}%`, background: it.late ? LATE : color, opacity: dim ? 0.35 : hover && hover !== it.key ? 0.6 : 1 }} />
              </span>
              <span className="w-24 text-right tabular-nums text-slate">
                <span className="font-bold text-navy">{fmt(it.value, format)}</span>
                {showShare && total > 0 ? ` · ${Math.round((it.value / total) * 100)}%` : ""}
                {it.late ? <span className="ml-1 font-bold text-alert">late</span> : null}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical columns with an optional reference line (e.g. 100% utilization). */
export function Columns({ items, format = "int", reference, referenceLabel, height = 180, color = SERIES[0] }: { items: Item[]; format?: FmtKind; reference?: number; referenceLabel?: string; height?: number; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const hi = niceMax(Math.max(1, reference ?? 0, ...items.map((i) => i.value)));
  const iw = W - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const step = iw / Math.max(1, items.length);
  const bw = Math.max(2, Math.min(48, step - 6));
  const y = (v: number) => M.top + (1 - v / hi) * ih;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" role="img" aria-label={items.map((i) => `${i.label} ${fmt(i.value, format)}`).join(", ")} onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.left} x2={W - M.right} y1={y(hi * f)} y2={y(hi * f)} stroke={GRID} />
            <text x={M.left - 6} y={y(hi * f) + 4} textAnchor="end" fontSize="10" fill={AXIS}>{fmt(hi * f, format === "moneyCents" ? "moneyCompact" : format)}</text>
          </g>
        ))}
        {items.map((it, i) => {
          const cx = M.left + i * step + step / 2;
          return (
            <g key={it.key} onPointerEnter={() => setHover(i)}>
              <rect x={M.left + i * step} y={M.top} width={step} height={ih} fill="transparent" />
              <rect x={cx - bw / 2} y={y(it.value)} width={bw} height={Math.max(0, y(0) - y(it.value))} rx={Math.min(4, bw / 3)} fill={it.late ? LATE : color} opacity={hover == null || hover === i ? 1 : 0.55} />
              <text x={cx} y={height - 8} textAnchor="middle" fontSize="10" fill={AXIS}>{it.label}</text>
            </g>
          );
        })}
        {reference != null && (
          <>
            <line x1={M.left} x2={W - M.right} y1={y(reference)} y2={y(reference)} stroke="#051c2c" strokeDasharray="4 3" strokeWidth="1.2" />
            <text x={W - M.right} y={y(reference) - 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#051c2c">{referenceLabel}</text>
          </>
        )}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[2px] border border-line bg-white px-3 py-2 text-xs shadow-lg" style={{ left: `${((M.left + hover * step + step / 2) / W) * 100}%` }}>
          <div className="font-bold">{items[hover].label}</div>
          <div className="text-slate">{fmt(items[hover].value, format)}{items[hover].note ? ` · ${items[hover].note}` : ""}</div>
        </div>
      )}
    </div>
  );
}

/** Funnel as stepped bars with conversion from the first step and from the previous step. */
export function Funnel({ steps }: { steps: Item[] }) {
  const first = steps[0]?.value || 1;
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const fromPrev = i ? (steps[i - 1].value ? (s.value / steps[i - 1].value) * 100 : 0) : 100;
        return (
          <li key={s.key} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-xs" title={`${fmt(fromPrev, "pct")} of the previous step`}>
            <span className="truncate text-navy">{s.label}</span>
            <span className="h-4 rounded-r-[4px]" style={{ width: `${Math.max(2, (s.value / first) * 100)}%`, background: SERIES[0], opacity: 1 - i * 0.13 }} />
            <span className="w-28 text-right tabular-nums text-slate">
              <span className="font-bold text-navy">{fmt(s.value)}</span> · {fmt((s.value / first) * 100, "pct")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
