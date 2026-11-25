"use client";

import { useMemo, useRef, useState } from "react";

type Point = { date: string; kg: number };

const W = 680;
const H = 270;
const M = { top: 18, right: 92, bottom: 34, left: 48 };
const ACTUAL = "#2251ff";
const PATH = "#197a56"; // BCG green: the path to your goal
const DAY = 86400_000;

/**
 * Weight over time: actual weigh-ins (solid) against the platform's safe path to the
 * goal (dashed), with a goal reference line. Hover shows a crosshair and tooltip.
 */
export function ProgressChart({
  points,
  goalKg,
  weeks,
  units,
}: {
  points: Point[];
  goalKg: number;
  weeks: number;
  units: "imperial" | "metric";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const conv = (kg: number) => (units === "metric" ? kg : kg / 0.45359237);
  const unit = units === "metric" ? "kg" : "lb";

  const g = useMemo(() => {
    const t = points.map((p) => new Date(p.date + "T12:00:00").getTime());
    const t0 = t[0];
    const tEnd = t0 + weeks * 7 * DAY;
    const tMax = Math.max(t[t.length - 1], tEnd);
    const vals = [...points.map((p) => conv(p.kg)), conv(goalKg)];
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const pad = Math.max(2, (hi - lo) * 0.12);
    lo = Math.floor((lo - pad) / 5) * 5;
    hi = Math.ceil((hi + pad) / 5) * 5;
    const x = (ms: number) => M.left + ((ms - t0) / Math.max(1, tMax - t0)) * (W - M.left - M.right);
    const y = (v: number) => M.top + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - M.top - M.bottom);
    const startV = conv(points[0].kg);
    const goalV = conv(goalKg);
    const pathAt = (ms: number) => (ms >= tEnd ? goalV : startV + (goalV - startV) * ((ms - t0) / (tEnd - t0)));
    const step = (hi - lo) / 5 <= 5 ? 5 : 10;
    const yTicks: number[] = [];
    for (let v = lo; v <= hi + 0.01; v += step) yTicks.push(v);
    const months: { ms: number; label: string }[] = [];
    const d = new Date(t0);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    while (d.getTime() <= tMax) {
      months.push({ ms: d.getTime(), label: d.toLocaleDateString("en-US", { month: "short" }) });
      d.setMonth(d.getMonth() + 1);
    }
    return { t, t0, tEnd, x, y, startV, goalV, pathAt, yTicks, months };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, goalKg, weeks, units]);

  if (points.length === 0) return null;
  const line = points.map((p, i) => `${i ? "L" : "M"}${g.x(g.t[i]).toFixed(1)},${g.y(conv(p.kg)).toFixed(1)}`).join(" ");
  const last = points.length - 1;
  const lastX = g.x(g.t[last]);
  const lastY = g.y(conv(points[last].kg));

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    let bd = Infinity;
    g.t.forEach((ms, i) => {
      const dd = Math.abs(g.x(ms) - px);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    setHover(best);
  }

  const h = hover != null ? points[hover] : null;
  const hx = hover != null ? g.x(g.t[hover]) : 0;
  const hy = h ? g.y(conv(h.kg)) : 0;
  const onPath = hover != null ? g.pathAt(g.t[hover]) : 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded" style={{ background: ACTUAL }} /> Your weigh-ins
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" x2="20" y1="2" y2="2" stroke={PATH} strokeWidth="2" strokeDasharray="4 3" /></svg> Safe path to goal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" x2="20" y1="2" y2="2" stroke="#7b868e" strokeWidth="1" strokeDasharray="2 2" /></svg> Goal
        </span>
      </div>
      <div className="relative">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Weight chart: ${points.length} weigh-ins from ${conv(points[0].kg).toFixed(0)} to ${conv(points[last].kg).toFixed(0)} ${unit}; goal ${conv(goalKg).toFixed(0)} ${unit}.`}>
          {g.yTicks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={g.y(v)} y2={g.y(v)} stroke="#e6ebef" strokeWidth="1" />
              <text x={M.left - 8} y={g.y(v) + 4} textAnchor="end" fontSize="11" fill="#7b868e" fontFamily="Arial">
                {v}
              </text>
            </g>
          ))}
          {g.months.map((m) => (
            <text key={m.ms} x={g.x(m.ms)} y={H - 10} textAnchor="middle" fontSize="11" fill="#7b868e" fontFamily="Arial">
              {m.label}
            </text>
          ))}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} stroke="#c9d0d5" />

          {/* goal reference */}
          <line x1={M.left} x2={W - M.right} y1={g.y(g.goalV)} y2={g.y(g.goalV)} stroke="#7b868e" strokeDasharray="2 3" />
          <text x={W - M.right + 6} y={g.y(g.goalV) + 4} fontSize="11" fill="#4a5862" fontFamily="Arial" fontWeight="700">
            Goal {g.goalV.toFixed(0)} {unit}
          </text>

          {/* safe path */}
          <line x1={g.x(g.t0)} y1={g.y(g.startV)} x2={g.x(g.tEnd)} y2={g.y(g.goalV)} stroke={PATH} strokeWidth="2" strokeDasharray="6 4" />
          <text x={g.x(g.tEnd) - 4} y={g.y(g.goalV) + 16} textAnchor="end" fontSize="11" fill="#4a5862" fontFamily="Arial">
            Safe path · week {weeks}
          </text>

          {/* actual */}
          <path d={line} fill="none" stroke={ACTUAL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={g.x(g.t[i])} cy={g.y(conv(p.kg))} r="4" fill={ACTUAL} stroke="#ffffff" strokeWidth="2" />
          ))}
          <text x={lastX + 8} y={lastY - 8} fontSize="11" fill="#051c2c" fontFamily="Arial" fontWeight="700">
            {conv(points[last].kg).toFixed(1)} {unit}
          </text>

          {h && (
            <g pointerEvents="none">
              <line x1={hx} x2={hx} y1={M.top} y2={H - M.bottom} stroke="#051c2c" strokeOpacity="0.25" />
              <circle cx={hx} cy={hy} r="6" fill={ACTUAL} stroke="#ffffff" strokeWidth="2" />
            </g>
          )}
          <rect
            x={M.left}
            y={M.top}
            width={W - M.left - M.right}
            height={H - M.top - M.bottom}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-[2px] border border-line bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `${(hx / W) * 100}%`, top: `${(hy / H) * 100}%`, marginTop: -10 }}
          >
            <div className="font-bold text-navy">
              {new Date(h.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div className="mt-1 flex justify-between gap-4 text-slate">
              <span>Weight</span>
              <span className="font-bold text-navy">
                {conv(h.kg).toFixed(1)} {unit}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-slate">
              <span>Safe path</span>
              <span className="font-bold text-navy">
                {onPath.toFixed(1)} {unit}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-slate">
              <span>vs. path</span>
              <span className="font-bold text-navy">
                {conv(h.kg) - onPath > 0 ? "+" : "−"}
                {Math.abs(conv(h.kg) - onPath).toFixed(1)} {unit}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
