import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser, isCareTeam } from "@/lib/auth";
import { db, UPLOAD_DIR } from "@/lib/db";
import type { ReportRow } from "@/lib/data";

/** Streams an uploaded report to its owner, or to active clinicians and NutriGoal management. */
export async function GET(_req: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { id } = await ctx.params;
  const report = db().prepare("SELECT * FROM medical_reports WHERE id = ?").get(id) as ReportRow | undefined;
  if (!report) return new Response("Not found", { status: 404 });
  const careTeam = isCareTeam(user.role) && user.staff_status === "active";
  if (report.user_id !== user.id && !careTeam) return new Response("Not found", { status: 404 });

  const file = path.join(UPLOAD_DIR, path.basename(report.stored_name));
  const data = await fs.readFile(file).catch(() => null);
  if (!data) return new Response("File missing", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": report.mime,
      "Content-Disposition": `inline; filename="${report.original_name.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
