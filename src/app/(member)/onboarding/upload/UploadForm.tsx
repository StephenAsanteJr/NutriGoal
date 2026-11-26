"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { uploadReport, type UploadState } from "@/actions/profile";
import { Alert } from "@/components/ui";

export function UploadForm() {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadReport, undefined);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  if (state && "ok" in state && state.ok) {
    const ex = state.extraction;
    return (
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line bg-good-tint px-6 py-4 text-good">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-good text-white" aria-hidden>✓</span>
            <div>
              <div className="font-bold">Report uploaded</div>
              <div className="text-sm">{state.fileName}</div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate">{ex?.note}</p>
            {ex && ex.found.length > 0 && (
              <table className="mt-5 w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="py-2 font-bold">Value</th>
                    <th className="py-2 font-bold">We read</th>
                    <th className="hidden py-2 font-bold sm:table-cell">From the text</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.found.map((f) => (
                    <tr key={f.field} className="border-b border-line last:border-0">
                      <td className="py-2.5 font-bold">{f.label}</td>
                      <td className="py-2.5 font-bold text-bcg-deep">{f.display}</td>
                      <td className="hidden py-2.5 font-mono text-xs text-muted sm:table-cell">“{f.raw}”</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(ex?.provider || ex?.reportDate) && (
              <p className="mt-4 text-xs text-muted">
                {ex?.provider && <>Provider: {ex.provider}. </>}
                {ex?.reportDate && <>Report date: {ex.reportDate}.</>}
              </p>
            )}
          </div>
        </div>
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <div className="font-bold">Next: confirm and add manual details</div>
            <p className="text-sm text-slate">Check the values above and fill in anything the report didn&apos;t include, like your goal and habits.</p>
          </div>
          <Link href={`/onboarding/manual?report=${state.reportId}`} className="btn-primary !px-7">
            Review and add details →
          </Link>
        </div>
      </div>
    );
  }

  const error = state && "error" in state ? state.error : undefined;
  return (
    <form action={action} className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <div
        className={`card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-14 text-center transition ${drag ? "border-blue bg-blue-tint" : "border-line hover:border-navy"}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && input.current) {
            const dt = new DataTransfer();
            dt.items.add(f);
            input.current.files = dt.files;
            setFile(f);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        aria-label="Choose a report file"
      >
        <svg viewBox="0 0 48 48" className="h-12 w-12 text-blue" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M28 6H14a4 4 0 0 0-4 4v28a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V16z" />
          <path d="M28 6v10h10M24 34V22M19 27l5-5 5 5" />
        </svg>
        {file ? (
          <>
            <div className="mt-4 font-bold">{file.name}</div>
            <div className="text-sm text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB · click to choose a different file</div>
          </>
        ) : (
          <>
            <div className="mt-4 font-bold">Drop your report here, or click to browse</div>
            <div className="text-sm text-muted">PDF, JPG, PNG or WEBP · up to 10 MB</div>
          </>
        )}
        <input
          ref={input}
          type="file"
          name="report"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-slate">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-bcg-deep" />
        <span>This is my own report, and I agree to share it with the NutriGoal clinicians who review my tickets.</span>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <a href="/samples/sample-checkup-report.pdf" className="link text-sm" download>
          No report handy? Download a sample report to try it
        </a>
        <button className="btn-primary !px-8 !py-3" disabled={pending || !file}>
          {pending ? "Reading your report…" : "Upload and read report"}
        </button>
      </div>
      <p className="text-xs text-muted">
        We read text-based PDFs on our own servers with simple pattern matching; nothing is sent to an outside AI service. Photos are
        stored for your clinician to read.
      </p>
    </form>
  );
}
