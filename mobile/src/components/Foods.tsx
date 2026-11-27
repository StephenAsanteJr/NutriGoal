import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { C, serif } from "@/lib/theme";
import { FOOD_GROUP_LABELS, type ClinicianFoods, type CuisineRef, type FoodExample, type FoodGuideData } from "@/lib/home";
import { useSession } from "@/lib/session";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Horizontal chips: Everyday, the member's cuisines first, then every other culture. */
function CuisineChips({ value, onChange, cuisines, preferred = [] }: { value: string; onChange: (id: string) => void; cuisines: CuisineRef[]; preferred?: string[] }) {
  const order = [...preferred.map((p) => cuisines.find((c) => c.id === p)).filter((c): c is CuisineRef => !!c), ...cuisines.filter((c) => !preferred.includes(c.id))];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
      {[{ id: "everyday", label: "Everyday", region: "" }, ...order].map((c) => {
        const on = value === c.id;
        return (
          <Pressable key={c.id} onPress={() => onChange(c.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.chip, on && { backgroundColor: C.red, borderColor: C.red }]}>
            <Text style={{ color: on ? C.white : C.ink, fontWeight: "700", fontSize: 13 }}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type CuisineFoods = { id: string; label: string; note: string | null; groups: Record<string, FoodExample[]> };

/** Member's daily food guide: servings per food group + swappable ingredients by culture (each an 80%+ match). */
export function FoodGuideCard({ guide }: { guide: FoodGuideData }) {
  const { call } = useSession();
  const [open, setOpen] = useState<string | null>(guide.rows[0]?.id ?? null);
  const [cuisine, setCuisine] = useState(guide.preferred?.[0] ?? "everyday");
  const [loaded, setLoaded] = useState<Record<string, CuisineFoods>>({});
  useEffect(() => {
    if (cuisine === "everyday" || loaded[cuisine]) return;
    call<CuisineFoods>(`cuisines/${cuisine}`).then((c) => setLoaded((l) => ({ ...l, [c.id]: c }))).catch(() => {});
  }, [cuisine, loaded, call]);
  const current = cuisine === "everyday" ? null : loaded[cuisine];
  const m = guide.match;
  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>FOODS THAT FIT YOUR TARGETS</Text>
          <Text style={{ fontFamily: serif, fontSize: 21, color: C.ink, marginTop: 2 }}>Food groups, not meals</Text>
          <Text style={{ color: C.slate, fontSize: 13, marginTop: 4 }}>Eat roughly these servings across your day. Any example in a group can stand in for another.</Text>
        </View>
        <View style={s.matchBox}>
          <Text style={{ fontFamily: serif, fontSize: 24, color: C.greenDeep }}>{m.overall}%</Text>
          <Text style={{ color: C.greenDeep, fontSize: 9.5, fontWeight: "800", textAlign: "center" }}>MATCH</Text>
        </View>
      </View>
      <View style={s.totals}>
        {[
          ["kcal", guide.totals.kcal, m.kcal],
          ["protein", `${guide.totals.protein} g`, m.protein],
          ["carbs", `${guide.totals.carbs} g`, m.carbs],
          ["fat", `${guide.totals.fat} g`, m.fat],
        ].map(([k, v, pct]) => (
          <View key={k as string} style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: "800", fontSize: 13 }}>{typeof v === "number" ? v.toLocaleString() : v}</Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{k}</Text>
            <Text style={{ color: (pct as number) >= 90 ? C.greenDeep : C.slate, fontSize: 11, fontWeight: "700" }}>{pct}%</Text>
          </View>
        ))}
      </View>
      {guide.cuisines?.length ? <CuisineChips value={cuisine} onChange={setCuisine} cuisines={guide.cuisines} preferred={guide.preferred} /> : null}
      {current?.note ? <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{current.label}: {current.note}</Text> : null}
      {guide.rows.map((r) => {
        const isOpen = open === r.id;
        const examples = cuisine === "everyday" ? r.examples : current?.groups[r.id] ?? [];
        return (
          <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: C.line }}>
            <Pressable onPress={() => setOpen(isOpen ? null : r.id)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={s.groupRow}>
              <Text style={{ fontFamily: serif, fontSize: 24, color: C.greenDeep, width: 32 }}>{r.servings}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.ink, fontWeight: "800" }}>{r.label}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={isOpen ? 3 : 1}>
                  serving{r.servings === 1 ? "" : "s"} a day · 1 serving ≈ {r.typical.serving}
                </Text>
              </View>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
            </Pressable>
            {isOpen && (
              <View style={{ paddingBottom: 12, gap: 6 }}>
                {cuisine !== "everyday" && !current && <Text style={{ color: C.muted }}>Loading…</Text>}
                {current && examples.length === 0 && <Text style={{ color: C.muted, fontSize: 13 }}>No close matches in this cuisine; see Everyday.</Text>}
                {examples.map((e) => (
                  <View key={e.name} style={s.food}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.ink, fontWeight: "700" }}>{e.name} <Text style={{ color: C.muted, fontWeight: "400" }}>· {e.serving}</Text></Text>
                      <Text style={{ color: C.slate, fontSize: 12 }}>{e.kcal} kcal · {fmt(e.protein)} g protein · {fmt(e.carbs)} g carbs · {fmt(e.fat)} g fat</Text>
                    </View>
                    <Text style={s.pct}>{e.match}%</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      <Text style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>Rounded USDA-style values per serving; packaged foods vary. General guidance; your clinician&apos;s plan comes first.</Text>
    </View>
  );
}

/** Foods a clinician suggested on a response, grouped. */
export function ClinicianFoodsCard({ foods, clinician }: { foods: ClinicianFoods; clinician: string }) {
  const groups = (Object.keys(FOOD_GROUP_LABELS) as (keyof ClinicianFoods)[]).filter((g) => foods[g]?.length);
  if (!groups.length) return null;
  return (
    <View style={s.card}>
      <Text style={s.kicker}>FOODS {clinician.split(",")[0].toUpperCase()} SUGGESTS</Text>
      <Text style={{ color: C.slate, fontSize: 13, marginTop: 2, marginBottom: 8 }}>Examples by food group, not set meals. Mix them into your day.</Text>
      {groups.map((g) => (
        <View key={g} style={{ marginTop: 6 }}>
          <Text style={{ color: C.greenDeep, fontWeight: "800", fontSize: 12 }}>{FOOD_GROUP_LABELS[g]}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {foods[g]!.map((name) => (
              <View key={name} style={s.chipOn}>
                <Text style={{ color: C.greenDeep, fontWeight: "700", fontSize: 13 }}>✓ {name}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

type Catalog = { cuisine: string; cuisines: CuisineRef[]; groups: { id: keyof ClinicianFoods; label: string; hint: string; foods: { name: string; serving: string; match: number }[] }[] };

/** Clinician picker: tap catalog ingredients from any culture's cuisine, or type your own (max 6 per group). */
export function FoodPicker({ value, onChange, memberCuisines = [] }: { value: ClinicianFoods; onChange: (v: ClinicianFoods) => void; memberCuisines?: string[] }) {
  const { call } = useSession();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<keyof ClinicianFoods, string>>>({});
  const active = cuisine ?? memberCuisines[0] ?? "everyday";
  useEffect(() => {
    call<Catalog>(`foods?cuisine=${encodeURIComponent(active)}`).then(setCatalog).catch(() => setCatalog({ cuisine: "everyday", cuisines: [], groups: [] }));
  }, [call, active]);
  const toggle = (g: keyof ClinicianFoods, name: string) => {
    const list = value[g] ?? [];
    onChange({ ...value, [g]: list.includes(name) ? list.filter((x) => x !== name) : list.length < 6 ? [...list, name] : list });
  };
  const add = (g: keyof ClinicianFoods) => {
    const t = (drafts[g] ?? "").trim().slice(0, 60);
    if (t && !(value[g] ?? []).includes(t) && (value[g] ?? []).length < 6) onChange({ ...value, [g]: [...(value[g] ?? []), t] });
    setDrafts((d) => ({ ...d, [g]: "" }));
  };
  if (!catalog) return <Text style={{ color: C.muted }}>Loading foods…</Text>;
  return (
    <View>
      {catalog.cuisines.length > 0 && <CuisineChips value={active} onChange={setCuisine} cuisines={catalog.cuisines} preferred={memberCuisines} />}
      {catalog.groups.map((g) => {
        const chosen = value[g.id] ?? [];
        const custom = chosen.filter((c) => !g.foods.some((f) => f.name === c));
        return (
          <View key={g.id} style={{ marginBottom: 14 }}>
            <Text style={{ color: C.ink, fontWeight: "800", fontSize: 13 }}>{g.label}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{g.hint}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {[...g.foods.map((f) => f.name), ...custom].map((name) => {
                const on = chosen.includes(name);
                return (
                  <Pressable key={name} onPress={() => toggle(g.id, name)} accessibilityRole="button" accessibilityState={{ selected: on }} style={on ? s.chipOn : s.chip}>
                    <Text style={{ color: on ? C.greenDeep : C.ink, fontWeight: "700", fontSize: 13 }}>{on ? "✓ " : ""}{name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput
                value={drafts[g.id] ?? ""}
                onChangeText={(t) => setDrafts((d) => ({ ...d, [g.id]: t }))}
                onSubmitEditing={() => add(g.id)}
                placeholder="Add your own (tap 🎙 on the keyboard to speak)"
                placeholderTextColor={C.muted}
                maxLength={60}
                style={s.input}
              />
              <Pressable onPress={() => add(g.id)} accessibilityRole="button" style={s.add}>
                <Text style={{ color: C.white, fontWeight: "800" }}>Add</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginVertical: 8 },
  kicker: { color: C.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  matchBox: { backgroundColor: C.greenTint, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  totals: { flexDirection: "row", backgroundColor: C.mist, borderRadius: 12, paddingVertical: 8, marginTop: 12, marginBottom: 6 },
  groupRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  food: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.mist, borderRadius: 10, padding: 10 },
  pct: { color: C.greenDeep, backgroundColor: C.greenTint, fontWeight: "800", fontSize: 11, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { borderRadius: 999, borderWidth: 1, borderColor: C.greenDeep, backgroundColor: C.greenTint, paddingHorizontal: 12, paddingVertical: 7 },
  input: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: C.ink },
  add: { backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 16, justifyContent: "center" },
});
