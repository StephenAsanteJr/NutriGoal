// The site's public address. Behind Railway's proxy, a route handler's req.url carries the internal
// address (https://localhost:8080), so redirects and links built from it send people nowhere.
// Prefer APP_URL, then the forwarded host the proxy passes along.

export function publicOrigin(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ? `${req.headers.get("x-forwarded-proto") ?? "https"}://${host}` : new URL(req.url).origin;
}

/** A 303 redirect to a path on this site, at its public address. */
export function redirectTo(req: Request, path: string) {
  return Response.redirect(new URL(path, publicOrigin(req)), 303);
}

/** The site's public address from inside a server component or action. */
export async function pageOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")}://${host}`;
}
