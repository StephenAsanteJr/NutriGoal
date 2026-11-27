"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { player, usePlayerState } from "./ReadAloud";

// Minimal typing for the browser Web Speech API (Chrome, Edge, Safari).
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Dictation using the browser's speech recognition. */
export function useDictation(onFinal: (text: string) => void) {
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cb = useRef(onFinal);
  useEffect(() => {
    cb.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run in the browser
    setSupported(!!getRecognition());
    return () => rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const r = getRecognition();
    if (!r) return;
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) cb.current(res[0].transcript.trim());
        else partial += res[0].transcript;
      }
      setInterim(partial);
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone access was blocked. Allow it in your browser to use voice mode." : "Voice input stopped. Try again.");
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    setError(null);
    setListening(true);
    r.start();
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  return { supported, listening, interim, error, start, stop };
}

function MicIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** Small mic toggle that appends dictated speech to one field. */
export function MicButton({ onText, label }: { onText: (text: string) => void; label: string }) {
  const d = useDictation(onText);
  if (!d.supported) return null;
  return (
    <button
      type="button"
      onClick={d.listening ? d.stop : d.start}
      aria-pressed={d.listening}
      aria-label={d.listening ? `Stop dictating ${label}` : `Dictate ${label}`}
      title={d.listening ? "Stop" : "Speak instead of typing"}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
        d.listening ? "animate-pulse border-alert bg-alert text-white" : "border-line text-bain hover:border-bain hover:bg-bain-tint"
      }`}
    >
      <MicIcon />
    </button>
  );
}

/**
 * "Speak it all at once" panel: record a free-form description, review the transcript,
 * then send it to be sorted into the form's fields.
 */
export function VoicePanel({
  title,
  hint,
  onTranscript,
  busyLabel = "Sorting into fields…",
  actionLabel = "Fill the form from what I said",
  tone = "light",
}: {
  title: string;
  hint: string;
  onTranscript: (text: string) => Promise<string | void>;
  busyLabel?: string;
  actionLabel?: string;
  tone?: "light" | "dark";
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const d = useDictation((t) => setText((s) => (s ? `${s} ${t}` : t)));
  const dark = tone === "dark";

  if (!d.supported)
    return (
      <div className={`rounded-[2px] border px-4 py-3 text-xs ${dark ? "border-white/20 text-white/70" : "border-line text-muted"}`}>
        Voice mode needs a browser with speech recognition (Chrome, Edge or Safari).
      </div>
    );

  return (
    <div className={`rounded-[3px] border p-4 ${dark ? "border-white/15 bg-white/5 text-white" : "border-bain/20 bg-bain-tint/60"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <MicIcon /> {title}
          </div>
          <p className={`text-xs ${dark ? "text-white/70" : "text-slate"}`}>{hint}</p>
        </div>
        <button
          type="button"
          onClick={d.listening ? d.stop : d.start}
          className={d.listening ? "btn !bg-alert !text-white animate-pulse" : "btn-primary"}
        >
          {d.listening ? "■ Stop" : "● Start speaking"}
        </button>
      </div>
      {(text || d.interim) && (
        <div className="mt-3 space-y-2">
          <textarea
            value={text + (d.interim ? ` ${d.interim}` : "")}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="input text-sm"
            aria-label="Transcript"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-[11px] ${dark ? "text-white/60" : "text-muted"}`}>Check the transcript, fix anything misheard, then:</span>
            <button
              type="button"
              className={dark ? "btn !bg-white !text-ink" : "btn-dark"}
              disabled={busy || d.listening || text.trim().length < 10}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                const note = await onTranscript(text.trim());
                setBusy(false);
                setMsg(note || "Done. Review the fields below before you continue.");
              }}
            >
              {busy ? busyLabel : actionLabel}
            </button>
          </div>
        </div>
      )}
      {(d.error || msg) && <p className={`mt-2 text-xs ${d.error ? "text-alert" : dark ? "text-bcg-fresh" : "text-good"} font-bold`}>{d.error ?? msg}</p>}
    </div>
  );
}

// ---------- Listen: read text aloud with the browser's speech synthesis ----------

function SpeakerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

/** "Listen" pill: plays the text in the site-wide read-aloud player (voice and speed are set there). */
export function ListenButton({ text, label = "Listen", title, tone = "light", size = "md" }: { text: string; label?: string; title?: string; tone?: "light" | "dark"; size?: "sm" | "md" }) {
  const [supported, setSupported] = useState(false);
  const s = usePlayerState();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run in the browser
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);
  if (!supported) return null;
  const name = title ?? label;
  const mine = s.track?.title === name;
  const playing = mine && s.playing;
  const dark = tone === "dark";
  return (
    <button
      type="button"
      onClick={() => (mine ? player.toggle() : player.play(name, text))}
      aria-pressed={playing}
      aria-label={playing ? "Pause reading aloud" : `${label}: read aloud`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-bold transition ${size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"} ${
        playing
          ? "border-bcg-deep bg-bcg-deep text-white"
          : dark
            ? "border-white/30 text-white hover:bg-white/10"
            : "border-bcg-deep/30 bg-white text-bcg-deep hover:border-bcg-deep hover:bg-bcg-tint"
      }`}
    >
      {playing ? (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
      ) : (
        <SpeakerIcon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      )}
      {playing ? "Pause" : mine ? "Resume" : label}
    </button>
  );
}

/** Single-line input with a mic, for short notes in server-rendered forms. */
export function DictationInput({ name, placeholder, maxLength, label }: { name: string; placeholder?: string; maxLength?: number; label: string }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input name={name} className="input" placeholder={placeholder} maxLength={maxLength} required aria-label={label} value={value} onChange={(e) => setValue(e.target.value)} />
      <MicButton label={label.toLowerCase()} onText={(t) => setValue((s) => (s ? `${s.trimEnd()} ${t}` : t).slice(0, maxLength ?? 10_000))} />
    </div>
  );
}
