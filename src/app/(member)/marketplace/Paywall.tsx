import Link from "next/link";
import { PRICES, money } from "@/lib/domain";

/** Locked preview shown to members who haven't paid for a ticket or membership yet. */
export function Paywall() {
  const tiles = [
    ["Certified trainers within 5–10 miles", "Strength, mobility and beginner coaches near you, verified by NutriGoal."],
    ["The right tracking app for your goal", "Independent picks among MyFitnessPal, Cronometer, MacroFactor, FatSecret and Lose It!"],
    ["Top U.S. grocers and pharmacies", "Kroger, Walmart, Costco, CVS, Walgreens and more, plus verified partner offers."],
    ["Add-ons", "Daily Support Pack, lab panels, coach bundles and plan-to-cart grocery lists."],
  ];
  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow mb-2">Marketplace</div>
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">Unlock the marketplace</h1>
        <p className="mt-2 max-w-2xl text-slate">
          The marketplace opens with your first goal ticket or a membership. It&apos;s where your plan meets real life: people, apps and
          stores that help you follow through.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-[3px] border border-line">
        <div className="grid grid-cols-1 gap-px bg-line blur-[2px] select-none sm:grid-cols-2" aria-hidden>
          {tiles.map(([t, b]) => (
            <div key={t} className="bg-white p-6">
              <div className="font-bold">{t}</div>
              <p className="mt-1 text-sm text-slate">{b}</p>
              <div className="mt-4 h-2 w-2/3 rounded bg-mist" />
              <div className="mt-2 h-2 w-1/2 rounded bg-mist" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 p-4">
          <div className="card max-w-md p-6 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy text-xl text-white" aria-hidden>🔒</div>
            <h2 className="font-display mt-3 text-2xl">For members and ticket holders</h2>
            <p className="mt-2 text-sm text-slate">Send your first goal ticket ({money(PRICES.ticketOneTime)}) or join the membership to open it.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/tickets/new" className="btn-primary">Send a goal ticket</Link>
              <Link href="/membership" className="btn-outline">See membership</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
