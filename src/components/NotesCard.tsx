import { addStaffNote } from "@/actions/staff";
import type { listStaffNotes } from "@/lib/data";
import { SubmitButton } from "./SubmitButton";
import { DictationInput } from "./Voice";
import { timeAgo } from "./ui";

export function NotesCard({ memberId, back, notes }: { memberId: string; back: string; notes: ReturnType<typeof listStaffNotes> }) {
  return (
    <section className="card">
      <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Care team notes · staff only</h2>
      <ul className="divide-y divide-line">
        {notes.map((n) => (
          <li key={n.id} className="px-6 py-3 text-sm">
            <p>{n.body}</p>
            <div className="mt-1 text-xs text-muted">
              {n.author_name}
              {n.author_credential ? `, ${n.author_credential}` : ""} · {timeAgo(n.created_at)}
            </div>
          </li>
        ))}
      </ul>
      <form action={addStaffNote} className="flex gap-2 border-t border-line p-4">
        <input type="hidden" name="member_id" value={memberId} />
        <input type="hidden" name="back" value={back} />
        <DictationInput name="body" placeholder="Add a note for the care team… (or tap the mic)" maxLength={1000} label="New note" />
        <SubmitButton className="btn-dark" pendingText="…">Add</SubmitButton>
      </form>
    </section>
  );
}
