import { getCurrentUser } from "@/lib/auth";
import { runVoiceMode } from "@/lib/voice-mode";

/** Voice mode for the website: spoken transcript → ticket fields (members) or a response draft (clinicians). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const r = await runVoiceMode(user, await req.json().catch(() => null));
  return Response.json(r.body, { status: r.status });
}
