import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { C } from "@/lib/theme";

type Props = {
  label: string;
  icon: string;
  onPress?: () => void;
  size?: number;
  color?: string;
  textColor?: string;
  badge?: number | string | null;
  sublabel?: string;
  locked?: boolean;
  style?: ViewStyle;
};

/** The bubble button: a big round, tappable target with an icon, label and optional count badge. */
export function Bubble({ label, icon, onPress, size = 118, color = C.greenDeep, textColor = C.white, badge, sublabel, locked, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${badge ? `, ${badge}` : ""}${locked ? ", locked" : ""}`}
      style={({ pressed }) => [
        styles.bubble,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ scale: pressed ? 0.94 : 1 }], opacity: locked ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.26 }}>{locked ? "🔒" : icon}</Text>
      <Text style={[styles.label, { color: textColor, fontSize: Math.max(12, size * 0.115) }]} numberOfLines={2}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={[styles.sub, { color: textColor }]} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Wraps bubbles in a loose, centered cluster. */
export function BubbleCluster({ children }: { children: React.ReactNode }) {
  return <View style={styles.cluster}>{children}</View>;
}

/** Small pill-shaped bubble used for choices (goal types, timeframes). */
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.8 }]}>
      <Text style={[styles.chipText, active && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    margin: 8,
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  label: { fontWeight: "700", textAlign: "center", marginTop: 4 },
  sub: { fontSize: 11, opacity: 0.85, marginTop: 2, textAlign: "center" },
  badge: { position: "absolute", top: 6, right: 6, minWidth: 26, height: 26, borderRadius: 13, backgroundColor: C.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderWidth: 2, borderColor: C.white },
  badgeText: { color: C.ink, fontWeight: "800", fontSize: 12 },
  cluster: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", paddingVertical: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 9, margin: 4 },
  chipActive: { backgroundColor: C.greenDeep, borderColor: C.greenDeep },
  chipText: { color: C.ink, fontWeight: "700", fontSize: 13 },
});
