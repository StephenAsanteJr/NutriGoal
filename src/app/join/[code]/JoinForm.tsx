"use client";

import { useActionState } from "react";
import { joinOrganization, type OrgFormState } from "@/actions/org";
import { Alert } from "@/components/ui";

export function JoinOrgForm({ code, orgName, next, compact = false }: { code?: string; orgName?: string; next?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<OrgFormState, FormData>(joinOrganization, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="good">{state.ok}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      {code ? (
        <input type="hidden" name="code" value={code} />
      ) : (
        <div>
          <label htmlFor="org-code" className="label">Invite code</label>
          <input id="org-code" name="code" placeholder="e.g. K7P2QX9M" autoCapitalize="characters" className="input font-mono uppercase" />
        </div>
      )}
      <label className="flex items-start gap-3 text-sm text-slate">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-bcg-deep" />
        <span>
          I want to join {orgName ?? "my organization"} on NutriGoal. I understand they see only de-identified totals for groups of 5 or more
          people, never my name or health information.
        </span>
      </label>
      <button className={compact ? "btn-outline !py-2 text-sm" : "btn-primary w-full !py-3"} disabled={pending}>
        {pending ? "Joining…" : `Join ${orgName ?? "organization"}`}
      </button>
    </form>
  );
}
