import Image from "next/image";
import Link from "next/link";

/**
 * NutriGoal logo: the brand mark plus the "NUTRI GOAL" wordmark.
 * On dark backgrounds the wordmark switches to white + a brighter blue for contrast.
 */
export function Logo({
  href = "/",
  tone = "dark",
  suffix,
  size = "md",
}: {
  href?: string;
  tone?: "dark" | "light";
  suffix?: string;
  size?: "md" | "lg";
}) {
  const mark = size === "lg" ? 48 : 34;
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="NutriGoal home">
      <Image src="/brand/nutrigoal-mark.png" alt="" width={mark} height={mark} priority className="shrink-0" />
      <span className={`font-brand font-extrabold leading-none tracking-[0.02em] ${size === "lg" ? "text-[28px]" : "text-[19px]"}`}>
        <span className={tone === "dark" ? "text-ink" : "text-white"}>NUTRI</span>{" "}
        <span className={tone === "dark" ? "text-bcg-deep" : "text-bcg"}>GOAL</span>
      </span>
      {suffix && (
        <span className={`ml-1 hidden text-[11px] font-bold uppercase tracking-[0.14em] sm:inline ${tone === "dark" ? "text-muted" : "text-bcg-fresh"}`}>
          {suffix}
        </span>
      )}
    </Link>
  );
}

/** The full original lockup (mark, wordmark and "Health • Balance • Success" tagline). Light backgrounds only. */
export function LogoLockup({ width = 280, className = "" }: { width?: number; className?: string }) {
  return (
    <Image
      src="/brand/nutrigoal-logo.png"
      alt="NutriGoal — Health, Balance, Success"
      width={width}
      height={Math.round((width * 512) / 671)}
      className={className}
      priority
    />
  );
}
