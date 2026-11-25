import { useState } from "react";
import { Text, View } from "react-native";
import { useHome } from "@/lib/home";
import { C, serif } from "@/lib/theme";
import { Chip } from "@/components/Bubble";
import { Body, Card, Loading, Screen, Title } from "@/components/UI";
import { Character } from "@/components/Character";

export default function Build() {
  const { data: home } = useHome();
  const data = home?.role === "member" ? home : null;
  const [view, setView] = useState<"today" | "goal">("today");
  if (!data) return <Loading />;
  if (!data.build)
    return (
      <Screen tab>
        <Title>My build</Title>
        <Body muted>Finish your health profile on the website and your build and biometric card will appear here.</Body>
      </Screen>
    );
  const b = data.build;
  const w = (kg: number) => `${Math.round(data.units === "metric" ? kg : kg / 0.45359237)} ${data.units === "metric" ? "kg" : "lb"}`;
  const now = view === "today";
  return (
    <Screen tab>
      <Title>My build</Title>
      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 8 }}>
        <Chip label="Today" active={now} onPress={() => setView("today")} />
        <Chip label="Goal" active={!now} onPress={() => setView("goal")} />
      </View>
      <View style={{ alignItems: "center" }}>
        <Character sex={b.sex} heightCm={b.heightCm} weightKg={now ? b.weightKg : b.goalWeightKg} bodyFatPct={now ? b.bodyFatPct : b.goalBodyFatPct} look={data.look} height={330} ghost={now ? { weightKg: b.goalWeightKg, bodyFatPct: b.goalBodyFatPct } : { weightKg: b.weightKg, bodyFatPct: b.bodyFatPct }} />
        <Body muted>Dotted outline: {now ? "your goal" : "today"}</Body>
      </View>
      <Card tone="navy">
        <Text style={{ color: C.greenFresh, fontWeight: "800", fontSize: 11, letterSpacing: 1.5 }}>BIOMETRIC CARD</Text>
        {[
          ["Weight", `${w(b.weightKg)} → ${w(b.goalWeightKg)}`],
          ["Body fat", `${b.bodyFatPct}% → ${b.goalBodyFatPct}%`],
          ["BMI", String(b.bmi)],
          ["Daily target", `${b.targetKcal.toLocaleString()} kcal`],
          ["Protein", `${b.proteinG} g / day`],
          ["Timeline", `${b.weeks} weeks`],
        ].map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" }}>
            <Text style={{ color: "rgba(255,255,255,0.7)" }}>{k}</Text>
            <Text style={{ color: C.white, fontWeight: "800", fontFamily: k === "Weight" ? serif : undefined }}>{v}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
