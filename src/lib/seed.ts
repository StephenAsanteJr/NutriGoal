// Demo data loaded the first time the database is created.
// All people, partners and offers here are fictional sample data.
import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";

/**
 * Shared password for every seeded demo account. Hosted copies should set
 * NUTRIGOAL_DEMO_PASSWORD so the public README's local password doesn't work there.
 * (Applied when the database is first created.)
 */
export const DEMO_PASSWORD = process.env.NUTRIGOAL_DEMO_PASSWORD || "NutriGoal-demo-2026";

export const DEMO_ACCOUNTS = {
  manager: "manager@nutrigoal.test",
  md: "dr.okafor@nutrigoal.test",
  rd: "marcus.lee@nutrigoal.test",
  rd2: "elena.ruiz@nutrigoal.test",
  md2: "dr.grant@nutrigoal.test",
  member: "member@nutrigoal.test",
  member2: "priya.shah@nutrigoal.test",
  member3: "chris.morgan@nutrigoal.test",
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

export function seedIfEmpty(conn: Database.Database) {
  const { n } = conn.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (n > 0) return;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const insertUser = conn.prepare(`INSERT INTO users
    (id, email, password_hash, name, role, clinician_type, credential, specialties, bio, onboarding_complete, created_at)
    VALUES (@id, @email, @hash, @name, @role, @clinician_type, @credential, @specialties, @bio, @onboarding_complete, @created_at)`);

  const users = [
    {
      id: "u_manager",
      email: DEMO_ACCOUNTS.manager,
      name: "Avery Brooks",
      role: "manager",
      clinician_type: null,
      credential: "Clinical Operations Manager",
      specialties: null,
      bio: "Runs the clinician roster, routing rules and the 48-hour response promise.",
      onboarding_complete: 1,
    },
    {
      id: "u_md_okafor",
      email: DEMO_ACCOUNTS.md,
      name: "Dr. Nadia Okafor",
      role: "clinician",
      clinician_type: "MD",
      credential: "MD, Obesity Medicine",
      specialties: JSON.stringify(["glp1_side_effects", "blood_sugar", "fat_loss", "keep_weight_off", "heart_health"]),
      bio: "Board-certified in obesity medicine; focuses on members starting, on, or coming off GLP-1 therapy.",
      onboarding_complete: 1,
    },
    {
      id: "u_rd_lee",
      email: DEMO_ACCOUNTS.rd,
      name: "Marcus Lee",
      role: "clinician",
      clinician_type: "RD",
      credential: "RD, LDN",
      specialties: JSON.stringify(["protein", "muscle_gain", "budget_meals", "fat_loss", "keep_weight_off"]),
      bio: "Registered dietitian specializing in sports nutrition and high-protein plans on a budget.",
      onboarding_complete: 1,
    },
    {
      id: "u_rd_ruiz",
      email: DEMO_ACCOUNTS.rd2,
      name: "Elena Ruiz",
      role: "clinician",
      clinician_type: "RD",
      credential: "RD, CDCES",
      specialties: JSON.stringify(["blood_sugar", "glp1_side_effects", "protein", "budget_meals", "heart_health"]),
      bio: "Dietitian and certified diabetes care specialist; meals the whole family will eat.",
      onboarding_complete: 1,
    },
    {
      id: "u_md_grant",
      email: DEMO_ACCOUNTS.md2,
      name: "Dr. Samuel Grant",
      role: "clinician",
      clinician_type: "MD",
      credential: "MD, Internal Medicine",
      specialties: JSON.stringify(["heart_health", "blood_sugar", "keep_weight_off"]),
      bio: "Internist with a focus on cardiometabolic risk: blood pressure, cholesterol and A1C.",
      onboarding_complete: 1,
    },
    {
      id: "u_member_jordan",
      email: DEMO_ACCOUNTS.member,
      name: "Jordan Taylor",
      role: "member",
      clinician_type: null,
      credential: null,
      specialties: null,
      bio: null,
      onboarding_complete: 1,
    },
    {
      id: "u_member_priya",
      email: DEMO_ACCOUNTS.member2,
      name: "Priya Shah",
      role: "member",
      clinician_type: null,
      credential: null,
      specialties: null,
      bio: null,
      onboarding_complete: 1,
    },
    {
      id: "u_member_chris",
      email: DEMO_ACCOUNTS.member3,
      name: "Chris Morgan",
      role: "member",
      clinician_type: null,
      credential: null,
      specialties: null,
      bio: null,
      onboarding_complete: 1,
    },
  ];

  const insertProfile = conn.prepare(`INSERT INTO profiles
    (user_id, unit_system, sex, age, height_cm, weight_kg, body_fat_pct, meals_per_day, est_calories, workout_min_per_day,
     desired_weight_kg, desired_body_fat_pct, timeframe_weeks, medication_stage, systolic, diastolic, a1c, fasting_glucose,
     total_cholesterol, ldl, hdl, triglycerides, vitamin_d, conditions, source, updated_at)
    VALUES (@user_id, @unit_system, @sex, @age, @height_cm, @weight_kg, @body_fat_pct, @meals_per_day, @est_calories, @workout_min_per_day,
     @desired_weight_kg, @desired_body_fat_pct, @timeframe_weeks, @medication_stage, @systolic, @diastolic, @a1c, @fasting_glucose,
     @total_cholesterol, @ldl, @hdl, @triglycerides, @vitamin_d, @conditions, @source, @updated_at)`);

  const profiles = [
    {
      user_id: "u_member_jordan", unit_system: "imperial", sex: "male", age: 38, height_cm: 178, weight_kg: 98.4,
      body_fat_pct: 30, meals_per_day: 3, est_calories: 2700, workout_min_per_day: 20, desired_weight_kg: 84,
      desired_body_fat_pct: 20, timeframe_weeks: 24, medication_stage: "on_glp1", systolic: 132, diastolic: 84,
      a1c: 5.9, fasting_glucose: 104, total_cholesterol: 214, ldl: 142, hdl: 41, triglycerides: 180, vitamin_d: 24,
      conditions: "Mild nausea for 2 days after weekly injection.", source: "report+manual", updated_at: hoursAgo(80),
    },
    {
      user_id: "u_member_priya", unit_system: "imperial", sex: "female", age: 45, height_cm: 163, weight_kg: 79,
      body_fat_pct: 38, meals_per_day: 3, est_calories: 1900, workout_min_per_day: 30, desired_weight_kg: 70,
      desired_body_fat_pct: 31, timeframe_weeks: 20, medication_stage: "coming_off", systolic: 124, diastolic: 78,
      a1c: 6.6, fasting_glucose: 131, total_cholesterol: 198, ldl: 118, hdl: 52, triglycerides: 150, vitamin_d: 18,
      conditions: "Type 2 diabetes diagnosed 2024; metformin.", source: "report+manual", updated_at: hoursAgo(30),
    },
    {
      user_id: "u_member_chris", unit_system: "metric", sex: "male", age: 29, height_cm: 183, weight_kg: 74,
      body_fat_pct: 14, meals_per_day: 4, est_calories: 2500, workout_min_per_day: 60, desired_weight_kg: 80,
      desired_body_fat_pct: 14, timeframe_weeks: 30, medication_stage: "none", systolic: null, diastolic: null,
      a1c: null, fasting_glucose: null, total_cholesterol: null, ldl: null, hdl: null, triglycerides: null, vitamin_d: null,
      conditions: null, source: "manual", updated_at: hoursAgo(10),
    },
  ];

  const insertTicket = conn.prepare(`INSERT INTO tickets
    (id, user_id, goal_type, goal_statement, typical_diet, setbacks, specific_target, extra_context, status, payment_method,
     goal_group, routing_reason, assigned_clinician_id, created_at, paid_at, assigned_at, due_at, responded_at, member_seen_at)
    VALUES (@id, @user_id, @goal_type, @goal_statement, @typical_diet, @setbacks, @specific_target, @extra_context, @status, @payment_method,
     @goal_group, @routing_reason, @assigned_clinician_id, @created_at, @paid_at, @assigned_at, @due_at, @responded_at, @member_seen_at)`);

  const tickets = [
    {
      id: 1, user_id: "u_member_jordan", goal_type: "protein",
      goal_statement: "Hit my protein target every day while on a GLP-1 without feeling sick.",
      typical_diet: "Coffee for breakfast, a deli sandwich at lunch, chicken or pasta at dinner. Snacks on chips at night.",
      setbacks: "Low appetite and nausea for two days after each weekly shot. I skip meals and then overeat at night.",
      specific_target: "150 g of protein a day, losing fat, not muscle.",
      extra_context: null, status: "responded", payment_method: "one_time",
      goal_group: "on_glp1 × protein",
      routing_reason: "On a GLP-1 → physician-led group. Specialty match: protein-on-GLP-1. Lowest open queue (0).",
      assigned_clinician_id: "u_md_okafor", created_at: hoursAgo(76), paid_at: hoursAgo(76), assigned_at: hoursAgo(76),
      due_at: hoursAgo(28), responded_at: hoursAgo(52), member_seen_at: null,
    },
    {
      id: 2, user_id: "u_member_jordan", goal_type: "heart_health",
      goal_statement: "Bring my LDL and triglycerides down with food before my next physical.",
      typical_diet: "Fried food 3–4 times a week, red meat most days, very little fiber.",
      setbacks: "Eating out for work lunches; not sure what to order.",
      specific_target: "LDL under 130 and triglycerides under 150 at my 6-month labs.",
      extra_context: null, status: "assigned", payment_method: "one_time",
      goal_group: "on_glp1 × heart_health",
      routing_reason: "No high-risk lab flags → dietitian. Specialty match: heart health. Lowest open queue (1).",
      assigned_clinician_id: "u_rd_ruiz", created_at: hoursAgo(5), paid_at: hoursAgo(5), assigned_at: hoursAgo(5),
      due_at: hoursFromNow(43), responded_at: null, member_seen_at: null,
    },
    {
      id: 3, user_id: "u_member_priya", goal_type: "keep_weight_off",
      goal_statement: "Keep the weight off as I come off my GLP-1 next month.",
      typical_diet: "Oatmeal, salads, grilled fish. Portions are small but I'm getting hungrier.",
      setbacks: "Worried about regaining. Evening cravings are back.",
      specific_target: "Stay within 2 kg of my current weight for 6 months after stopping.",
      extra_context: "Type 2 diabetes, on metformin.", status: "in_review", payment_method: "subscription",
      goal_group: "coming_off × keep_weight_off",
      routing_reason: "Lab flag (A1C 6.6%) → physician. Specialty match: keeping weight off. Lowest open queue (0).",
      assigned_clinician_id: "u_md_okafor", created_at: hoursAgo(20), paid_at: hoursAgo(20), assigned_at: hoursAgo(20),
      due_at: hoursFromNow(28), responded_at: null, member_seen_at: null,
    },
  ];

  const steps = [
    { title: "Front-load protein at breakfast", detail: "Have 30–35 g within an hour of waking: Greek yogurt with a scoop of whey, or 3 eggs with cottage cheese.", timeframe: "Days 1–3" },
    { title: "Switch to 4 smaller meals", detail: "Replace 3 large meals with 4 smaller ones every 3–4 hours, each built around a palm-and-a-half of protein.", timeframe: "Week 1" },
    { title: "Keep a liquid protein backup", detail: "On injection days or when nausea hits, use a 30 g protein shake or bone broth instead of skipping the meal.", timeframe: "Week 1" },
    { title: "Track protein, not calories", detail: "Log protein only for two weeks. Target 150 g; 120 g is the floor on hard days.", timeframe: "Weeks 1–2" },
    { title: "Add two strength sessions", detail: "Full-body, 30 minutes, twice a week to hold on to lean mass while fat comes off.", timeframe: "Weeks 2–4" },
    { title: "Recheck labs and body fat", detail: "Repeat A1C and a lipid panel at 12 weeks and send a follow-up ticket with the results.", timeframe: "Months 2–3" },
  ];

  const insertPartner = conn.prepare(`INSERT INTO partners
    (id, name, category, tagline, description, verification, verified_on, location, tags, offer, rating, goal_types)
    VALUES (@id, @name, @category, @tagline, @description, @verification, @verified_on, @location, @tags, @offer, @rating, @goal_types)`);

  const partners = [
    { id: "p_freshcart", name: "FreshCart Market", category: "grocer", tagline: "Same-day groceries, carts built from your plan", description: "Turns the food list in your response ticket into a ready-to-order cart, with high-protein and low-sugar swaps highlighted.", verification: "Food retail license verified", verified_on: "2026-10-02", location: "Delivery in 40+ U.S. metros", tags: ["Delivery", "High-protein", "Plan-to-cart"], offer: "Free delivery on your first plan-built cart", rating: 4.7, goal_types: ["protein", "fat_loss", "muscle_gain", "budget_meals"] },
    { id: "p_harvest", name: "Harvest Co-op Grocers", category: "grocer", tagline: "Local produce and bulk staples", description: "Member-owned co-op with bulk beans, grains and seasonal produce: the backbone of heart-healthy and budget plans.", verification: "Business license & organic certificate verified", verified_on: "2026-09-18", location: "Pickup in 12 states", tags: ["Bulk", "Produce", "Organic"], offer: "10% off bulk legumes and grains", rating: 4.6, goal_types: ["heart_health", "budget_meals", "blood_sugar"] },
    { id: "p_budgetbasket", name: "BudgetBasket", category: "grocer", tagline: "Low-cost staples, price-matched lists", description: "Discount grocer that price-matches the staples dietitians recommend most: eggs, canned fish, frozen vegetables, oats.", verification: "Food retail license verified", verified_on: "2026-08-30", location: "Nationwide shipping", tags: ["Budget", "Staples"], offer: "$5 off a $50 order", rating: 4.4, goal_types: ["budget_meals", "protein"] },
    { id: "p_peak", name: "Peak Nutrition Supply", category: "retailer", tagline: "Third-party tested protein and supplements", description: "Only stocks products with independent lab testing for contents and contaminants. Clinicians can link exact products in plans.", verification: "Third-party testing certificates verified", verified_on: "2026-10-11", location: "Online", tags: ["Protein", "Supplements", "Tested"], offer: "15% off protein powders", rating: 4.8, goal_types: ["protein", "muscle_gain", "glp1_side_effects"] },
    { id: "p_kitchenlab", name: "Kitchen Lab Goods", category: "retailer", tagline: "Food scales, prep containers, blenders", description: "The gear that makes a plan stick: digital food scales, portion containers and blenders for protein shakes.", verification: "Business license verified", verified_on: "2026-07-21", location: "Online", tags: ["Meal prep", "Gear"], offer: "Meal-prep starter kit for $39", rating: 4.5, goal_types: ["fat_loss", "budget_meals", "protein"] },
    { id: "p_stridefit", name: "StrideFit Gear", category: "retailer", tagline: "Bands, dumbbells and home-gym basics", description: "Compact strength equipment for members preserving muscle during weight loss.", verification: "Business license verified", verified_on: "2026-09-05", location: "Online", tags: ["Strength", "Home gym"], offer: "Free resistance band set over $60", rating: 4.5, goal_types: ["muscle_gain", "fat_loss", "keep_weight_off"] },
    { id: "p_carewell", name: "CareWell Pharmacy", category: "pharmacy", tagline: "Licensed pharmacy with GLP-1 refill sync", description: "Syncs refill dates with your plan so nutrition steps line up with dose changes; pharmacist consults included.", verification: "State pharmacy license verified", verified_on: "2026-10-20", location: "Mail order, all 50 states", tags: ["GLP-1", "Refills", "Pharmacist"], offer: "Free pharmacist consult on first refill", rating: 4.7, goal_types: ["glp1_side_effects", "blood_sugar", "keep_weight_off"] },
    { id: "p_quicklab", name: "QuickLab Pharmacy Clinics", category: "pharmacy", tagline: "Walk-in A1C, lipid and vitamin D tests", description: "In-store lab panels with results you can share straight into your NutriGoal build.", verification: "Pharmacy & CLIA-waived lab license verified", verified_on: "2026-09-27", location: "900+ locations", tags: ["Labs", "Walk-in"], offer: "$49 metabolic lab panel", rating: 4.6, goal_types: ["blood_sugar", "heart_health"] },
    { id: "p_northside", name: "Northside Wellness Pharmacy", category: "pharmacy", tagline: "Vitamin D, B12 and electrolyte support", description: "Independent pharmacy carrying pharmacist-selected supplements for deficiencies found on your labs.", verification: "State pharmacy license verified", verified_on: "2026-08-14", location: "Mail order, 38 states", tags: ["Vitamins", "Electrolytes"], offer: "20% off vitamin D3", rating: 4.5, goal_types: ["heart_health", "glp1_side_effects"] },
    { id: "p_maya", name: "Maya Chen, CSCS", category: "coach", tagline: "Strength coaching to protect muscle on a GLP-1", description: "Remote, twice-weekly programs that pair with your clinician's plan. Sends progress notes back to your build.", verification: "Certification & background check verified", verified_on: "2026-10-08", location: "Remote · video", tags: ["Strength", "GLP-1", "Remote"], offer: "First session free", rating: 4.9, goal_types: ["muscle_gain", "glp1_side_effects", "keep_weight_off", "protein"] },
    { id: "p_andre", name: "Andre Wallace, NASM-CPT", category: "coach", tagline: "Beginner-friendly home workouts", description: "20–30 minute sessions with no equipment, built for people starting from zero.", verification: "Certification & background check verified", verified_on: "2026-09-12", location: "Remote · video", tags: ["Beginner", "Home"], offer: "2 weeks for $29", rating: 4.7, goal_types: ["fat_loss", "keep_weight_off"] },
    { id: "p_leila", name: "Leila Haddad, ACE Health Coach", category: "coach", tagline: "Habit coaching between tickets", description: "Weekly accountability calls focused on sleep, cravings and sticking with your plan after the goal.", verification: "Certification & background check verified", verified_on: "2026-08-25", location: "Remote · phone or video", tags: ["Habits", "Maintenance"], offer: "First call free", rating: 4.8, goal_types: ["keep_weight_off", "budget_meals", "fat_loss"] },
  ];

  const insertAddon = conn.prepare(`INSERT INTO addons
    (id, name, description, price_cents, interval, partner_id, included_with_membership, sort)
    VALUES (@id, @name, @description, @price_cents, @interval, @partner_id, @included_with_membership, @sort)`);
  const addons = [
    { id: "support_pack", name: "Daily Support Pack", description: "3–4 meal-timed nudges a day, a 4-week program for your goal group, weekly progress notes and grocery lists from your plan. Quiet hours 9 pm–8 am.", price_cents: 799, interval: "month", partner_id: null, included_with_membership: 1, sort: 1 },
    { id: "plan_to_cart", name: "Plan-to-Cart Grocery Lists", description: "Turns every response ticket into a FreshCart cart you can order in one tap.", price_cents: 499, interval: "month", partner_id: "p_freshcart", included_with_membership: 0, sort: 2 },
    { id: "coach_bundle", name: "Coach Check-in Bundle", description: "Four 30-minute sessions with Maya Chen, CSCS, synced to your clinician's plan.", price_cents: 7900, interval: "once", partner_id: "p_maya", included_with_membership: 0, sort: 3 },
    { id: "lab_panel", name: "Metabolic Lab Panel", description: "A1C, lipid panel and vitamin D at a QuickLab location; results flow into your build automatically.", price_cents: 4900, interval: "once", partner_id: "p_quicklab", included_with_membership: 0, sort: 4 },
    { id: "maintenance", name: "Maintenance Check-ins", description: "Clinician check-ins at 30, 60 and 90 days after you reach your goal, so the weight stays off.", price_cents: 2500, interval: "once", partner_id: null, included_with_membership: 0, sort: 5 },
  ];

  const tx = conn.transaction(() => {
    for (const u of users) insertUser.run({ ...u, hash, created_at: hoursAgo(24 * 14) });
    for (const p of profiles) insertProfile.run(p);
    for (const t of tickets) insertTicket.run(t);
    conn.prepare(`INSERT INTO ticket_responses (id, ticket_id, clinician_id, recommendation, steps_json, ai_assist, created_at)
      VALUES (?, 1, 'u_md_okafor', ?, ?, 'wording', ?)`).run(
      "resp_demo_1",
      "Put protein first at every eating window: four smaller meals of 30–40 g protein, with soft or liquid protein on low-appetite days, plus two short strength sessions a week so the weight you lose is fat, not muscle.",
      JSON.stringify(steps),
      hoursAgo(52),
    );
    const pay = conn.prepare(`INSERT INTO payments (id, user_id, kind, description, amount_cents, card_brand, card_last4, ticket_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'Visa', '4242', ?, ?)`);
    pay.run("pay_demo_1", "u_member_jordan", "ticket", "Goal ticket NG-1001", 1999, 1, hoursAgo(76));
    pay.run("pay_demo_2", "u_member_jordan", "ticket", "Goal ticket NG-1002", 1999, 2, hoursAgo(5));
    pay.run("pay_demo_3", "u_member_priya", "subscription_monthly", "NutriGoal Membership · monthly", 2999, null, hoursAgo(21));
    conn.prepare(`INSERT INTO subscriptions (id, user_id, plan, status, price_cents, started_at, renews_at, ticket_credits, credits_reset_at)
      VALUES ('sub_demo_priya', 'u_member_priya', 'monthly', 'active', 2999, ?, ?, 0, ?)`).run(
      hoursAgo(21), hoursFromNow(24 * 29), hoursFromNow(24 * 29));
    for (const p of partners) insertPartner.run({ ...p, tags: JSON.stringify(p.tags), goal_types: JSON.stringify(p.goal_types) });
    for (const a of addons) insertAddon.run(a);
    conn.prepare(`INSERT INTO notifications (id, user_id, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
      "n_demo_1", "u_member_jordan", "Your response ticket is ready",
      "Dr. Nadia Okafor answered NG-1001: Hit my protein target every day while on a GLP-1.", "/tickets/1", hoursAgo(52));
    conn.prepare(`INSERT INTO staff_notes (id, member_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)`).run(
      "note_demo_1", "u_member_jordan", "u_md_okafor",
      "Nausea pattern tied to injection day. Revisit protein adherence at the 12-week lab recheck.", hoursAgo(50));
  });
  tx();
}

/**
 * Hosted copies: if NUTRIGOAL_DEMO_PASSWORD is set but the demo accounts still use the
 * public local password (e.g. the database was seeded before the variable existed),
 * switch them to the private one. Runs once per server start; cheap after the first time.
 */
export function syncDemoPassword(conn: Database.Database) {
  const pw = process.env.NUTRIGOAL_DEMO_PASSWORD;
  if (!pw || pw === "NutriGoal-demo-2026") return;
  const probe = conn.prepare("SELECT password_hash FROM users WHERE email = ?").get(DEMO_ACCOUNTS.manager) as { password_hash: string } | undefined;
  if (!probe || !bcrypt.compareSync("NutriGoal-demo-2026", probe.password_hash)) return;
  const hash = bcrypt.hashSync(pw, 10);
  const upd = conn.prepare("UPDATE users SET password_hash = ? WHERE email = ?");
  conn.transaction(() => {
    for (const email of Object.values(DEMO_ACCOUNTS)) upd.run(hash, email);
  })();
}
