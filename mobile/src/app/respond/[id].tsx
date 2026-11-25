import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSession } from "@/lib/session";
import { useData } from "@/lib/useData";
import { C } from "@/lib/theme";
import { Chip } from "@/components/Bubble";
import { Body, Button, Card, ErrorText, Eyebrow, Screen, Title } from "@/components/UI";
import { DictateField, ListenButton, VoicePanel } from "@/components/Voice";
import { FoodPicker } from "@/components/Foods";
import type { ClinicianFoods } from "@/lib/home";

const FRAMES = ["Today", "Days 1–3", "Week 1", "Weeks 1–2", "Weeks 2–4", "Month 2", "Months 2–3", "Ongoing"];
type Step = { title: string; detail: string; timeframe: string };
const blank = (): Step => ({ title: "", detail: "", timeframe: "" });
type T = { ticket: { number: string; goal: string; goalType: string; member: string; typicalDiet: string; setbacks: string; target: string } };

/** Clinician response composer: concise recommendation + 5–6 timed steps, signed by the clinician. */
export default function Respond() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { call, name } = useSession();
  const router = useRouter();
  const { data } = useData<T>(`tickets/${id}`);
  const [rec, setRec] = useState("");
  const [steps, setSteps] = useState<Step[]>(Array.from({ length: 5 }, blank));
  const [ai, setAi] = useState(false);
  const [foods, setFoods] = useState<ClinicianFoods>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    call(`tickets/${id}/start-review`, {}).catch(() => {});
  }, [id, call]);
  const upd = (i: number, k: keyof Step, v: string) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const done = steps.filter((s) => s.title && s.detail && s.timeframe).length;
  const t = data?.ticket;

  const fromVoice = async (transcript: string) => {
    const r = await call<{ draft: { recommendation: string; steps: Step[] }; ai: boolean; note?: string }>("voice", { kind: "response", transcript, ticketId: Number(id) });
    if (r.draft.recommendation) setRec(r.draft.recommendation.slice(0, 420));
    const drafted = r.draft.steps.slice(0, 6).map((s) => ({ title: s.title.slice(0, 80), detail: s.detail.slice(0, 400), timeframe: s.timeframe.slice(0, 40) }));
    if (drafted.length) setSteps([...drafted, ...Array.from({ length: Math.max(0, 5 - drafted.length) }, blank)]);
    // Same disclosure rule as the website: if a model formatted the dictation, the signature says so.
    if (r.ai) setAi(true);
    if (r.note) return r.note;
    return r.ai
      ? "Formatted from your dictation. AI writing help is now disclosed as “wording only”. Review every step before signing."
      : "Drafted from your dictation. Read every step and edit it before you sign.";
  };

  return (
    <Screen>
      <Eyebrow>Response ticket</Eyebrow>
      <Title>Write your plan</Title>
      <Body muted>Tap any 🎙 to dictate. You sign every response; AI never writes the plan.</Body>

      {t && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ color: C.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1, flex: 1 }}>{t.number} · FROM {t.member.toUpperCase()}</Text>
            <ListenButton label="Listen to ticket" title={`${t.number}: ${t.goal}`} text={`${t.member}'s goal: ${t.goal}. What they eat: ${t.typicalDiet}. Setbacks: ${t.setbacks}. Target: ${t.target}.`} />
          </View>
          <Text style={{ color: C.navy, fontWeight: "800", fontSize: 16, marginTop: 6 }}>{t.goal}</Text>
          <Text style={{ color: C.slate, fontSize: 13, marginTop: 4 }} numberOfLines={3}>Target: {t.target}</Text>
        </Card>
      )}

      <VoicePanel
        title="Dictate the whole plan"
        hint="Say your recommendation, then each step with when to do it (“Step one, this week: …”). We draft the fields; you review, edit and sign."
        action="Draft the plan from what I said"
        onTranscript={fromVoice}
      />

      <Card>
        <DictateField label={`Concise recommendation (${rec.length}/420)`} value={rec} onChangeText={(v) => setRec(v.slice(0, 420))} multiline />
      </Card>
      {steps.map((s, i) => (
        <Card key={i}>
          <Text style={{ color: C.navy, fontWeight: "800", marginBottom: 8 }}>Step {i + 1}</Text>
          <DictateField label="Title" value={s.title} onChangeText={(v) => upd(i, "title", v.slice(0, 80))} maxLength={80} />
          <DictateField label="What to do" value={s.detail} onChangeText={(v) => upd(i, "detail", v.slice(0, 400))} multiline maxLength={400} />
          <Text style={{ color: C.navy, fontWeight: "700", fontSize: 13, marginBottom: 4 }}>Timeframe</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {(s.timeframe && !FRAMES.includes(s.timeframe) ? [...FRAMES, s.timeframe] : FRAMES).map((fr) => (
              <Chip key={fr} label={fr} active={s.timeframe === fr} onPress={() => upd(i, "timeframe", fr)} />
            ))}
          </View>
        </Card>
      ))}
      {steps.length < 6 && <Button label="+ Add a sixth step" kind="ghost" onPress={() => setSteps((s) => [...s, blank()])} />}
      <Card>
        <Text style={{ color: C.navy, fontWeight: "800", fontSize: 16 }}>Suggested foods (optional)</Text>
        <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 2, marginBottom: 12 }}>
          Pick example foods by group or add your own. The member sees them under your plan. Foods, not meals.
        </Text>
        <FoodPicker value={foods} onChange={setFoods} />
      </Card>
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
            await call(`tickets/${id}/respond`, { recommendation: rec, steps, aiAssist: ai ? "wording" : "none", foods });
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
