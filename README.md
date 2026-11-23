# NutriGoal

**Nutrition answers, by the ticket.** Members build a health profile, send one nutrition goal at a time, and a licensed physician (MD) or registered dietitian (RD) writes back a response ticket: a concise recommendation followed by 5–6 actionable steps, each with a timeframe, within 48 hours.

Product strategy, market sizing and pricing research live in [`Ticket-Based Nutrition App.pptx`](./Ticket-Based%20Nutrition%20App.pptx).

---

## What's built (v0.1)

### Member experience
| Step | What happens |
| --- | --- |
| **Sign up** | Email + password account, consent to clinician review. |
| **Build your profile: choose one of two paths** | **1. Enter health data:** age, sex, height, weight, body fat % (or estimated), meals/day, estimated calories, workout minutes/day, goal weight, goal body fat, and a timeframe. A live preview of the build updates as you type. **2. Upload a checkup report:** PDF/JPG/PNG/WEBP. Text PDFs are read on the server with pattern matching (A1C, lipids, glucose, vitamin D, BP, height, weight, body fat, age, sex), shown back to the member, then pre-filled into the manual form for confirmation and extra details. |
| **Platform guardrails** | Goal weight must be ≥ BMI 18.5; goal body fat ≥ 8% (male) / 15% (female). Timeframe must be at least the safe minimum (≤ 1% body weight/week loss, ≤ 0.35%/week gain, ≤ 0.5 body-fat points/week); the form offers "fastest safe" and "recommended" buttons. |
| **Physical build + biometric card** | A mock body silhouette shaped by height, lean mass (FFMI) and body fat, with a dotted outline of the goal body. Next to it, a biometric card: BMI, body fat, lean/fat mass, BMR (Katch-McArdle or Mifflin-St Jeor), TDEE, daily calorie target, protein, water, per-meal calories, intake gap, timeline, labs, and clinician flags. |
| **Goal ticket** | Goal type, nutritional goal, what they typically eat, setbacks, specific target, extra context. |
| **Split-screen submit** | Same screen, two options side by side: **Option 1:** one-time ticket **$19.99**. **Option 2:** NutriGoal Membership **$29.99/month** or **$300/year** (1 ticket/month + Daily Support Pack + $14.99 extra tickets). Members see "use your included ticket" instead. |
| **Response ticket** | Pushed to the member as an in-app notification; the ticket page shows a progress timeline and the signed response. |
| **Verified marketplace** | Grocers, retailers, pharmacies and fitness coaches with verification badges, offers and "Connect"; unlockable add-ons (Daily Support Pack, Plan-to-Cart lists, coach bundle, lab panel, maintenance check-ins). Available with or without a ticket. |

### Staff experience (clinicians and managers)
- **Routing by plain rules (no AI):** goal group = medication stage × goal type. Physicians take high-risk lab flags and GLP-1 stage + side-effect/blood-sugar goals; dietitians take the rest. Within a type, the clinician with a matching specialty and the shortest open queue wins. The reason is recorded on every ticket.
- **Clinician queue:** KPIs, due-soon flags, 48-hour SLA.
- **Ticket review:** the member's ticket, routing reason, full build + biometric card, uploaded reports, care-team notes, and a **response composer** (recommendation + 5–6 steps with timeframe presets + AI-assist disclosure + signature preview). Only the assigned clinician can sign.
- **Manager operations:** open tickets, SLA, revenue (simulated), clinician load, reassignment, roster, and every member's build.

---

## Design system
McKinsey & Company-inspired: deep navy `#051C2C`, electric blue `#2251FF`, cyan `#00A9F4`, white space, thin rules, square corners, a Bodoni-style serif for display type (Bodoni Moda) and Arial for body text. Tokens live in [`src/app/globals.css`](src/app/globals.css).

## Pricing and plan settings
All prices and membership rules are in [`src/lib/domain.ts`](src/lib/domain.ts) (`PRICES`, `MEMBERSHIP`).

---

## Run it locally

Requires Node.js 20+ (this machine has Node 22 installed at `~/.local/bin`; add it to your PATH first if `node -v` fails):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The SQLite database (`data/nutrigoal.db`) and uploads (`data/uploads/`) are created and seeded automatically on first run. To start over, run `npm run db:reset` and restart.

### Demo accounts (local seed data only)
Every seeded account uses the password **`NutriGoal-demo-2026`** (see [`src/lib/seed.ts`](src/lib/seed.ts)).

| Role | Email |
| --- | --- |
| Member (has a responded ticket) | `member@nutrigoal.test` |
| Member (subscriber, type 2 diabetes) | `priya.shah@nutrigoal.test` |
| Physician, obesity medicine | `dr.okafor@nutrigoal.test` |
| Physician, internal medicine | `dr.grant@nutrigoal.test` |
| Dietitian, RD LDN | `marcus.lee@nutrigoal.test` |
| Dietitian, RD CDCES | `elena.ruiz@nutrigoal.test` |
| Operations manager | `manager@nutrigoal.test` |

**Checkout is simulated.** Use test card `4242 4242 4242 4242` (any future expiry, CVC, ZIP); `4000 0000 0000 0002` simulates a decline. Only the last 4 digits are stored.

A fictional sample checkup PDF for the upload path is at [`public/samples/sample-checkup-report.pdf`](public/samples/sample-checkup-report.pdf) (regenerate with `npm run sample:report`).

---

## Tech stack
- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **SQLite** via `better-sqlite3` behind a small data layer (`src/lib/data.ts`), ready to move to Postgres
- Auth: bcrypt password hashes + signed HTTP-only JWT session cookie (`jose`)
- PDF text extraction: `unpdf`

```
src/
  actions/        Server actions: auth, profile + report upload, tickets + checkout, staff, marketplace
  app/            Routes: landing, (auth), (member) dashboard/onboarding/tickets/marketplace/membership, staff/*, api/reports
  components/     BodyBuild (SVG silhouette), BiometricCard, BuildPanel, ResponseTicket, CardFields, UI primitives
  lib/            biometrics (formulas), silhouette (shape generator), routing rules, report extraction, payments (mock), db + seed
```

---

## Not production-ready yet: next steps
1. **Payments:** swap `src/lib/payments.ts` for Stripe Checkout / PaymentIntents and webhooks; real subscription renewals and cancellation.
2. **Compliance:** HIPAA-eligible hosting and a BAA, encryption at rest for `data/uploads`, audit logs, MFA for staff, staff invitation flow instead of seeded accounts.
3. **Reports:** OCR for photographed reports; patient-portal / records-network import (see deck slide 22).
4. **Notifications:** email/SMS delivery for response tickets; Daily Support Pack nudges.
5. **Ticket follow-up:** the one included follow-up question per ticket and "suggest goal 2" (deck slides 8 and 25).
6. **Marketplace:** real partner onboarding and verification workflow, affiliate tracking with disclosure.
