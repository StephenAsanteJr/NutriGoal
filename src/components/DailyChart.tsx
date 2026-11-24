"use client";

import { useState } from "react";

type Point = { day: string; value: number | null };
const W = 680;
const H = 200;
const M = { top: 14, right: 70, bottom: 28, left: 44 };

/** One measure per chart: daily bars against a target line, with hover tooltip. */
export function DailyChart({ points, target, unit, label, color = "#2251ff" }: { points: Point[]; target: number | null; unit: string; label: string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return null;
  const vals = points.map((p) => p.value ?? 0);
  const hi = Math.max(...vals, target ?? 0) * 1.12 || 1;
  const step = (W - M.left - M.right) / points.length;
  const y = (v: number) => M.top + (1 - v / hi) * (H - M.top - M.bottom);
  const ticks = [0, 0.5, 1].map((f) => Math.round((hi * f) / 10) * 10);
  const fmt = (v: number) => Math.round(v).toLocaleString();
  const h = hover != null ? points[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${label}: ${points.length} days${target ? `, target ${fmt(target)} ${unit}` : ""}`} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#e6ebef" />
            <text x={M.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#7b868e" fontFamily="Arial">{fmt(t)}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = M.left + i * step;
          const v = p.value;
          return (
            <g key={p.day} onPointerEnter={() => setHover(i)}>
              <rect x={x} y={M.top} width={step} height={H - M.top - M.bottom} fill="transparent" />
              {v != null ? (
                <rect x={x + 1} y={y(v)} width={Math.max(1, step - 2)} height={Math.max(0, y(0) - y(v))} rx={Math.min(4, step / 3)} fill={color} opacity={hover == null || hover === i ? 1 : 0.55} />
              ) : (
                <rect x={x + 1} y={y(0) - 2} width={Math.max(1, step - 2)} height={2} fill="#dfe4e8" />
              )}
            </g>
          );
        })}
        {target != null && (
          <>
            <line x1={M.left} x2={W - M.right} y1={y(target)} y2={y(target)} stroke="#051c2c" strokeDasharray="4 3" strokeWidth="1.2" />
            <text x={W - M.right + 6} y={y(target) + 4} fontSize="10" fill="#051c2c" fontFamily="Arial" fontWeight="700">Target {fmt(target)}</text>
          </>
        )}
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
          <text key={i} x={M.left + i * step + step / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#7b868e" fontFamily="Arial">
            {new Date(points[i].day + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[2px] border border-line bg-white px-3 py-2 text-xs shadow-lg" style={{ left: `${((M.left + hover! * step + step / 2) / W) * 100}%` }}>
          <div className="font-bold">{new Date(h.day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
          <div className="text-slate">{h.value != null ? `${fmt(h.value)} ${unit}` : "Not logged"}{h.value != null && target ? ` · ${Math.round((h.value / target) * 100)}% of target` : ""}</div>
        </div>
      )}
    </div>
  );
}
