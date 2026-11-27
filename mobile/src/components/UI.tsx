import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, serif } from "@/lib/theme";

/** `tab` screens sit under no header and above the tab bar, so they pad the top (status bar) instead of the bottom. */
export function Screen({ children, scroll = true, tab }: { children: React.ReactNode; scroll?: boolean; tab?: boolean }) {
  const inner = <View style={s.inner}>{children}</View>;
  return (
    <SafeAreaView edges={tab ? ["top"] : ["bottom"]} style={s.screen}>
      {scroll ? <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}

export const Title = ({ children }: { children: React.ReactNode }) => <Text style={s.title}>{children}</Text>;
export const Eyebrow = ({ children }: { children: React.ReactNode }) => <Text style={s.eyebrow}>{children}</Text>;
export const Body = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => <Text style={[s.body, muted && { color: C.muted }]}>{children}</Text>;

export function Card({ children, tone }: { children: React.ReactNode; tone?: "ink" | "good" | "warn" | "alert" }) {
  const bg = tone === "ink" ? C.ink : tone === "good" ? C.goodTint : tone === "warn" ? C.warnTint : tone === "alert" ? C.alertTint : C.white;
  return <View style={[s.card, { backgroundColor: bg, borderColor: tone ? "transparent" : C.line }]}>{children}</View>;
}

export function Button({ label, onPress, kind = "primary", busy, disabled }: { label: string; onPress: () => void; kind?: "primary" | "dark" | "ghost"; busy?: boolean; disabled?: boolean }) {
  const bg = kind === "primary" ? C.greenDeep : kind === "dark" ? C.ink : "transparent";
  return (
    <Pressable onPress={onPress} disabled={busy || disabled} accessibilityRole="button" style={({ pressed }) => [s.button, { backgroundColor: bg, opacity: busy || disabled ? 0.5 : pressed ? 0.85 : 1 }, kind === "ghost" && { borderWidth: 1, borderColor: C.line }]}>
      {busy ? <ActivityIndicator color={kind === "ghost" ? C.ink : C.white} /> : <Text style={[s.buttonText, kind === "ghost" && { color: C.greenDeep }]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={C.muted} style={[s.input, props.multiline && { minHeight: 84, textAlignVertical: "top" }]} {...props} />
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ padding: 40, alignItems: "center" }}>
      <ActivityIndicator color={C.greenDeep} size="large" />
    </View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return children ? <Text style={s.error}>{children}</Text> : null;
}

export function Pill({ label, tone = "info" }: { label: string; tone?: "info" | "good" | "warn" | "alert" }) {
  const bg = tone === "good" ? C.goodTint : tone === "warn" ? C.warnTint : tone === "alert" ? C.alertTint : C.mist;
  const fg = tone === "good" ? C.good : tone === "warn" ? C.warn : tone === "alert" ? C.alert : C.ink;
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.mist },
  inner: { padding: 18, width: "100%", maxWidth: 640, alignSelf: "center" },
  title: { fontFamily: serif, fontSize: 30, color: C.ink, marginBottom: 6 },
  eyebrow: { color: C.red, fontWeight: "800", fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 6 },
  body: { color: C.slate, fontSize: 15, lineHeight: 21 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginVertical: 8 },
  button: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", marginVertical: 6 },
  buttonText: { color: C.white, fontWeight: "800", fontSize: 15 },
  label: { color: C.ink, fontWeight: "700", fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink },
  error: { color: C.alert, fontWeight: "700", marginVertical: 6 },
});
