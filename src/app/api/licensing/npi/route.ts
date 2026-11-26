import { guessProfession, isState, lookupNpi, searchNpi, validNpi, type NpiRecord } from "@/lib/licensing";

const shape = (r: NpiRecord) => ({
  npi: r.npi,
  name: [r.firstName, r.lastName].filter(Boolean).map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(" "),
  credential: r.credential,
  city: r.city ? r.city.charAt(0) + r.city.slice(1).toLowerCase() : null,
  state: r.state,
  profession: guessProfession(r),
  licenses: r.taxonomies.map((t) => ({ desc: t.desc, license: t.license, state: t.state, primary: t.primary })),
});

/**
 * Applicant-facing NPI lookup (public NPPES data only): ?number=NPI, or ?first=&last=&state= for a name search.
 * Used to pre-fill the clinician application; the server re-checks everything when they apply.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  try {
    const number = (sp.get("number") ?? "").trim();
    if (number) {
      if (!validNpi(number)) return Response.json({ error: "That isn't a valid NPI. Check the 10 digits." }, { status: 400 });
      const rec = await lookupNpi(number);
      return Response.json({ results: rec && rec.individual ? [shape(rec)] : [] });
    }
    const last = (sp.get("last") ?? "").trim().slice(0, 40);
    const first = (sp.get("first") ?? "").trim().slice(0, 40);
    const state = (sp.get("state") ?? "").trim().toUpperCase();
    if (last.length < 2) return Response.json({ error: "Enter a last name." }, { status: 400 });
    const recs = await searchNpi(first, last, isState(state) ? state : undefined);
    // Only clinicians we could onboard: physicians, dietitians and nutritionists.
    return Response.json({ results: recs.filter((r) => guessProfession(r)).map(shape) });
  } catch {
    return Response.json({ error: "The NPI Registry didn't respond. Try again, or enter your license details by hand." }, { status: 502 });
  }
}
