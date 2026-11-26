import "server-only";
// Clinician license verification. When a physician, dietitian or nutritionist applies, we pull their
// record from the federal NPPES NPI Registry (CMS's public directory of every U.S. health care
// provider) and check it against what they entered: active individual NPI, name, profession
// (taxonomy) and the state license number and state the record lists. Managers then confirm the
// state license with the issuing board (links provided) before approving.

import { db, nowIso } from "./db";

export type Profession = "MD" | "DO" | "RD" | "CNS" | "NUT";
export type LicenseInput = { profession: Profession; name: string; license: string; state: string; npi?: string | null };
export type CheckStatus = "pass" | "fail" | "warn" | "info";
export type Check = { label: string; status: CheckStatus; detail: string };
export type NpiTaxonomy = { code: string; desc: string; license: string | null; state: string | null; primary: boolean };
export type NpiRecord = { npi: string; individual: boolean; active: boolean; firstName: string; lastName: string; credential: string | null; taxonomies: NpiTaxonomy[]; city: string | null; state: string | null };
export type Verification = {
  status: "verified" | "needs_review" | "mismatch" | "not_found" | "unavailable";
  checkedAt: string;
  source: string;
  npi: string | null;
  record: NpiRecord | null;
  checks: Check[];
  links: { label: string; url: string }[];
  manual?: { by: string; at: string; note: string }[];
};

const NPPES = "https://npiregistry.cms.hhs.gov/api/?version=2.1";
const STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico",
};
export const isState = (s: string) => s in STATES;

/** NPI check digit (Luhn over "80840" + the first 9 digits). Catches typos before we call the registry. */
export function validNpi(npi: string) {
  if (!/^\d{10}$/.test(npi)) return false;
  const digits = `80840${npi.slice(0, 9)}`.split("").map(Number);
  let sum = 0;
  for (let i = digits.length - 1, dbl = true; i >= 0; i--, dbl = !dbl) {
    let d = digits[i];
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10 === Number(npi[9]);
}

type RawResult = {
  number: string; enumeration_type: string;
  basic: { first_name?: string; last_name?: string; credential?: string; status?: string };
  taxonomies?: { code: string; desc: string; license?: string; state?: string; primary?: boolean }[];
  addresses?: { address_purpose?: string; city?: string; state?: string }[];
};

function normalize(r: RawResult): NpiRecord {
  const loc = r.addresses?.find((a) => a.address_purpose === "LOCATION") ?? r.addresses?.[0];
  return {
    npi: r.number,
    individual: r.enumeration_type === "NPI-1",
    active: (r.basic.status ?? "A") === "A",
    firstName: r.basic.first_name ?? "",
    lastName: r.basic.last_name ?? "",
    credential: r.basic.credential ?? null,
    taxonomies: (r.taxonomies ?? []).map((t) => ({ code: t.code, desc: t.desc, license: t.license || null, state: t.state || null, primary: !!t.primary })),
    city: loc?.city ?? null,
    state: loc?.state ?? null,
  };
}

async function nppes(query: string): Promise<RawResult[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${NPPES}&${query}`, { signal: ctl.signal, cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`NPI Registry responded ${res.status}`);
    const data = (await res.json()) as { results?: RawResult[]; Errors?: { description: string }[] };
    if (data.Errors?.length) throw new Error(data.Errors[0].description);
    return data.results ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupNpi(npi: string) {
  const [r] = await nppes(`number=${encodeURIComponent(npi)}`);
  return r ? normalize(r) : null;
}

/** Individuals by name (and optional state), for "find my NPI" on the application form. */
export async function searchNpi(first: string, last: string, state?: string) {
  const q = new URLSearchParams({ enumeration_type: "NPI-1", first_name: first, last_name: last, limit: "10" });
  if (state) q.set("state", state);
  return (await nppes(q.toString())).map(normalize);
}

/** Which NPI taxonomies fit each profession (NUCC codes): 207/208 = allopathic & osteopathic physicians, 133V = registered dietitian, 133N = nutritionist. */
const fits = (p: Profession, code: string) => (p === "MD" || p === "DO" ? /^20[78]/.test(code) : p === "RD" ? code.startsWith("133V") : code.startsWith("133N") || code.startsWith("133V"));
export function guessProfession(rec: NpiRecord): Profession | null {
  const codes = rec.taxonomies.map((t) => t.code);
  const cred = (rec.credential ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  if (codes.some((c) => /^20[78]/.test(c))) return cred.includes("DO") && !cred.includes("MD") ? "DO" : "MD";
  if (codes.some((c) => c.startsWith("133V"))) return "RD";
  if (codes.some((c) => c.startsWith("133N"))) return cred.includes("CNS") ? "CNS" : "NUT";
  return null;
}

const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^0+/, "");
const nameParts = (full: string) => full.replace(/^dr\.?\s+/i, "").replace(/,.*$/, "").trim().toUpperCase().replace(/[^A-Z\s-]/g, "").split(/\s+/).filter(Boolean);

export function verificationLinks(input: LicenseInput, npi: string | null) {
  const stateName = STATES[input.state] ?? input.state;
  const board = input.profession === "MD" || input.profession === "DO" ? "medical board" : "dietitian nutritionist licensing board";
  const links = [
    ...(npi ? [{ label: "NPI Registry record (CMS)", url: `https://npiregistry.cms.hhs.gov/provider-view/${npi}` }] : []),
    ...(input.profession === "MD" || input.profession === "DO" ? [{ label: "DocInfo license & discipline history (FSMB)", url: "https://www.docinfo.org/" }] : []),
    ...(input.profession === "RD" ? [{ label: "CDR registered dietitian verification", url: "https://secure.eatright.org/v14pgmlib/prd/cdrvfy001?spage=ICRED" }] : []),
    ...(input.profession === "CNS" ? [{ label: "CNS status: email certifications@nutritionspecialists.org", url: "mailto:certifications@nutritionspecialists.org" }] : []),
    { label: `${stateName} ${board} license lookup`, url: `https://www.google.com/search?q=${encodeURIComponent(`${stateName} ${board} license verification lookup`)}` },
  ];
  return links;
}

export function evaluate(input: LicenseInput, rec: NpiRecord | null, npi: string | null): Omit<Verification, "checkedAt" | "source" | "links"> {
  const checks: Check[] = [];
  if (!npi) {
    checks.push({ label: "NPI", status: "warn", detail: "No NPI provided. Confirm the state license directly with the board." });
    return { status: "needs_review", npi: null, record: null, checks };
  }
  if (!validNpi(npi)) {
    checks.push({ label: "NPI", status: "fail", detail: "That isn't a valid NPI (check digit doesn't match)." });
    return { status: "mismatch", npi, record: null, checks };
  }
  if (!rec) {
    checks.push({ label: "NPI Registry", status: "fail", detail: `No provider found for NPI ${npi}.` });
    return { status: "not_found", npi, record: null, checks };
  }
  checks.push({ label: "Individual provider", status: rec.individual ? "pass" : "fail", detail: rec.individual ? "NPI belongs to an individual (type 1)." : "This NPI belongs to an organization, not a person." });
  checks.push({ label: "NPI active", status: rec.active ? "pass" : "fail", detail: rec.active ? "Active in the NPI Registry." : "NPI is deactivated." });

  const entered = nameParts(input.name);
  const last = rec.lastName.toUpperCase().replace(/[^A-Z\s-]/g, "");
  const lastOk = entered.some((p) => p === last || last.split(/[\s-]/).includes(p));
  const firstOk = entered[0]?.[0] === rec.firstName.toUpperCase()[0];
  checks.push({
    label: "Name",
    status: lastOk && firstOk ? "pass" : lastOk ? "warn" : "fail",
    detail: `Registry name: ${rec.firstName} ${rec.lastName}${rec.credential ? `, ${rec.credential}` : ""}.`,
  });

  const fitting = rec.taxonomies.filter((t) => fits(input.profession, t.code));
  checks.push({
    label: "Profession",
    status: fitting.length ? "pass" : "fail",
    detail: fitting.length ? `Registry lists: ${fitting.map((t) => t.desc).join("; ")}.` : `Registry taxonomies (${rec.taxonomies.map((t) => t.desc).join("; ") || "none"}) don't match ${input.profession}.`,
  });

  const want = clean(input.license);
  const exact = rec.taxonomies.find((t) => t.license && clean(t.license) === want && t.state === input.state);
  const otherState = rec.taxonomies.find((t) => t.license && clean(t.license) === want && t.state !== input.state);
  const listed = rec.taxonomies.filter((t) => t.license).map((t) => `${t.state} ${t.license}`);
  checks.push({
    label: "State license",
    status: exact ? "pass" : otherState ? "warn" : "fail",
    detail: exact
      ? `License ${exact.license} (${exact.state}) is on the NPI record. Confirm it's current with the ${input.state} board.`
      : otherState
        ? `License matches, but the record lists it in ${otherState.state}, not ${input.state}.`
        : `The NPI record lists ${listed.length ? listed.join(", ") : "no license numbers"}, not ${input.state} ${input.license}.`,
  });

  const failed = checks.some((c) => c.status === "fail");
  const warned = checks.some((c) => c.status === "warn");
  return { status: failed ? "mismatch" : warned ? "needs_review" : "verified", npi, record: rec, checks };
}

/** Run the registry check. Never throws: if the registry is down, the result says so and a manager reviews by hand. */
export async function verifyLicense(input: LicenseInput): Promise<Verification> {
  const npi = input.npi?.trim() || null;
  const base = { checkedAt: nowIso(), source: "NPPES NPI Registry (CMS)", links: verificationLinks(input, npi) };
  if (npi && validNpi(npi)) {
    try {
      const rec = await lookupNpi(npi);
      return { ...base, ...evaluate(input, rec, npi) };
    } catch (e) {
      return { ...base, status: "unavailable", npi, record: null, checks: [{ label: "NPI Registry", status: "warn", detail: `Couldn't reach the registry (${e instanceof Error ? e.message : "error"}). Re-run the check or verify by hand.` }] };
    }
  }
  return { ...base, ...evaluate(input, null, npi) };
}

export function saveVerification(userId: string, v: Verification) {
  db().prepare("UPDATE users SET license_verification = ?, license_verified_at = ? WHERE id = ?").run(JSON.stringify(v), v.status === "verified" ? v.checkedAt : null, userId);
}

export function readVerification(raw: string | null): Verification | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Verification;
  } catch {
    return null;
  }
}
