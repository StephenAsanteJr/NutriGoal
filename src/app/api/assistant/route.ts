import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { runAgent, type ChatMessage } from "@/lib/agent";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "member") return Response.json({ error: "Sign in as a member." }, { status: 401 });
  if (!getSettings(user.id).assistant_enabled) return Response.json({ error: "The assistant is turned off in your settings." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { messages?: ChatMessage[] } | null;
  if (!Array.isArray(body?.messages)) return Response.json({ error: "Bad request." }, { status: 400 });
  return Response.json(await runAgent(user, body.messages));
}
