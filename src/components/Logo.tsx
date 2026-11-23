import Link from "next/link";

export function Logo({ href = "/", tone = "dark", suffix }: { href?: string; tone?: "dark" | "light"; suffix?: string }) {
  const color = tone === "dark" ? "text-navy" : "text-white";
  return (
    <Link href={href} className={`group inline-flex items-baseline gap-2 ${color}`} aria-label="NutriGoal home">
      <span className="relative inline-flex h-7 w-7 items-center justify-center self-center" aria-hidden>
        <svg viewBox="0 0 28 28" className="h-7 w-7">
          <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="7" fill="none" stroke="#2251FF" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="2.6" fill="#00A9F4" />
        </svg>
      </span>
      <span className="font-display text-[22px] font-semibold leading-none">NutriGoal</span>
      {suffix && (
        <span className={`ml-1 text-[11px] font-bold uppercase tracking-[0.14em] ${tone === "dark" ? "text-muted" : "text-cyan"}`}>
          {suffix}
        </span>
      )}
    </Link>
  );
}
