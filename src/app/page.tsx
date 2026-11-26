import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo, LogoLockup } from "@/components/Logo";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { PRICES, money } from "@/lib/domain";

const STEPS = [
  { n: "01", title: "Build your profile", body: "Enter your health data or upload your latest checkup report. We turn it into a physical build and biometric card." },
  { n: "02", title: "Open a goal ticket", body: "One goal at a time: what you eat, what gets in the way, and the exact target you want to hit." },
  { n: "03", title: "Pay once or join", body: `${money(PRICES.ticketOneTime)} for a single ticket, or a membership that includes a ticket every month.` },
  { n: "04", title: "A clinician writes back", body: "Plain rules route your ticket to a matched physician or dietitian. They read it and write your plan." },
  { n: "05", title: "Follow 5–6 clear steps", body: "A concise recommendation up top and 5–6 action steps, each with a timeframe, within 48 hours." },
];

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Logo tone="light" />
          <nav className="flex items-center gap-6 text-sm font-bold text-white">
            <a href="#why" className="hidden hover:text-bcg-fresh sm:inline">Why NutriGoal</a>
            <a href="#how" className="hidden hover:text-bcg-fresh sm:inline">How it works</a>
            <a href="#pricing" className="hidden hover:text-bcg-fresh sm:inline">Pricing</a>
            <a href="#join" className="hidden hover:text-bcg-fresh sm:inline">Join</a>
            <a href="#partners" className="hidden hover:text-bcg-fresh sm:inline">Partners</a>
            <Link href="/login" className="hover:text-bcg-fresh">Sign in</Link>
            <Link href="/signup" className="btn-primary !py-2">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy pb-24 pt-40 text-white">
        <svg className="pointer-events-none absolute -right-40 -top-24 h-[720px] w-[720px] opacity-30" viewBox="0 0 400 400" aria-hidden>
          {/* McKinsey blue and cyan, with one BCG green and one Bain red ring */}
          {[
            [190, "#2251FF"],
            [150, "#21BF61"],
            [110, "#00A9F4"],
            [70, "#CC0000"],
          ].map(([r, c]) => (
            <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={c as string} strokeWidth="1" />
          ))}
        </svg>
        <div className="relative mx-auto grid grid-cols-1 max-w-7xl gap-12 px-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bcg-fresh">Real people. Proven methods. No AI slop.</div>
            <h1 className="font-display mt-5 text-5xl leading-[1.05] sm:text-6xl">
              Nutrition answers,
              <br />
              by the ticket.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/80">
              Send in one nutrition goal at a time. A licensed physician, dietitian or nutritionist reads it and writes back a plan in
              their own words, using methods they&apos;ve already proven in practice, within 48 hours.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary !px-7 !py-3 text-base">Create your free account</Link>
              <a href="#how" className="btn !border !border-white/40 !px-7 !py-3 text-base text-white hover:bg-white/10">See how it works</a>
            </div>
            <p className="mt-4 text-xs text-white/50">Free to sign up and build your profile. Pay only when you send a ticket.</p>
          </div>

          <div className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-[3px] bg-white/15">
            {[
              ["48 hrs", "to a written plan from a real clinician"],
              ["5–6", "actionable steps, each with a timeframe"],
              [money(PRICES.ticketOneTime), "per ticket vs. $75–150 for a dietitian visit"],
              ["0", "AI-written plans: a credentialed person writes and signs every one"],
            ].map(([k, v]) => (
              <div key={k} className="bg-navy/80 p-6">
                <div className="font-display text-4xl text-white">{k}</div>
                <div className="mt-2 text-sm text-white/70">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value proposition */}
      <section id="why" className="border-b border-line bg-white py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <div className="eyebrow">Why NutriGoal</div>
            <h2 className="font-display mt-3 text-4xl leading-tight">Real words from real people who know what they&apos;re doing</h2>
            <p className="mt-4 text-slate">
              The internet is full of AI-generated meal plans and recycled advice. We deliberately don&apos;t rely on it. Every plan comes from a
              physician, dietitian or nutritionist, and every method they recommend has been proven and tested before it&apos;s passed on to
              you.
            </p>
            <p className="mt-4 text-sm text-slate">
              Where we use software, it handles logistics (sorting your ticket, reminders, finding a store), never the advice. If a clinician
              uses a tool to tidy their wording, the plan says so.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-3">
            {[
              ["Written by credentialed people", "MDs, registered dietitians and nutritionists read your goal and write your plan in their own words, then sign it with their name and credential."],
              ["Proven before it's passed on", "Recommendations come from methods our clinicians have used, tested and seen work in practice, backed by evidence, not trends or a chatbot's guess."],
              ["Built for busy people who invest in themselves", "For people short on time or energy but ready to invest in their nutritional health. This is self-healthcare: expert direction without weeks of research or appointments."],
            ].map(([t, b], i) => (
              <div key={t} className="bg-white p-6">
                <div className={`font-display text-3xl ${["text-blue", "text-bcg-deep", "text-bain"][i]}`}>0{i + 1}</div>
                <div className="font-display mt-2 text-2xl leading-snug text-navy">{t}</div>
                <p className="mt-3 text-sm text-slate">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join as */}
      <section id="join" className="border-b border-bain/10 bg-bain-tint py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="eyebrow">Join NutriGoal</div>
          <h2 className="font-display mt-3 text-4xl">Sign up the way you&apos;ll use it</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["member", "For members", "Get a written plan for one goal at a time from a physician or dietitian.", "Sign up as a member"],
              ["clinician", "For clinicians", "MDs, DOs, registered dietitians and nutritionists: answer tickets in your specialty, on your schedule.", "Apply as a clinician"],
              ["manager", "For care managers", "Run routing, clinician load and the 48-hour promise for your team.", "Apply as a care manager"],
            ].map(([role, title, body, cta]) => (
              <div key={role} className="card flex flex-col p-6">
                <div className="font-bold">{title}</div>
                <p className="mt-2 flex-1 text-sm text-slate">{body}</p>
                <Link href={`/signup?role=${role}`} className={`mt-5 ${role === "member" ? "btn-primary" : "btn-outline"}`}>{cta}</Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Clinician and care manager accounts are verified and approved before they can see any member information.</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-line py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="eyebrow">How a goal ticket works</div>
          <h2 className="font-display mt-3 max-w-3xl text-4xl leading-tight">One goal, one plan, written by a clinician who knows that kind of goal</h2>
          <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-[3px] bg-line md:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-white p-6">
                <div className={`font-display text-3xl ${["text-blue", "text-bcg-deep", "text-bain"][(Number(s.n) - 1) % 3]}`}>{s.n}</div>
                <div className="mt-3 font-bold">{s.title}</div>
                <p className="mt-2 text-sm text-slate">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Two ways in */}
      <section className="bg-mist py-20">
        <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="eyebrow">Your build</div>
            <h2 className="font-display mt-3 text-4xl leading-tight">Two ways to give your clinician the full picture</h2>
            <p className="mt-4 text-slate">
              Every member gets a physical build and biometric card: BMI, body fat, lean mass, daily energy needs, protein target and a
              safe timeline to your goal. Doctors, dietitians and care managers see the same view when they review your ticket.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-tint text-blue" aria-hidden>✎</div>
              <h3 className="mt-4 text-lg font-bold">Enter it yourself</h3>
              <p className="mt-2 text-sm text-slate">Age, height, weight, body fat, meals, calories, activity and the goal you want, with a timeframe the platform checks is safe.</p>
            </div>
            <div className="card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bcg-tint text-bcg-deep" aria-hidden>⇪</div>
              <h3 className="mt-4 text-lg font-bold">Upload your checkup</h3>
              <p className="mt-2 text-sm text-slate">Add your latest report from a healthcare provider. We pull out labs like A1C and cholesterol, then you confirm and fill any gaps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="eyebrow">Pricing</div>
          <h2 className="font-display mt-3 text-4xl">Pay per ticket, or join for a ticket every month</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <PriceCard
              name="Single ticket"
              price={money(PRICES.ticketOneTime)}
              unit="one time"
              points={["One goal, one written plan", "Matched physician or dietitian", "Response within 48 hours"]}
            />
            <PriceCard
              featured
              name="Membership"
              price={money(PRICES.subscriptionMonthly)}
              unit="per month"
              points={["1 goal ticket every month", `Daily Support Pack (${money(PRICES.supportPack)}/mo value)`, `Extra tickets at ${money(PRICES.extraTicketMember)}`, "Member offers from verified partners"]}
            />
            <PriceCard
              name="Membership · annual"
              price={money(PRICES.subscriptionYearly)}
              unit="per year"
              points={["Everything in Membership", `Save ${money(PRICES.subscriptionMonthly * 12 - PRICES.subscriptionYearly)} a year`, "Locks in your price for 12 months"]}
            />
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="bg-bcg-midnight py-20 text-white">
        <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-6 lg:grid-cols-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bcg-fresh">Verified partner marketplace</div>
            <h2 className="font-display mt-3 text-4xl leading-tight">Grocers, retailers, pharmacies and coaches that fit your plan</h2>
            <p className="mt-4 text-white/75">
              Included for members and ticket holders: certified trainers within 5–10 miles, independent tracking-app picks, and the stores and
              pharmacies you already use. Each verified partner&apos;s license or certification is checked before they&apos;re listed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] bg-white/15">
            {[
              ["Grocers", "Plan-built carts and budget staples"],
              ["Retailers", "Tested protein, scales and prep gear"],
              ["Pharmacies", "Refill sync and walk-in lab panels"],
              ["Trainers near you", "Certified trainers within 5–10 miles"],
            ].map(([k, v]) => (
              <div key={k} className="bg-bcg-midnight p-6">
                <div className="font-bold">{k}</div>
                <div className="mt-1 text-sm text-white/70">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted">
          <LogoLockup width={150} />
          <p className="max-w-xl">
            NutriGoal provides general nutrition guidance from licensed clinicians. It is not emergency care and does not replace your own
            doctor. Demo build: payments are simulated.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PriceCard({ name, price, unit, points, featured }: { name: string; price: string; unit: string; points: string[]; featured?: boolean }) {
  return (
    <div className={`card flex flex-col p-7 ${featured ? "border-bain ring-1 ring-bain" : ""}`}>
      {featured && <div className="mb-3 self-start rounded-full bg-bcg-tint px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-bcg-deep">Most value</div>}
      <div className="font-bold">{name}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl">{price}</span>
        <span className="text-sm text-muted">{unit}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="font-bold text-bcg-deep" aria-hidden>✓</span>
            {p}
          </li>
        ))}
      </ul>
      <Link href="/signup" className={`mt-7 ${featured ? "btn-primary" : "btn-outline"}`}>
        Get started
      </Link>
    </div>
  );
}
