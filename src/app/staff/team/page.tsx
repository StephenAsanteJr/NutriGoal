import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listClinicians } from "@/lib/data";
import { goalLabel } from "@/lib/domain";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Clinicians" };

export default async function TeamPage() {
  await requireStaff(["manager"]);
  const clinicians = listClinicians();
  return (
    <div>
      <PageHeader eyebrow="Roster" title="Clinicians">
        Physicians take tickets with GLP-1 stage + side-effect or blood-sugar goals, and any ticket with a high-risk lab flag. Dietitians take
        the rest. Within a type, a matching specialty and the shortest queue wins.
      </PageHeader>
      <div className="grid gap-5 md:grid-cols-2">
        {clinicians.map((c) => (
          <article key={c.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy font-display text-lg text-white">
                  {c.name.replace("Dr. ", "").split(" ").map((w) => w[0]).join("")}
                </div>
                <div>
                  <div className="text-lg font-bold">{c.name}</div>
                  <div className="text-sm text-slate">{c.credential}</div>
                </div>
              </div>
              <span className={`pill ${c.clinician_type === "MD" ? "bg-navy text-white" : "bg-cyan-tint text-navy"}`}>{c.clinician_type === "MD" ? "Physician" : "Dietitian"}</span>
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
