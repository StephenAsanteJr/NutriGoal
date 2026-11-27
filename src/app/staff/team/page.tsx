import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listClinicians } from "@/lib/data";
import { goalLabel } from "@/lib/domain";
import { PageHeader, timeAgo } from "@/components/ui";
import { db } from "@/lib/db";
import { reviewApplication } from "@/actions/staff";
import { SubmitButton } from "@/components/SubmitButton";
import { getDemographics } from "@/lib/demographics";
import { cuisineById } from "@/lib/cuisines";
import { LicenseCheck } from "@/components/LicenseCheck";
import { readVerification } from "@/lib/licensing";

export const metadata: Metadata = { title: "Clinicians" };

export default async function TeamPage() {
  await requireStaff(["manager"]);
  const clinicians = listClinicians();
  const applications = db()
    .prepare("SELECT id, name, email, role, credential, license_info, license_verification, organization, created_at FROM users WHERE role != 'member' AND staff_status = 'pending' ORDER BY created_at")
    .all() as { id: string; name: string; email: string; role: string; credential: string | null; license_info: string | null; license_verification: string | null; organization: string | null; created_at: string }[];
  return (
    <div>
      <section id="applications" className="mb-8 scroll-mt-24">
        <h2 className="mb-3 text-lg font-bold">Applications {applications.length > 0 && <span className="pill ml-2 bg-warn-tint text-warn">{applications.length} waiting</span>}</h2>
        {applications.length === 0 ? (
          <p className="card px-6 py-4 text-sm text-slate">No clinician or NutriGoal management applications waiting.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {applications.map((a) => {
              const lic = a.license_info ? (JSON.parse(a.license_info) as { license: string; state: string; npi: string | null }) : null;
              return (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      {a.name} <span className="font-normal text-slate">· {a.role === "clinician" ? a.credential : `NutriGoal management, ${a.credential}`}</span>
                    </div>
                    <div className="text-xs text-muted">
                      {a.email}
                      {lic ? ` · license ${lic.state} ${lic.license}${lic.npi ? ` · NPI ${lic.npi}` : ""}` : ""}
                      {a.organization ? ` · ${a.organization}` : ""} · applied {timeAgo(a.created_at)}
                    </div>
                    {a.role === "clinician" && <ApplicantAbout userId={a.id} />}
                    {a.role === "clinician" && <LicenseCheck userId={a.id} v={readVerification(a.license_verification)} />}
                  </div>
                  <div className="flex gap-2">
                    <form action={reviewApplication}>
                      <input type="hidden" name="user_id" value={a.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <SubmitButton className="btn-outline !py-2" pendingText="…">Decline</SubmitButton>
                    </form>
                    <form action={reviewApplication}>
                      <input type="hidden" name="user_id" value={a.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <SubmitButton className="btn-primary !py-2" pendingText="…">Approve</SubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <PageHeader eyebrow="Roster" title="Clinicians">
        Physicians take tickets with GLP-1 stage + side-effect or blood-sugar goals, and any ticket with a high-risk lab flag. Dietitians take
        the rest. Within a type, a matching specialty and the shortest queue wins.
      </PageHeader>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {clinicians.map((c) => (
          <article key={c.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-display text-lg text-white">
                  {c.name.replace("Dr. ", "").split(" ").map((w) => w[0]).join("")}
                </div>
                <div>
                  <div className="text-lg font-bold">{c.name}</div>
                  <div className="text-sm text-slate">{c.credential}</div>
                </div>
              </div>
              <span className={`pill ${c.clinician_type === "MD" ? "bg-ink text-white" : "bg-bcg-tint text-bcg-deep"}`}>{c.clinician_type === "MD" ? "Physician" : "Dietitian"}</span>
            </div>
            <p className="mt-4 text-sm text-slate">{c.bio}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(JSON.parse(c.specialties ?? "[]") as string[]).map((s) => (
                <span key={s} className="pill bg-mist text-slate">{goalLabel(s)}</span>
              ))}
            </div>
            <div className="mt-4 flex gap-6 border-t border-line pt-4 text-sm">
              <span><strong>{c.open_count}</strong> open</span>
              <span><strong>{c.done_count}</strong> answered</span>
              <span className="text-muted">{c.email}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ApplicantAbout({ userId }: { userId: string }) {
  const d = getDemographics(userId);
  if (!d) return null;
  const cuisines = d.cuisines.map((id) => cuisineById(id)?.label).filter(Boolean).join(", ");
  const parts = [
    d.years_in_practice != null ? `${d.years_in_practice} years in practice` : null,
    d.practice_setting,
    [d.city, d.region, d.country].filter(Boolean).join(", ") || null,
    d.languages ? `Languages: ${d.languages}` : null,
    cuisines ? `Cuisines: ${cuisines}` : null,
    d.populations ? `Serves: ${d.populations}` : null,
  ].filter(Boolean);
  return parts.length ? <p className="mt-1 text-xs text-slate">{parts.join(" · ")}</p> : null;
}
