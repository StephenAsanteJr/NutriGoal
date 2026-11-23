import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
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
      <LoginForm next={next} />
    </>
  );
}
