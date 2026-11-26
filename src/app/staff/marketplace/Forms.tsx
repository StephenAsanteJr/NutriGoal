"use client";

import { useActionState } from "react";
import { addPartner, addTrainer, type AdminState } from "@/actions/marketplace-admin";
import { GOAL_TYPES, PARTNER_CATEGORIES } from "@/lib/domain";
import { Alert } from "@/components/ui";

function Goals() {
  return (
    <fieldset>
      <legend className="label">Goals they help with</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {GOAL_TYPES.map((g) => (
          <label key={g.id} className="flex items-center gap-1.5 text-xs text-slate">
            <input type="checkbox" name="goal_types" value={g.id} className="accent-bcg-deep" /> {g.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PartnerForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(addPartner, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="good">{state.ok}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Name</span><input name="name" className="input" required /></label>
        <label className="block">
          <span className="label">Category</span>
          <select name="category" className="input" required>
            {PARTNER_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.singular}</option>)}
          </select>
        </label>
        <label className="block sm:col-span-2"><span className="label">What you verified, and how</span><input name="verification" className="input" placeholder="State pharmacy license #12345, checked on the state board site" required /></label>
        <label className="block"><span className="label">Tagline</span><input name="tagline" className="input" placeholder="One line members see first" /></label>
        <label className="block"><span className="label">Website</span><input name="website" className="input" placeholder="https://" /></label>
        <label className="block"><span className="label">Where they serve</span><input name="location" className="input" placeholder="Online · Nationwide · Chicago, IL" /></label>
        <label className="block"><span className="label">Member offer (optional)</span><input name="offer" className="input" placeholder="10% off first order" /></label>
        <label className="block sm:col-span-2"><span className="label">Description</span><textarea name="description" rows={2} className="input" /></label>
        <label className="block sm:col-span-2"><span className="label">Tags (comma-separated)</span><input name="tags" className="input" placeholder="Delivery, High-protein" /></label>
      </div>
      <Goals />
      <button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add verified partner"}</button>
    </form>
  );
}

export function TrainerForm({ metros }: { metros: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(addTrainer, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="good">{state.ok}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Name</span><input name="name" className="input" required /></label>
        <label className="block"><span className="label">Certification verified</span><input name="certification" className="input" placeholder="NSCA-CSCS #123456" required /></label>
        <label className="block"><span className="label">Specialty</span><input name="specialty" className="input" placeholder="Strength training for GLP-1 users" /></label>
        <label className="block"><span className="label">Studio or gym</span><input name="studio" className="input" placeholder="Independent" /></label>
        <label className="block">
          <span className="label">Metro area</span>
          <select name="metro" className="input" required>
            {metros.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="block"><span className="label">Price per session ($)</span><input name="price" type="number" min="0" step="1" className="input" placeholder="75" /></label>
        <label className="block">
          <span className="label">Sessions</span>
          <select name="modes" className="input"><option>In person</option><option>Virtual</option><option>In person + virtual</option></select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="label">Latitude (optional)</span><input name="lat" inputMode="decimal" className="input" placeholder="41.88" /></label>
          <label className="block"><span className="label">Longitude</span><input name="lng" inputMode="decimal" className="input" placeholder="-87.63" /></label>
        </div>
      </div>
      <p className="hint">Without coordinates, the trainer is placed at the metro&apos;s center for &quot;trainers near you&quot; distances.</p>
      <Goals />
      <button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add verified trainer"}</button>
    </form>
  );
}
