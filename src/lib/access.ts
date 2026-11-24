import "server-only";
import { db } from "./db";
import { getActiveSubscription } from "./data";

/**
 * Marketplace paywall: open to any paying customer — an active membership,
 * or at least one paid goal ticket (including tickets covered by a membership).
 */
export function hasMarketplaceAccess(userId: string) {
  if (getActiveSubscription(userId)) return true;
  if (db().prepare("SELECT 1 FROM payments WHERE user_id = ? AND status = 'succeeded' AND kind != 'addon' LIMIT 1").get(userId)) return true;
  return !!db().prepare("SELECT 1 FROM tickets WHERE user_id = ? AND paid_at IS NOT NULL LIMIT 1").get(userId);
}
