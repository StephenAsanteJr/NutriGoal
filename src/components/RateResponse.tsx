"use client";

import { useActionState, useState } from "react";
import { rateResponse, type RateState } from "@/actions/ratings";

/** Member rates the plan they received. Shows their current rating and lets them change it. */
export function RateResponse({ ticketId, clinician, rating, comment }: { ticketId: number; clinician: string; rating: number | null; comment: string | null }) {
  const [state, action, pending] = useActionState<RateState, FormData>(rateResponse, undefined);
  const [stars, setStars] = useState(rating ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || stars;
  const labels = ["", "Not helpful", "Somewhat helpful", "Helpful", "Very helpful", "Exactly what I needed"];
  return (
    <form action={action} className="card flex flex-wrap items-center gap-4 p-5">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="rating" value={stars} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{rating ? "Your rating" : `How useful was ${clinician}'s plan?`}</div>
        <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}: ${labels[n]}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setStars(n)}
              className="p-0.5"
            >
              <svg viewBox="0 0 20 20" className={`h-7 w-7 transition ${n <= shown ? "text-bcg" : "text-line"}`} fill="currentColor" aria-hidden>
                <path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-xs text-slate">{shown ? labels[shown] : "Tap a star"}</span>
        </div>
      </div>
      <input name="comment" defaultValue={comment ?? ""} maxLength={300} placeholder="Anything to add? (optional)" className="input max-w-sm flex-1 !py-2 text-sm" aria-label="Comment" />
      <button className="btn-dark" disabled={pending || !stars}>{pending ? "Saving…" : rating ? "Update" : "Send rating"}</button>
      {state?.error && <p className="w-full text-xs font-bold text-alert">{state.error}</p>}
      {state?.ok && <p className="w-full text-xs font-bold text-bcg-deep">{state.ok}</p>}
    </form>
  );
}
