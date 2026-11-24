import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRACKING_APPS, energy } from "@/lib/domain";
import { computeTrends, listShareLinks } from "@/lib/integrations/trends";
import { listTokens } from "@/lib/integrations/tokens";
import { epicEnabled } from "@/lib/integrations/epic";
import { removeSource, revokeApiToken, revokeReport } from "@/actions/integrations";
import { Alert, PageHeader, shortDate, timeAgo } from "@/components/ui";
import { DailyChart } from "@/components/DailyChart";
import { LabsTable } from "@/components/LabsTable";
import { NutritionUpload, RecordUpload, ReportForm, ShareCodeForm, TokenForm } from "./Forms";

export const metadata: Metadata = { title: "Health data & trends" };

const TABS = [
  { id: "trends", label: "Trends" },
  { id: "connect", label: "Connect sources" },
  { id: "share", label: "Share a report" },
  { id: "api", label: "API" },
] as const;

const EPIC_MSG: Record<string, [string, "good" | "warn" | "alert"]> = {
  off: ["Epic MyChart connection isn't switched on for this server yet. Upload a FHIR or C-CDA export instead, or paste a share code.", "warn"],
  expired: ["The MyChart sign-in took too long. Please try again.", "warn"],
  state: ["That MyChart sign-in couldn't be verified. Please try again.", "alert"],
  denied: ["MyChart access wasn't granted.", "warn"],
  token: ["MyChart didn't complete the connection. Please try again.", "alert"],
  error: ["We couldn't read your MyChart records right now.", "alert"],
};

export default async function DataPage(props: PageProps<"/data">) {
  const user = await requireMember();
  const sp = await props.searchParams;
  const tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as (typeof TABS)[number]["id"]) : "trends";
  const sources = db().prepare("SELECT * FROM data_sources WHERE user_id = ? ORDER BY last_sync_at DESC").all(user.id) as {
    id: string; kind: string; label: string; url: string | null; details: string | null; records: number; last_sync_at: string | null;
  }[];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Health data" title="Your nutrition trends">
        Bring in results from your healthcare provider (Epic MyChart and others) and your food-tracking app, so your clinician sees what you
        actually eat and how your labs are moving. You choose what to connect and what to share.
      </PageHeader>
      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Data sections">
        {TABS.map((t) => (
          <Link key={t.id} href={`/data?tab=${t.id}`} aria-current={tab === t.id ? "page" : undefined} className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold ${tab === t.id ? "border-blue text-navy" : "border-transparent text-slate hover:text-navy"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "trends" && <Trends userId={user.id} days={[14, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30} hasSources={sources.length > 0} />}

      {tab === "connect" && (
        <div className="space-y-6">
          {typeof sp.epic === "string" && sp.epic === "ok" && <Alert tone="good">Connected to MyChart: {String(sp.n ?? 0)} new results imported. Your build now uses the latest values.</Alert>}
          {typeof sp.epic === "string" && EPIC_MSG[sp.epic] && <Alert tone={EPIC_MSG[sp.epic][1]}>{EPIC_MSG[sp.epic][0]}</Alert>}

          <section className="card p-6">
            <div className="eyebrow">Healthcare provider results</div>
            <h2 className="mt-1 text-lg font-bold">Epic MyChart and other patient portals</h2>
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div>
                <h3 className="text-sm font-bold">1. Connect MyChart (Epic)</h3>
                <p className="mt-1 text-xs text-slate">Sign in to your health system&apos;s MyChart and approve read-only access to labs and vitals. We import them once and don&apos;t keep your MyChart login.</p>
                {epicEnabled() ? (
                  <a href="/api/integrations/epic/start" className="btn-primary mt-3 !py-2">Connect MyChart</a>
                ) : (
                  <p className="mt-3 rounded-[2px] bg-mist px-3 py-2 text-xs text-muted">Coming soon on this server (needs an Epic app registration).</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold">2. Upload a record export</h3>
                <p className="mb-3 mt-1 text-xs text-slate">From MyChart or another portal: download your health summary (C-CDA XML) or a FHIR JSON export. PDF reports go through the <Link href="/onboarding/upload" className="link">report upload</Link>.</p>
                <RecordUpload />
              </div>
              <div>
                <h3 className="text-sm font-bold">3. Share a link or code</h3>
                <p className="mt-1 text-xs text-slate">MyChart&apos;s “Share Everywhere” gives you a code your clinician can use to view your record. Paste it here for your NutriGoal care team.</p>
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <ShareCodeForm />
            </div>
          </section>

          <section className="card p-6">
            <div className="eyebrow">Nutrition tracking</div>
            <h2 className="mt-1 text-lg font-bold">MyFitnessPal, Cronometer, MacroFactor, FatSecret, Lose It!</h2>
            <p className="mt-1 text-sm text-slate">Export from your app, then upload here. We read daily calories, protein, carbs, fat, fiber, sugar and sodium.</p>
            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {TRACKING_APPS.map((a) => (
                <li key={a.id} id={`app-${a.id}`} className="scroll-mt-24 rounded-[2px] border border-line p-3 text-sm">
                  <div className="font-bold">{a.name}</div>
                  <div className="text-xs text-slate">{a.export}</div>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <NutritionUpload />
            </div>
          </section>

          <section className="card">
            <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Connected sources</h2>
            {sources.length === 0 ? (
              <p className="px-6 py-5 text-sm text-slate">Nothing connected yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {sources.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-bold">{s.label}</div>
                      <div className="truncate text-xs text-muted">
                        {s.url ? (s.url.startsWith("https://") ? <a href={s.url} className="link" target="_blank" rel="noreferrer noopener">{s.url}</a> : `Code ${s.url}`) : s.details}
                        {s.records ? ` · ${s.records} records` : ""}
                        {s.last_sync_at ? ` · ${timeAgo(s.last_sync_at)}` : ""}
                      </div>
                    </div>
                    <form action={removeSource}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs font-bold text-muted hover:text-alert">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "share" && <ShareTab userId={user.id} />}
      {tab === "api" && <ApiTab userId={user.id} />}
    </div>
  );
}

function Trends({ userId, days, hasSources }: { userId: string; days: number; hasSources: boolean }) {
  const t = computeTrends(userId, days);
  const points = t.points;
  const r0 = (n: number | null) => (n == null ? "—" : Math.round(n).toLocaleString());
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[2px] border border-line bg-white p-0.5 text-xs font-bold">
          {[14, 30, 90].map((d) => (
            <Link key={d} href={`/data?tab=trends&days=${d}`} className={`rounded-[2px] px-3 py-1.5 ${days === d ? "bg-navy text-white" : "text-slate hover:text-navy"}`}>
              {d} days
            </Link>
          ))}
        </div>
        <Link href="/data?tab=share" className="link text-sm">Share these trends →</Link>
      </div>

      {t.current.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">No nutrition data yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate">{hasSources ? "Your connected sources have no days in this period." : "Connect your tracking app export to see daily calories, protein and nutrient trends against your targets."}</p>
          <Link href="/data?tab=connect" className="btn-primary mt-4">Connect a source</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line lg:grid-cols-5">
            {[
              ["Calories / day", t.averages.calories != null ? energy(t.averages.calories, t.energyUnit) : "—", t.targets.kcal ? `Target ${energy(t.targets.kcal, t.energyUnit)}` : ""],
              ["Protein / day", `${r0(t.averages.protein_g)} g`, t.targets.protein ? `Target ${t.targets.protein} g` : ""],
              ["Fiber / day", `${r0(t.averages.fiber_g)} g`, "Guideline 14 g / 1,000 kcal"],
              ["Sodium / day", `${r0(t.averages.sodium_mg)} mg`, "Limit 2,300 mg"],
              ["Macro split", t.split ? `${t.split.carbs}/${t.split.protein}/${t.split.fat}` : "—", "Carbs / protein / fat %"],
            ].map(([k, v, s]) => (
              <div key={k} className="bg-white px-5 py-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</div>
                <div className="font-display mt-1 text-2xl">{v}</div>
                <div className="text-xs text-slate">{s}</div>
              </div>
            ))}
          </div>

          <section className="card p-5">
            <h2 className="font-bold">What the numbers say</h2>
            <p className="text-xs text-muted">Calculated from your logs, targets and published guidelines. Your clinician interprets them; these aren&apos;t advice.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {t.insights.map((i) => (
                <li key={i.text} className="flex gap-2">
                  <span className={i.tone === "good" ? "text-good" : i.tone === "watch" ? "text-warn" : "text-slate"} aria-hidden>{i.tone === "good" ? "●" : "▲"}</span>
                  {i.text}
                </li>
              ))}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-2 font-bold">Calories</h2>
              <DailyChart points={points.map((p) => ({ day: p.day, value: p.calories }))} target={t.targets.kcal} unit="kcal" label="Daily calories" />
            </section>
            <section className="card p-5">
              <h2 className="mb-2 font-bold">Protein</h2>
              <DailyChart points={points.map((p) => ({ day: p.day, value: p.protein }))} target={t.targets.protein} unit="g" label="Daily protein" />
            </section>
          </div>
        </>
      )}

      <LabsTable labs={t.labs} />
    </div>
  );
}

function ShareTab({ userId }: { userId: string }) {
  const links = listShareLinks(userId);
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-lg font-bold">Create a shareable report</h2>
        <p className="mb-4 mt-1 text-sm text-slate">A read-only page with your trends that you can send to your own doctor, dietitian or trainer. It expires automatically and you can turn it off any time.</p>
        <ReportForm />
      </section>
      <section className="card">
        <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Your links</h2>
        {links.length === 0 ? (
          <p className="px-6 py-5 text-sm text-slate">No links yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {links.map((l) => {
              const active = !l.revoked_at && new Date(l.expires_at) > new Date();
              return (
                <li key={l.token} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div>
                    <div className="font-bold">{l.label}</div>
                    <div className="text-xs text-muted">
                      Last {l.days} days · {active ? `expires ${shortDate(l.expires_at)}` : l.revoked_at ? "turned off" : "expired"} · {l.views} view{l.views === 1 ? "" : "s"}
                    </div>
                  </div>
                  {active && (
                    <div className="flex items-center gap-3">
                      <a href={`/share/${l.token}`} target="_blank" rel="noreferrer" className="link text-xs">Open ↗</a>
                      <form action={revokeReport}>
                        <input type="hidden" name="token" value={l.token} />
                        <button className="text-xs font-bold text-muted hover:text-alert">Turn off</button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ApiTab({ userId }: { userId: string }) {
  const tokens = listTokens(userId, "integrations");
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-lg font-bold">Personal API tokens</h2>
        <p className="mb-4 mt-1 text-sm text-slate">
          Send daily nutrition or provider results to NutriGoal from automations (Apple Shortcuts, Zapier) or partner apps. Each token only
          writes to your account. <Link href="/developers" className="link">Read the API docs →</Link>
        </p>
        <TokenForm />
      </section>
      <section className="card">
        <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Active tokens</h2>
        {tokens.length === 0 ? (
          <p className="px-6 py-5 text-sm text-slate">No tokens yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                <div>
                  <div className="font-bold">{t.name}</div>
                  <div className="font-mono text-xs text-muted">{t.prefix}… · created {shortDate(t.created_at)}{t.last_used_at ? ` · used ${timeAgo(t.last_used_at)}` : " · never used"}</div>
                </div>
                <form action={revokeApiToken}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="text-xs font-bold text-muted hover:text-alert">Revoke</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
