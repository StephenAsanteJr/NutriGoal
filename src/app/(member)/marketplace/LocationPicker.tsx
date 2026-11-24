"use client";

import { useActionState, useState, useTransition } from "react";
import { setLocationByCoords, setLocationByZip, type LocationState } from "@/actions/marketplace";

/** ZIP code or browser geolocation → approximate location for the trainer search. */
export function LocationPicker({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<LocationState, FormData>(setLocationByZip, undefined);
  const [geoPending, start] = useTransition();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [open, setOpen] = useState(!compact);

  function useMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) return setGeoError("Your browser can't share location. Enter a ZIP code instead.");
    navigator.geolocation.getCurrentPosition(
      (pos) => start(() => setLocationByCoords(pos.coords.latitude, pos.coords.longitude)),
      () => setGeoError("Location access was blocked. Enter a ZIP code instead."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  if (!open)
    return (
      <button type="button" className="link text-xs" onClick={() => setOpen(true)}>
        Change location
      </button>
    );

  return (
    <div className="flex flex-wrap items-start gap-3">
      <form action={action} className="flex items-start gap-2">
        <div>
          <input name="zip" inputMode="numeric" maxLength={5} placeholder="ZIP code" aria-label="ZIP code" className="input !w-32 !py-2" />
          {state?.error && <p className="field-error max-w-xs">{state.error}</p>}
        </div>
        <button className="btn-dark !py-2" disabled={pending}>{pending ? "…" : "Search"}</button>
      </form>
      <span className="self-center text-xs text-muted">or</span>
      <div>
        <button type="button" className="btn-outline !py-2" onClick={useMyLocation} disabled={geoPending}>
          {geoPending ? "Locating…" : "📍 Use my location"}
        </button>
        {geoError && <p className="field-error max-w-xs">{geoError}</p>}
      </div>
    </div>
  );
}
