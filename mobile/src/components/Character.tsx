import { useMemo } from "react";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import { silhouette, VIEW, type Sex } from "@/lib/silhouette";

export type Look = { skin: string; skinShade: string; hairStyle: string; hairColor: string };

/** The member's animated-build character (same shape model as the website). */
export function Character({ sex, heightCm, weightKg, bodyFatPct, look, height = 220, ghost }: {
  sex: Sex; heightCm: number; weightKg: number; bodyFatPct: number; look: Look; height?: number; ghost?: { weightKg: number; bodyFatPct: number };
}) {
  const s = useMemo(() => silhouette({ sex, heightCm, weightKg, bodyFatPct }), [sex, heightCm, weightKg, bodyFatPct]);
  const g = useMemo(() => (ghost ? silhouette({ sex, heightCm, weightKg: ghost.weightKg, bodyFatPct: ghost.bodyFatPct }) : null), [ghost, sex, heightCm]);
  const y0 = Math.max(0, Math.floor(s.topY - 20));
  const vbH = VIEW.height - y0;
  const { cx, cy, rx, ry } = s.head;
  const hair = look.hairColor;
  const cap = `M${cx - rx * 1.04},${cy + ry * 0.08} C${cx - rx * 1.12},${cy - ry * 1.25} ${cx + rx * 1.12},${cy - ry * 1.25} ${cx + rx * 1.04},${cy + ry * 0.08} L${cx + rx * 0.9},${cy - ry * 0.32} Q${cx + rx * 0.3},${cy - ry * 0.62} ${cx - rx * 0.15},${cy - ry * 0.42} Q${cx - rx * 0.6},${cy - ry * 0.55} ${cx - rx * 0.9},${cy - ry * 0.3} Z`;

  return (
    <Svg width={(height * VIEW.width) / vbH} height={height} viewBox={`0 ${y0} ${VIEW.width} ${vbH}`}>
      <Defs>
        <LinearGradient id="skin" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={look.skinShade} />
          <Stop offset="0.3" stopColor={look.skin} />
          <Stop offset="0.7" stopColor={look.skin} />
          <Stop offset="1" stopColor={look.skinShade} />
        </LinearGradient>
        <ClipPath id="body">
          <Path d={s.body} />
        </ClipPath>
      </Defs>
      {g && (
        <G opacity={0.9}>
          <Path d={g.body} fill="none" stroke="#00a9f4" strokeWidth={2} strokeDasharray="1.5 4" strokeLinecap="round" />
        </G>
      )}
      {look.hairStyle === "long" && (
        <Path d={`M${cx - rx * 1.08},${cy - ry * 0.2} C${cx - rx * 1.35},${cy + ry * 1.2} ${cx - rx * 1.2},${cy + ry * 2.1} ${cx - rx * 0.7},${cy + ry * 2.2} L${cx + rx * 0.7},${cy + ry * 2.2} C${cx + rx * 1.2},${cy + ry * 2.1} ${cx + rx * 1.35},${cy + ry * 1.2} ${cx + rx * 1.08},${cy - ry * 0.2} Z`} fill={hair} />
      )}
      <Path d={s.body} fill="url(#skin)" stroke={look.skinShade} strokeWidth={0.8} />
      <G clipPath="url(#body)">
        <Path d={s.top} fill="#2251ff" />
        <Path d={s.shorts} fill="#051c2c" />
      </G>
      {s.feet.map((f, i) => (
        <Ellipse key={i} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill="#ffffff" stroke="#051c2c" strokeWidth={0.9} />
      ))}
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={look.skin} stroke={look.skinShade} strokeWidth={0.8} />
      {[-1, 1].map((d) => (
        <G key={d}>
          <Ellipse cx={cx + d * rx * 0.38} cy={cy + ry * 0.06} rx={rx * 0.11} ry={ry * 0.13} fill="#1b1410" />
          <Circle cx={cx + d * rx * 0.38 + rx * 0.035} cy={cy + ry * 0.02} r={rx * 0.035} fill="#fff" />
        </G>
      ))}
      <Path d={`M${cx - rx * 0.28},${cy + ry * 0.42} Q${cx},${cy + ry * 0.62} ${cx + rx * 0.28},${cy + ry * 0.42}`} stroke="#7a2e2e" strokeWidth={rx * 0.07} strokeLinecap="round" fill="none" />
      {look.hairStyle === "curly" ? (
        <G>
          {Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI * (1.02 + (i / 10) * 0.96);
            return <Circle key={i} cx={cx + Math.cos(a) * rx * 0.95} cy={cy - ry * 0.05 + Math.sin(a) * ry * 0.95} r={rx * 0.3} fill={hair} />;
          })}
          <Ellipse cx={cx} cy={cy - ry * 0.62} rx={rx * 0.85} ry={ry * 0.42} fill={hair} />
        </G>
      ) : look.hairStyle === "bun" ? (
        <G>
          <Circle cx={cx} cy={cy - ry * 1.12} r={rx * 0.42} fill={hair} />
          <Path d={cap} fill={hair} />
        </G>
      ) : (
        <Path d={cap} fill={hair} opacity={look.hairStyle === "buzz" ? 0.55 : 1} />
      )}
    </Svg>
  );
}
