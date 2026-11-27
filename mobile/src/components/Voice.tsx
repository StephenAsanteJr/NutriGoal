import { useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from "react-native";
import { C } from "@/lib/theme";
import { inAppDictation, useDictation } from "@/lib/voice";
import { usePlayer } from "@/lib/player";
import { Button } from "@/components/UI";

const KEYBOARD_HINT =
  Platform.OS === "ios"
    ? "Tap the 🎙 key on your keyboard (bottom right) and speak. Tap it again when you're done."
    : "Tap the 🎙 key on your keyboard and speak.";

/** "Listen" pill: plays the text in the shared read-aloud player (voice and speed live there). */
export function ListenButton({ text, label = "Listen", title }: { text: string; label?: string; title?: string }) {
  const p = usePlayer();
  const name = title ?? label;
  const mine = p.track?.title === name;
  const playing = mine && p.playing;
  return (
    <Pressable
      onPress={() => (mine ? p.toggle() : p.play(name, text))}
      accessibilityRole="button"
      accessibilityLabel={playing ? "Pause reading aloud" : `${label}: read aloud`}
      style={({ pressed }) => [s.listen, playing && { backgroundColor: C.ink, borderColor: C.ink }, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={playing ? "pause" : "volume-high"} size={15} color={playing ? C.white : C.greenDeep} />
      <Text style={[s.listenText, playing && { color: C.white }]}>{playing ? "Pause" : mine ? "Resume" : label}</Text>
    </Pressable>
  );
}

/** Round mic button. Red while recording (Bain red = live). */
function MicButton({ listening, onPress, label }: { listening: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={listening ? `Stop dictating ${label}` : `Dictate ${label}`}
      style={({ pressed }) => [s.mic, listening && { backgroundColor: C.red, borderColor: C.red }, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={listening ? "stop" : "mic"} size={16} color={listening ? C.white : C.red} />
    </Pressable>
  );
}

type FieldProps = Omit<TextInputProps, "value" | "onChangeText"> & { label: string; value: string; onChangeText: (v: string) => void };

/**
 * Text field with a mic. In builds with speech recognition (and on web) the mic transcribes
 * straight into the field; in Expo Go it opens the keyboard and points to its dictation key.
 */
export function DictateField({ label, value, onChangeText, ...props }: FieldProps) {
  const input = useRef<TextInputInstance>(null);
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const [hint, setHint] = useState(false);
  const d = useDictation((t) => onChangeText(latest.current ? `${latest.current.trimEnd()} ${t}` : t));

  const press = () => {
    if (inAppDictation) return d.listening ? d.stop() : d.start();
    input.current?.focus();
    setHint(true);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
        <Text style={s.label}>{label}</Text>
        <MicButton listening={d.listening} onPress={press} label={label} />
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChangeText}
        onBlur={() => setHint(false)}
        placeholderTextColor={C.muted}
        style={[s.input, props.multiline && { minHeight: 84, textAlignVertical: "top" }, d.listening && { borderColor: C.red }]}
        {...props}
      />
      {d.listening && <Text style={s.live}>● Listening{d.interim ? `: “${d.interim}”` : "… speak now"}</Text>}
      {hint && !inAppDictation && <Text style={s.hint}>{KEYBOARD_HINT}</Text>}
      {d.error && <Text style={s.error}>{d.error}</Text>}
    </View>
  );
}

/**
 * Voice mode: speak everything in one go, check the transcript, then let NutriGoal sort it
 * into the form. `onTranscript` returns a short note to show (or nothing).
 */
export function VoicePanel({ title, hint, action, onTranscript }: { title: string; hint: string; action: string; onTranscript: (text: string) => Promise<string | void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <View style={s.panel}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="mic-circle" size={22} color={C.red} />
        <Text style={{ color: C.ink, fontWeight: "800", fontSize: 15, flex: 1 }}>{title}</Text>
      </View>
      <Text style={{ color: C.slate, fontSize: 13, marginTop: 4, marginBottom: 10 }}>{hint}</Text>
      <DictateField label="What you said" value={text} onChangeText={setText} multiline placeholder="Tap the mic and talk it through…" />
      <Button
        label={busy ? "Sorting it into the form…" : action}
        kind="dark"
        busy={busy}
        disabled={text.trim().length < 10}
        onPress={async () => {
          setBusy(true);
          setMsg(null);
          try {
            setMsg((await onTranscript(text.trim())) || "Done. Check the fields below before you continue.");
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Couldn't sort that. Try again or type it in.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {msg && <Text style={{ color: C.greenDeep, fontWeight: "700", fontSize: 13, marginTop: 4 }}>{msg}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  listen: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: C.greenTint, backgroundColor: C.greenTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  listenText: { color: C.greenDeep, fontWeight: "800", fontSize: 13 },
  mic: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  label: { color: C.ink, fontWeight: "700", fontSize: 13, flex: 1 },
  input: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink },
  live: { color: C.red, fontWeight: "700", fontSize: 12.5, marginTop: 6 },
  hint: { color: C.red, fontWeight: "600", fontSize: 12.5, marginTop: 6 },
  error: { color: C.red, fontWeight: "700", fontSize: 12.5, marginTop: 6 },
  panel: { backgroundColor: C.greenTint, borderRadius: 16, padding: 14, marginVertical: 8 },
});
