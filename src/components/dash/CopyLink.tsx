"use client";

import { useState } from "react";

/** Read-only link with a copy button (clinician referral link). */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <input readOnly value={url} className="input min-w-0 !py-1.5 font-mono text-xs" aria-label="Your referral link" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn-dark !px-3 !py-1.5 text-xs"
        onClick={async () => {
          await navigator.clipboard?.writeText(url).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
