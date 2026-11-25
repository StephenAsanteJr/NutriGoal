"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ListenButton, MicButton } from "./Voice";

type Action = { type: "link"; label: string; href: string };
type Msg = { role: "user" | "assistant"; content: string; actions?: Action[] };

const KEY = "ng-assistant-v1";
const SUGGESTIONS = [
  "Nudge my clinician about my open ticket",
  "Show me pharmacies",
  "What add-ons can I unlock?",
  "Find high-protein grocers",
  "Where do my tickets stand?",
];

/** Floating NutriGoal Assistant chat for members. */
export function Assistant({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiMode, setAiMode] = useState<boolean | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) setMsgs(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));
    } catch {}
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Something went wrong.");
      setAiMode(!!d.ai);
      setMsgs((m) => [...m, { role: "assistant", content: d.reply, actions: d.actions }]);
      router.refresh(); // reflect saved stores, unlocked add-ons, nudges
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-navy py-2 pl-2 pr-4 text-sm font-bold text-white shadow-[0_8px_30px_rgba(5,28,44,0.35)] hover:bg-navy-soft md:bottom-6 md:right-6 print:hidden"
        aria-expanded={open}
        aria-controls="ng-assistant"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
          <Image src="/brand/nutrigoal-mark.png" alt="" width={24} height={24} />
        </span>
        {open ? "Close" : "Ask NutriGoal"}
      </button>

      {open && (
        <section
          id="ng-assistant"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col overflow-hidden rounded-t-2xl border border-line bg-white shadow-2xl md:inset-x-auto md:bottom-20 md:right-6 md:h-[600px] md:w-[400px] md:rounded-[4px]"
          aria-label="NutriGoal Assistant"
        >
          <header className="flex items-center justify-between bg-navy px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <Image src="/brand/nutrigoal-mark.png" alt="" width={24} height={24} />
              </span>
              <div>
                <div className="text-sm font-bold">NutriGoal Assistant</div>
                <div className="text-[10px] uppercase tracking-wider text-cyan">
                  {aiMode === false ? "Quick answers mode" : "AI assistant · not medical advice"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {msgs.length > 0 && (
                <button type="button" className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10" onClick={() => setMsgs([])}>
                  Clear
                </button>
              )}
              <button type="button" className="rounded px-2 py-1 text-white/80 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close assistant">
                ✕
              </button>
            </div>
          </header>

          <div ref={list} className="flex-1 space-y-3 overflow-y-auto bg-mist/60 p-4" aria-live="polite">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm shadow-sm">
                  Hi {firstName}! I can find grocers, pharmacies and coaches, save stores, unlock add-ons, check your tickets, and nudge your
                  clinician if a response is taking a while.
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-blue/30 bg-white px-3 py-1.5 text-xs font-bold text-blue hover:bg-blue-tint">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                    m.role === "user" ? "rounded-tr-sm bg-blue text-white" : "rounded-tl-sm bg-white text-navy"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && (
                  <div className="mt-1.5">
                    <ListenButton size="sm" title={`NutriGoal assistant · reply ${i + 1}`} text={m.content} />
                  </div>
                )}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.actions.map((a) => (
                      <Link key={a.href} href={a.href} onClick={() => setOpen(false)} className="rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-soft">
                        {a.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="inline-flex gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm" aria-label="Assistant is typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-line bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <MicButton label="your message" onText={(t) => setInput((s) => (s ? `${s} ${t}` : t))} />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the marketplace or your tickets…" className="input !py-2 text-sm" aria-label="Message" maxLength={1000} />
            <button className="btn-primary !px-4 !py-2" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
    </>
  );
}
