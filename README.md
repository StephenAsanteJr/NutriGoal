<p align="center"><img src="public/brand/nutrigoal-logo.png" alt="NutriGoal — Health · Balance · Success" width="260"></p>

# NutriGoal

**Real words from real people. Proven methods. No AI slop.** NutriGoal deliberately doesn't rely on AI-generated advice: every plan is written and signed by a physician, dietitian or nutritionist, using methods they've proven and tested before passing them on. It's built for people short on time or energy but ready to invest in their nutritional health: self-healthcare with expert direction. (Software handles logistics such as routing, reminders and finding stores, never the advice.)

**Nutrition answers, by the ticket.** Members build a health profile, send one nutrition goal at a time, and a licensed physician (MD) or registered dietitian (RD) writes back a response ticket: a concise recommendation followed by 5–6 actionable steps, each with a timeframe, within 48 hours.

Product strategy, market sizing and pricing research live in [`Ticket-Based Nutrition App.pptx`](./Ticket-Based%20Nutrition%20App.pptx).

---

## What's built

### Member experience
| Area | What it does |
| --- | --- |
| **About you (demographics), before biometrics** | Age, gender (optional), occupation and a typical workday, city/region/country, who they live with and household size, who cooks, languages, cultural background, eating pattern (halal, kosher, vegetarian…) and the **cuisines they eat most**. Clinicians read it with every ticket; the food guide opens on the member's cuisines. Editable later under Membership → Settings. Never shared with an organization. |
| **Sign up & two onboarding paths** | **1. Enter health data:** age, sex, height, weight, body fat % (or estimated), meals/day, estimated calories, workout minutes/day, goal weight, goal body fat and a timeframe the platform checks is safe. **2. Upload a checkup report** (PDF/photo): text PDFs are read on the server, values are shown back, then pre-filled for confirmation and extra details. |
| **Animated character build** | The physical build is a cartoon character shaped by height, lean mass and body fat, in the member's chosen **skin tone** and hair. It breathes and blinks; a **Today ↔ Goal** toggle, slider and "Play transformation" morph it toward the goal body, with a dotted outline and a side-by-side Today vs Goal comparison. |
| **Photo body scan (optional)** | Take a photo with the camera or upload one. Skin tone is sampled **in the browser** (tap your cheek or forearm). With consent, the photo can be sent once to Claude for a rough body-fat range; it is never saved. |
| **Biometric card** | BMI, body fat, lean/fat mass, BMR, TDEE, calorie target, protein, water, per-meal calories, timeline, labs and clinician flags. |
| **Goal tickets + voice mode** | Goal type, goal, typical diet, setbacks, target. **Voice mode:** speak the whole ticket and it's sorted into the fields (Claude when configured, keyword rules otherwise), or tap the mic on any single field. |
| **Split-screen submit** | Option 1: one-time ticket **$19.99**. Option 2: Membership **$29.99/month** or **$300/year** (1 ticket/month + Daily Support Pack + $14.99 extra tickets). |
| **Payments: Stripe + proof of payment** | With Stripe keys set, every purchase goes through **Stripe Checkout** (one-time and subscriptions) and returns to a **proof-of-payment receipt** with the Stripe payment ID and a link to Stripe's own receipt. Without keys, a demo checkout runs the same flow. |
| **Membership tab** | **Overview:** plan, the member's build, daily calorie and macro targets, payments and receipts. **Progress:** weigh-in log, weight chart vs. the safe path to goal (hover for details), stats and history. **Settings (MyFitnessPal-style):** character, goals and weekly rate, custom calories, macro split, units (lb/kg, kcal/kJ, oz/ml), meal names, weigh-in reminders, nudges and quiet hours, notification channels, privacy, assistant and voice toggles. |
| **Marketplace (paywall)** | Open to **any paying customer** (a paid ticket or an active membership); others see a locked preview. **Certified trainers within 5 or 10 miles** (ZIP code or "use my location"; sample verified trainers in 16 launch metros, plus optional Google Maps results). **Food-tracking app picks** (MyFitnessPal, Cronometer, MacroFactor, FatSecret, Lose It!), ranked by fit with the member's goals. Then the **top 3 U.S. supermarket grocers** (Kroger, Albertsons, Publix), **food retailers** (Walmart, Costco, Amazon Fresh & Whole Foods) and **retail pharmacies** (CVS, Walgreens, Walmart Pharmacy) as public listings, clearly marked as not NutriGoal partners. Plus verified partners (grocers, retailers, pharmacies, fitness coaches) and unlockable add-ons. Available with or without a ticket. |
| **Health data & integrations** | **Data** page: nutrition **trends** (calories and protein vs. targets, fiber, sodium, macro split, lab history) with rule-based insights. **Connect:** Epic MyChart via SMART on FHIR, FHIR JSON / C-CDA XML record exports, MyChart "Share Everywhere" codes, and CSV exports from MyFitnessPal, Cronometer, MacroFactor, FatSecret and Lose It!. **Share:** expiring, revocable read-only report links for the member's own doctor or trainer. **API:** personal tokens plus `POST /api/v1/nutrition`, `POST /api/v1/health-records` (FHIR R4 / LOINC) and `GET /api/v1/trends` (docs at `/developers`). Clinicians see connected data on ticket and member pages. |
| **NutriGoal Assistant (AI)** | A chat widget on every member page. It searches the marketplace, saves stores, lists and unlocks add-ons (paid ones always go through the member's own checkout), checks ticket status and **nudges the assigned clinician** (rate-limited to once per 6 hours per ticket). It never gives medical advice; it points members to goal tickets instead. |
| **Foods by culture** | Daily servings across five food groups, with swappable **ingredients from 37 cuisines worldwide** grouped by region (American, Southern & soul food, Mexican, Caribbean, Brazilian, Peruvian, Colombian; Italian, French, Spanish & Portuguese, Greek, British & Irish, German, Eastern European, Nordic; Lebanese, Turkish, Persian, North African, Israeli; Ghanaian, Nigerian, Senegalese, Ethiopian, East African, Southern African; North Indian, South Indian & Sri Lankan, Pakistani & Bangladeshi; Chinese, Japanese, Korean; Thai, Vietnamese, Filipino, Indonesian & Malaysian, Hawaiian & Pacific Islander). Every ingredient is sized so one serving matches its group's typical serving at least 80% ([`src/lib/cuisines.ts`](src/lib/cuisines.ts)). Clinicians pick suggested foods from the member's cuisines or any other. |
| **Mobile app (Expo)** | A native iOS/Android app in [`mobile/`](mobile) with a **bubble-button** interface for all four roles. **Members:** character + targets, new ticket, tickets, build, log weight, marketplace, assistant, alerts. **Clinicians:** queue, respond next (full composer), due soon, nudged, alerts. **NutriGoal management:** open tickets, due soon, clinician load, revenue, ops and finance summaries. **Organizational managers:** de-identified wellness totals, the monthly bill and a share sheet for the invite link. Payments open web checkout through a one-time signed-in link. |
| **Mobile web** | Responsive on phones with a bottom tab bar, a floating assistant button, and an installable app (web manifest, home-screen icons, offline screen). |

### Four account types
| Role | Who | What they can see |
| --- | --- | --- |
| **Member** | Consumers | Their own build, tickets, plans and data. |
| **Clinician** | MDs, DOs, registered dietitians, nutritionists (license-checked) | Tickets assigned to them, with the member's build, data and "About the member". |
| **Organizational manager** | Employers, health plans, schools, unions | **Only de-identified group totals** for members who joined with their invite link. No names, tickets, plans or health values; nothing covering fewer than 5 people. |
| **NutriGoal management** | People who run NutriGoal | Everything that used to belong to "care managers": ops and finance dashboards, all tickets, clinician applications, marketplace listings, member builds, plus **Organizations**. |

### Enterprise plan and double-blind organizational wellness
- **Public page** `/enterprise`: four illustrative plans (90-day **Pilot** $5,000 flat; **Team** $16, **Growth** $13 and **Enterprise** $10 per enrolled member per month, plus a platform fee and one-time setup) and an interactive **cost rundown**: headcount, enrollment, plan usage and extras → every line of the bill, cost per enrolled member and per eligible person (PEPM), and the comparison with members paying on their own. Prices live in [`src/lib/enterprise.ts`](src/lib/enterprise.ts).
- **Organization portal** `/org`: enrollment, 30-day activity, a 0–100 wellness index (average progress toward each person's own goal) and the share of people **getting closer to, holding or straying from their goals**, today and month by month, plus a clearly labeled **sample preview** for walkthroughs. `/org/plan` shows their plan and cost rundown; `/org/settings` the invite link/code and organization details.
- **Double-blind by design** ([`src/lib/org-wellness.ts`](src/lib/org-wellness.ts)): reports are computed on the server from members who opted in, only aggregates leave, groups under 5 are withheld and shares are rounded to 5%. Clinician-facing code never reads organization membership, so clinicians don't know who sponsors a member. Members join at `/join/CODE` (or with the code in Membership) after a plain-language explanation, and can leave any time.
- **NutriGoal management → Organizations**: customers, contacts, enrollment counts, monthly bills, status (pilot / active / paused) and plan changes, enterprise MRR, and a **deal model** that adds clinician payouts and contribution margin to the cost rundown (for pricing and investor conversations).

### Staff experience (clinicians and NutriGoal management)
- **Routing by plain rules (no AI):** goal group = medication stage × goal type → physician or dietitian, then specialty match and shortest queue.
- **Queue** with 48-hour SLA, due-soon flags and **⚑ Nudged ×N** badges.
- **Ticket review:** member ticket, routing reason, the member's animated build + biometric card, reports, care-team notes, nudge history.
- **Response composer with voice mode:** dictate the whole response and it's formatted into a recommendation + 5–6 timed steps for the clinician to review and sign. When Claude does the formatting, the "AI writing help: wording only" disclosure is set automatically. Only the assigned clinician can sign.
- **NutriGoal management operations:** KPIs, clinician load, reassignment, **send a nudge**, roster, ops and finance dashboards (Excel and Tableau export), organizations.

---

## Run it locally

```bash
export PATH="$HOME/.local/bin:$PATH"   # Node 22 installed for this project
npm install
npm run dev
```

Open http://localhost:3000. The SQLite database and uploads are created in `data/`; schema migrations apply automatically. A new database starts **empty** (no sample people or businesses). To load the fictional demo data for local development, start with `NUTRIGOAL_SEED_DEMO=1 npm run dev` on a fresh database (`npm run db:reset`).

### First-time setup (owner account)
On a fresh install, the first person to sign up as **NutriGoal management** (/signup → NutriGoal team) is approved automatically and becomes the owner. Do this right after deploying. After that, clinicians and other management accounts apply through **/signup** and are approved on **Clinicians**. Organizations sign up at **/signup → Organization** (or from /enterprise); their portal opens right away as a pilot because it only ever shows group totals. Paid tickets that arrive before any clinician is approved wait as "Matching a clinician" and are routed automatically when the first clinician is approved.

### Run the mobile app
With the web app running (`npm run dev`):

```bash
cd mobile && npm install && npx expo start
```

Scan the QR code with **Expo Go** (free on the App Store / Google Play); your phone must be on the same Wi-Fi as this Mac. The app talks to the site in `mobile/app.json` (`extra.apiUrl`, the live site by default); set `EXPO_PUBLIC_API_URL=http://localhost:3000` to use your local web app. Press `w` to open it in a browser instead.

### Turn on the integrations (optional)
Copy `.env.example` to `.env.local`, fill in what you need, and restart `npm run dev`.

| Key | Enables |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI assistant, voice-mode formatting, photo body-fat estimates. Uses **Claude Opus 5.5** (`claude-opus-5-5`) through the Messages API with server-side refusal fallbacks (`fallbacks: "default"`). Without it, the assistant and voice mode use keyword rules. |
| `STRIPE_SECRET_KEY` | Real Stripe Checkout for tickets, memberships and add-ons, with proof-of-payment receipts. Use a **test-mode** key (`sk_test_…`). |
| `EPIC_CLIENT_ID` | "Connect MyChart" (SMART on FHIR). Register a free app at fhir.epic.com; the default endpoint is Epic's sandbox. |
| `GOOGLE_PLACES_API_KEY` | Adds unverified Google Maps trainers to the 5–10 mile search. |
| `STRIPE_WEBHOOK_SECRET` | Webhook fulfilment and membership renewals. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Continue with Google" (web and app). Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). Authorized redirect URI: `<APP_URL>/auth/oauth/google/callback`. |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | "Continue with Apple". Apple Developer → Identifiers → Services ID (= `APPLE_CLIENT_ID`) with Sign in with Apple, return URL `<APP_URL>/auth/oauth/apple/callback`; Keys → a Sign in with Apple key (`APPLE_KEY_ID`, and the .p8 file's contents as `APPLE_PRIVATE_KEY`). |
| `SSO_ISSUER`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_LABEL` | Company single sign-on through any OpenID Connect provider (Okta, Microsoft Entra ID, Google Workspace, Auth0…). Redirect URI `<APP_URL>/auth/oauth/sso/callback`; `SSO_LABEL` is the button text, e.g. "Continue with Okta". |

Sign-in buttons appear only for providers whose variables are set. New people who sign in with a provider get a member account; clinicians, organizations and NutriGoal management sign up with the form, then can sign in with a provider that uses the same verified email.

### Clinician license verification
When a clinician applies, NutriGoal pulls their record from the federal **NPPES NPI Registry** (CMS's public directory; no key needed) and checks it against the application: active individual NPI, name, profession (NUCC taxonomy: physician, registered dietitian or nutritionist) and the state license number and state listed on the record. Applicants can look themselves up by NPI or name to pre-fill the form. NutriGoal management sees the result on **Clinicians → Applications**, with links to the NPI record, FSMB DocInfo (physicians), CDR credential verification (dietitians) and the state board's lookup, and record their state board check before approving. The NPI Registry is self-reported by providers, so the state board check stays a required manual step.

### Brand colors
Two brand colors on white: **BCG green** for action and progress (primary buttons, focus, selection, success) and **Bain red** for attention and navigation (section labels, links, the active tab, counts, deadlines). Ink and dark surfaces are BCG's midnight green. `node scripts/brand-balance.mjs` reports the green/red split and fails if any McKinsey blue or cyan comes back.

Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.

### Demo data (local development only)
`NUTRIGOAL_SEED_DEMO=1` on a fresh database loads fictional members, clinicians, a NutriGoal management account and sample partners (password **`NutriGoal-demo-2026`**, see [`src/lib/seed.ts`](src/lib/seed.ts)). Production never loads it, and migration v10 removed it from existing databases.

Demo checkout (no Stripe key): `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines.

---

## Host it (Railway)

NutriGoal needs a running Node server and a disk for its SQLite database, so it can't run on GitHub Pages.

1. In Railway: **New Project → Deploy from GitHub repo → StephenAsanteJr/NutriGoal**. It builds with `npm run build` and starts with `npm start` (Node 22, from `.nvmrc`).
2. Add a **Volume** to the service, mounted at `/data`.
3. Add the variable `NUTRIGOAL_DATA_DIR=/data` so the database, uploaded reports and session secret survive redeploys. Optional: `APP_URL` (your public URL, for Stripe redirects), Stripe test-mode keys, and `ANTHROPIC_API_KEY` (leave it unset on a public demo unless you accept the usage cost; without it the assistant and voice mode use keyword rules).
4. **Settings → Networking → Generate Domain** to get the shareable link.

Right after the first deploy, sign up as NutriGoal management (/signup → NutriGoal team) to become the owner. For a separate demo copy with sample data, deploy another service with `NUTRIGOAL_SEED_DEMO=1` and `NUTRIGOAL_DEMO_BANNER=on`. Before storing real member health information, see the compliance step below.

## Tech stack
- **Next.js 16** (App Router, Server Actions, Turbopack) · **React 19** · **TypeScript** · **Tailwind CSS 4**
- **SQLite** (`better-sqlite3`) with versioned migrations (`src/lib/migrations.ts`)
- **Claude** via `@anthropic-ai/sdk` (tool runner for the assistant; structured outputs for voice and scans)
- **Stripe** via the official `stripe` SDK (Checkout Sessions, webhooks)
- Auth: bcrypt + signed HTTP-only JWT cookie (`jose`) · PDF text: `unpdf`

```
mobile/        Expo (React Native) bubble-button app: src/app (Expo Router screens), src/components, src/lib (API client, session)
src/
  actions/     auth, profile + report upload, tickets + checkout, settings + weigh-ins, staff, marketplace
  app/         landing, (auth), (member) dashboard/onboarding/tickets/marketplace/membership/payments, staff/*,
               api/{assistant,voice,scan,reports,stripe/webhook}, payments/complete, manifest
  components/  AvatarBuild (animated character), BiometricCard, BuildPanel, PhotoScan, Voice, Assistant,
               ProgressChart, MobileNav, ResponseTicket, LookPicker, Logo
  lib/integrations/  csv, nutrition (tracker exports), fhir (FHIR + C-CDA, LOINC), epic (SMART on FHIR), tokens, trends + share links
  lib/         access (paywall), trainers + geo-data, responses, biometrics, silhouette, routing, nudges, ai, agent, stripe, fulfillment, payments (demo),
               report-extract, voice-fallback, migrations, db + seed
```

---

## Not production-ready yet: next steps
1. **Compliance:** HIPAA-eligible hosting and BAAs (including any AI vendor and sign-in provider you use with PHI), encryption at rest for `data/uploads`, audit log review, MFA for staff, periodic license re-verification.
2. **Stripe:** customer portal for cancelling or updating cards; tie subscription status to Stripe events beyond renewals.
3. **Notifications:** deliver nudges, reminders and response tickets by email/SMS/push (settings are stored; sending isn't wired).
4. **Marketplace:** NutriGoal management lists verified partners and trainers on **Staff → Marketplace**; next: partner self-onboarding, affiliate tracking with disclosure, store-specific cart building.
5. **Ticket follow-up:** the included follow-up question and "suggest goal 2" (deck slides 8 and 25).
