import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty } from "./seed";
import { runMigrations } from "./migrations";

// Where the database, uploaded reports and session secret live. Point NUTRIGOAL_DATA_DIR
// at a persistent volume when hosting (for example /data on Railway) so they survive redeploys.
export const DATA_DIR = process.env.NUTRIGOAL_DATA_DIR
  ? path.resolve(process.env.NUTRIGOAL_DATA_DIR)
  : path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = process.env.NUTRIGOAL_DB ?? path.join(DATA_DIR, "nutrigoal.db");

const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member','clinician','manager')),
  clinician_type TEXT CHECK (clinician_type IN ('MD','RD') OR clinician_type IS NULL),
  credential TEXT,
  specialties TEXT,
  bio TEXT,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  unit_system TEXT NOT NULL DEFAULT 'imperial',
  sex TEXT,
  age INTEGER,
  height_cm REAL,
  weight_kg REAL,
  body_fat_pct REAL,
  meals_per_day INTEGER,
  est_calories INTEGER,
  workout_min_per_day INTEGER,
  desired_weight_kg REAL,
  desired_body_fat_pct REAL,
  timeframe_weeks INTEGER,
  medication_stage TEXT,
  systolic INTEGER,
  diastolic INTEGER,
  a1c REAL,
  fasting_glucose REAL,
  total_cholesterol REAL,
  ldl REAL,
  hdl REAL,
  triglycerides REAL,
  vitamin_d REAL,
  conditions TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medical_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  provider TEXT,
  report_date TEXT,
  extracted_json TEXT,
  extraction_note TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  goal_statement TEXT NOT NULL,
  typical_diet TEXT NOT NULL,
  setbacks TEXT NOT NULL,
  specific_target TEXT NOT NULL,
  extra_context TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_payment',
  payment_method TEXT,
  goal_group TEXT,
  routing_reason TEXT,
  assigned_clinician_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  assigned_at TEXT,
  due_at TEXT,
  responded_at TEXT,
  member_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_responses (
  id TEXT PRIMARY KEY,
  ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  clinician_id TEXT NOT NULL REFERENCES users(id),
  recommendation TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  ai_assist TEXT NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly','yearly')),
  status TEXT NOT NULL DEFAULT 'active',
  price_cents INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  renews_at TEXT NOT NULL,
  ticket_credits INTEGER NOT NULL DEFAULT 1,
  credits_reset_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  ticket_id INTEGER REFERENCES tickets(id),
  status TEXT NOT NULL DEFAULT 'succeeded',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  verification TEXT NOT NULL,
  verified_on TEXT NOT NULL,
  location TEXT NOT NULL,
  tags TEXT NOT NULL,
  offer TEXT,
  rating REAL,
  goal_types TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('month','once')),
  partner_id TEXT REFERENCES partners(id),
  included_with_membership INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_addons (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL REFERENCES addons(id),
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, addon_id)
);

CREATE TABLE IF NOT EXISTS partner_connections (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL REFERENCES partners(id),
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, partner_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_notes (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_clinician ON tickets(assigned_clinician_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
`;

type GlobalWithDb = typeof globalThis & { __nutrigoalDb?: Database.Database };

export function db(): Database.Database {
  const g = globalThis as GlobalWithDb;
  if (g.__nutrigoalDb) {
    // In development the connection survives hot reloads; apply any new migrations.
    if (process.env.NODE_ENV !== "production") runMigrations(g.__nutrigoalDb);
    return g.__nutrigoalDb;
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const conn = new Database(DB_PATH);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.exec(SCHEMA);
  seedIfEmpty(conn);
  runMigrations(conn);
  g.__nutrigoalDb = conn;
  return conn;
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
