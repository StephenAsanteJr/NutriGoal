import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "NutriGoal API" };

const Code = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-[2px] bg-ink p-4 text-xs leading-relaxed text-white"><code>{children}</code></pre>
);

/** Public documentation for the member-scoped integrations API. */
export default function Developers() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Logo />
          <Link href="/data?tab=api" className="link text-sm">Get a token →</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <div>
          <div className="eyebrow">Developers</div>
          <h1 className="font-display mt-2 text-4xl">NutriGoal Integrations API</h1>
          <p className="mt-3 text-slate">
            Members connect their own data: provider results (FHIR R4, e.g. from Epic) and daily totals from food-tracking apps. Every request
            uses a personal token the member creates in <strong>Data → API</strong>, and only reads or writes that member&apos;s account.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Authentication</h2>
          <p className="text-sm text-slate">Send the token as a bearer token. Tokens can be revoked at any time; only a hash is stored.</p>
          <Code>{`Authorization: Bearer ng_live_xxxxxxxxxxxxxxxx`}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">POST /api/v1/nutrition</h2>
          <p className="text-sm text-slate">Daily totals from a tracker (MyFitnessPal, Cronometer, MacroFactor, FatSecret, Lose It! or your own). Re-sending a day for the same source updates it. Up to 731 days per request.</p>
          <Code>{`curl -X POST https://YOUR-NUTRIGOAL-HOST/api/v1/nutrition \\
  -H "Authorization: Bearer $NUTRIGOAL_TOKEN" -H "Content-Type: application/json" \\
  -d '{
    "source": "cronometer",
    "days": [
      { "date": "2026-11-20", "calories": 2180, "protein_g": 132, "carbs_g": 210,
        "fat_g": 78, "fiber_g": 27, "sugar_g": 48, "sodium_mg": 2410 }
    ]
  }'
# → { "saved": 1 }`}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">POST /api/v1/health-records</h2>
          <p className="text-sm text-slate">
            Provider results as a FHIR R4 <code>Bundle</code> or <code>Observation</code> (Epic, Cerner/Oracle Health and other EHRs), or a simple list. Matched by LOINC:
            A1C 4548-4, fasting glucose 1558-6, total cholesterol 2093-3, LDL 13457-7/18262-6, HDL 2085-9, triglycerides 2571-8, vitamin D 1989-3,
            blood pressure 85354-9 (8480-6/8462-4), weight 29463-7, height 8302-2, body fat 41982-0. mmol/L, nmol/L, lb and in are converted.
          </p>
          <Code>{`curl -X POST https://YOUR-NUTRIGOAL-HOST/api/v1/health-records \\
  -H "Authorization: Bearer $NUTRIGOAL_TOKEN" -H "Content-Type: application/json" \\
  -d '{ "observations": [
        { "loinc": "4548-4", "value": 5.8, "unit": "%", "date": "2026-10-14" },
        { "loinc": "13457-7", "value": 146, "unit": "mg/dL", "date": "2026-10-14" } ] }'
# → { "received": 2, "saved": 2 }`}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">GET /api/v1/trends?days=30</h2>
          <p className="text-sm text-slate">Averages, targets, macro split, calculated insights, latest labs and daily rows. <code>days</code>: 7, 14, 30 or 90.</p>
          <Code>{`curl https://YOUR-NUTRIGOAL-HOST/api/v1/trends?days=30 -H "Authorization: Bearer $NUTRIGOAL_TOKEN"`}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">GET /api/v1/me</h2>
          <p className="text-sm text-slate">Returns the member the token belongs to; use it to test a token.</p>
        </section>

        <section className="space-y-2 text-sm text-slate">
          <h2 className="text-xl font-bold text-ink">Other ways members connect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Epic MyChart</strong> (SMART on FHIR, read-only labs and vitals): Data → Connect sources.</li>
            <li><strong>File exports</strong>: tracker CSVs, FHIR JSON, C-CDA XML and PDF checkup reports.</li>
            <li><strong>Share links</strong>: MyChart “Share Everywhere” codes for the care team, and expiring read-only NutriGoal reports members can send out.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
