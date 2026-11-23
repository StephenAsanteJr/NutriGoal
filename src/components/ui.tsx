import type { ReactNode } from "react";
import { TICKET_STATUS, type TicketStatus } from "@/lib/domain";

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="max-w-3xl">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="font-display text-3xl leading-tight text-navy sm:text-4xl">{title}</h1>
        {children && <div className="mt-2 text-[15px] text-slate">{children}</div>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}

const TONE = {
  warn: "bg-warn-tint text-warn",
  info: "bg-blue-tint text-blue",
  good: "bg-good-tint text-good",
} as const;

export function StatusPill({ status }: { status: string }) {
  const s = TICKET_STATUS[status as TicketStatus] ?? { label: status, tone: "info" as const };
  return <span className={`pill ${TONE[s.tone]}`}>{s.label}</span>;
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({ tone = "alert", children }: { tone?: "alert" | "good" | "info" | "warn"; children: ReactNode }) {
  const cls = {
    alert: "border-alert/30 bg-alert-tint text-alert",
    good: "border-good/30 bg-good-tint text-good",
    info: "border-blue/20 bg-blue-tint text-navy",
    warn: "border-warn/30 bg-warn-tint text-warn",
  }[tone];
  return (
    <div role={tone === "alert" ? "alert" : "status"} className={`rounded-[2px] border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const abs = Math.abs(s);
  const fmt = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"}`;
  let out: string;
  if (abs < 60) out = "just now";
  else if (abs < 3600) out = fmt(Math.round(abs / 60), "minute");
  else if (abs < 86400) out = fmt(Math.round(abs / 3600), "hour");
  else out = fmt(Math.round(abs / 86400), "day");
  if (out === "just now") return out;
  return s >= 0 ? `${out} ago` : `in ${out}`;
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Hours from now until `iso` (negative when it's in the past). */
export function hoursUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 3600_000;
}

export function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}
