import { enabledProviders, type ProviderId } from "@/lib/oauth";

function Icon({ id }: { id: ProviderId }) {
  if (id === "google")
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" />
      </svg>
    );
  if (id === "apple")
    return (
      <svg viewBox="0 0 384 512" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** "Continue with Google / Apple / SSO". Renders only the providers configured on the server. */
export function SsoButtons({ next = "", referral = "", divider = "or use email" }: { next?: string; referral?: string; divider?: string }) {
  const providers = enabledProviders();
  if (!providers.length) return null;
  const qs = (p: ProviderId) => `/auth/oauth/${p}/start?${new URLSearchParams({ ...(next ? { next } : {}), ...(referral ? { ref: referral } : {}) }).toString()}`;
  return (
    <div className="mt-6">
      <div className="grid gap-2">
        {providers.map((p) => (
          <a
            key={p.id}
            href={qs(p.id)}
            className={`flex items-center justify-center gap-3 rounded-[3px] border px-4 py-2.5 text-sm font-bold transition ${
              p.id === "apple" ? "border-black bg-black text-white hover:bg-[#222]" : p.id === "google" ? "border-[#dadce0] bg-white text-[#1f1f1f] hover:bg-[#f8f9fa]" : "border-ink bg-white text-ink hover:bg-mist"
            }`}
          >
            <Icon id={p.id} />
            {p.label}
          </a>
        ))}
      </div>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-line" />
        {divider}
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
