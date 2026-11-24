import type { computeTrends } from "@/lib/integrations/trends";

export function LabsTable({ labs }: { labs: ReturnType<typeof computeTrends>["labs"] }) {
  if (!labs.length) return null;
  return (
    <section className="card overflow-x-auto">
      <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Lab and vital trends</h2>
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line bg-mist text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="px-6 py-2 font-bold">Test</th>
            <th className="px-3 py-2 font-bold">Latest</th>
            <th className="px-3 py-2 font-bold">Previous</th>
            <th className="px-3 py-2 font-bold">Change</th>
            <th className="px-6 py-2 font-bold">Source</th>
          </tr>
        </thead>
        <tbody>
          {labs.map((l) => {
            const d = l.previous ? l.value - l.previous.value : null;
            return (
              <tr key={l.code} className="border-b border-line last:border-0">
                <td className="px-6 py-2.5 font-bold">{l.label}</td>
                <td className="px-3 py-2.5">
                  {l.value} <span className="text-xs text-muted">{l.unit}</span>
                  <div className="text-[11px] text-muted">{new Date(l.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </td>
                <td className="px-3 py-2.5 text-slate">{l.previous ? `${l.previous.value} ${l.unit}` : "—"}</td>
                <td className="px-3 py-2.5 font-bold">{d == null ? "—" : `${d > 0 ? "▲ +" : d < 0 ? "▼ −" : ""}${Math.abs(Math.round(d * 10) / 10)}`}</td>
                <td className="px-6 py-2.5 text-xs text-slate">{l.source === "epic_fhir" ? "Epic MyChart" : l.source === "api" ? "API" : l.source.includes("ccda") ? "C-CDA file" : l.source.includes("fhir") ? "FHIR file" : l.source}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

