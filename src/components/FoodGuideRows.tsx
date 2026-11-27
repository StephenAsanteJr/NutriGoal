"use client";

import { useState } from "react";
import { FOOD_GROUPS, examplesFor, type FoodGroupId } from "@/lib/foods";
import { cuisineById, cuisineExamples } from "@/lib/cuisines";
import { CuisineSelect } from "./CuisineSelect";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Servings per food group, with swappable ingredients from the chosen culture's cuisine. */
export function FoodGuideRows({ servings, preferred = [] }: { servings: Record<FoodGroupId, number>; preferred?: string[] }) {
  const [cuisine, setCuisine] = useState(preferred.find((p) => cuisineById(p)) ?? "everyday");
  const c = cuisine === "everyday" ? null : cuisineById(cuisine);
  return (
    <>
      <div className="border-b border-line bg-mist/60 px-6 py-3">
        <CuisineSelect value={cuisine} onChange={setCuisine} quick={preferred} id="guide-cuisine" />
        {c?.note && <p className="mt-1.5 text-xs text-muted">{c.label}: {c.note}.</p>}
      </div>
      <ul className="divide-y divide-line">
        {FOOD_GROUPS.map((g) => {
          const examples = c ? cuisineExamples(c.id, g.id) : examplesFor(g);
          const n = servings[g.id];
          return (
            <li key={g.id} className="grid gap-3 px-6 py-4 md:grid-cols-[220px_1fr]">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-bcg-deep">{n}</span>
                  <span className="text-sm font-bold">serving{n === 1 ? "" : "s"} · {g.label}</span>
                </div>
                <div className="text-xs text-muted">{g.hint}. One serving ≈ {g.typical.serving}.</div>
              </div>
              <div className="flex flex-wrap content-start gap-2">
                {examples.length === 0 && <span className="text-xs text-muted">No ingredients from this cuisine match closely enough; use the Everyday list.</span>}
                {examples.map((e) => (
                  <span key={e.name} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs" title={`${e.kcal} kcal · ${fmt(e.protein)} g protein · ${fmt(e.carbs)} g carbs · ${fmt(e.fat)} g fat`}>
                    <span className="font-bold text-ink">{e.name}</span>
                    <span className="text-muted">{e.serving}</span>
                    <span className="rounded-full bg-bcg-tint px-1.5 py-0.5 text-[10px] font-bold text-bcg-deep">{Math.round(e.match * 100)}%</span>
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
