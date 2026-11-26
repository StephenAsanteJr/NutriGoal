"use client";

import { useActionState, useState } from "react";
import { signupClinician, signupManager, type FormState } from "@/actions/auth";
import { GOAL_TYPES } from "@/lib/domain";
import { Alert, Field } from "@/components/ui";

function Common({ fe }: { fe: Record<string, string> }) {
  return (
    <>
      <Field label="Full name" name="name" error={fe.name}>
        <input id="name" name="name" autoComplete="name" className="input" aria-invalid={!!fe.name} required />
      </Field>
      <Field label="Work email" name="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="email" className="input" aria-invalid={!!fe.email} required />
      </Field>
      <Field label="Password" name="password" error={fe.password} hint="At least 10 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" aria-invalid={!!fe.password} required />
      </Field>
    </>
  );
}

function Consent({ fe, text }: { fe: Record<string, string>; text: string }) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-slate">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-bcg-deep" />
        <span>{text}</span>
      </label>
      {fe.consent && <p className="field-error">{fe.consent}</p>}
    </div>
  );
}

type NpiHit = { npi: string; name: string; credential: string | null; city: string | null; state: string | null; profession: string | null; licenses: { desc: string; license: string | null; state: string | null; primary: boolean }[] };

/** Pull the applicant's record from the NPI Registry and pre-fill profession, license number and state. */
function NpiLookup({ onPick }: { onPick: (hit: NpiHit) => void }) {
  const [npi, setNpi] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [st, setSt] = useState("");
  const [hits, setHits] = useState<NpiHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (qs: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/licensing/npi?${qs}`);
      const d = (await r.json()) as { results?: NpiHit[]; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Lookup failed.");
      setHits(d.results ?? []);
      if (d.results?.length === 1) onPick(d.results[0]);
      if (!d.results?.length) setMsg("No matching provider in the NPI Registry. Check the number, or enter your license details below.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-[3px] border border-blue/30 bg-blue-tint/40 p-4">
      <div className="text-sm font-bold">Start with your NPI</div>
      <p className="text-xs text-slate">We pull your record from the national NPI Registry (CMS) to fill in your license. Managers confirm it with your state board.</p>
      <div className="mt-3 flex gap-2">
        <input value={npi} onChange={(e) => setNpi(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit NPI" className="input !py-2" aria-label="NPI to look up" />
        <button type="button" className="btn-dark !px-4 !py-2 text-xs" disabled={busy || npi.length !== 10} onClick={() => run(`number=${npi}`)}>{busy ? "Looking…" : "Look up"}</button>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-bain">Don&apos;t know your NPI? Search by name</summary>
        <div className="mt-2 grid grid-cols-[1fr_1fr_70px_auto] gap-2">
          <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" className="input !py-2 text-sm" aria-label="First name" />
          <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" className="input !py-2 text-sm" aria-label="Last name" />
          <input value={st} onChange={(e) => setSt(e.target.value.toUpperCase().slice(0, 2))} placeholder="ST" className="input !py-2 text-sm uppercase" aria-label="State" />
          <button type="button" className="btn-outline !px-3 !py-2 text-xs" disabled={busy || last.length < 2} onClick={() => run(new URLSearchParams({ first, last, ...(st ? { state: st } : {}) }).toString())}>Search</button>
        </div>
      </details>
      {msg && <p className="mt-2 text-xs font-bold text-alert">{msg}</p>}
      {hits && hits.length > 1 && (
        <ul className="mt-3 divide-y divide-line rounded-[2px] border border-line bg-white text-xs">
          {hits.map((h) => (
            <li key={h.npi}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-mist" onClick={() => onPick(h)}>
                <span className="font-bold text-navy">{h.name}{h.credential ? `, ${h.credential}` : ""}</span> · NPI {h.npi} · {h.city}, {h.state}
                <span className="block text-muted">{h.licenses.map((l) => `${l.desc}${l.license ? ` (${l.state} ${l.license})` : ""}`).join("; ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ClinicianSignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signupClinician, undefined);
  const fe = state?.fieldErrors ?? {};
  const [profession, setProfession] = useState("");
  const [license, setLicense] = useState("");
  const [licState, setLicState] = useState("");
  const [npi, setNpi] = useState("");
  const [found, setFound] = useState<NpiHit | null>(null);
  const pick = (h: NpiHit) => {
    setFound(h);
    setNpi(h.npi);
    if (h.profession) setProfession(h.profession);
    const lic = h.licenses.find((l) => l.primary && l.license) ?? h.licenses.find((l) => l.license);
    if (lic?.license) setLicense(lic.license);
    if (lic?.state) setLicState(lic.state);
    const nameEl = document.getElementById("name") as HTMLInputElement | null;
    if (nameEl && !nameEl.value) nameEl.value = h.name;
  };
  return (
    <form action={action} className="mt-6 space-y-5" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      <NpiLookup onPick={pick} />
      {found && (
        <p className="rounded-[3px] bg-bcg-tint px-4 py-2.5 text-xs text-bcg-deep">
          Found in the NPI Registry: <strong>{found.name}{found.credential ? `, ${found.credential}` : ""}</strong> · NPI {found.npi}. We filled in your license below; check it before you apply.
        </p>
      )}
      <Common fe={fe} />
      <Field label="Profession" name="clinician_type" error={fe.clinician_type}>
        <select id="clinician_type" name="clinician_type" className="input" value={profession} onChange={(e) => setProfession(e.target.value)}>
          <option value="" disabled>Choose…</option>
          <option value="MD">Physician (MD)</option>
          <option value="DO">Physician (DO)</option>
          <option value="RD">Registered dietitian (RD/RDN)</option>
          <option value="CNS">Certified Nutrition Specialist (CNS)</option>
          <option value="NUT">Licensed nutritionist</option>
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_90px]">
        <Field label="License or registration number" name="license_number" error={fe.license_number}>
          <input id="license_number" name="license_number" className="input" value={license} onChange={(e) => setLicense(e.target.value)} aria-invalid={!!fe.license_number} />
        </Field>
        <Field label="State" name="license_state" error={fe.license_state}>
          <input id="license_state" name="license_state" maxLength={2} placeholder="NY" className="input uppercase" value={licState} onChange={(e) => setLicState(e.target.value.toUpperCase())} aria-invalid={!!fe.license_state} />
        </Field>
      </div>
      <Field label={profession === "CNS" || profession === "NUT" ? "NPI (if you have one)" : "NPI"} name="npi" error={fe.npi} hint="Required for physicians and registered dietitians.">
        <input id="npi" name="npi" inputMode="numeric" maxLength={10} className="input" value={npi} onChange={(e) => setNpi(e.target.value.replace(/\D/g, ""))} aria-invalid={!!fe.npi} />
      </Field>
      <fieldset>
        <legend className="label">Goals you&apos;d like to take</legend>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {GOAL_TYPES.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm text-slate">
              <input type="checkbox" name="specialties" value={g.id} className="accent-bcg-deep" /> {g.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Consent
        fe={fe}
        text="I hold an active license or credential in good standing, and I'll write and sign my own recommendations using methods I've proven in practice. NutriGoal may verify my license."
      />
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Submitting…" : "Apply to join as a clinician"}
      </button>
    </form>
  );
}

export function ManagerSignupForm({ owner = false }: { owner?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signupManager, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-6 space-y-5" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      <Common fe={fe} />
      <Field label="Organization" name="organization" error={fe.organization}>
        <input id="organization" name="organization" autoComplete="organization" className="input" aria-invalid={!!fe.organization} />
      </Field>
      <Field label="Job title" name="title" error={fe.title}>
        <input id="title" name="title" autoComplete="organization-title" placeholder="e.g. Clinical Operations Manager" className="input" aria-invalid={!!fe.title} />
      </Field>
      <Consent
        fe={fe}
        text={owner ? "I'll access member information only to run care operations." : "I'll access member information only to run care operations, and I understand an existing manager must approve my account."}
      />
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Submitting…" : owner ? "Create the owner account" : "Apply to join as a care manager"}
      </button>
    </form>
  );
}
