import { Logo, LogoLockup } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col">
        <Logo tone="light" />
        <div className="mt-auto max-w-md">
          <p className="font-display text-3xl leading-snug">Real words from real people who know what they&apos;re doing.</p>
          <p className="mt-4 text-sm text-white/70">
            Plans written and signed by physicians, dietitians and nutritionists, using methods proven in practice. No AI slop. Self-healthcare
            for people short on time, not on ambition.
          </p>
        </div>
        <svg className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] opacity-30" viewBox="0 0 400 400" aria-hidden>
          {[190, 140, 90].map((r, i) => (
            <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={i % 2 ? "#00A9F4" : "#2251FF"} strokeWidth="1" />
          ))}
        </svg>
      </aside>
      <main className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <LogoLockup width={190} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
