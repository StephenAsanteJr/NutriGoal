// Read-aloud player (Speechify-style) shared by the whole app: one mini player that floats above
// every screen. Members hear their plans, clinicians hear the tickets sent to them. It uses the
// phone's own voices (on-device, so health details never leave the phone); people pick the voice
// and speed, and both are remembered on this device.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Speech from "expo-speech";

export type VoiceOption = { id: string; name: string; enhanced: boolean; language: string };
export type Prefs = { voice: string | null; rate: number };
export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];
/** Apple's joke voices (Bubbles, Zarvox…) don't belong in a health app. */
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Deranged|Hysterical|Pipe Organ)\b/i;

const KEY = "nutrigoal_tts";
const DEFAULT: Prefs = { voice: null, rate: 1 };
const store = {
  get: async () => (Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === "web" ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
};

/** Split into sentences (merging short ones) so playback can pause, skip and change speed mid-way. */
export function chunk(text: string) {
  const parts = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/);
  const out: string[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && last.length + p.length < 140) out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out.flatMap((c) => (c.length > 3500 ? c.match(/.{1,3500}(\s|$)/g) ?? [c] : [c])).filter(Boolean);
}

type Track = { title: string; chunks: string[] };
type Player = {
  track: Track | null;
  index: number;
  playing: boolean;
  prefs: Prefs;
  voices: VoiceOption[];
  play: (title: string, text: string) => void;
  toggle: () => void;
  pause: () => void;
  skip: (delta: number) => void;
  close: () => void;
  setRate: (rate: number) => void;
  setVoice: (id: string | null) => void;
  loadVoices: () => Promise<void>;
};

const Ctx = createContext<Player | null>(null);
export function usePlayer() {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePlayer must be used inside PlayerProvider");
  return p;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  // Each speakFrom() call gets a token; callbacks from older utterances are ignored.
  const token = useRef(0);
  const ended = useRef(false);
  // speakFrom chains to the next sentence through this ref (a callback can't name itself).
  const next = useRef<(i: number, t: Track) => void>(() => {});
  const live = useRef({ track, prefs });
  useEffect(() => {
    live.current = { track, prefs };
  }, [track, prefs]);

  useEffect(() => {
    store.get().then((raw) => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw) as Partial<Prefs>;
        setPrefs({ voice: typeof p.voice === "string" ? p.voice : null, rate: SPEEDS.includes(Number(p.rate)) ? Number(p.rate) : 1 });
      } catch {}
    });
    return () => void Speech.stop();
  }, []);

  const savePrefs = useCallback((next: Prefs) => {
    setPrefs(next);
    live.current.prefs = next;
    store.set(JSON.stringify(next)).catch(() => {});
  }, []);

  const speakFrom = useCallback((i: number, t?: Track) => {
    const tr = t ?? live.current.track;
    if (!tr || i < 0 || i >= tr.chunks.length) {
      setPlaying(false);
      return;
    }
    const my = ++token.current;
    ended.current = false;
    Speech.stop();
    setIndex(i);
    setPlaying(true);
    const { voice, rate } = live.current.prefs;
    Speech.speak(tr.chunks[i], {
      language: "en-US",
      voice: voice ?? undefined,
      rate,
      onDone: () => {
        if (token.current !== my) return;
        if (i + 1 < tr.chunks.length) next.current(i + 1, tr);
        else {
          ended.current = true;
          setPlaying(false);
        }
      },
      onError: () => {
        if (token.current === my) setPlaying(false);
      },
    });
  }, []);
  useEffect(() => {
    next.current = speakFrom;
  }, [speakFrom]);

  const play = useCallback(
    (title: string, text: string) => {
      const t = { title, chunks: chunk(text) };
      setTrack(t);
      live.current.track = t;
      speakFrom(0, t);
    },
    [speakFrom],
  );

  const pause = useCallback(() => {
    token.current++;
    Speech.stop();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) pause();
    else speakFrom(ended.current ? 0 : index); // play again from the top once it has finished
  }, [playing, pause, speakFrom, index]);

  const skip = useCallback((d: number) => speakFrom(Math.max(0, Math.min((track?.chunks.length ?? 1) - 1, index + d))), [speakFrom, track, index]);

  const close = useCallback(() => {
    pause();
    setTrack(null);
    live.current.track = null;
  }, [pause]);

  const setRate = useCallback(
    (rate: number) => {
      savePrefs({ ...live.current.prefs, rate });
      if (playing) speakFrom(index); // restart this sentence at the new speed
    },
    [savePrefs, playing, speakFrom, index],
  );

  const setVoice = useCallback(
    (voice: string | null) => {
      savePrefs({ ...live.current.prefs, voice });
      if (playing) speakFrom(index);
    },
    [savePrefs, playing, speakFrom, index],
  );

  const loadVoices = useCallback(async () => {
    if (voices.length) return;
    const all = await Speech.getAvailableVoicesAsync().catch(() => []);
    const seen = new Set<string>();
    const list = all
      .filter((v) => v.language?.toLowerCase().startsWith("en") && !NOVELTY.test(v.name))
      .map((v) => ({ id: v.identifier, name: v.name, language: v.language, enhanced: v.quality === Speech.VoiceQuality.Enhanced || /premium|enhanced|natural|neural/i.test(v.name) }))
      .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))
      .sort((a, b) => Number(b.enhanced) - Number(a.enhanced) || Number(b.language === "en-US") - Number(a.language === "en-US") || a.name.localeCompare(b.name));
    setVoices(list);
  }, [voices.length]);

  const value = useMemo<Player>(
    () => ({ track, index, playing, prefs, voices, play, toggle, pause, skip, close, setRate, setVoice, loadVoices }),
    [track, index, playing, prefs, voices, play, toggle, pause, skip, close, setRate, setVoice, loadVoices],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
