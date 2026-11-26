import type { Verification } from "@/lib/licensing";
import { confirmStateLicense, rerunLicenseCheck } from "@/actions/staff";
import { SubmitButton } from "./SubmitButton";
import { timeAgo } from "./ui";

const BADGE: Record<Verification["status"], { label: string; cls: string }> = {
  verified: { label: "NPI record matches", cls: "bg-good-tint text-good" },
  needs_review: { label: "Needs a manual check", cls: "bg-warn-tint text-warn" },
  mismatch: { label: "Doesn't match the NPI record", cls: "bg-alert-tint text-alert" },
  not_found: { label: "NPI not found", cls: "bg-alert-tint text-alert" },
  unavailable: { label: "Registry check pending", cls: "bg-warn-tint text-warn" },
};
const MARK = { pass: "✓", fail: "✕", warn: "!", info: "i" } as const;
const MARK_CLS = { pass: "text-good", fail: "text-alert", warn: "text-warn", info: "text-muted" } as const;

/** Manager view of a clinician applicant's license verification (NPI Registry + state board). */
export function LicenseCheck({ userId, v }: { userId: string; v: Verification | null }) {
  if (!v)
    return (
      <form action={rerunLicenseCheck} className="mt-2">
        <input type="hidden" name="user_id" value={userId} />
        <SubmitButton className="btn-ghost !px-2 !py-1 text-xs" pendingText="Checking…">Run NPI Registry check</SubmitButton>
      </form>
    );
  const b = BADGE[v.status];
  const stateConfirmed = v.manual?.some((m) => m.note.startsWith("State board"));
  return (
    <div className="mt-3 rounded-[3px] border border-line bg-mist/50 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`pill ${b.cls}`}>{b.label}</span>
        {stateConfirmed && <span className="pill bg-good-tint text-good">✓ State board confirmed</span>}
        <span className="text-muted">{v.source} · checked {timeAgo(v.checkedAt)}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {v.checks.map((c) => (
          <li key={c.label} className="flex gap-2">
            <span className={`w-3 shrink-0 text-center font-bold ${MARK_CLS[c.status]}`} aria-label={c.status}>{MARK[c.status]}</span>
            <span><strong className="text-navy">{c.label}:</strong> <span className="text-slate">{c.detail}</span></span>
          </li>
        ))}
        {v.manual?.map((m, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-3 shrink-0 text-center font-bold text-good">✓</span>
            <span className="text-slate">{m.note} · {m.by} · {timeAgo(m.at)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {v.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener" className="link">{l.label} ↗</a>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <form action={rerunLicenseCheck}>
          <input type="hidden" name="user_id" value={userId} />
          <SubmitButton className="btn-ghost !px-2 !py-1 text-xs" pendingText="Checking…">Re-run NPI check</SubmitButton>
        </form>
        {!stateConfirmed && (
          <form action={confirmStateLicense} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="user_id" value={userId} />
            <input name="note" maxLength={160} placeholder="e.g. Active, expires 2027-06-30, no discipline" className="input !w-72 !py-1 text-xs" aria-label="What the state board shows" required />
            <SubmitButton className="btn-outline !px-3 !py-1 text-xs" pendingText="…">I checked the state board</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
