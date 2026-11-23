import { getCurrentUser } from "@/lib/auth";
import { completeCheckout, stripeEnabled } from "@/lib/stripe";
import { nextUrlAfter } from "@/lib/fulfillment";

/** Stripe Checkout success_url: verify the session with Stripe, record proof of payment, fulfil, then redirect. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = (path: string) => Response.redirect(new URL(path, url.origin), 303);
  const user = await getCurrentUser();
  if (!user) return to("/login");
  const sessionId = url.searchParams.get("session_id");
  if (!stripeEnabled() || !sessionId) return to("/membership");
  try {
    const res = await completeCheckout(sessionId, user.id);
    if (!res.ok) return to(`/membership?payment_error=${encodeURIComponent(res.error)}`);
    return to(nextUrlAfter({ kind: res.row.kind, ticketId: res.row.ticket_id }, res.paymentId));
  } catch {
    return to(`/membership?payment_error=${encodeURIComponent("We couldn't confirm your payment with Stripe yet. Refresh in a moment.")}`);
  }
}
