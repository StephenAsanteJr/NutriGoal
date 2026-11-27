import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrgByCode, memberOrg } from "@/lib/org-wellness";
import { LogoLockup } from "@/components/Logo";
import { JoinOrgForm } from "./JoinForm";

export const metadata: Metadata = { title: "Join your organization on NutriGoal" };

/** Invite link from an organization: explains what the organization can and can't see, then joins. */
export default async function Join(props: PageProps<"/join/[code]">) {
  const { code } = await props.params;
  const org = getOrgByCode(code);
  if (!org) notFound();
  const user = await getCurrentUser();
  const already = user?.role === "member" ? memberOrg(user.id) : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist/60 px-4 py-12">
      <div className="card w-full max-w-lg p-8">
        <LogoLockup width={150} />
        <div className="eyebrow mt-6">You&apos;re invited</div>
        <h1 className="font-display mt-2 text-3xl">{org.name} offers you NutriGoal</h1>
        <p className="mt-3 text-sm text-slate">
          Send a goal ticket and get a written plan from a licensed physician, dietitian or nutritionist within 48 hours.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate">
          <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bcg" aria-hidden /><span><strong className="text-ink">{org.name} sees only group totals</strong> for 5 or more people, rounded: how many joined and the share getting closer to their goals.</span></li>
          <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bain" aria-hidden /><span><strong className="text-ink">They never see</strong> your name, email, weight, labs, conditions, medications, tickets or plans.</span></li>
          <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bcg" aria-hidden /><span><strong className="text-ink">Your clinician isn&apos;t told</strong> who sponsors you. You can leave any time.</span></li>
        </ul>
        <div className="mt-6">
          {!user ? (
            <div className="space-y-3">
              <Link href={`/signup?role=member&org=${org.invite_code}`} className="btn-primary w-full !py-3">Create your account</Link>
              <Link href={`/login?next=${encodeURIComponent(`/join/${org.invite_code}`)}`} className="btn-outline w-full">I already have an account</Link>
            </div>
          ) : user.role !== "member" ? (
            <p className="rounded-[3px] bg-mist p-4 text-sm text-slate">Invite links are for members. You&apos;re signed in as {user.name}; sign out and use a member account to join.</p>
          ) : already?.id === org.id ? (
            <p className="rounded-[3px] bg-bcg-tint p-4 text-sm text-bcg-deep">You&apos;re already in {org.name}. <Link href="/dashboard" className="font-bold underline">Go to your build</Link></p>
          ) : (
            <>
              {already && <p className="mb-3 text-sm text-slate">You&apos;re currently in {already.name}. Joining {org.name} moves you over.</p>}
              <JoinOrgForm code={org.invite_code} orgName={org.name} next={user.onboarding_complete ? "/membership?tab=settings#organization" : "/onboarding"} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
