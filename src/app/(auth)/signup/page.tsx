import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  return (
    <>
      <div className="eyebrow mb-2">Step 1 of 3 · Account</div>
      <h1 className="font-display text-4xl">Create your account</h1>
      <p className="mt-2 text-sm text-slate">
        Free to join. Next you&apos;ll build your profile, then send your first goal ticket when you&apos;re ready. Already have an account?{" "}
        <Link href="/login" className="link">
          Sign in
        </Link>
      </p>
      <SignupForm />
    </>
  );
}
