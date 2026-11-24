import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSession } from "@/lib/session";
import { C } from "@/lib/theme";
import { Chip } from "@/components/Bubble";
import { Body, Button, Card, ErrorText, Eyebrow, Field, Screen, Title } from "@/components/UI";

const FRAMES = ["Today", "Days 1–3", "Week 1", "Weeks 1–2", "Weeks 2–4", "Month 2", "Ongoing"];
type Step = { title: string; detail: string; timeframe: string };
const blank = (): Step => ({ title: "", detail: "", timeframe: "" });

/** Clinician response composer: concise recommendation + 5–6 timed steps, signed by the clinician. */
export default function Respond() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { call, name } = useSession();
  const router = useRouter();
  const [rec, setRec] = useState("");
  const [steps, setSteps] = useState<Step[]>(Array.from({ length: 5 }, blank));
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    call(`tickets/${id}/start-review`, {}).catch(() => {});
  }, [id, call]);
  const upd = (i: number, k: keyof Step, v: string) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const done = steps.filter((s) => s.title && s.detail && s.timeframe).length;

  return (
    <Screen>
      <Eyebrow>Response ticket</Eyebrow>
      <Title>Write your plan</Title>
      <Body muted>Tip: use your keyboard&apos;s mic to dictate. You sign every response; AI never writes the plan.</Body>
      <Card>
        <Field label={`Concise recommendation (${rec.length}/420)`} value={rec} onChangeText={(v) => setRec(v.slice(0, 420))} multiline />
      </Card>
      {steps.map((s, i) => (
        <Card key={i}>
          <Text style={{ color: C.navy, fontWeight: "800", marginBottom: 8 }}>Step {i + 1}</Text>
          <Field label="Title" value={s.title} onChangeText={(v) => upd(i, "title", v)} maxLength={80} />
          <Field label="What to do" value={s.detail} onChangeText={(v) => upd(i, "detail", v)} multiline maxLength={400} />
          <Text style={{ color: C.navy, fontWeight: "700", fontSize: 13, marginBottom: 4 }}>Timeframe</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {FRAMES.map((fr) => (
              <Chip key={fr} label={fr} active={s.timeframe === fr} onPress={() => upd(i, "timeframe", fr)} />
            ))}
          </View>
        </Card>
      ))}
      {steps.length < 6 && <Button label="+ Add a sixth step" kind="ghost" onPress={() => setSteps((s) => [...s, blank()])} />}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: C.navy, fontWeight: "700", flex: 1 }}>I used an approved AI tool for wording only</Text>
          <Switch value={ai} onValueChange={setAi} />
        </View>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
          Signature: “Written and reviewed by {name}. AI writing help: {ai ? "used for wording only" : "not used"}.”
        </Text>
      </Card>
      <ErrorText>{error}</ErrorText>
      <Button
        label={`Sign and send (${done} of 5–6 steps)`}
        busy={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await call(`tickets/${id}/respond`, { recommendation: rec, steps, aiAssist: ai ? "wording" : "none" });
            router.replace(`/tickets/${id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't send.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}
