// Metro areas with seeded (sample) trainers, and approximate ZIP-prefix centroids.
// A production build would use a geocoding provider; this keeps location lookups
// on our own server for the demo.

export type Metro = { id: string; name: string; lat: number; lng: number; zip3: string[]; neighborhoods: string[] };

export const METROS: Metro[] = [
  { id: "nyc", name: "New York, NY", lat: 40.7128, lng: -74.006, zip3: ["100", "101", "102", "103", "104", "110", "111", "112", "113", "114", "070", "071", "073"], neighborhoods: ["Chelsea", "Astoria", "Park Slope", "Harlem", "Jersey City"] },
  { id: "chi", name: "Chicago, IL", lat: 41.8781, lng: -87.6298, zip3: ["606", "607", "608", "600", "601", "603"], neighborhoods: ["River North", "Wicker Park", "Lincoln Park", "Hyde Park", "Oak Park"] },
  { id: "la", name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, zip3: ["900", "902", "903", "904", "905", "910", "911", "912", "913", "914"], neighborhoods: ["Silver Lake", "Koreatown", "Culver City", "Pasadena", "Santa Monica"] },
  { id: "sf", name: "San Francisco Bay Area, CA", lat: 37.7749, lng: -122.4194, zip3: ["940", "941", "944", "945", "946", "947", "948", "949"], neighborhoods: ["Mission", "SoMa", "Oakland", "Berkeley", "Daly City"] },
  { id: "hou", name: "Houston, TX", lat: 29.7604, lng: -95.3698, zip3: ["770", "772", "773", "774", "775"], neighborhoods: ["Montrose", "Heights", "Midtown", "Bellaire", "Galleria"] },
  { id: "dal", name: "Dallas–Fort Worth, TX", lat: 32.7767, lng: -96.797, zip3: ["750", "751", "752", "753", "760", "761"], neighborhoods: ["Uptown", "Deep Ellum", "Oak Lawn", "Richardson", "Irving"] },
  { id: "atl", name: "Atlanta, GA", lat: 33.749, lng: -84.388, zip3: ["300", "301", "302", "303", "311"], neighborhoods: ["Midtown", "Inman Park", "Buckhead", "Decatur", "West End"] },
  { id: "mia", name: "Miami, FL", lat: 25.7617, lng: -80.1918, zip3: ["330", "331", "332", "333"], neighborhoods: ["Brickell", "Wynwood", "Coral Gables", "Little Havana", "Miami Beach"] },
  { id: "bos", name: "Boston, MA", lat: 42.3601, lng: -71.0589, zip3: ["021", "022", "024", "019"], neighborhoods: ["Back Bay", "Cambridge", "Somerville", "Jamaica Plain", "Brookline"] },
  { id: "sea", name: "Seattle, WA", lat: 47.6062, lng: -122.3321, zip3: ["980", "981", "982"], neighborhoods: ["Capitol Hill", "Fremont", "Ballard", "Bellevue", "Beacon Hill"] },
  { id: "den", name: "Denver, CO", lat: 39.7392, lng: -104.9903, zip3: ["800", "801", "802", "803"], neighborhoods: ["LoDo", "Highlands", "Cherry Creek", "Wash Park", "Lakewood"] },
  { id: "phx", name: "Phoenix, AZ", lat: 33.4484, lng: -112.074, zip3: ["850", "852", "853"], neighborhoods: ["Arcadia", "Tempe", "Scottsdale", "Midtown", "Mesa"] },
  { id: "phl", name: "Philadelphia, PA", lat: 39.9526, lng: -75.1652, zip3: ["190", "191", "080", "081"], neighborhoods: ["Fishtown", "Center City", "University City", "Manayunk", "Camden"] },
  { id: "dc", name: "Washington, DC", lat: 38.9072, lng: -77.0369, zip3: ["200", "202", "203", "204", "205", "207", "208", "209", "220", "221", "222", "223"], neighborhoods: ["Dupont Circle", "Navy Yard", "Arlington", "Silver Spring", "Alexandria"] },
  { id: "aus", name: "Austin, TX", lat: 30.2672, lng: -97.7431, zip3: ["786", "787"], neighborhoods: ["East Austin", "South Congress", "Mueller", "Hyde Park", "Round Rock"] },
  { id: "clt", name: "Charlotte, NC", lat: 35.2271, lng: -80.8431, zip3: ["280", "281", "282"], neighborhoods: ["South End", "NoDa", "Plaza Midwood", "Ballantyne", "Dilworth"] },
];

/** Approximate location for a U.S. ZIP code (metro centroid by 3-digit prefix). */
export function locateZip(zip: string) {
  const z = zip.trim().slice(0, 3);
  if (!/^\d{3}$/.test(z)) return null;
  const m = METROS.find((x) => x.zip3.includes(z));
  return m ? { lat: m.lat, lng: m.lng, label: `${zip.trim().slice(0, 5)} · ${m.name}` } : null;
}

export function nearestMetro(lat: number, lng: number) {
  let best = METROS[0];
  let bd = Infinity;
  for (const m of METROS) {
    const d = milesBetween(lat, lng, m.lat, m.lng);
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return { metro: best, miles: bd };
}

/** Great-circle distance in miles. */
export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
