import { silhouette, VIEW } from "@/lib/silhouette";
import { formatWeight, type Sex } from "@/lib/biometrics";

type Props = {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  goalWeightKg: number;
  goalBodyFatPct: number;
  units: "imperial" | "metric";
  heightLabel: string;
  className?: string;
};

/** Mock physical build: solid silhouette = today, dotted outline = goal. */
export function BodyBuild(p: Props) {
  const now = silhouette({ sex: p.sex, heightCm: p.heightCm, weightKg: p.weightKg, bodyFatPct: p.bodyFatPct });
  const goal = silhouette({ sex: p.sex, heightCm: p.heightCm, weightKg: p.goalWeightKg, bodyFatPct: p.goalBodyFatPct });
  const id = `g${Math.round(p.weightKg * 10)}${Math.round(p.bodyFatPct)}`;
  const ticks = Array.from({ length: 11 }, (_, i) => now.topY + (now.heightPx * i) / 10);
  // Crop empty space above shorter figures so the body fills the frame.
  const y0 = Math.max(0, Math.floor(now.topY - 30));

  return (
    <figure className={p.className}>
      <svg
        viewBox={`0 ${y0} ${VIEW.width} ${VIEW.height - y0}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Body build: now ${formatWeight(p.weightKg, p.units)} at ${p.bodyFatPct.toFixed(0)}% body fat; goal ${formatWeight(p.goalWeightKg, p.units)} at ${p.goalBodyFatPct.toFixed(0)}%.`}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#0E2F45" />
            <stop offset="1" stopColor="#051C2C" />
          </linearGradient>
          <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#E6EBEF" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x="0" y={y0} width={VIEW.width} height={VIEW.height - y0} fill={`url(#${id}-grid)`} />

        {/* height ruler */}
        <line x1="22" x2="22" y1={now.topY} y2={VIEW.ground} stroke="#7B868E" strokeWidth="0.8" />
        {ticks.map((y, i) => (
          <line key={i} x1={i % 5 === 0 ? 14 : 18} x2="22" y1={y} y2={y} stroke="#7B868E" strokeWidth="0.8" />
        ))}
        <text x="10" y={now.topY - 6} fontSize="9" fill="#4A5862" fontFamily="Arial" fontWeight="700">
          {p.heightLabel}
        </text>

        {/* floor */}
        <ellipse cx={VIEW.centerX} cy={VIEW.ground + 2} rx="62" ry="5" fill="#051C2C" opacity="0.08" />

        {/* current body */}
        <path d={now.body} fill={`url(#${id}-fill)`} />
        <ellipse cx={now.head.cx} cy={now.head.cy} rx={now.head.rx} ry={now.head.ry} fill={`url(#${id}-fill)`} />

        {/* goal outline */}
        <g fill="none" stroke="#00A9F4" strokeWidth="2" strokeDasharray="1.5 4" strokeLinecap="round">
          <path d={goal.body} />
          <ellipse cx={goal.head.cx} cy={goal.head.cy} rx={goal.head.rx} ry={goal.head.ry} />
        </g>
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-navy" aria-hidden /> Now · {formatWeight(p.weightKg, p.units)} ·{" "}
          {p.bodyFatPct.toFixed(0)}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dotted border-cyan" aria-hidden /> Goal ·{" "}
          {formatWeight(p.goalWeightKg, p.units)} · {p.goalBodyFatPct.toFixed(0)}%
        </span>
      </figcaption>
    </figure>
  );
}
