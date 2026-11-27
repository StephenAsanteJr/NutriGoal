"use client";

import { useState } from "react";
import { FOOD_GROUPS, examplesFor, type ClinicianFoods, type FoodGroupId } from "@/lib/foods";
import { MicButton } from "./Voice";
import { cuisineById, cuisineExamples, findCuisineFood } from "@/lib/cuisines";
import { CuisineSelect } from "./CuisineSelect";

const MAX = 6;

/**
 * Optional "Suggested foods" picker for clinicians writing a response: tap catalog ingredients
 * (each an 80%+ match for its group) from any culture's cuisine, or type your own. No meals.
 * Starts on the member's own cuisines when they've shared them.
 */
export function FoodPicker({ value, onChange, memberCuisines = [] }: { value: ClinicianFoods; onChange: (v: ClinicianFoods) => void; memberCuisines?: string[] }) {
  const [drafts, setDrafts] = useState<Partial<Record<FoodGroupId, string>>>({});
  const [cuisine, setCuisine] = useState(memberCuisines.find((c) => cuisineById(c)) ?? "everyday");
  const count = Object.values(value).reduce((n, list) => n + (list?.length ?? 0), 0);

  const toggle = (g: FoodGroupId, name: string) => {
    const list = value[g] ?? [];
    const next = list.includes(name) ? list.filter((x) => x !== name) : list.length < MAX ? [...list, name] : list;
    onChange({ ...value, [g]: next });
  };
  const addCustom = (g: FoodGroupId) => {
    const text = (drafts[g] ?? "").trim().slice(0, 60);
    if (!text) return;
    const list = value[g] ?? [];
    if (!list.includes(text) && list.length < MAX) onChange({ ...value, [g]: [...list, text] });
    setDrafts((d) => ({ ...d, [g]: "" }));
  };

  return (
    <fieldset className="rounded-[2px] border border-line p-4">
      <legend className="px-1 text-[13px] font-bold">Suggested foods (optional)</legend>
      <p className="mb-3 text-xs text-slate">
        Pick example foods by group, or add your own. Members see them under your plan, with servings and nutrition facts for the ones from our
        list. Keep it to foods, not meals. {count > 0 && <strong className="text-bcg-deep">{count} selected.</strong>}
      </p>
      <div className="mb-4">
        <CuisineSelect value={cuisine} onChange={setCuisine} quick={memberCuisines} id="picker-cuisine" label={memberCuisines.length ? "Member's cuisines" : "Cuisine"} />
      </div>
      <div className="space-y-4">
        {FOOD_GROUPS.map((g) => {
          const chosen = value[g.id] ?? [];
          const catalog = cuisine === "everyday" ? examplesFor(g) : cuisineExamples(cuisine, g.id);
          const custom = chosen.filter((c) => !catalog.some((x) => x.name === c));
          return (
            <div key={g.id}>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                {g.label} <span className="font-normal normal-case tracking-normal">· {g.hint.toLowerCase()}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catalog.map((f) => {
                  const on = chosen.includes(f.name);
                  return (
                    <button
                      key={f.name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(g.id, f.name)}
                      title={`${f.serving} · ${f.kcal} kcal · ${f.protein} g protein · ${Math.round(f.match * 100)}% match`}
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${on ? "border-bcg-deep bg-bcg-tint text-bcg-deep" : "border-line text-ink hover:border-ink"}`}
                    >
                      {on ? "✓ " : ""}
                      {f.name}
                    </button>
                  );
                })}
                {custom.map((c) => (
                  <button key={c} type="button" onClick={() => toggle(g.id, c)} className="rounded-full border border-bcg-deep bg-bcg-tint px-2.5 py-1 text-xs font-bold text-bcg-deep" aria-label={`Remove ${c}`} title={findCuisineFood(g.id, c)?.cuisine}>
                    ✓ {c} ×
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="input !py-1.5 text-sm"
                  placeholder={`Add your own ${g.label.toLowerCase()} example`}
                  value={drafts[g.id] ?? ""}
                  maxLength={60}
                  onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom(g.id);
                    }
                  }}
                  aria-label={`Add a ${g.label} example`}
                />
                <MicButton label={`a ${g.label.toLowerCase()} example`} onText={(t) => setDrafts((d) => ({ ...d, [g.id]: `${d[g.id] ? `${d[g.id]} ` : ""}${t}`.slice(0, 60) }))} />
                <button type="button" className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => addCustom(g.id)} disabled={chosen.length >= MAX}>
                  Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
