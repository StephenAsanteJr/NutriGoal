import type { Metadata } from "next";
import { requireOrgManager } from "@/lib/auth";
import { getOrgForManager } from "@/lib/org-wellness";
import { pageOrigin } from "@/lib/origin";
import { regenerateInviteCode } from "@/actions/org";
import { CopyLink } from "@/components/dash/CopyLink";
import { Panel } from "@/components/dash/Parts";
import { OrgSettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Invite and settings" };

export default async function OrgSettings() {
  const user = await requireOrgManager();
  const org = getOrgForManager(user.id);
  if (!org) return null;
  const link = `${await pageOrigin()}/join/${org.invite_code}`;
  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow">Invite and settings</div>
        <h1 className="font-display text-4xl">Invite your people</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate">
          Share the link in your benefits portal, intranet or onboarding email. People join on their own, so NutriGoal never needs an
          employee list from you, and you never learn who joined.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Invite link and code">
          <CopyLink url={link} label="Your organization's invite link" />
          <p className="mt-3 text-sm text-slate">
            Or they can enter code <span className="rounded-[2px] bg-mist px-2 py-0.5 font-mono font-bold text-ink">{org.invite_code}</span> in NutriGoal under
            Membership → Organization, on the web or in the app.
          </p>
          <form action={regenerateInviteCode} className="mt-4">
            <button className="btn-outline !py-2 text-xs">Issue a new code</button>
            <p className="hint">The old link stops working. Members who already joined stay in.</p>
          </form>
          <div className="mt-5 rounded-[3px] bg-mist p-4 text-sm text-slate">
            <div className="font-bold text-ink">Suggested message</div>
            <p className="mt-1">
              We now offer NutriGoal: plans for your own nutrition goals written by licensed physicians and dietitians within 48 hours, covered by{" "}
              {org.name}. We only ever see anonymous group totals, never your name or health information. Join here: {link}
            </p>
          </div>
        </Panel>
        <Panel title="Organization">
          <OrgSettingsForm org={{ name: org.name, industry: org.industry, eligible: org.eligible_count, plan: org.plan }} />
        </Panel>
      </div>
    </div>
  );
}
