// Versioned schema migrations, tracked with SQLite's PRAGMA user_version.
// Each step runs once, in order, inside a transaction.
import type Database from "better-sqlite3";
import { METROS } from "./geo-data";

type Migration = (conn: Database.Database) => void;

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString().slice(0, 10);

const migrations: Migration[] = [
  // v1: avatar + MyFitnessPal-style settings, progress weigh-ins, clinician nudges,
  //     body scans, assistant audit log, and national retailers in the marketplace.
  (conn) => {
    conn.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        skin_tone TEXT NOT NULL DEFAULT 'tone3',
        hair_style TEXT NOT NULL DEFAULT 'short',
        hair_color TEXT NOT NULL DEFAULT '#2b1b12',
        energy_unit TEXT NOT NULL DEFAULT 'kcal',
        water_unit TEXT NOT NULL DEFAULT 'oz',
        calorie_goal_override INTEGER,
        macro_carbs INTEGER NOT NULL DEFAULT 40,
        macro_protein INTEGER NOT NULL DEFAULT 30,
        macro_fat INTEGER NOT NULL DEFAULT 30,
        meal_names TEXT NOT NULL DEFAULT '["Breakfast","Lunch","Dinner","Snacks"]',
        weigh_in_reminder TEXT NOT NULL DEFAULT 'weekly',
        reminder_time TEXT NOT NULL DEFAULT '08:00',
        nudges_enabled INTEGER NOT NULL DEFAULT 1,
        nudges_per_day INTEGER NOT NULL DEFAULT 3,
        quiet_start TEXT NOT NULL DEFAULT '21:00',
        quiet_end TEXT NOT NULL DEFAULT '08:00',
        channel_push INTEGER NOT NULL DEFAULT 1,
        channel_email INTEGER NOT NULL DEFAULT 1,
        channel_sms INTEGER NOT NULL DEFAULT 0,
        share_progress_with_clinician INTEGER NOT NULL DEFAULT 1,
        insights_opt_in INTEGER NOT NULL DEFAULT 0,
        voice_mode INTEGER NOT NULL DEFAULT 1,
        assistant_enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS weigh_ins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        logged_on TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        body_fat_pct REAL,
        waist_cm REAL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_weigh_ins_user ON weigh_ins(user_id, logged_on);

      CREATE TABLE IF NOT EXISTS nudges (
        id TEXT PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        member_id TEXT NOT NULL REFERENCES users(id),
        clinician_id TEXT REFERENCES users(id),
        source TEXT NOT NULL,
        message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_nudges_ticket ON nudges(ticket_id, created_at);

      CREATE TABLE IF NOT EXISTS body_scans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skin_tone TEXT,
        ai_estimate_json TEXT,
        photo_stored_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS assistant_actions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tool TEXT NOT NULL,
        input_json TEXT,
        result TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const cols = (conn.prepare("PRAGMA table_info(partners)").all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes("kind")) conn.exec("ALTER TABLE partners ADD COLUMN kind TEXT NOT NULL DEFAULT 'partner'");
    if (!cols.includes("website")) conn.exec("ALTER TABLE partners ADD COLUMN website TEXT");
    if (!cols.includes("rank_note")) conn.exec("ALTER TABLE partners ADD COLUMN rank_note TEXT");
    if (!cols.includes("sort_rank")) conn.exec("ALTER TABLE partners ADD COLUMN sort_rank INTEGER NOT NULL DEFAULT 100");

    // The largest U.S. players. Public listings only: no partnership, offer or endorsement is implied.
    const grocery = ["budget_meals", "protein", "fat_loss", "heart_health", "blood_sugar", "muscle_gain"];
    const pharmacy = ["glp1_side_effects", "blood_sugar", "heart_health", "keep_weight_off"];
    const national = [
      { id: "n_kroger", name: "Kroger", category: "grocer", rank: 1, website: "https://www.kroger.com", rank_note: "Largest U.S. supermarket chain by sales", tagline: "Supermarkets with pickup and delivery", description: "Operates Kroger, Ralphs, Fred Meyer, King Soopers, Harris Teeter and other banners nationwide.", location: "35 states", tags: ["Supermarket", "Pickup & delivery"], goal_types: grocery },
      { id: "n_albertsons", name: "Albertsons Companies", category: "grocer", rank: 2, website: "https://www.albertsons.com", rank_note: "#2 U.S. supermarket chain by sales", tagline: "Safeway, Albertsons, Vons, Jewel-Osco and more", description: "Supermarket group operating Safeway, Albertsons, Vons, Jewel-Osco, Shaw's, Acme and other regional banners.", location: "34 states + D.C.", tags: ["Supermarket", "Pickup & delivery"], goal_types: grocery },
      { id: "n_publix", name: "Publix", category: "grocer", rank: 3, website: "https://www.publix.com", rank_note: "#3 U.S. supermarket chain by sales", tagline: "Employee-owned supermarkets", description: "Employee-owned supermarket chain concentrated in the Southeast, with in-store pharmacies.", location: "Southeastern U.S.", tags: ["Supermarket", "Southeast"], goal_types: grocery },
      { id: "n_walmart", name: "Walmart", category: "retailer", rank: 1, website: "https://www.walmart.com/cp/grocery/976759", rank_note: "Largest U.S. grocery seller", tagline: "Groceries with store pickup and delivery", description: "The country's largest food retailer, with grocery pickup and delivery from thousands of stores.", location: "Nationwide", tags: ["Food retailer", "Pickup & delivery"], goal_types: grocery },
      { id: "n_costco", name: "Costco Wholesale", category: "retailer", rank: 2, website: "https://www.costco.com", rank_note: "#2 U.S. retailer by share of food & beverage spending", tagline: "Membership warehouse club", description: "Bulk staples, produce and proteins for members; useful for budget and high-protein plans.", location: "Nationwide", tags: ["Warehouse club", "Bulk"], goal_types: grocery },
      { id: "n_amazon", name: "Amazon Fresh & Whole Foods Market", category: "retailer", rank: 3, website: "https://www.amazon.com/fresh", rank_note: "#2 U.S. retailer overall (NRF 2026)", tagline: "Online grocery and Whole Foods stores", description: "Grocery delivery through Amazon Fresh and Whole Foods Market stores and delivery.", location: "Nationwide", tags: ["Online grocery", "Delivery"], goal_types: grocery },
      { id: "n_cvs", name: "CVS Pharmacy", category: "pharmacy", rank: 1, website: "https://www.cvs.com", rank_note: "Largest U.S. pharmacy by prescription revenue (2025)", tagline: "Retail pharmacy and MinuteClinic", description: "Nationwide retail pharmacy chain with prescription delivery and in-store clinics.", location: "Nationwide", tags: ["Retail pharmacy", "Clinics"], goal_types: pharmacy },
      { id: "n_walgreens", name: "Walgreens", category: "pharmacy", rank: 2, website: "https://www.walgreens.com", rank_note: "#2 U.S. pharmacy by prescription revenue (2025)", tagline: "Retail pharmacy chain", description: "Nationwide retail pharmacy chain with prescription pickup and delivery.", location: "Nationwide", tags: ["Retail pharmacy"], goal_types: pharmacy },
      { id: "n_walmart_rx", name: "Walmart Pharmacy", category: "pharmacy", rank: 3, website: "https://www.walmart.com/cp/pharmacy/5431", rank_note: "#3 retail pharmacy chain (excluding PBM mail-order)", tagline: "Pharmacies inside Walmart stores", description: "In-store and mail pharmacy with low-cost generic programs.", location: "Nationwide", tags: ["Retail pharmacy", "Generics"], goal_types: pharmacy },
    ];
    const ins = conn.prepare(`INSERT OR IGNORE INTO partners
      (id, name, category, tagline, description, verification, verified_on, location, tags, offer, rating, goal_types, kind, website, rank_note, sort_rank)
      VALUES (@id, @name, @category, @tagline, @description, 'Public listing · not a NutriGoal partner', '2026-11-23', @location, @tags, NULL, NULL, @goal_types, 'national', @website, @rank_note, @rank)`);
    for (const n of national) ins.run({ ...n, tags: JSON.stringify(n.tags), goal_types: JSON.stringify(n.goal_types) });

    // Demo progress history for the seeded members (only if they exist).
    const hasUser = (id: string) => !!conn.prepare("SELECT 1 FROM users WHERE id = ?").get(id);
    const weigh = conn.prepare("INSERT INTO weigh_ins (id, user_id, logged_on, weight_kg, body_fat_pct, note) VALUES (?, ?, ?, ?, ?, ?)");
    const series = (userId: string, start: number, end: number, weeks: number, bfStart: number, bfEnd: number) => {
      for (let i = 0; i <= weeks; i++) {
        const t = i / weeks;
        const wobble = i === 0 || i === weeks ? 0 : Math.sin(i * 1.7) * 0.35;
        weigh.run(
          `wi_${userId}_${i}`,
          userId,
          daysAgo((weeks - i) * 7),
          Math.round((start + (end - start) * t + wobble) * 10) / 10,
          i % 4 === 0 || i === weeks ? Math.round((bfStart + (bfEnd - bfStart) * t) * 10) / 10 : null,
          i === 0 ? "Starting weight" : null,
        );
      }
    };
    if (hasUser("u_member_jordan") && !conn.prepare("SELECT 1 FROM weigh_ins WHERE user_id = 'u_member_jordan'").get())
      series("u_member_jordan", 103.2, 98.4, 10, 32.5, 30);
    if (hasUser("u_member_priya") && !conn.prepare("SELECT 1 FROM weigh_ins WHERE user_id = 'u_member_priya'").get())
      series("u_member_priya", 82.6, 79, 8, 39.5, 38);
    if (hasUser("u_member_chris") && !conn.prepare("SELECT 1 FROM weigh_ins WHERE user_id = 'u_member_chris'").get())
      series("u_member_chris", 72.4, 74, 6, 14, 14);
    if (hasUser("u_member_jordan"))
      conn.prepare("INSERT OR IGNORE INTO user_settings (user_id, skin_tone, hair_style, hair_color) VALUES ('u_member_jordan', 'tone4', 'short', '#1d1410')").run();
    if (hasUser("u_member_priya"))
      conn.prepare("INSERT OR IGNORE INTO user_settings (user_id, skin_tone, hair_style, hair_color) VALUES ('u_member_priya', 'tone5', 'long', '#120c0a')").run();

    // Every existing member with a profile gets a starting weigh-in if they have none.
    const missing = conn
      .prepare(`SELECT p.user_id, p.weight_kg, p.body_fat_pct, p.updated_at FROM profiles p
                WHERE p.weight_kg IS NOT NULL AND NOT EXISTS (SELECT 1 FROM weigh_ins w WHERE w.user_id = p.user_id)`)
      .all() as { user_id: string; weight_kg: number; body_fat_pct: number | null; updated_at: string }[];
    for (const m of missing)
      weigh.run(`wi_${m.user_id}_start`, m.user_id, m.updated_at.slice(0, 10), m.weight_kg, m.body_fat_pct, "Starting weight");
  },

  // v2: Stripe Checkout + proof-of-payment receipts.
  (conn) => {
    const cols = (conn.prepare("PRAGMA table_info(payments)").all() as { name: string }[]).map((c) => c.name);
    const add = (name: string, type: string) => {
      if (!cols.includes(name)) conn.exec(`ALTER TABLE payments ADD COLUMN ${name} ${type}`);
    };
    add("provider", "TEXT NOT NULL DEFAULT 'demo'");
    add("stripe_session_id", "TEXT");
    add("stripe_payment_intent", "TEXT");
    add("stripe_subscription_id", "TEXT");
    add("receipt_url", "TEXT");
    add("addon_id", "TEXT");
    conn.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_session ON payments(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS checkout_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        description TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        ticket_id INTEGER,
        plan TEXT,
        addon_id TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        payment_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        fulfilled_at TEXT
      );
    `);
  },

  // v3: location + nearby trainers, data integrations (labs, nutrition days, sources),
  //     API/mobile tokens and shareable reports.
  (conn) => {
    const cols = (conn.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[]).map((c) => c.name);
    const add = (name: string, type: string) => {
      if (!cols.includes(name)) conn.exec(`ALTER TABLE user_settings ADD COLUMN ${name} ${type}`);
    };
    add("home_lat", "REAL");
    add("home_lng", "REAL");
    add("home_label", "TEXT");
    add("trainer_radius", "INTEGER NOT NULL DEFAULT 10");
    conn.exec(`
      CREATE TABLE IF NOT EXISTS trainers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        certification TEXT NOT NULL,
        specialty TEXT NOT NULL,
        studio TEXT NOT NULL,
        metro TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        price_cents INTEGER NOT NULL,
        modes TEXT NOT NULL,
        goal_types TEXT NOT NULL,
        rating REAL,
        verified_on TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS trainer_saves (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trainer_id TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'nutrigoal',
        label TEXT,
        saved_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, trainer_id)
      );
      CREATE TABLE IF NOT EXISTS lab_results (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        loinc TEXT,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        observed_on TEXT NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (user_id, code, observed_on, value)
      );
      CREATE INDEX IF NOT EXISTS idx_lab_results_user ON lab_results(user_id, code, observed_on);
      CREATE TABLE IF NOT EXISTS nutrition_days (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day TEXT NOT NULL,
        source TEXT NOT NULL,
        calories REAL,
        protein_g REAL,
        carbs_g REAL,
        fat_g REAL,
        fiber_g REAL,
        sugar_g REAL,
        sodium_mg REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (user_id, day, source)
      );
      CREATE INDEX IF NOT EXISTS idx_nutrition_days_user ON nutrition_days(user_id, day);
      CREATE TABLE IF NOT EXISTS data_sources (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        url TEXT,
        details TEXT,
        records INTEGER NOT NULL DEFAULT 0,
        last_sync_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS api_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        scope TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        prefix TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_used_at TEXT,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS share_links (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        include_json TEXT NOT NULL,
        days INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        views INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    seedTrainers(conn);
    seedIntegrationDemo(conn);
  },

  // v4: self-serve sign-up for clinicians and care managers (approved by a manager).
  (conn) => {
    const cols = (conn.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes("staff_status")) conn.exec("ALTER TABLE users ADD COLUMN staff_status TEXT NOT NULL DEFAULT 'active'");
    if (!cols.includes("license_info")) conn.exec("ALTER TABLE users ADD COLUMN license_info TEXT");
    if (!cols.includes("organization")) conn.exec("ALTER TABLE users ADD COLUMN organization TEXT");
  },
  // v5: clinicians can suggest example foods (by food group) on a response ticket.
  (conn) => {
    const cols = (conn.prepare("PRAGMA table_info(ticket_responses)").all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes("foods_json")) conn.exec("ALTER TABLE ticket_responses ADD COLUMN foods_json TEXT");
  },
  // v6: demo content only. Give the seeded demo plan (NG-1001, Dr. Okafor) example food picks.
  (conn) => {
    const demo = conn
      .prepare(
        `SELECT r.id FROM ticket_responses r JOIN users u ON u.id = r.clinician_id
         WHERE r.ticket_id = 1 AND u.email = 'dr.okafor@nutrigoal.test' AND r.foods_json IS NULL`,
      )
      .get() as { id: string } | undefined;
    if (!demo) return;
    const foods = {
      protein: ["Chicken breast, skinless", "Egg whites", "Tuna, canned in water"],
      dairy: ["Greek yogurt, plain 2%", "Cottage cheese, 2%", "Ultra-filtered milk, 2%"],
      grains: ["Rolled oats"],
      produce: ["Blueberries", "Banana"],
      fats: ["Peanut butter"],
    };
    conn.prepare("UPDATE ticket_responses SET foods_json = ? WHERE id = ?").run(JSON.stringify(foods), demo.id);
  },
];

export function runMigrations(conn: Database.Database) {
  const current = conn.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < migrations.length; v++) {
    conn.transaction(() => {
      migrations[v](conn);
      conn.pragma(`user_version = ${v + 1}`);
    })();
  }
}

// ---------- v3 seed helpers ----------

function seedTrainers(conn: Database.Database) {
  if ((conn.prepare("SELECT COUNT(*) AS n FROM trainers").get() as { n: number }).n > 0) return;
  const first = ["Maya", "Andre", "Leila", "Sam", "Priya", "Marcus", "Elena", "Tomas", "Grace", "Devon", "Rosa", "Kenji", "Aisha", "Luca", "Nina", "Omar"];
  const last = ["Chen", "Wallace", "Haddad", "Ortiz", "Raman", "Brooks", "Kowalski", "Nguyen", "Kim", "Price", "Alvarez", "Sato", "Bello", "Rossi", "Patel", "Farah"];
  const certs = ["NASM-CPT", "ACE-CPT", "NSCA-CSCS", "ACSM-EP", "NASM-CPT, CNC"];
  const specs = [
    { s: "Strength training for GLP-1 users", g: ["glp1_side_effects", "muscle_gain", "keep_weight_off"] },
    { s: "Beginner strength and confidence", g: ["fat_loss", "muscle_gain"] },
    { s: "Fat loss and conditioning", g: ["fat_loss", "keep_weight_off"] },
    { s: "Low-impact training and mobility", g: ["heart_health", "blood_sugar", "keep_weight_off"] },
  ];
  const studios = ["Strength Lab", "Training Studio", "Performance Club", "Fitness Collective"];
  const ins = conn.prepare(`INSERT INTO trainers (id, name, certification, specialty, studio, metro, lat, lng, price_cents, modes, goal_types, rating, verified_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const miles = [1.6, 3.8, 6.4, 9.1, 13.5];
  METROS.forEach((m, mi) => {
    miles.forEach((d, i) => {
      const bearing = ((mi * 47 + i * 83) % 360) * (Math.PI / 180);
      const dLat = (d / 69) * Math.cos(bearing);
      const dLng = (d / (69 * Math.cos((m.lat * Math.PI) / 180))) * Math.sin(bearing);
      const k = mi * 5 + i;
      const spec = specs[k % specs.length];
      ins.run(
        `t_${m.id}_${i}`,
        `${first[k % first.length]} ${last[(k * 7 + 3) % last.length]}`,
        certs[k % certs.length],
        spec.s,
        `${m.neighborhoods[i % m.neighborhoods.length]} ${studios[k % studios.length]}`,
        m.id,
        Math.round((m.lat + dLat) * 10000) / 10000,
        Math.round((m.lng + dLng) * 10000) / 10000,
        5500 + ((k * 900) % 4500),
        i % 3 === 2 ? "In person + virtual" : "In person",
        JSON.stringify(spec.g),
        Math.round((4.5 + ((k * 13) % 5) / 10) * 10) / 10,
        "2026-11-01",
      );
    });
  });
}

function seedIntegrationDemo(conn: Database.Database) {
  if (!conn.prepare("SELECT 1 FROM users WHERE id = 'u_member_jordan'").get()) return;
  if (conn.prepare("SELECT 1 FROM nutrition_days WHERE user_id = 'u_member_jordan'").get()) return;
  const ins = conn.prepare(`INSERT OR IGNORE INTO nutrition_days (id, user_id, day, source, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg)
    VALUES (?, 'u_member_jordan', ?, 'cronometer', ?, ?, ?, ?, ?, ?, ?)`);
  for (let i = 27; i >= 0; i--) {
    if (i % 9 === 4) continue; // a few unlogged days
    const t = (27 - i) / 27;
    const wob = Math.sin(i * 1.9);
    ins.run(
      `nd_demo_${i}`,
      daysAgo(i),
      Math.round(2450 - 420 * t + wob * 160),
      Math.round(95 + 32 * t + wob * 12),
      Math.round(270 - 70 * t + wob * 20),
      Math.round(88 - 16 * t + wob * 8),
      Math.round(16 + 9 * t + wob * 3),
      Math.round(70 - 25 * t + wob * 8),
      Math.round(3100 - 500 * t + wob * 200),
    );
  }
  conn.prepare(`INSERT OR IGNORE INTO data_sources (id, user_id, kind, label, details, records, last_sync_at)
    VALUES ('ds_demo_cron', 'u_member_jordan', 'cronometer', 'Cronometer daily summary export', 'dailysummary.csv', 25, ?)`).run(new Date().toISOString());
  const lab = conn.prepare(`INSERT OR IGNORE INTO lab_results (id, user_id, code, loinc, value, unit, observed_on, source)
    VALUES (?, 'u_member_jordan', ?, ?, ?, ?, ?, ?)`);
  const labs: [string, string, number, string, number][] = [
    ["a1c", "4548-4", 6.1, "%", 200], ["a1c", "4548-4", 5.9, "%", 40],
    ["ldl", "13457-7", 151, "mg/dL", 200], ["ldl", "13457-7", 142, "mg/dL", 40],
    ["hdl", "2085-9", 38, "mg/dL", 200], ["hdl", "2085-9", 41, "mg/dL", 40],
    ["triglycerides", "2571-8", 205, "mg/dL", 200], ["triglycerides", "2571-8", 180, "mg/dL", 40],
    ["vitamin_d", "1989-3", 19, "ng/mL", 200], ["vitamin_d", "1989-3", 24, "ng/mL", 40],
  ];
  labs.forEach(([code, loinc, v, u, ago], i) => lab.run(`lr_demo_${i}`, code, loinc, v, u, daysAgo(ago), "epic_fhir"));
  conn.prepare(`INSERT OR IGNORE INTO data_sources (id, user_id, kind, label, details, records, last_sync_at)
    VALUES ('ds_demo_epic', 'u_member_jordan', 'epic', 'Epic MyChart (sample import)', 'FHIR R4 Observations', 10, ?)`).run(new Date().toISOString());
}
