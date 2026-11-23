import { getCurrentUser } from "@/lib/auth";
import { AiError, aiAvailable, estimateBodyFromPhoto } from "@/lib/ai";
import { db, newId, nowIso } from "@/lib/db";
import { getProfile } from "@/lib/data";

const MAX_BASE64 = 6_000_000; // ~4.5 MB image

/**
 * Optional AI body estimate from a member's photo. The photo is sent to the AI
 * model for this one request and is never written to disk.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "member") return Response.json({ error: "Sign in as a member." }, { status: 401 });
  if (!aiAvailable()) return Response.json({ error: "AI body estimates aren't switched on for this server yet." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { image?: string; mediaType?: string; skinTone?: string } | null;
  const media = body?.mediaType;
  if (!body?.image || body.image.length > MAX_BASE64 || (media !== "image/jpeg" && media !== "image/png" && media !== "image/webp"))
    return Response.json({ error: "Send one JPG, PNG or WEBP photo under 4 MB." }, { status: 400 });

  try {
    const result = await estimateBodyFromPhoto(body.image, media, getProfile(user.id)?.sex ?? null);
    db()
      .prepare("INSERT INTO body_scans (id, user_id, skin_tone, ai_estimate_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(newId(), user.id, body.skinTone ?? null, JSON.stringify(result), nowIso());
    return Response.json({ result });
  } catch (e) {
    const msg = e instanceof AiError ? e.message : "Something went wrong estimating from this photo.";
    return Response.json({ error: msg }, { status: 502 });
  }
}

export async function GET() {
  return Response.json({ ai: aiAvailable() });
}
