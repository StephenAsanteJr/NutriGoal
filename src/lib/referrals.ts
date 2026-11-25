// Clinician referral links: each clinician shares /signup?ref=CODE; members who sign up through it
// are attributed to that clinician, and "converted" once they make a first payment.
import crypto from "node:crypto";

/** "Dr. Nadia Okafor" → "OKAFOR-7KQ2": readable, unique enough, no lookalike characters. */
export function referralCode(name: string) {
  const last = (name.replace(/^Dr\.\s+/, "").split(/\s+/).at(-1) ?? "NG").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) || "NG";
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const tail = Array.from(crypto.randomBytes(4), (b) => alphabet[b % alphabet.length]).join("");
  return `${last}-${tail}`;
}
