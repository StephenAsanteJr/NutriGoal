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
    <div className="flex min-h-screen flex-col">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Logo tone="light" />
          <nav className="flex items-center gap-6 text-sm font-bold text-white">
            <a href="#how" className="hidden hover:text-cyan sm:inline">How it works</a>
            <a href="#pricing" className="hidden hover:text-cyan sm:inline">Pricing</a>
            <a href="#partners" className="hidden hover:text-cyan sm:inline">Partners</a>
            <Link href="/login" className="hover:text-cyan">Sign in</Link>
            <Link href="/signup" className="btn-primary !py-2">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy pb-24 pt-40 text-white">
        <svg className="pointer-events-none absolute -right-40 -top-24 h-[720px] w-[720px] opacity-30" viewBox="0 0 400 400" aria-hidden>
          {[190, 150, 110, 70].map((r, i) => (
            <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={i % 2 ? "#00A9F4" : "#2251FF"} strokeWidth="1" />
          ))}
        </svg>
        <div className="relative mx-auto grid grid-cols-1 max-w-7xl gap-12 px-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan">Nutrition, answered by people</div>
            <h1 className="font-display mt-5 text-5xl leading-[1.05] sm:text-6xl">
              Nutrition answers,
              <br />
              by the ticket.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/80">
              Send in one nutrition goal at a time. A licensed physician or registered dietitian reads it and writes back a plan
              within 48 hours, with 5–6 steps you can start today.
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
              ["0", "AI-written answers: people review every ticket"],
            ].map(([k, v]) => (
              <div key={k} className="bg-navy/80 p-6">
                <div className="font-display text-4xl text-white">{k}</div>
                <div className="mt-2 text-sm text-white/70">{v}</div>
              </div>
            ))}
          </div>
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
                <div className="font-display text-3xl text-blue">{s.n}</div>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-tint text-navy" aria-hidden>⇪</div>
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
      <section id="partners" className="bg-navy py-20 text-white">
        <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-6 lg:grid-cols-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan">Verified partner marketplace</div>
            <h2 className="font-display mt-3 text-4xl leading-tight">Grocers, retailers, pharmacies and coaches that fit your plan</h2>
            <p className="mt-4 text-white/75">
              Open to every member, with or without a ticket. Each partner&apos;s license or certification is checked before they&apos;re listed, and
              add-ons like the Daily Support Pack and lab panels can be unlocked any time.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] bg-white/15">
            {[
              ["Grocers", "Plan-built carts and budget staples"],
              ["Retailers", "Tested protein, scales and prep gear"],
              ["Pharmacies", "Refill sync and walk-in lab panels"],
              ["Fitness coaches", "Strength and habit coaching"],
            ].map(([k, v]) => (
              <div key={k} className="bg-navy p-6">
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
    <div className={`card flex flex-col p-7 ${featured ? "border-blue ring-1 ring-blue" : ""}`}>
      {featured && <div className="eyebrow mb-3">Most value</div>}
      <div className="font-bold">{name}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl">{price}</span>
        <span className="text-sm text-muted">{unit}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="text-blue" aria-hidden>✓</span>
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
