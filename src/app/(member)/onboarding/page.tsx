import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Build your profile" };

export default async function OnboardingChoice() {
  const user = await requireMember({ allowIncompleteOnboarding: true });
  const first = user.name.split(" ")[0];
  return (
    <div className="mx-auto max-w-5xl">
      <div className="eyebrow mb-2">Step 2 of 3 · Your build</div>
      <h1 className="font-display text-4xl leading-tight">Welcome, {first}. How would you like to build your profile?</h1>
      <p className="mt-3 max-w-2xl text-slate">
        Your answers become a physical build and biometric card that your clinician reviews with every ticket. You can update it any time.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <ChoiceCard
          href="/onboarding/manual"
          tag="About 3 minutes"
          title="Enter my health data"
          body="Type in your age, height, weight, body fat, meals, calories, activity and goal. We'll check your timeframe is safe as you go."
          items={["Age, height, weight, body fat %", "Meals a day and estimated calories", "Workout time a day", "Goal weight, body fat and timeframe"]}
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
              <path d="M13.5 6.5l4 4" />
            </svg>
          }
        />
        <ChoiceCard
          href="/onboarding/upload"
          tag="Most accurate"
          title="Upload my latest checkup report"
          body="Add a PDF or photo of a recent report from your healthcare provider. We pull out the values we can, then you confirm and add anything missing."
          items={["Labs like A1C, cholesterol, vitamin D", "Blood pressure, height and weight", "Your clinician sees the original file", "Add details by hand afterward"]}
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <path d="M14 3v6h6M12 18v-6M9 15l3-3 3 3" />
            </svg>
          }
          featured
        />
      </div>
      <p className="mt-6 text-xs text-muted">
        Your health information is only visible to you and to NutriGoal clinicians and care managers reviewing your account.
      </p>
    </div>
  );
}

function ChoiceCard(p: { href: string; tag: string; title: string; body: string; items: string[]; icon: React.ReactNode; featured?: boolean }) {
  return (
    <Link
      href={p.href}
      className={`card group flex flex-col p-7 transition hover:border-blue hover:shadow-[0_8px_30px_rgba(5,28,44,0.08)] ${p.featured ? "border-navy" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${p.featured ? "bg-navy text-white" : "bg-blue-tint text-blue"}`}>{p.icon}</span>
        <span className="pill bg-mist text-slate">{p.tag}</span>
      </div>
      <h2 className="font-display mt-6 text-2xl">{p.title}</h2>
      <p className="mt-2 text-sm text-slate">{p.body}</p>
      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {p.items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="text-blue" aria-hidden>
              —
            </span>
            {i}
          </li>
        ))}
      </ul>
      <span className="mt-7 inline-flex items-center gap-2 font-bold text-blue">
        Continue <span className="transition group-hover:translate-x-1" aria-hidden>→</span>
      </span>
    </Link>
  );
}
