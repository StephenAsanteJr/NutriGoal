import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { LogoLockup } from "@/components/Logo";

export const metadata: Metadata = { title: "Application under review" };

/** Clinicians and NutriGoal management waiting for (or declined) approval. */
export default async function Pending() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "member" || user.staff_status === "active") redirect(homeFor({ ...user, staff_status: "active" }));
  const declined = user.staff_status === "rejected";
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist/60 px-4 py-12">
      <div className="card max-w-lg p-8 text-center">
        <div className="mx-auto w-fit">
          <LogoLockup width={150} />
        </div>
        <h1 className="font-display mt-6 text-3xl">{declined ? "Application not approved" : "Thanks, your application is in"}</h1>
        <p className="mt-3 text-sm text-slate">
          {declined
            ? "NutriGoal management wasn't able to approve this account. If you think that's a mistake, contact NutriGoal operations."
            : `We're verifying your ${user.role === "clinician" ? "license" : "details"}. NutriGoal management will approve your ${user.role === "clinician" ? "clinician" : user.role === "org_manager" ? "organization" : "NutriGoal management"} account, and you'll be able to sign in right away. You won't see any member information until then.`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/notifications" className="btn-outline">Check notifications</Link>
          <form action={logout}>
            <button className="btn-dark">Sign out</button>
          </form>
        </div>
      </div>
    </main>
  );
}
