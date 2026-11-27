import { useMemo } from "react";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import { silhouette, VIEW, type Sex } from "@/lib/silhouette";

export type Look = { skin: string; skinShade: string; hairStyle: string; hairColor: string; facialHair?: string };

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
  const male = sex === "male";
  const facial = male ? look.facialHair ?? "none" : "none";
  const beard = `M${cx - rx * 0.98},${cy} C${cx - rx * 0.95},${cy + ry * 0.85} ${cx - rx * 0.45},${cy + ry * 1.1} ${cx},${cy + ry * 1.1} C${cx + rx * 0.45},${cy + ry * 1.1} ${cx + rx * 0.95},${cy + ry * 0.85} ${cx + rx * 0.98},${cy} C${cx + rx * 0.78},${cy + ry * 0.36} ${cx + rx * 0.5},${cy + ry * 0.3} ${cx},${cy + ry * 0.33} C${cx - rx * 0.5},${cy + ry * 0.3} ${cx - rx * 0.78},${cy + ry * 0.36} ${cx - rx * 0.98},${cy} Z`;
  const maleShort = `M${cx - rx * 1.02},${cy - ry * 0.05} C${cx - rx * 1.08},${cy - ry * 1.2} ${cx + rx * 1.08},${cy - ry * 1.2} ${cx + rx * 1.02},${cy - ry * 0.05} L${cx + rx * 0.92},${cy - ry * 0.38} L${cx - rx * 0.92},${cy - ry * 0.38} Z`;
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
          <Path d={g.body} fill="none" stroke="#21bf61" strokeWidth={2} strokeDasharray="1.5 4" strokeLinecap="round" />
        </G>
      )}
      {look.hairStyle === "long" && (
        <Path d={`M${cx - rx * 1.08},${cy - ry * 0.2} C${cx - rx * 1.35},${cy + ry * 1.2} ${cx - rx * 1.2},${cy + ry * 2.1} ${cx - rx * 0.7},${cy + ry * 2.2} L${cx + rx * 0.7},${cy + ry * 2.2} C${cx + rx * 1.2},${cy + ry * 2.1} ${cx + rx * 1.35},${cy + ry * 1.2} ${cx + rx * 1.08},${cy - ry * 0.2} Z`} fill={hair} />
      )}
      <Path d={s.body} fill="url(#skin)" stroke={look.skinShade} strokeWidth={0.8} />
      <G clipPath="url(#body)">
        <Path d={s.top} fill="#197a56" />
        <Path d={s.shorts} fill="#0c2b15" />
      </G>
      {s.feet.map((f, i) => (
        <Ellipse key={i} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill="#ffffff" stroke="#0c2b15" strokeWidth={0.9} />
      ))}
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={look.skin} stroke={look.skinShade} strokeWidth={0.8} />
      {[-1, 1].map((d) => (
        <G key={d}>
          <Ellipse cx={cx + d * rx * 0.38} cy={cy + ry * 0.06} rx={rx * 0.11} ry={ry * 0.13} fill="#1b1410" />
          <Circle cx={cx + d * rx * 0.38 + rx * 0.035} cy={cy + ry * 0.02} r={rx * 0.035} fill="#fff" />
        </G>
      ))}
      {/* Women: arched brows, lashes, lip colour, blush. Men: heavier brows, neutral mouth, optional facial hair. */}
      {[-1, 1].map((d) =>
        male ? (
          <Path key={`b${d}`} d={`M${cx + d * rx * 0.2},${cy - ry * 0.22} L${cx + d * rx * 0.58},${cy - ry * 0.25}`} stroke={hair} strokeWidth={rx * 0.13} strokeLinecap="round" />
        ) : (
          <G key={`b${d}`}>
            <Path d={`M${cx + d * rx * 0.22},${cy - ry * 0.2} Q${cx + d * rx * 0.38},${cy - ry * 0.32} ${cx + d * rx * 0.56},${cy - ry * 0.21}`} stroke={hair} strokeWidth={rx * 0.07} strokeLinecap="round" fill="none" />
            <Path d={`M${cx + d * rx * 0.48},${cy - ry * 0.02} l${d * rx * 0.08},${-ry * 0.06}`} stroke="#1b1410" strokeWidth={rx * 0.04} strokeLinecap="round" />
          </G>
        ),
      )}
      {(facial === "beard" || facial === "stubble") && <Path d={beard} fill={hair} opacity={facial === "stubble" ? 0.22 : 0.95} />}
      {facial === "beard" && <Ellipse cx={cx} cy={cy + ry * 0.52} rx={rx * 0.34} ry={ry * 0.13} fill={look.skin} />}
      {(facial === "mustache" || facial === "beard") && (
        <Path d={`M${cx - rx * 0.3},${cy + ry * 0.37} Q${cx},${cy + ry * 0.25} ${cx + rx * 0.3},${cy + ry * 0.37}`} stroke={hair} strokeWidth={rx * 0.11} strokeLinecap="round" fill="none" />
      )}
      <Path d={`M${cx - rx * 0.26},${cy + ry * 0.44} Q${cx},${cy + ry * (male ? 0.58 : 0.62)} ${cx + rx * 0.26},${cy + ry * 0.44}`} stroke={male ? "#4a2f25" : "#9c3b48"} strokeWidth={rx * (male ? 0.06 : 0.08)} strokeLinecap="round" fill="none" />
      {!male && (
        <G>
          <Circle cx={cx - rx * 0.55} cy={cy + ry * 0.35} r={rx * 0.13} fill="#e0707a" opacity={0.25} />
          <Circle cx={cx + rx * 0.55} cy={cy + ry * 0.35} r={rx * 0.13} fill="#e0707a" opacity={0.25} />
        </G>
      )}
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
        <Path d={male && look.hairStyle === "short" ? maleShort : cap} fill={hair} opacity={look.hairStyle === "buzz" ? 0.55 : 1} />
      )}
    </Svg>
  );
}
