import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { hasActiveManager } from "@/lib/setup";
import { SsoButtons } from "@/components/SsoButtons";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const ssoError = sp.sso === "error" ? (typeof sp.reason === "string" ? sp.reason : "Sign-in didn't complete. Please try again.") : sp.sso === "unavailable" ? "That sign-in option isn't set up yet." : null;
  return (
    <>
      <div className="eyebrow mb-2">Welcome back</div>
      <h1 className="font-display text-4xl">Sign in to NutriGoal</h1>
      <p className="mt-2 text-sm text-slate">
        Members, clinicians and managers all sign in here. New to NutriGoal?{" "}
        <Link href="/signup" className="link">
          Create an account
        </Link>
      </p>
      {ssoError && <p className="mt-4 rounded-[3px] border border-alert/30 bg-alert-tint px-4 py-2.5 text-sm text-alert">{ssoError}</p>}
      <SsoButtons next={next} />
      <LoginForm next={next} />
      {!hasActiveManager() && (
        <p className="mt-4 rounded-[3px] bg-bcg-tint px-4 py-2.5 text-sm text-bcg-deep">
          Setting up NutriGoal for the first time? <Link href="/signup?role=manager" className="font-bold underline">Sign up as a care manager</Link>: the first one is approved automatically as the owner.
        </p>
      )}
      <div className="mt-8 border-t border-line pt-6">
        <div className="text-xs font-bold uppercase tracking-wider text-muted">New to NutriGoal?</div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link href="/signup?role=member" className="btn-outline !px-3 !py-2 text-xs">Sign up as a member</Link>
          <Link href="/signup?role=clinician" className="btn-outline !px-3 !py-2 text-xs">Join as a clinician</Link>
          <Link href="/signup?role=manager" className="btn-outline !px-3 !py-2 text-xs">Join as a care manager</Link>
        </div>
      </div>
    </>
  );
}
