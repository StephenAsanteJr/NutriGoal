"use client";

import { useActionState, useState } from "react";
import { submitResponse, type ResponseFormState } from "@/actions/staff";
import { TIMEFRAME_PRESETS } from "@/lib/domain";
import { Alert } from "@/components/ui";

type Row = { title: string; detail: string; timeframe: string };
const blank = (): Row => ({ title: "", detail: "", timeframe: "" });

export function ResponseComposer({ ticketId, signer }: { ticketId: number; signer: { name: string; credential: string | null } }) {
  const [state, action, pending] = useActionState<ResponseFormState, FormData>(submitResponse, undefined);
  const [rec, setRec] = useState("");
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 5 }, blank));
  const [ai, setAi] = useState<"none" | "wording">("none");
  const fe = state?.fieldErrors ?? {};
  const update = (i: number, k: keyof Row, val: string) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: val } : row)));
  const complete = rows.filter((r) => r.title && r.detail && r.timeframe).length;

  return (
    <form action={action} className="card overflow-hidden">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <div className="bg-navy px-6 py-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan">Response ticket composer</div>
        <div className="text-sm text-white/80">A concise recommendation at the top, then 5–6 actionable steps with timeframes.</div>
      </div>
      <div className="space-y-5 p-6">
        {state?.error && <Alert>{state.error}</Alert>}
        <div>
          <label htmlFor="recommendation" className="label">Concise recommendation</label>
          <textarea
            id="recommendation"
            name="recommendation"
            rows={3}
            className="input"
            value={rec}
            onChange={(e) => setRec(e.target.value)}
            maxLength={420}
            aria-invalid={!!fe.recommendation}
            placeholder="The one thing this member should do, and why, in two or three sentences."
          />
          <div className="mt-1 flex justify-between text-xs">
            {fe.recommendation ? <span className="field-error !mt-0">{fe.recommendation}</span> : <span className="text-muted">Shown at the top of the member&apos;s response ticket.</span>}
            <span className={rec.length > 380 ? "text-warn" : "text-muted"}>{rec.length}/420</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="label !mb-0">Action steps</span>
            <span className={`text-xs font-bold ${complete >= 5 ? "text-good" : "text-muted"}`}>{complete} of 5–6 complete</span>
          </div>
          {fe.steps && <p className="field-error mb-2">{fe.steps}</p>}
          <ol className="space-y-3">
            {rows.map((r, i) => (
              <li key={i} className={`rounded-[2px] border p-3 ${fe[`step_${i}`] ? "border-alert" : "border-line"}`}>
                <div className="grid grid-cols-[28px_1fr_150px] items-start gap-3">
                  <span className="mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
                  <input name="step_title" className="input !py-2 font-bold" placeholder="Step title" value={r.title} onChange={(e) => update(i, "title", e.target.value)} maxLength={80} aria-label={`Step ${i + 1} title`} />
                  <input
                    name="step_timeframe"
                    className="input !py-2"
                    placeholder="Timeframe"
                    list="timeframes"
                    value={r.timeframe}
                    onChange={(e) => update(i, "timeframe", e.target.value)}
                    maxLength={40}
                    aria-label={`Step ${i + 1} timeframe`}
                  />
                  <span />
                  <textarea
                    name="step_detail"
                    rows={2}
                    className="input col-span-2 !py-2 text-sm"
                    placeholder="What exactly to do, in plain words"
                    value={r.detail}
                    onChange={(e) => update(i, "detail", e.target.value)}
                    maxLength={400}
                    aria-label={`Step ${i + 1} details`}
                  />
                </div>
                {fe[`step_${i}`] && <p className="field-error ml-10">{fe[`step_${i}`]}</p>}
              </li>
            ))}
          </ol>
          <datalist id="timeframes">
            {TIMEFRAME_PRESETS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <div className="mt-3 flex gap-3">
            {rows.length < 6 && (
              <button type="button" className="btn-ghost !px-2 text-xs" onClick={() => setRows((r) => [...r, blank()])}>
                + Add a sixth step
              </button>
            )}
            {rows.length > 5 && (
              <button type="button" className="btn-ghost !px-2 text-xs !text-muted" onClick={() => setRows((r) => r.slice(0, 5))}>
                Remove step 6
              </button>
            )}
          </div>
        </div>

        <fieldset className="rounded-[2px] border border-line p-4">
          <legend className="px-1 text-[13px] font-bold">AI writing help (disclosed to the member)</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="ai_assist" value="none" checked={ai === "none"} onChange={() => setAi("none")} className="accent-blue" />
              Not used
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="ai_assist" value="wording" checked={ai === "wording"} onChange={() => setAi("wording")} className="accent-blue" />
              Used for wording only (approved tool)
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">AI never decides the plan. You read, decide and sign every response.</p>
        </fieldset>

        <div className="rounded-[2px] bg-mist px-4 py-3 text-xs text-slate">
          Signature preview: “Written and reviewed by {signer.name}
          {signer.credential ? `, ${signer.credential}` : ""}. AI writing help: {ai === "wording" ? "used for wording only" : "not used"}.”
        </div>

        <button className="btn-primary w-full !py-3" disabled={pending}>
          {pending ? "Sending…" : "Sign and send response ticket"}
        </button>
      </div>
    </form>
  );
}
