import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getActiveSubscription, getProfile, listPartners, listReports, listTicketsForMember, toBuildInput } from "@/lib/data";
import { BuildPanel, memberCode } from "@/components/BuildPanel";
import { Alert, PageHeader, StatusPill, timeAgo } from "@/components/ui";
import { MEMBERSHIP, PARTNER_CATEGORIES, PRICES, goalLabel, money, ticketNumber } from "@/lib/domain";

export const metadata: Metadata = { title: "My build" };

export default async function Dashboard(props: PageProps<"/dashboard">) {
  const user = await requireMember();
  const sp = await props.searchParams;
  const profile = getProfile(user.id);
  const input = toBuildInput(profile);
  const tickets = listTicketsForMember(user.id).filter((t) => t.status !== "awaiting_payment");
  const drafts = listTicketsForMember(user.id).filter((t) => t.status === "awaiting_payment");
  const sub = getActiveSubscription(user.id);
  const reports = listReports(user.id);
  const goalTypes = new Set(tickets.map((t) => t.goal_type));
  const partners = listPartners(user.id)
    .map((p) => ({ p, score: p.goal_types.filter((g) => goalTypes.has(g)).length + (p.connected ? -5 : 0) }))
    .sort((a, b) => b.score - a.score || (b.p.rating ?? 0) - (a.p.rating ?? 0))
    .slice(0, 3)
    .map((x) => x.p);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="My build"
        title={`Hi, ${user.name.split(" ")[0]}`}
        actions={
          <>
            <Link href="/onboarding/manual" className="btn-outline">Update build</Link>
            <Link href="/tickets/new" className="btn-primary">New goal ticket</Link>
          </>
        }
      >
        This is the build and biometric card your clinician sees with every ticket.
      </PageHeader>

      {sp.built && (
        <Alert tone="good">
          <strong>Your build is ready.</strong> Next, open a goal ticket to tell a clinician what you want to achieve. Step 3 of 3.
        </Alert>
      )}
      {sp.updated && <Alert tone="good">Your build has been updated.</Alert>}

      {input ? (
        <BuildPanel
          name={user.name}
          memberId={memberCode(user.id)}
          input={input}
          units={profile!.unit_system}
          medicationStage={profile!.medication_stage}
          source={profile!.source}
          updatedAt={profile!.updated_at}
        />
      ) : (
        <Alert tone="warn">
          Your build is missing some details. <Link href="/onboarding" className="link">Finish your profile</Link>.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-lg font-bold">Your goal tickets</h2>
            <Link href="/tickets" className="link text-sm">View all</Link>
          </div>
          {drafts.length > 0 && (
            <div className="flex items-center justify-between gap-4 border-b border-line bg-warn-tint/60 px-6 py-3 text-sm">
              <span>
                <strong>Unsent draft:</strong> “{drafts[0].goal_statement}”
              </span>
              <Link href={`/tickets/new?draft=${drafts[0].id}`} className="link whitespace-nowrap">Finish and send →</Link>
            </div>
          )}
          {tickets.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-display text-2xl">No tickets yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate">
                Describe one nutrition goal, what you eat, and what gets in the way. A physician or dietitian answers within{" "}
                {MEMBERSHIP.responseSlaHours} hours.
              </p>
              <Link href="/tickets/new" className="btn-primary mt-5">Open your first ticket</Link>
            </div>
          ) : (
            <ul>
              {tickets.slice(0, 4).map((t) => (
                <li key={t.id} className="border-b border-line last:border-0">
                  <Link href={`/tickets/${t.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-mist">
                    <div className="w-20 font-mono text-xs text-muted">{ticketNumber(t.id)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{t.goal_statement}</div>
                      <div className="text-xs text-slate">
                        {goalLabel(t.goal_type)} · {t.clinician_name ?? "Matching clinician"} · {timeAgo(t.paid_at ?? t.created_at)}
                      </div>
                    </div>
                    {t.status === "responded" && !t.member_seen_at && <span className="h-2 w-2 rounded-full bg-cyan" aria-label="New" />}
                    <StatusPill status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className={`card p-6 ${sub ? "" : "border-navy"}`}>
            <div className="eyebrow">Membership</div>
            {sub ? (
              <>
                <div className="font-display mt-2 text-2xl">Member · {sub.plan === "yearly" ? "annual" : "monthly"}</div>
                <p className="mt-1 text-sm text-slate">
                  {sub.ticket_credits > 0 ? "1 included ticket available this month." : `This month's ticket is used. Extra tickets are ${money(PRICES.extraTicketMember)}.`}{" "}
                  Next ticket credit {new Date(sub.credits_reset_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
                </p>
                <Link href="/membership" className="link mt-3 inline-block text-sm">Manage membership</Link>
              </>
            ) : (
              <>
                <div className="font-display mt-2 text-2xl">{money(PRICES.subscriptionMonthly)}/month</div>
                <p className="mt-1 text-sm text-slate">
                  A goal ticket every month, the Daily Support Pack and member pricing. Or {money(PRICES.subscriptionYearly)}/year.
                </p>
                <Link href="/membership" className="btn-dark mt-4">See membership</Link>
              </>
            )}
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <div className="eyebrow">Medical reports</div>
              <Link href="/onboarding/upload" className="link text-xs">Upload</Link>
            </div>
            {reports.length === 0 ? (
              <p className="mt-2 text-sm text-slate">No reports yet. Uploading a recent checkup helps your clinician use real labs.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {reports.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <a href={`/api/reports/${r.id}`} className="link truncate" target="_blank" rel="noreferrer">{r.original_name}</a>
                    <span className="whitespace-nowrap text-xs text-muted">{timeAgo(r.uploaded_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="eyebrow">Verified partners</div>
            <h2 className="font-display mt-1 text-2xl">Picked for your goals</h2>
          </div>
          <Link href="/marketplace" className="link text-sm">Explore the marketplace →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {partners.map((p) => (
            <Link key={p.id} href={`/marketplace?category=${p.category}#${p.id}`} className="card block p-5 hover:border-blue">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {PARTNER_CATEGORIES.find((c) => c.id === p.category)?.label}
                </span>
                <span className="pill bg-good-tint text-good">✓ Verified</span>
              </div>
              <div className="mt-2 font-bold">{p.name}</div>
              <p className="text-sm text-slate">{p.tagline}</p>
              {p.offer && <p className="mt-3 text-xs font-bold text-blue">{p.offer}</p>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
