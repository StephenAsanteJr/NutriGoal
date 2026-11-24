import "server-only";
// Trainers near the member: NutriGoal-verified sample trainers from our own table,
// plus (optionally) live results from Google Maps when GOOGLE_PLACES_API_KEY is set.

import { db, nowIso } from "./db";
import { milesBetween, nearestMetro } from "./geo-data";

export type Location = { lat: number; lng: number; label: string | null; radius: number };
export type NearbyTrainer = {
  id: string;
  name: string;
  certification: string;
  specialty: string;
  studio: string;
  miles: number;
  price_cents: number | null;
  modes: string;
  rating: number | null;
  goal_types: string[];
  source: "nutrigoal" | "google";
  url?: string | null;
  address?: string | null;
  saved: boolean;
};

export function getLocation(userId: string): Location | null {
  const r = db().prepare("SELECT home_lat, home_lng, home_label, trainer_radius FROM user_settings WHERE user_id = ?").get(userId) as
    | { home_lat: number | null; home_lng: number | null; home_label: string | null; trainer_radius: number | null }
    | undefined;
  if (!r || r.home_lat == null || r.home_lng == null) return null;
  return { lat: r.home_lat, lng: r.home_lng, label: r.home_label, radius: r.trainer_radius === 5 ? 5 : 10 };
}

export function saveLocation(userId: string, loc: { lat: number; lng: number; label: string | null; radius?: number }) {
  // Store a rounded location (~1 km) — enough for a 5–10 mile search, without a precise address.
  const lat = Math.round(loc.lat * 100) / 100;
  const lng = Math.round(loc.lng * 100) / 100;
  db().prepare("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)").run(userId);
  db()
    .prepare("UPDATE user_settings SET home_lat = ?, home_lng = ?, home_label = ?, trainer_radius = COALESCE(?, trainer_radius), updated_at = ? WHERE user_id = ?")
    .run(lat, lng, loc.label, loc.radius ?? null, nowIso(), userId);
}

export function setRadius(userId: string, radius: number) {
  db().prepare("UPDATE user_settings SET trainer_radius = ? WHERE user_id = ?").run(radius === 5 ? 5 : 10, userId);
}

type TrainerRow = {
  id: string; name: string; certification: string; specialty: string; studio: string; lat: number; lng: number;
  price_cents: number; modes: string; goal_types: string; rating: number | null;
};

export async function trainersNear(userId: string, loc: Location) {
  const saved = new Set(
    (db().prepare("SELECT trainer_id FROM trainer_saves WHERE user_id = ?").all(userId) as { trainer_id: string }[]).map((r) => r.trainer_id),
  );
  const rows = db().prepare("SELECT * FROM trainers").all() as TrainerRow[];
  const verified: NearbyTrainer[] = rows
    .map((t) => ({ t, miles: milesBetween(loc.lat, loc.lng, t.lat, t.lng) }))
    .filter((x) => x.miles <= loc.radius)
    .sort((a, b) => a.miles - b.miles)
    .map(({ t, miles }) => ({
      id: t.id,
      name: t.name,
      certification: t.certification,
      specialty: t.specialty,
      studio: t.studio,
      miles,
      price_cents: t.price_cents,
      modes: t.modes,
      rating: t.rating,
      goal_types: JSON.parse(t.goal_types),
      source: "nutrigoal",
      saved: saved.has(t.id),
    }));
  const google = await googleTrainers(loc).catch(() => []);
  return {
    verified,
    google: google.map((g) => ({ ...g, saved: saved.has(g.id) })),
    googleEnabled: !!process.env.GOOGLE_PLACES_API_KEY,
    coverage: nearestMetro(loc.lat, loc.lng),
  };
}

// ---- Google Places (New) Text Search — optional ----
const cache = new Map<string, { at: number; data: NearbyTrainer[] }>();

async function googleTrainers(loc: Location): Promise<NearbyTrainer[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  const cacheKey = `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)},${loc.radius}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < 3600_000) return hit.data;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.websiteUri,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery: "certified personal trainer",
      pageSize: 10,
      locationBias: { circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: Math.min(50000, loc.radius * 1609) } },
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const d = (await res.json()) as {
    places?: { id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; rating?: number; websiteUri?: string; googleMapsUri?: string }[];
  };
  const out: NearbyTrainer[] = (d.places ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      id: `g_${p.id}`,
      name: p.displayName?.text ?? "Trainer",
      certification: "Not verified by NutriGoal",
      specialty: "Personal training",
      studio: p.formattedAddress ?? "",
      miles: milesBetween(loc.lat, loc.lng, p.location!.latitude, p.location!.longitude),
      price_cents: null,
      modes: "See listing",
      rating: p.rating ?? null,
      goal_types: [],
      source: "google" as const,
      url: p.websiteUri ?? p.googleMapsUri ?? null,
      address: p.formattedAddress ?? null,
      saved: false,
    }))
    .filter((t) => t.miles <= loc.radius)
    .sort((a, b) => a.miles - b.miles);
  cache.set(cacheKey, { at: Date.now(), data: out });
  return out;
}
