import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getDemographics } from "@/lib/demographics";
import { AboutForm } from "./AboutForm";

export const metadata: Metadata = { title: "About you" };

/** Step 2 of onboarding: demographics, before any biometrics. Also where members edit them later. */
export default async function About() {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  const d = getDemographics(user.id);
  const first = user.name.split(" ")[0];
  return (
    <div className="mx-auto max-w-3xl">
      <div className="eyebrow mb-2">{user.onboarding_complete ? "Your details" : "Step 2 of 4 · About you"}</div>
      <h1 className="font-display text-4xl leading-tight">{user.onboarding_complete ? "About you" : `Welcome, ${first}. First, a little about you`}</h1>
      <p className="mb-8 mt-3 max-w-2xl text-slate">
        Where you live, how you work, who you cook for and the food you grew up with all shape a plan that works. Your clinician reads this
        with every ticket, and your food guide shows ingredients from your cuisines first. Health numbers come next.
      </p>
      <AboutForm initial={d} editing={!!user.onboarding_complete} />
    </div>
  );
}
