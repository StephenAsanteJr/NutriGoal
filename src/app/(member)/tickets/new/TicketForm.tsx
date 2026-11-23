"use client";

import { useActionState, useState } from "react";
import { saveTicketDraft, type TicketFormState } from "@/actions/tickets";
import { GOAL_TYPES } from "@/lib/domain";
import { Alert } from "@/components/ui";

type Draft = {
  id: number;
  goal_type: string;
  goal_statement: string;
  typical_diet: string;
  setbacks: string;
  specific_target: string;
  extra_context: string;
};

const EXAMPLES = [
  { goal_type: "protein", text: "Hit 100 g of protein a day while on a GLP-1" },
  { goal_type: "glp1_side_effects", text: "Eat through nausea in my first month on a GLP-1" },
  { goal_type: "keep_weight_off", text: "Keep the weight off as I come off my GLP-1" },
  { goal_type: "blood_sugar", text: "Lower my A1C with meals my family will eat" },
  { goal_type: "fat_loss", text: "Lose 15 lb of fat before summer without losing muscle" },
  { goal_type: "budget_meals", text: "Eat high-protein meals on $60 a week" },
];

export function TicketForm({ draft, onGlp1 }: { draft: Draft | null; onGlp1: boolean }) {
  const [state, action, pending] = useActionState<TicketFormState, FormData>(saveTicketDraft, undefined);
  const [v, setV] = useState({
    goal_type: draft?.goal_type ?? "",
    goal_statement: draft?.goal_statement ?? "",
    typical_diet: draft?.typical_diet ?? "",
    setbacks: draft?.setbacks ?? "",
    specific_target: draft?.specific_target ?? "",
    extra_context: draft?.extra_context ?? "",
  });
  const fe = state?.fieldErrors ?? {};
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const examples = onGlp1 ? EXAMPLES : [...EXAMPLES.slice(4), ...EXAMPLES.slice(0, 4)];

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_320px]" noValidate>
      {draft && <input type="hidden" name="draft_id" value={draft.id} />}
      <div className="space-y-6">
        {state?.error && <Alert>{state.error}</Alert>}

        <section className="card p-6">
          <h2 className="text-lg font-bold">What kind of goal is it?</h2>
          <p className="text-sm text-slate">This helps us route your ticket to the right physician or dietitian.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Goal type">
            {GOAL_TYPES.map((g) => (
              <label
                key={g.id}
                className={`flex cursor-pointer items-center gap-3 rounded-[2px] border px-4 py-3 text-sm font-bold transition ${v.goal_type === g.id ? "border-blue bg-blue-tint text-blue" : "border-line hover:border-navy"}`}
              >
                <input type="radio" name="goal_type" value={g.id} checked={v.goal_type === g.id} onChange={() => setV((s) => ({ ...s, goal_type: g.id }))} className="accent-blue" />
                {g.label}
              </label>
            ))}
          </div>
          {fe.goal_type && <p className="field-error">{fe.goal_type}</p>}
        </section>

        <section className="card space-y-5 p-6">
          <Q n="1" id="goal_statement" label="What is your nutritional goal?" hint="One goal per ticket, in a sentence." error={fe.goal_statement}>
            <input id="goal_statement" name="goal_statement" className="input" value={v.goal_statement} onChange={set("goal_statement")} maxLength={200} aria-invalid={!!fe.goal_statement} placeholder="e.g. Hit my protein target every day while on a GLP-1" />
          </Q>
          <Q n="2" id="typical_diet" label="What do you typically eat?" hint="Walk us through a normal day: meals, snacks, drinks, eating out." error={fe.typical_diet}>
            <textarea id="typical_diet" name="typical_diet" rows={4} className="input" value={v.typical_diet} onChange={set("typical_diet")} maxLength={1200} aria-invalid={!!fe.typical_diet} placeholder="Breakfast… Lunch… Dinner… Snacks…" />
          </Q>
          <Q n="3" id="setbacks" label="What setbacks do you face?" hint="Cravings, schedule, budget, side effects, family meals, travel — anything that gets in the way." error={fe.setbacks}>
            <textarea id="setbacks" name="setbacks" rows={3} className="input" value={v.setbacks} onChange={set("setbacks")} maxLength={1200} aria-invalid={!!fe.setbacks} />
          </Q>
          <Q n="4" id="specific_target" label="What specific target do you want to hit?" hint="Make it measurable: a number, a lab value, a date." error={fe.specific_target}>
            <input id="specific_target" name="specific_target" className="input" value={v.specific_target} onChange={set("specific_target")} maxLength={300} aria-invalid={!!fe.specific_target} placeholder="e.g. 130 g protein a day, 5 days a week, by March 1" />
          </Q>
          <Q n="+" id="extra_context" label="Anything else your clinician should know? (optional)" hint="Medicines, allergies, foods you won't eat, grocery budget.">
            <textarea id="extra_context" name="extra_context" rows={2} className="input" value={v.extra_context} onChange={set("extra_context")} maxLength={800} />
          </Q>
        </section>

        <div className="flex items-center justify-end gap-4">
          <p className="text-xs text-muted">Next you&apos;ll choose a one-time ticket or membership.</p>
          <button className="btn-primary !px-8 !py-3" disabled={pending}>
            {pending ? "Saving…" : "Continue to submit →"}
          </button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5">
          <div className="eyebrow">Goals people send in</div>
          <p className="mt-1 text-xs text-slate">Tap one to start from it.</p>
          <ul className="mt-3 space-y-2">
            {examples.map((e) => (
              <li key={e.text}>
                <button
                  type="button"
                  className="w-full rounded-[2px] border border-line px-3 py-2 text-left text-sm hover:border-blue hover:bg-blue-tint"
                  onClick={() => setV((s) => ({ ...s, goal_type: e.goal_type, goal_statement: e.text }))}
                >
                  “{e.text}”
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card bg-navy p-5 text-white">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan">What you&apos;ll get back</div>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            <li>— A concise recommendation at the top</li>
            <li>— 5–6 actionable steps, each with a timeframe</li>
            <li>— Signed by your physician or dietitian</li>
            <li>— Within 48 hours of submitting</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}

function Q({ n, id, label, hint, error, children }: { n: string; id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <span className="font-display pt-0.5 text-xl text-blue">{n}</span>
      <div>
        <label htmlFor={id} className="label !text-[15px]">
          {label}
        </label>
        {children}
        {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
      </div>
    </div>
  );
}
