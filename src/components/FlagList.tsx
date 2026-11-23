import type { Flag } from "@/lib/biometrics";

const STYLE = {
  alert: "bg-alert-tint text-alert",
  warn: "bg-warn-tint text-warn",
  info: "bg-mist text-slate",
} as const;

export function FlagList({ flags, title = "Flags for your clinician" }: { flags: Flag[]; title?: string }) {
  if (!flags.length) return null;
  const order = { alert: 0, warn: 1, info: 2 };
  const sorted = [...flags].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <div>
      <div className="eyebrow mb-2 !text-slate">{title}</div>
      <ul className="flex flex-wrap gap-2">
        {sorted.map((f) => (
          <li key={f.text} className={`pill ${STYLE[f.level]}`}>
            <span aria-hidden>{f.level === "alert" ? "●" : f.level === "warn" ? "▲" : "i"}</span>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
