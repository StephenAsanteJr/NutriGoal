import type { Step } from "@/lib/data";
import { goalLabel, ticketNumber } from "@/lib/domain";
import { planScript } from "@/lib/voice-text";
import { ListenButton } from "./Voice";
import { ClinicianFoodsList } from "./FoodGuide";
import type { ClinicianFoods } from "@/lib/foods";

type Props = {
  ticketId: number;
  goalType: string;
  goalStatement: string;
  recommendation: string;
  steps: Step[];
  clinicianName: string;
  clinicianCredential: string | null;
  aiAssist: "none" | "wording";
  respondedAt: string;
  foods?: ClinicianFoods | null;
};

/** The response ticket pushed back to the member. */
export function ResponseTicket(p: Props) {
  const date = new Date(p.respondedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    <article className="card overflow-hidden" aria-label="Response ticket">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-navy px-6 py-4 text-white">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan">Response ticket · {ticketNumber(p.ticketId)}</div>
          <div className="mt-1 text-sm text-white/80">
            {goalLabel(p.goalType)} — “{p.goalStatement}”
          </div>
        </div>
        <div className="text-right text-xs text-white/70">
          <div className="font-bold text-white">{p.clinicianName}</div>
          <div>
            {p.clinicianCredential} · {date}
          </div>
        </div>
      </header>

      <section className="border-b border-line bg-blue-tint/50 px-6 py-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="eyebrow !mb-0">Recommendation</div>
          <ListenButton label="Listen to this plan" title={`Plan for ${ticketNumber(p.ticketId)}`} text={planScript({ recommendation: p.recommendation, steps: p.steps, foods: p.foods, clinician: `${p.clinicianName}${p.clinicianCredential ? `, ${p.clinicianCredential}` : ""}` })} />
        </div>
        <p className="font-display text-[22px] leading-snug text-navy">{p.recommendation}</p>
      </section>

      <section className="px-6 py-5">
        <div className="eyebrow mb-4">Your action steps</div>
        <ol className="space-y-0">
          {p.steps.map((s, i) => (
            <li key={i} className="grid grid-cols-[40px_1fr_auto] items-start gap-4 border-b border-line py-4 last:border-b-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{i + 1}</span>
              <div>
                <div className="font-bold text-navy">{s.title}</div>
                <p className="mt-0.5 text-sm text-slate">{s.detail}</p>
              </div>
              <span className="pill whitespace-nowrap bg-cyan-tint text-navy">
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 4.5V8l2.3 1.5" />
                </svg>
                {s.timeframe}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {p.foods && <ClinicianFoodsList foods={p.foods} clinician={p.clinicianName} />}

      <footer className="border-t border-line bg-mist px-6 py-3 text-xs text-slate">
        Written and reviewed by {p.clinicianName}
        {p.clinicianCredential ? `, ${p.clinicianCredential}` : ""}. AI writing help:{" "}
        {p.aiAssist === "wording" ? "used for wording only" : "not used"}. This plan is general nutrition guidance, not a diagnosis;
        talk to your own doctor before changing medicines.
      </footer>
    </article>
  );
}
