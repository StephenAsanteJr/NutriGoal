import "server-only";
// Epic MyChart via SMART on FHIR (standalone patient launch, PKCE, public client).
// Register an app at https://fhir.epic.com (free sandbox), then set EPIC_CLIENT_ID.
// EPIC_FHIR_BASE defaults to Epic's public sandbox; point it at a health system's
// FHIR R4 endpoint in production.

import crypto from "node:crypto";

export const EPIC_FHIR_BASE = process.env.EPIC_FHIR_BASE ?? "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4";
export const EPIC_SCOPES = "openid fhirUser launch/patient patient/Patient.read patient/Observation.read";

export function epicEnabled() {
  return !!process.env.EPIC_CLIENT_ID;
}

export async function smartEndpoints() {
  try {
    const r = await fetch(`${EPIC_FHIR_BASE}/.well-known/smart-configuration`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = (await r.json()) as { authorization_endpoint?: string; token_endpoint?: string };
      if (d.authorization_endpoint && d.token_endpoint) return { authorize: d.authorization_endpoint, token: d.token_endpoint };
    }
  } catch {}
  const root = EPIC_FHIR_BASE.replace(/\/api\/FHIR\/R4\/?$/, "");
  return { authorize: `${root}/oauth2/authorize`, token: `${root}/oauth2/token` };
}

export function pkce() {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: crypto.randomBytes(16).toString("base64url") };
}

export async function fetchObservations(accessToken: string, patient: string) {
  const out: unknown[] = [];
  for (const category of ["laboratory", "vital-signs"]) {
    let url: string | null = `${EPIC_FHIR_BASE}/Observation?patient=${encodeURIComponent(patient)}&category=${category}&_count=200`;
    for (let page = 0; url && page < 5; page++) {
      const r: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/fhir+json" }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) break;
      const b = (await r.json()) as { link?: { relation: string; url: string }[] };
      out.push(b);
      url = b.link?.find((l) => l.relation === "next")?.url ?? null;
    }
  }
  return out;
}
