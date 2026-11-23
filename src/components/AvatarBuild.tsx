"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { silhouette, VIEW, type SilhouetteShape } from "@/lib/silhouette";
import { formatWeight, type Sex } from "@/lib/biometrics";
import { skinTone } from "@/lib/domain";

export type AvatarLook = { skinTone: string; hairStyle: string; hairColor: string };

type Props = {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  goalWeightKg: number;
  goalBodyFatPct: number;
  weeks: number;
  units: "imperial" | "metric";
  heightLabel: string;
  look: AvatarLook;
  /** "full" shows the Today/Goal controls and the side-by-side comparison. */
  variant?: "full" | "compact";
  className?: string;
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Animated character version of the member's build. Shape follows height, lean
 * mass and body fat; colours follow the member's chosen skin tone and hair.
 * The slider / play button morphs the character from today's body to the goal body.
 */
export function AvatarBuild(p: Props) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const variant = p.variant ?? "full";

  const w = p.weightKg + (p.goalWeightKg - p.weightKg) * t;
  const bf = p.bodyFatPct + (p.goalBodyFatPct - p.bodyFatPct) * t;
  const shape = useMemo(() => silhouette({ sex: p.sex, heightCm: p.heightCm, weightKg: w, bodyFatPct: bf }), [p.sex, p.heightCm, w, bf]);
  const start = useMemo(
    () => silhouette({ sex: p.sex, heightCm: p.heightCm, weightKg: p.weightKg, bodyFatPct: p.bodyFatPct }),
    [p.sex, p.heightCm, p.weightKg, p.bodyFatPct],
  );
  const goal = useMemo(
    () => silhouette({ sex: p.sex, heightCm: p.heightCm, weightKg: p.goalWeightKg, bodyFatPct: p.goalBodyFatPct }),
    [p.sex, p.heightCm, p.goalWeightKg, p.goalBodyFatPct],
  );
  const ghost = t < 0.5 ? goal : start;

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  function animateTo(target: number) {
    if (raf.current) cancelAnimationFrame(raf.current);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(target);
      return;
    }
    const from = t;
    const dur = 2200 * Math.abs(target - from) + 200;
    const t0 = performance.now();
    setPlaying(true);
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setT(from + (target - from) * ease(k));
      if (k < 1) raf.current = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(step);
  }

  const week = Math.round(t * p.weeks);
  const y0 = Math.max(0, Math.floor(start.topY - 40));

  return (
    <figure className={p.className}>
      {variant === "full" && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-[2px] border border-line p-0.5 text-xs font-bold" role="group" aria-label="Show build">
            <button type="button" onClick={() => animateTo(0)} aria-pressed={t === 0} className={`rounded-[2px] px-3 py-1.5 ${t === 0 ? "bg-navy text-white" : "text-slate hover:text-navy"}`}>
              Today
            </button>
            <button type="button" onClick={() => animateTo(1)} aria-pressed={t === 1} className={`rounded-[2px] px-3 py-1.5 ${t === 1 ? "bg-blue text-white" : "text-slate hover:text-navy"}`}>
              Goal
            </button>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue hover:underline disabled:opacity-50"
            disabled={playing}
            onClick={() => {
              setT(0);
              requestAnimationFrame(() => animateTo(1));
            }}
          >
            <span aria-hidden>▶</span> Play transformation
          </button>
        </div>
      )}

      <svg
        viewBox={`0 ${y0} ${VIEW.width} ${VIEW.height - y0}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Animated character at week ${week} of ${p.weeks}: ${formatWeight(w, p.units)}, ${bf.toFixed(0)}% body fat.`}
      >
        <Backdrop y0={y0} />
        <line x1="22" x2="22" y1={start.topY} y2={VIEW.ground} stroke="#7b868e" strokeWidth="0.8" />
        {Array.from({ length: 11 }, (_, i) => start.topY + (start.heightPx * i) / 10).map((y, i) => (
          <line key={i} x1={i % 5 === 0 ? 14 : 18} x2="22" y1={y} y2={y} stroke="#7b868e" strokeWidth="0.8" />
        ))}
        <text x="8" y={start.topY - 8} fontSize="9" fill="#4a5862" fontFamily="Arial" fontWeight="700">
          {p.heightLabel}
        </text>
        <ellipse cx={VIEW.centerX} cy={VIEW.ground + 3} rx="64" ry="5" fill="#051c2c" opacity="0.1" />

        {/* comparison outline: the goal while showing today, today while showing the goal */}
        {variant === "full" && (
          <g fill="none" stroke={t < 0.5 ? "#00a9f4" : "#7b868e"} strokeWidth="1.6" strokeDasharray="1.5 4" strokeLinecap="round" opacity="0.9">
            <path d={ghost.body} />
            <ellipse cx={ghost.head.cx} cy={ghost.head.cy} rx={ghost.head.rx} ry={ghost.head.ry} />
          </g>
        )}

        <Character shape={shape} look={p.look} sex={p.sex} />
      </svg>

      {variant === "full" ? (
        <>
          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(t * 100)}
              onChange={(e) => setT(Number(e.target.value) / 100)}
              className="w-full accent-blue"
              aria-label="Timeline from today to goal"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>Today</span>
              <span className="font-bold text-navy">
                Week {week} of {p.weeks} · {formatWeight(w, p.units)} · {bf.toFixed(0)}% fat
              </span>
              <span>Goal</span>
            </div>
          </div>
          <Comparison start={start} goal={goal} look={p.look} sex={p.sex} p={p} />
        </>
      ) : null}
    </figure>
  );
}

function Backdrop({ y0 }: { y0: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <pattern id={`grid-${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#e6ebef" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect x="0" y={y0} width={VIEW.width} height={VIEW.height - y0} fill={`url(#grid-${id})`} />
    </>
  );
}

/** Side-by-side Today vs Goal characters. */
function Comparison({ start, goal, look, sex, p }: { start: SilhouetteShape; goal: SilhouetteShape; look: AvatarLook; sex: Sex; p: Props }) {
  const y0 = Math.max(0, Math.floor(start.topY - 20));
  const vb = `0 ${y0} ${VIEW.width} ${VIEW.height - y0}`;
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
      {[
        { label: "Today", s: start, wt: p.weightKg, f: p.bodyFatPct, tone: "text-navy" },
        { label: "Goal", s: goal, wt: p.goalWeightKg, f: p.goalBodyFatPct, tone: "text-blue" },
      ].map((c) => (
        <div key={c.label} className="text-center">
          <svg viewBox={vb} className="mx-auto block h-28 w-auto" aria-hidden>
            <Character shape={c.s} look={look} sex={sex} still />
          </svg>
          <div className={`mt-1 text-xs font-bold ${c.tone}`}>{c.label}</div>
          <div className="text-[11px] text-slate">
            {formatWeight(c.wt, p.units)} · {c.f.toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  );
}

/** The cartoon character: skin, clothes, shoes, face and hair. */
export function Character({ shape, look, sex, still }: { shape: SilhouetteShape; look: AvatarLook; sex: Sex; still?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const tone = skinTone(look.skinTone);
  const { cx, cy, rx, ry } = shape.head;
  const hair = look.hairColor;

  return (
    <g className={still ? undefined : "ng-breathe"}>
      <defs>
        <linearGradient id={`skin-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={tone.shade} />
          <stop offset="0.28" stopColor={tone.hex} />
          <stop offset="0.72" stopColor={tone.hex} />
          <stop offset="1" stopColor={tone.shade} />
        </linearGradient>
        <linearGradient id={`top-${uid}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3a66ff" />
          <stop offset="1" stopColor="#1a3fd6" />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={shape.body} />
        </clipPath>
      </defs>

      {/* long hair falls behind the body */}
      {look.hairStyle === "long" && (
        <path
          d={`M${cx - rx * 1.08},${cy - ry * 0.2} C${cx - rx * 1.35},${cy + ry * 1.2} ${cx - rx * 1.2},${cy + ry * 2.1} ${cx - rx * 0.7},${cy + ry * 2.2}
              L${cx + rx * 0.7},${cy + ry * 2.2} C${cx + rx * 1.2},${cy + ry * 2.1} ${cx + rx * 1.35},${cy + ry * 1.2} ${cx + rx * 1.08},${cy - ry * 0.2} Z`}
          fill={hair}
        />
      )}

      <path d={shape.body} fill={`url(#skin-${uid})`} stroke={tone.shade} strokeWidth="0.8" />
      <g clipPath={`url(#clip-${uid})`}>
        <path d={shape.top} fill={`url(#top-${uid})`} />
        <path d={shape.shorts} fill="#051c2c" />
        {/* small brand dot on the top */}
        <circle cx={cx + rx * 0.9} cy={cy + ry * 2.55} r={rx * 0.16} fill="#00a9f4" opacity="0.9" />
      </g>
      {shape.feet.map((f, i) => (
        <g key={i}>
          <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill="#ffffff" stroke="#051c2c" strokeWidth="0.9" />
          <path d={`M${f.cx - f.rx * 0.8},${f.cy + f.ry * 0.35} L${f.cx + f.rx * 0.8},${f.cy + f.ry * 0.35}`} stroke="#2251ff" strokeWidth="1.2" />
        </g>
      ))}

      {/* head */}
      <ellipse cx={cx - rx * 0.98} cy={cy + ry * 0.1} rx={rx * 0.16} ry={ry * 0.2} fill={tone.shade} />
      <ellipse cx={cx + rx * 0.98} cy={cy + ry * 0.1} rx={rx * 0.16} ry={ry * 0.2} fill={tone.shade} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={tone.hex} stroke={tone.shade} strokeWidth="0.8" />

      {/* face */}
      <g className={still ? undefined : "ng-blink"}>
        {[-1, 1].map((s) => (
          <g key={s}>
            <ellipse cx={cx + s * rx * 0.38} cy={cy + ry * 0.06} rx={rx * 0.11} ry={ry * 0.13} fill="#1b1410" />
            <circle cx={cx + s * rx * 0.38 + rx * 0.035} cy={cy + ry * 0.02} r={rx * 0.035} fill="#ffffff" />
          </g>
        ))}
      </g>
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={`M${cx + s * rx * 0.22},${cy - ry * 0.2} Q${cx + s * rx * 0.38},${cy - ry * 0.3} ${cx + s * rx * 0.56},${cy - ry * 0.2}`}
          stroke={hair}
          strokeWidth={rx * 0.09}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <path d={`M${cx - rx * 0.06},${cy + ry * 0.2} Q${cx},${cy + ry * 0.3} ${cx + rx * 0.06},${cy + ry * 0.2}`} stroke={tone.shade} strokeWidth="1" fill="none" />
      <path d={`M${cx - rx * 0.28},${cy + ry * 0.42} Q${cx},${cy + ry * 0.62} ${cx + rx * 0.28},${cy + ry * 0.42}`} stroke="#7a2e2e" strokeWidth={rx * 0.07} strokeLinecap="round" fill="none" />
      <circle cx={cx - rx * 0.55} cy={cy + ry * 0.35} r={rx * 0.13} fill="#e0707a" opacity="0.22" />
      <circle cx={cx + rx * 0.55} cy={cy + ry * 0.35} r={rx * 0.13} fill="#e0707a" opacity="0.22" />

      <Hair style={look.hairStyle} color={hair} head={shape.head} sex={sex} />
    </g>
  );
}

function Hair({ style, color, head, sex }: { style: string; color: string; head: SilhouetteShape["head"]; sex: Sex }) {
  const { cx, cy, rx, ry } = head;
  const cap = `M${cx - rx * 1.04},${cy + ry * 0.08} C${cx - rx * 1.12},${cy - ry * 1.25} ${cx + rx * 1.12},${cy - ry * 1.25} ${cx + rx * 1.04},${cy + ry * 0.08}
    L${cx + rx * 0.9},${cy - ry * 0.32} Q${cx + rx * 0.3},${cy - ry * 0.62} ${cx - rx * 0.15},${cy - ry * 0.42} Q${cx - rx * 0.6},${cy - ry * 0.55} ${cx - rx * 0.9},${cy - ry * 0.3} Z`;
  switch (style) {
    case "buzz":
      return <path d={cap} fill={color} opacity="0.55" />;
    case "curly":
      return (
        <g fill={color}>
          {Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI * (1.02 + (i / 10) * 0.96);
            return <circle key={i} cx={cx + Math.cos(a) * rx * 0.95} cy={cy - ry * 0.05 + Math.sin(a) * ry * 0.95} r={rx * 0.3} />;
          })}
          <ellipse cx={cx} cy={cy - ry * 0.62} rx={rx * 0.85} ry={ry * 0.42} />
        </g>
      );
    case "bun":
      return (
        <g fill={color}>
          <circle cx={cx} cy={cy - ry * 1.12} r={rx * 0.42} />
          <path d={cap} />
        </g>
      );
    case "long":
      return <path d={cap} fill={color} />;
    case "short":
    default:
      return <path d={cap} fill={color} transform={sex === "female" ? undefined : undefined} />;
  }
}
