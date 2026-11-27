"use client";

// Read-aloud player (Speechify-style) for the whole site: one mini player pinned to the bottom of the
// window. Members hear their plans; clinicians hear the tickets sent to them. It uses the voices built
// into the person's browser and computer (on-device: the text isn't sent to a voice service), and
// remembers the chosen voice and speed in this browser.

import { useEffect, useState, useSyncExternalStore } from "react";

export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];
/** Apple's joke voices (Bubbles, Zarvox…) don't belong in a health app. */
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Deranged|Hysterical|Pipe Organ)\b/i;
const KEY = "ng_tts";

type Track = { title: string; chunks: string[] };
type State = { track: Track | null; index: number; playing: boolean; voiceURI: string | null; rate: number };

let state: State = { track: null, index: 0, playing: false, voiceURI: null, rate: 1 };
let token = 0;
let ended = false;
let prefsLoaded = false;
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: State = state;

function loadPrefs() {
  if (prefsLoaded || typeof window === "undefined") return;
  prefsLoaded = true;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "{}") as { voiceURI?: string | null; rate?: number };
    set({ voiceURI: typeof p.voiceURI === "string" ? p.voiceURI : null, rate: SPEEDS.includes(Number(p.rate)) ? Number(p.rate) : 1 });
  } catch {}
}
const savePrefs = () => localStorage.setItem(KEY, JSON.stringify({ voiceURI: state.voiceURI, rate: state.rate }));

/** Split into sentences (merging short ones) so playback can pause, skip and change speed mid-way. */
export function chunk(text: string) {
  const parts = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/);
  const out: string[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && last.length + p.length < 140) out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out.filter(Boolean);
}

function speakFrom(i: number) {
  const tr = state.track;
  const synth = window.speechSynthesis;
  if (!tr || i < 0 || i >= tr.chunks.length) return set({ playing: false });
  const my = ++token;
  ended = false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(tr.chunks[i]);
  u.lang = "en-US";
  u.rate = state.rate;
  const v = state.voiceURI ? synth.getVoices().find((x) => x.voiceURI === state.voiceURI) : undefined;
  if (v) u.voice = v;
  u.onend = () => {
    if (token !== my) return;
    if (i + 1 < tr.chunks.length) speakFrom(i + 1);
    else {
      ended = true;
      set({ playing: false });
    }
  };
  u.onerror = () => {
    if (token === my) set({ playing: false });
  };
  set({ index: i, playing: true });
  synth.speak(u);
}

export const player = {
  play(title: string, text: string) {
    loadPrefs();
    set({ track: { title, chunks: chunk(text) } });
    speakFrom(0);
  },
  pause() {
    token++;
    window.speechSynthesis.cancel();
    set({ playing: false });
  },
  toggle() {
    if (state.playing) player.pause();
    else speakFrom(ended ? 0 : state.index);
  },
  skip(d: number) {
    if (!state.track) return;
    speakFrom(Math.max(0, Math.min(state.track.chunks.length - 1, state.index + d)));
  },
  close() {
    player.pause();
    set({ track: null, index: 0 });
  },
  setRate(rate: number) {
    set({ rate });
    savePrefs();
    if (state.playing) speakFrom(state.index);
  },
  setVoice(voiceURI: string | null) {
    set({ voiceURI });
    savePrefs();
    if (state.playing) speakFrom(state.index);
  },
};

export function usePlayerState() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

type VoiceItem = { uri: string; name: string; lang: string; natural: boolean };
function useVoices(enabled: boolean) {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const read = () => {
      const list = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.toLowerCase().startsWith("en") && !NOVELTY.test(v.name))
        .map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, natural: /natural|neural|premium|enhanced|online|google/i.test(v.name) }))
        .sort((a, b) => Number(b.natural) - Number(a.natural) || Number(b.lang === "en-US") - Number(a.lang === "en-US") || a.name.localeCompare(b.name));
      setVoices(list);
    };
    read();
    window.speechSynthesis.addEventListener("voiceschanged", read);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", read);
  }, [enabled]);
  return voices;
}

/** The mini player. Mounted once in the root layout; shows while something is loaded. */
export function ReadAloudBar() {
  const s = usePlayerState();
  const [open, setOpen] = useState(false);
  const voices = useVoices(open || !!s.track);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  if (!s.track) return null;
  const total = s.track.chunks.length;
  const voice = voices.find((v) => v.uri === s.voiceURI);
  const natural = voices.filter((v) => v.natural);
  const other = voices.filter((v) => !v.natural);

  return (
    <div className="fixed inset-x-3 bottom-[84px] z-50 mx-auto max-w-2xl lg:bottom-4 rounded-2xl bg-ink p-3 text-white shadow-2xl sm:inset-x-6" role="region" aria-label="Read-aloud player">
      {open && (
        <div className="mb-3 grid gap-4 border-b border-white/15 pb-3 sm:grid-cols-[auto_1fr]">
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60">Speed</div>
            <div className="flex flex-wrap gap-1.5">
              {SPEEDS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => player.setRate(r)}
                  aria-pressed={s.rate === r}
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${s.rate === r ? "border-bcg bg-bcg text-ink" : "border-white/30 hover:bg-white/10"}`}
                >
                  {r}×
                </button>
              ))}
            </div>
          </div>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/60">Voice</span>
            <select
              value={s.voiceURI ?? ""}
              onChange={(e) => player.setVoice(e.target.value || null)}
              className="w-full rounded-lg border border-white/25 bg-ink-soft px-2.5 py-2 text-sm text-white"
            >
              <option value="">Browser default</option>
              {natural.length > 0 && (
                <optgroup label="Natural voices">
                  {natural.map((v) => (
                    <option key={v.uri} value={v.uri}>{v.name}{v.lang !== "en-US" ? ` (${v.lang})` : ""}</option>
                  ))}
                </optgroup>
              )}
              {other.length > 0 && (
                <optgroup label="Other voices">
                  {other.map((v) => (
                    <option key={v.uri} value={v.uri}>{v.name}{v.lang !== "en-US" ? ` (${v.lang})` : ""}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <span className="mt-1.5 block text-[11px] text-white/55">
              Voices come from your browser and computer. Edge and Safari include natural-sounding ones; on a Mac, add more in System Settings → Accessibility → Spoken Content.
            </span>
          </label>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="button" onClick={player.toggle} aria-label={s.playing ? "Pause" : "Play"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bcg text-ink">
          {s.playing ? (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden><path d="M4 2.5v11l9.5-5.5z" /></svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{s.track.title}</div>
          <div className="truncate text-xs text-white/65">
            {s.rate}× · {voice?.name ?? "Browser default"} · {s.index + 1}/{total}
          </div>
          <div className="mt-1.5 h-[3px] overflow-hidden rounded bg-white/20">
            <div className="h-full rounded bg-bcg transition-all" style={{ width: `${((s.index + (s.playing ? 0.5 : 1)) / total) * 100}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => player.skip(-1)} aria-label="Previous sentence" className="rounded p-1.5 hover:bg-white/10">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M3 2h2v12H3zM14 2.5v11L6 8z" /></svg>
        </button>
        <button type="button" onClick={() => player.skip(1)} aria-label="Next sentence" className="rounded p-1.5 hover:bg-white/10">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M11 2h2v12h-2zM2 2.5v11L10 8z" /></svg>
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Voice and speed" className={`rounded-full px-2.5 py-1.5 text-xs font-bold ${open ? "bg-white/20" : "hover:bg-white/10"}`}>
          {s.rate}× ▾
        </button>
        <button type="button" onClick={player.close} aria-label="Close player" className="rounded p-1.5 text-white/80 hover:bg-white/10">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      </div>
    </div>
  );
}
