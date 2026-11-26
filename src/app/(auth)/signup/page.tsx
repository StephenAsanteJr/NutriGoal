import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { SsoButtons } from "@/components/SsoButtons";
import { hasActiveManager } from "@/lib/setup";
import { SignupForm } from "./SignupForm";
import { ClinicianSignupForm, ManagerSignupForm } from "./StaffSignupForms";

export const metadata: Metadata = { title: "Create your account" };

const ROLES = [
  { id: "member", label: "Member", sub: "Get plans for your goals" },
  { id: "clinician", label: "Clinician", sub: "MD, DO, RD or nutritionist" },
  { id: "manager", label: "Care manager", sub: "Run the care team" },
] as const;

export default async function SignupPage(props: PageProps<"/signup">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const sp = await props.searchParams;
  const role = ROLES.some((r) => r.id === sp.role) ? (sp.role as (typeof ROLES)[number]["id"]) : "member";
  const ref = typeof sp.ref === "string" ? sp.ref.trim().toUpperCase().slice(0, 20) : "";
  const referrer = ref
    ? (db().prepare("SELECT name, credential FROM users WHERE referral_code = ? AND role = 'clinician' AND staff_status = 'active'").get(ref) as { name: string; credential: string | null } | undefined)
    : undefined;

  return (
    <>
      <h1 className="font-display text-4xl">Create your account</h1>
      <p className="mt-2 text-sm text-slate">
        Choose how you&apos;ll use NutriGoal. Already have an account?{" "}
        <Link href="/login" className="link">
          Sign in
        </Link>
      </p>

      <nav className="mt-6 grid grid-cols-3 gap-2" aria-label="Account type">
        {ROLES.map((r) => (
          <Link
            key={r.id}
            href={`/signup?role=${r.id}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`}
            aria-current={role === r.id ? "page" : undefined}
            className={`rounded-[3px] border px-3 py-3 text-center transition ${role === r.id ? "border-blue bg-blue-tint" : "border-line hover:border-navy"}`}
          >
            <div className={`text-sm font-bold ${role === r.id ? "text-blue" : "text-navy"}`}>{r.label}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-muted">{r.sub}</div>
          </Link>
        ))}
      </nav>

      {role === "member" && (
        <>
          {referrer && (
            <p className="mt-6 rounded-[3px] bg-bcg-tint px-4 py-2.5 text-sm text-bcg-deep">
              <strong>{referrer.name}</strong>
              {referrer.credential ? `, ${referrer.credential}` : ""} invited you to NutriGoal.
            </p>
          )}
          <p className="mt-6 text-sm text-slate">Free to join. Next you&apos;ll build your profile, then send your first goal ticket when you&apos;re ready.</p>
          <SsoButtons referral={referrer ? ref : ""} divider="or sign up with email" />
          <SignupForm referral={referrer ? ref : ""} />
        </>
      )}
      {role === "clinician" && (
        <>
          <p className="mt-6 text-sm text-slate">
            Write and sign response tickets for members in your specialty. We verify your license before your account opens; you&apos;ll see
            no member information until a NutriGoal manager approves you.
          </p>
          <ClinicianSignupForm />
          <p className="mt-3 text-xs text-muted">Once you&apos;re approved, you can also sign in with Google, Apple or your organization&apos;s SSO using this email.</p>
        </>
      )}
      {role === "manager" && (
        <>
          <p className="mt-6 text-sm text-slate">
            Oversee ticket routing, clinician load and the 48-hour promise.{" "}
            {hasActiveManager()
              ? "Care manager accounts are approved by an existing NutriGoal manager before they open."
              : "NutriGoal has no manager yet, so this first care manager account opens right away as the owner."}
          </p>
          <ManagerSignupForm owner={!hasActiveManager()} />
        </>
      )}
    </>
  );
}
