import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/lib/theme";
import { SPEEDS, usePlayer } from "@/lib/player";

const fmt = (r: number) => `${r}×`;
const VOICE_TIP =
  Platform.OS === "ios"
    ? "More natural voices: iPhone Settings → Accessibility → Spoken Content → Voices → English. Download an Enhanced or Premium voice, then reopen this list."
    : Platform.OS === "android"
      ? "More voices: Android Settings → Accessibility → Text-to-speech → Install voice data."
      : "Voices come from your browser and computer. Edge and Safari include natural-sounding ones.";

/** Floating mini player (one for the whole app). Sits above the tab bar when there is one. */
export function MiniPlayer() {
  const p = usePlayer();
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  const [open, setOpen] = useState(false);
  if (!p.track) return null;
  const total = p.track.chunks.length;
  const bottom = insets.bottom + (segments[0] === "(tabs)" ? 58 : 12);
  const voiceName = p.voices.find((v) => v.id === p.prefs.voice)?.name ?? "Device default";

  return (
    <View style={[s.wrap, { bottom }]} pointerEvents="box-none">
      <View style={s.card}>
        {open && (
          <View style={{ paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.12)" }}>
            <Text style={s.section}>SPEED</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {SPEEDS.map((r) => (
                <Pressable key={r} onPress={() => p.setRate(r)} accessibilityRole="button" accessibilityState={{ selected: p.prefs.rate === r }} style={[s.chip, p.prefs.rate === r && s.chipOn]}>
                  <Text style={[s.chipText, p.prefs.rate === r && { color: C.navy }]}>{fmt(r)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[s.section, { marginTop: 12 }]}>VOICE</Text>
            <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled>
              {[{ id: null as string | null, name: "Device default", enhanced: false, language: "" }, ...p.voices].map((v) => {
                const on = p.prefs.voice === v.id;
                return (
                  <Pressable key={v.id ?? "default"} onPress={() => p.setVoice(v.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={s.voiceRow}>
                    <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={18} color={on ? C.greenFresh : "rgba(255,255,255,0.6)"} />
                    <Text style={{ color: C.white, flex: 1 }} numberOfLines={1}>
                      {v.name}
                      {v.language && v.language !== "en-US" ? <Text style={{ color: "rgba(255,255,255,0.55)" }}>  {v.language}</Text> : null}
                    </Text>
                    {v.enhanced && <Text style={s.badge}>Natural</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={s.tip}>{VOICE_TIP}</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={p.toggle} accessibilityRole="button" accessibilityLabel={p.playing ? "Pause" : "Play"} style={s.play}>
            <Ionicons name={p.playing ? "pause" : "play"} size={20} color={C.navy} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.white, fontWeight: "800" }} numberOfLines={1}>{p.track.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }} numberOfLines={1}>
              {fmt(p.prefs.rate)} · {voiceName} · {p.index + 1}/{total}
            </Text>
            <View style={s.track}>
              <View style={[s.fill, { width: `${((p.index + (p.playing ? 0.5 : 1)) / total) * 100}%` }]} />
            </View>
          </View>
          <Pressable onPress={() => p.skip(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Previous sentence">
            <Ionicons name="play-skip-back" size={18} color={C.white} />
          </Pressable>
          <Pressable onPress={() => p.skip(1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Next sentence">
            <Ionicons name="play-skip-forward" size={18} color={C.white} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (!open) p.loadVoices();
              setOpen((o) => !o);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={open ? "Hide voice and speed" : "Voice and speed"}
            style={[s.settings, open && { backgroundColor: "rgba(255,255,255,0.18)" }]}
          >
            <Ionicons name="options" size={18} color={C.white} />
          </Pressable>
          <Pressable onPress={p.close} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close player">
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 10, right: 10, alignItems: "center" },
  card: {
    width: "100%", maxWidth: 620, backgroundColor: C.navy, borderRadius: 18, padding: 12,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  track: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginTop: 6, overflow: "hidden" },
  fill: { height: 3, borderRadius: 2, backgroundColor: C.green },
  settings: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  section: { color: "rgba(255,255,255,0.6)", fontWeight: "800", fontSize: 11, letterSpacing: 1.2, marginBottom: 6 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
  chipText: { color: C.white, fontWeight: "800", fontSize: 13 },
  voiceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  badge: { color: C.navy, backgroundColor: C.greenFresh, fontSize: 10, fontWeight: "800", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  tip: { color: "rgba(255,255,255,0.6)", fontSize: 11.5, marginTop: 8, lineHeight: 16 },
});
