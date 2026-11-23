import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { UploadForm } from "./UploadForm";

export const metadata: Metadata = { title: "Upload your checkup report" };

export default async function UploadPage() {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{user.onboarding_complete ? "Add a report" : "Step 2 of 3 · Your build"}</div>
          <h1 className="font-display text-4xl">Upload your latest checkup report</h1>
          <p className="mt-2 max-w-2xl text-slate">
            A PDF from your provider&apos;s patient portal works best. We&apos;ll read the values we can find, show them to you, and then you can
            add anything else by hand.
          </p>
        </div>
        {!user.onboarding_complete && (
          <Link href="/onboarding" className="btn-ghost">
            ← Choose a different way
          </Link>
        )}
      </div>
      <UploadForm />
    </div>
  );
}
