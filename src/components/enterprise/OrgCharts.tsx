"use client";

import { useState } from "react";

// Direction of travel is a diverging scale: BCG green (closer) and Bain red (straying) on either side
// of a neutral gray (holding), with a pale fill for "no recent check-ins". Every segment is labeled.
export const DIRECTION_COLORS = { closer: "#197a56", holding: "#a3ada6", straying: "#cc0000", noData: "#e6ece8" } as const;
const NAMES = { closer: "Getting closer", holding: "Holding steady", straying: "Straying", noData: "No recent check-ins" } as const;
type Key = keyof typeof NAMES;
const KEYS: Key[] = ["closer", "holding", "straying", "noData"];

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
      {KEYS.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: DIRECTION_COLORS[k], outline: k === "noData" ? "1px solid #c8d1cb" : undefined }} />
          {NAMES[k]}
        </li>
      ))}
    </ul>
  );
}

/** One 100% bar: where the group stands today. */
export function DirectionBar({ values }: { values: Record<Key, number | null> }) {
  const known = KEYS.every((k) => values[k] != null);
  if (!known) return <Hidden />;
  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-[3px]" role="img" aria-label={KEYS.map((k) => `${NAMES[k]} ${values[k]}%`).join(", ")}>
        {KEYS.map((k) =>
          values[k] ? (
            <div key={k} className="flex items-center justify-center border-r-2 border-white text-xs font-bold last:border-r-0" style={{ width: `${values[k]}%`, background: DIRECTION_COLORS[k], color: k === "closer" || k === "straying" ? "#fff" : "#0c2b15" }} title={`${NAMES[k]}: ${values[k]}%`}>
              {(values[k] ?? 0) >= 10 ? `${values[k]}%` : ""}
            </div>
          ) : null,
        )}
      </div>
      <div className="mt-3"><Legend /></div>
    </div>
  );
}

type Month = { label: string; closer: number | null; holding: number | null; straying: number | null; noData: number | null; enrolled: number; suppressed: boolean };

/** Share of members by direction, month by month. Months covering fewer than 5 people are withheld. */
export function DirectionTrend({ months }: { months: Month[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, M = { top: 12, right: 8, bottom: 26, left: 36 };
  const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
  const step = iw / months.length;
  const bw = Math.min(56, step - 10);
  const y = (v: number) => M.top + (1 - v / 100) * ih;
  return (
    <div className="relative">
      <Legend />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block h-auto w-full" role="img" aria-label="Share of members getting closer to, holding or straying from their goals by month" onPointerLeave={() => setHover(null)}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="#e6ece8" />
            <text x={M.left - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#77847b">{v}%</text>
          </g>
        ))}
        {months.map((m, i) => {
          const x = M.left + i * step + (step - bw) / 2;
          let acc = 0;
          return (
            <g key={m.label} onPointerEnter={() => setHover(i)} opacity={hover == null || hover === i ? 1 : 0.55}>
              <rect x={M.left + i * step} y={M.top} width={step} height={ih} fill="transparent" />
              {m.suppressed ? (
                <rect x={x} y={M.top} width={bw} height={ih} rx="3" fill="url(#ng-hatch)" stroke="#dfe6e1" />
              ) : (
                KEYS.map((k) => {
                  const v = m[k] ?? 0;
                  if (!v) return null;
                  const top = y(acc + v), bottom = y(acc);
                  acc += v;
                  return <rect key={k} x={x} y={top} width={bw} height={Math.max(0, bottom - top - 2)} fill={DIRECTION_COLORS[k]} rx={k === "closer" ? 0 : 0} />;
                })
              )}
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#77847b">{m.label}</text>
            </g>
          );
        })}
        <defs>
          <pattern id="ng-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#dfe6e1" strokeWidth="2" />
          </pattern>
        </defs>
      </svg>
      {hover != null && (
        <div
          className={`pointer-events-none absolute top-8 z-10 whitespace-nowrap rounded-[2px] border border-line bg-white px-3 py-2 text-xs shadow-lg ${hover === 0 ? "" : hover === months.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
          style={{ left: `${((M.left + hover * step + (hover === 0 ? 0 : hover === months.length - 1 ? step : step / 2)) / W) * 100}%` }}
        >
          <div className="font-bold">{months[hover].label}</div>
          {months[hover].suppressed ? (
            <div className="text-slate">Hidden: fewer than 5 members</div>
          ) : (
            <>
              {KEYS.map((k) => (
                <div key={k} className="flex items-center gap-2 text-slate">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: DIRECTION_COLORS[k] }} />
                  {NAMES[k]}: <span className="font-bold text-ink">{months[hover][k]}%</span>
                </div>
              ))}
              <div className="mt-1 text-muted">{months[hover].enrolled.toLocaleString()} members enrolled</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Hidden() {
  return (
    <div className="rounded-[3px] border border-dashed border-line bg-mist px-4 py-6 text-center text-sm text-slate">
      Hidden to protect privacy until at least 5 members have joined.
    </div>
  );
}
