// Voice features for members and clinicians:
//  - Listen: see ./player.tsx (read-aloud player with voice and speed choice).
//  - Dictate: speech to text (expo-speech-recognition). Works in standalone/development builds
//    (iOS on-device speech, Android recognizer) and on web (browser speech recognition).
//    Expo Go doesn't ship that native module, so there the mic falls back to the keyboard's
//    own dictation key, which is also on-device speech-to-text.
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { usePlayer } from "./player";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";

function loadRecognizer(): ExpoSpeechRecognitionModuleType | null {
  // Check for the native module first so Expo Go never tries to load it.
  if (Platform.OS !== "web" && !requireOptionalNativeModule("ExpoSpeechRecognition")) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-speech-recognition") as { ExpoSpeechRecognitionModule: ExpoSpeechRecognitionModuleType };
    const r = mod.ExpoSpeechRecognitionModule;
    return r.isRecognitionAvailable() ? r : null;
  } catch {
    return null;
  }
}

const recognizer = loadRecognizer();

/** True when the app can transcribe speech itself (not just via the keyboard). */
export const inAppDictation = recognizer != null;

/** Which listener currently owns the microphone, so only one field dictates at a time. */
let activeOwner: symbol | null = null;

export function useDictation(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const owner = useRef(Symbol("dictation"));
  const player = usePlayer();
  const cb = useRef(onFinal);
  useEffect(() => {
    cb.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    if (!recognizer) return;
    const me = owner.current;
    const subs = [
      recognizer.addListener("result", (e) => {
        if (activeOwner !== me) return;
        const text = e.results[0]?.transcript ?? "";
        if (e.isFinal) {
          if (text.trim()) cb.current(text.trim());
          setInterim("");
        } else setInterim(text);
      }),
      recognizer.addListener("error", (e) => {
        if (activeOwner !== me) return;
        if (e.error !== "aborted" && e.error !== "no-speech")
          setError(e.error === "not-allowed" ? "Allow microphone and speech recognition for NutriGoal in Settings to dictate." : "Dictation stopped. Try again.");
      }),
      recognizer.addListener("end", () => {
        if (activeOwner !== me) return;
        activeOwner = null;
        setListening(false);
        setInterim("");
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      if (activeOwner === me) recognizer.abort();
    };
  }, []);

  const start = useCallback(async () => {
    if (!recognizer) return;
    setError(null);
    const perm = await recognizer.requestPermissionsAsync();
    if (!perm.granted) {
      setError("Allow microphone and speech recognition for NutriGoal in Settings to dictate.");
      return;
    }
    if (activeOwner) recognizer.abort();
    player.pause(); // don't transcribe the read-aloud voice
    activeOwner = owner.current;
    setListening(true);
    recognizer.start({ lang: "en-US", interimResults: true, continuous: true, addsPunctuation: true });
  }, [player]);

  const stop = useCallback(() => {
    if (recognizer && activeOwner === owner.current) recognizer.stop();
  }, []);

  return { supported: inAppDictation, listening, interim, error, start, stop };
}

/** Plain-language script of a response plan, for reading aloud. */
export function planScript(p: { recommendation: string; steps: { title: string; detail: string; timeframe: string }[]; clinician?: string; foods?: Record<string, string[] | undefined> | null }) {
  const steps = p.steps.map((s, i) => `Step ${i + 1}, ${s.timeframe}: ${s.title}. ${s.detail}`).join(" ");
  const foods = p.foods ? Object.values(p.foods).flat().filter(Boolean) : [];
  return `${p.clinician ? `Your plan from ${p.clinician}. ` : ""}Recommendation: ${p.recommendation} ${steps}${foods.length ? ` Suggested foods: ${foods.join(", ")}.` : ""}`;
}
