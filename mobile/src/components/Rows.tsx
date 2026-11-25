// Home-screen building blocks: the highlight card, "Jump in" list rows and count badges.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "@/lib/theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export type Tone = "blue" | "green" | "red" | "cyan" | "navy" | "warn";

/** Icon colors. Green and red keep their meaning: green = progress/success, red = needs attention. */
const TONES: Record<Tone, { fg: string; bg: string }> = {
  blue: { fg: C.blue, bg: C.blueTint },
  green: { fg: C.greenDeep, bg: C.greenTint },
  red: { fg: C.red, bg: C.redTint },
  cyan: { fg: "#0284c7", bg: C.cyanTint },
  navy: { fg: C.navy, bg: "#eef1f4" },
  warn: { fg: C.warn, bg: C.warnTint },
};

export function IconTile({ icon, tone = "blue", size = 38 }: { icon: IconName; tone?: Tone; size?: number }) {
  const t = TONES[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={size * 0.5} color={t.fg} />
    </View>
  );
}

/** Count badge. Red is for things that need attention; navy for plain counts; green for done/ready. */
export function Badge({ value, tone = "red" }: { value: number | string; tone?: "red" | "navy" | "green" }) {
  const bg = tone === "red" ? C.red : tone === "green" ? C.green : C.navy;
  const fg = tone === "green" ? C.navy : C.white;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{value}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.section}>{children}</Text>;
}

/** White rounded group holding rows, separated by hairlines. */
export function RowGroup({ children }: { children: React.ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={s.group}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <View style={s.divider} />}
          {child}
        </View>
      ))}
    </View>
  );
}

type RowProps = {
  icon: IconName;
  tone?: Tone;
  title: string;
  subtitle?: string | null;
  subtitleTone?: "muted" | "red" | "green";
  onPress?: () => void;
  badge?: number | string | null;
  badgeTone?: "red" | "navy" | "green";
  value?: string;
  locked?: boolean;
};

export function Row({ icon, tone, title, subtitle, subtitleTone = "muted", onPress, badge, badgeTone, value, locked }: RowProps) {
  const subColor = subtitleTone === "red" ? C.red : subtitleTone === "green" ? C.greenDeep : C.muted;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ""}${badge ? `, ${badge}` : ""}${locked ? ", locked" : ""}`}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: C.mist }]}
    >
      <IconTile icon={locked ? "lock-closed" : icon} tone={locked ? "navy" : tone} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[s.rowSub, { color: subColor }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={s.value}>{value}</Text> : null}
      {badge ? <Badge value={badge} tone={badgeTone} /> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={C.muted} /> : null}
    </Pressable>
  );
}

/** The bright card at the top of home: one "next step" with a single action. BCG green, navy text. */
export function HighlightCard({ icon, kicker, title, subtitle, action, onPress }: {
  icon: IconName; kicker: string; title: string; subtitle?: string | null; action?: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} style={({ pressed }) => [s.hero, pressed && { opacity: 0.92 }]}>
      <View style={s.heroIcon}>
        <Ionicons name={icon} size={22} color={C.navy} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.heroKicker} numberOfLines={1}>{kicker}</Text>
        <Text style={s.heroTitle} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={s.heroSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <View style={s.heroAction}>
          <Text style={s.heroActionText}>{action}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Thin meter. "min" targets (protein) are met at 90%+; "range" targets (calories) are met within ±10%,
 * and going more than 10% over turns the bar Bain red. Blue = still working toward it.
 */
export function Meter({ label, value, target, unit, mode = "min" }: { label: string; value: number; target: number; unit: string; mode?: "min" | "range" }) {
  const pct = Math.max(0, Math.min(1, value / target));
  const met = mode === "range" ? Math.abs(value - target) <= target * 0.1 : value >= target * 0.9;
  const over = mode === "range" && value > target * 1.1;
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: C.navy, fontWeight: "700", fontSize: 13 }}>{label}</Text>
        <Text style={{ color: met ? C.greenDeep : over ? C.red : C.slate, fontWeight: "700", fontSize: 13 }}>
          {value.toLocaleString()} / {target.toLocaleString()} {unit}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: "#e8ecef", overflow: "hidden" }}>
        <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: met ? C.green : over ? C.red : C.blue }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { color: C.navy, fontWeight: "800", fontSize: 16, marginTop: 22, marginBottom: 10 },
  group: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 64 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowTitle: { color: C.navy, fontWeight: "700", fontSize: 15 },
  rowSub: { fontSize: 12.5, marginTop: 2 },
  value: { color: C.navy, fontWeight: "800", fontSize: 14 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { fontWeight: "800", fontSize: 12 },
  hero: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.green, borderRadius: 18, padding: 16, marginTop: 18,
    shadowColor: "#0c2b15", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  heroIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center" },
  heroKicker: { color: C.navy, fontWeight: "800", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.75 },
  heroTitle: { color: C.navy, fontWeight: "800", fontSize: 16, marginTop: 2 },
  heroSub: { color: C.navy, fontSize: 12.5, marginTop: 2, opacity: 0.85 },
  heroAction: { backgroundColor: C.navy, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  heroActionText: { color: C.white, fontWeight: "800", fontSize: 13 },
});
