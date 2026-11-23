// Generates a front-facing body silhouette whose proportions follow height,
// lean mass (FFMI) and body fat. Used for the member "physical build" and the
// dotted goal outline drawn over it. Pure functions, no DOM.

import type { Sex } from "./biometrics";

export const VIEW = { width: 240, height: 440, ground: 428, centerX: 120 };

type Pt = [number, number, boolean?]; // [x, y, isCorner]

export type SilhouetteShape = {
  body: string; // SVG path (open at the neck, drawn behind the head)
  head: { cx: number; cy: number; rx: number; ry: number };
  topY: number;
  heightPx: number;
};

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function silhouette(opts: {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
}): SilhouetteShape {
  const { sex, heightCm, weightKg, bodyFatPct } = opts;
  const H = 400 * Math.min(1.02, Math.max(0.62, heightCm / 210));
  const topY = VIEW.ground - H;
  const hM = heightCm / 100;
  const lean = weightKg * (1 - bodyFatPct / 100);
  const ffmi = lean / (hM * hM);

  const L = clamp01((ffmi - (sex === "male" ? 15 : 12.5)) / 10); // muscle factor
  const F = clamp01((bodyFatPct - (sex === "male" ? 6 : 14)) / 36); // fat factor
  const m = sex === "male";

  // Half widths as a fraction of figure height
  const neck = 0.03 + 0.008 * L + 0.008 * F;
  const shoulder = (m ? 0.112 : 0.098) + (m ? 0.026 : 0.018) * L + 0.03 * F;
  const chest = (m ? 0.092 : 0.086) + (m ? 0.02 : 0.012) * L + 0.034 * F;
  const waist = (m ? 0.068 : 0.06) + 0.012 * L + (m ? 0.078 : 0.06) * F;
  const hip = (m ? 0.084 : 0.094) + 0.012 * L + (m ? 0.05 : 0.062) * F;
  const thighOut = (m ? 0.078 : 0.086) + 0.014 * L + (m ? 0.04 : 0.048) * F;
  const thighIn = Math.max(0.004, 0.012 - 0.008 * F);
  const kneeOut = 0.049 + 0.006 * L + 0.016 * F;
  const kneeIn = 0.016 + 0.003 * F;
  const calfOut = 0.051 + 0.009 * L + 0.013 * F;
  const calfIn = 0.017 + 0.004 * F;
  const ankleOut = 0.03;
  const ankleIn = 0.016;

  const upper = 0.022 + 0.011 * L + 0.014 * F; // upper arm half width
  const fore = 0.017 + 0.006 * L + 0.007 * F;
  const wrist = 0.011 + 0.002 * F;
  const hand = 0.015;

  const torsoAt = (y: number) => {
    const keys: Pt[] = [
      [0.25, chest],
      [0.39, waist],
      [0.48, hip],
    ];
    if (y <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [y0, x0] = keys[i];
      const [y1, x1] = keys[i + 1];
      if (y <= y1) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    }
    return keys[keys.length - 1][1];
  };

  // Arms hang from the shoulder but must clear the torso (a heavier torso pushes them out).
  const elbowC = Math.max(shoulder - upper * 0.7, torsoAt(0.335) + upper * 0.85 + 0.008);
  const wristC = Math.max(elbowC - 0.004, torsoAt(0.47) + fore + 0.012);

  // Right half, clockwise from the neck down to the crotch.
  const right: Pt[] = [
    [neck, 0.128],
    [neck + 0.012, 0.15],
    [shoulder, 0.176],
    [shoulder + 0.006 + 0.004 * L, 0.205],
    [elbowC + upper * 0.95, 0.335],
    [wristC + wrist + 0.002, 0.47],
    [wristC + hand, 0.505],
    [wristC + 0.003, 0.538],
    [wristC - hand, 0.505],
    [wristC - wrist, 0.47],
    [elbowC - upper * 0.85, 0.335],
    [chest - 0.006, 0.245, true], // armpit
    [chest, 0.28],
    [waist, 0.39],
    [hip, 0.48],
    [thighOut, 0.575],
    [kneeOut, 0.725],
    [calfOut, 0.815],
    [ankleOut, 0.955],
    [ankleOut + 0.012, 0.99],
    [ankleOut + 0.006, 0.998, true],
    [ankleIn - 0.004, 0.998, true],
    [ankleIn, 0.955],
    [calfIn, 0.84],
    [kneeIn, 0.73],
    [thighIn, 0.585],
    [0.006, 0.522],
  ];
  const left: Pt[] = [...right].reverse().map(([x, y, c]) => [-x, y, c]);
  const pts: Pt[] = [...right, ...left].map(([x, y, c]) => [
    VIEW.centerX + x * H,
    topY + y * H,
    c,
  ]);

  return {
    body: catmullRom(pts),
    head: {
      cx: VIEW.centerX,
      cy: topY + 0.066 * H,
      rx: (0.05 + 0.006 * F) * H,
      ry: 0.066 * H,
    },
    topY,
    heightPx: H,
  };
}

/** Smooth open path through points (Catmull-Rom converted to cubic Béziers). */
function catmullRom(p: Pt[]): string {
  if (p.length < 2) return "";
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(p[0][0])},${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    // Corner points get zero-length handles so the curve doesn't loop at cusps.
    const c1: Pt = p1[2]
      ? [p1[0], p1[1]]
      : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = p2[2]
      ? [p2[0], p2[1]]
      : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}
