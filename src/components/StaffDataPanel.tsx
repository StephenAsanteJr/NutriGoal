import { db } from "@/lib/db";
import { computeTrends } from "@/lib/integrations/trends";
import { getSettings } from "@/lib/data";
import { LabsTable } from "./LabsTable";
import { timeAgo } from "./ui";

/** Connected data for the care team: tracker trends, lab history and links the member shared. */
export function StaffDataPanel({ memberId }: { memberId: string }) {
  const t = computeTrends(memberId, 14);
  const shareProgress = getSettings(memberId).share_progress_with_clinician;
  const links = db()
    .prepare("SELECT id, label, url, last_sync_at FROM data_sources WHERE user_id = ? AND url IS NOT NULL ORDER BY last_sync_at DESC")
    .all(memberId) as { id: string; label: string; url: string; last_sync_at: string | null }[];
  const sources = db().prepare("SELECT label FROM data_sources WHERE user_id = ? AND url IS NULL").all(memberId) as { label: string }[];
  if (!t.current.length && !t.labs.length && !links.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="eyebrow">Connected data</div>
          <h2 className="font-display text-2xl">Nutrition and lab trends</h2>
        </div>
        {sources.length > 0 && <p className="text-xs text-muted">Sources: {[...new Set(sources.map((s) => s.label))].join(" · ")}</p>}
      </div>
      {shareProgress && t.current.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold">Last 14 days from the member&apos;s tracker</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {t.insights.map((i) => (
              <li key={i.text} className="flex gap-2">
                <span className={i.tone === "good" ? "text-good" : "text-warn"} aria-hidden>{i.tone === "good" ? "●" : "▲"}</span>
                {i.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      <LabsTable labs={t.labs} />
      {links.length > 0 && (
        <div className="card">
          <h3 className="border-b border-line px-6 py-3 text-sm font-bold">Links and codes the member shared</h3>
          <ul className="divide-y divide-line text-sm">
            {links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
                <span className="font-bold">{l.label}</span>
                <span className="text-xs text-slate">
                  {l.url.startsWith("https://") ? (
                    <a href={l.url} target="_blank" rel="noreferrer noopener" className="link">Open link ↗</a>
                  ) : (
                    <>Code <code className="font-mono">{l.url}</code></>
                  )}
                  {l.last_sync_at ? ` · ${timeAgo(l.last_sync_at)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
