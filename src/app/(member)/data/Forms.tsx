"use client";

import { useActionState, useState } from "react";
import { addSharedLink, createApiToken, createReport, importHealthRecord, importNutritionExport, type ImportState } from "@/actions/integrations";
import { TRACKING_APPS } from "@/lib/domain";
import { Alert } from "@/components/ui";

function Result({ state }: { state: ImportState }) {
  if (!state) return null;
  return <div className="mt-3">{state.error ? <Alert>{state.error}</Alert> : state.ok ? <Alert tone="good">{state.ok}</Alert> : null}</div>;
}

export function NutritionUpload({ defaultApp }: { defaultApp?: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importNutritionExport, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-xs font-bold">
        App
        <select name="app" defaultValue={defaultApp ?? "cronometer"} className="input mt-1 !py-2">
          {TRACKING_APPS.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold">
        Export file (.csv)
        <input type="file" name="file" accept=".csv,text/csv" className="mt-1 block text-sm" required />
      </label>
      <button className="btn-dark !py-2" disabled={pending}>{pending ? "Importing…" : "Import"}</button>
      <div className="w-full">
        <Result state={state} />
      </div>
    </form>
  );
}

export function RecordUpload() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importHealthRecord, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-xs font-bold">
        FHIR JSON or C-CDA XML export
        <input type="file" name="file" accept=".json,.xml,application/json,text/xml,application/xml" className="mt-1 block text-sm" required />
      </label>
      <button className="btn-dark !py-2" disabled={pending}>{pending ? "Reading…" : "Import results"}</button>
      <div className="w-full">
        <Result state={state} />
      </div>
    </form>
  );
}

export function ShareCodeForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(addSharedLink, undefined);
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr_1fr_auto] sm:items-end">
      <label className="text-xs font-bold">
        Type
        <select name="kind" className="input mt-1 !py-2">
          <option value="mychart">MyChart share code</option>
          <option value="provider">Provider portal link</option>
          <option value="app">Tracking app share link</option>
        </select>
      </label>
      <label className="text-xs font-bold">
        Link or code
        <input name="url" className="input mt-1 !py-2" placeholder="https://… or share code" required />
      </label>
      <label className="text-xs font-bold">
        Note (optional)
        <input name="note" className="input mt-1 !py-2" maxLength={200} placeholder="e.g. Labs from Oct physical" />
      </label>
      <button className="btn-dark !py-2" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      <div className="sm:col-span-4">
        <Result state={state} />
      </div>
    </form>
  );
}

export function TokenForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(createApiToken, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold">
          Token name
          <input name="name" className="input mt-1 !py-2" placeholder="e.g. Apple Shortcut, Zapier" maxLength={60} />
        </label>
        <button className="btn-dark !py-2" disabled={pending}>{pending ? "Creating…" : "Create token"}</button>
      </div>
      {state?.token && (
        <div className="rounded-[2px] border border-good/40 bg-good-tint p-3 text-sm">
          <div className="font-bold text-good">{state.ok}</div>
          <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-xs">{state.token}</code>
        </div>
      )}
    </form>
  );
}

export function ReportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(createReport, undefined);
  const [copied, setCopied] = useState(false);
  const full = state?.link && typeof window !== "undefined" ? `${window.location.origin}${state.link}` : state?.link;
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">
          Name
          <input name="label" className="input mt-1 !py-2" placeholder="e.g. For Dr. Patel" maxLength={80} />
        </label>
        <label className="text-xs font-bold">
          Period
          <select name="days" defaultValue="30" className="input mt-1 !py-2">
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          Link expires
          <select name="expires" defaultValue="7" className="input mt-1 !py-2">
            <option value="7">In 7 days</option>
            <option value="30">In 30 days</option>
          </select>
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="mb-1 text-xs font-bold">Include</legend>
        {[
          ["nutrition", "Nutrition trends"],
          ["labs", "Lab results"],
          ["weight", "Weight trend"],
          ["build", "Biometric summary"],
        ].map(([k, l]) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" name={k} defaultChecked className="accent-blue" /> {l}
          </label>
        ))}
      </fieldset>
      <button className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Create shareable link"}</button>
      {state?.error && <Alert>{state.error}</Alert>}
      {full && (
        <div className="flex flex-wrap items-center gap-2 rounded-[2px] border border-good/40 bg-good-tint p-3 text-sm">
          <code className="flex-1 break-all font-mono text-xs">{full}</code>
          <button
            type="button"
            className="btn-dark !py-1.5 text-xs"
            onClick={() => {
              navigator.clipboard?.writeText(full!);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </form>
  );
}
