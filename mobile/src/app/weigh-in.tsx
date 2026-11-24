import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/session";
import { useData } from "@/lib/useData";
import { C, serif } from "@/lib/theme";
import { Body, Button, ErrorText, Screen, Title } from "@/components/UI";

export default function WeighIn() {
  const { call } = useSession();
  const { data } = useData<{ units: "imperial" | "metric" }>("home");
  const router = useRouter();
  const [w, setW] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unit = data?.units === "metric" ? "kg" : "lb";
  return (
    <Screen>
      <Title>Log today&apos;s weight</Title>
      <Body muted>It updates your build, progress chart and what your clinician sees.</Body>
      <View style={{ alignItems: "center", marginVertical: 28 }}>
        <View style={{ width: 220, height: 220, borderRadius: 110, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 6, borderColor: C.cyan }}>
          <TextInput value={w} onChangeText={setW} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.line} style={{ fontFamily: serif, fontSize: 56, color: C.navy, textAlign: "center", minWidth: 140 }} accessibilityLabel={`Weight in ${unit}`} />
          <Text style={{ color: C.muted, fontWeight: "800" }}>{unit}</Text>
        </View>
      </View>
      <ErrorText>{error}</ErrorText>
      <Button
        label="Save weigh-in"
        busy={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await call("weigh-ins", { weight: Number(w) });
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't save.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}
