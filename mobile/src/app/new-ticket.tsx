import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/web";
import { C } from "@/lib/theme";
import { Bubble, BubbleCluster, Chip } from "@/components/Bubble";
import { Body, Button, Card, ErrorText, Eyebrow, Field, Screen, Title } from "@/components/UI";

const GOALS = [
  ["fat_loss", "Lose body fat"], ["muscle_gain", "Build muscle"], ["protein", "Protein target"], ["blood_sugar", "Blood sugar / A1C"],
  ["heart_health", "Heart health"], ["glp1_side_effects", "GLP-1 side effects"], ["keep_weight_off", "Keep it off"], ["budget_meals", "Budget meals"],
] as const;

export default function NewTicket() {
  const { call } = useSession();
  const router = useRouter();
  const [goalType, setGoalType] = useState<string>("fat_loss");
  const [f, setF] = useState({ goal_statement: "", typical_diet: "", setbacks: "", specific_target: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: number; number: string; canRedeem: boolean } | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  if (draft)
    return (
      <Screen>
        <Eyebrow>{draft.number} · ready to submit</Eyebrow>
        <Title>How would you like to submit?</Title>
        <ErrorText>{error}</ErrorText>
        <BubbleCluster>
          {draft.canRedeem && (
            <Bubble
              size={150}
              label="Use included ticket"
              icon="🎟️"
              color={C.blue}
              sublabel="$0 with membership"
              onPress={async () => {
                try {
                  await call(`tickets/${draft.id}/redeem`, {});
                  router.replace(`/tickets/${draft.id}`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Couldn't submit.");
                }
              }}
            />
          )}
          <Bubble size={130} label="Pay & submit" icon="💳" color={C.navy} sublabel="$19.99 or membership" onPress={() => openWeb(call, `/tickets/new?draft=${draft.id}`).catch(() => setError("Couldn't open checkout."))} />
        </BubbleCluster>
        <Body muted>Payment opens NutriGoal&apos;s secure checkout on the web (Stripe), already signed in. Come back here to follow your ticket.</Body>
        <Button label="View my tickets" kind="ghost" onPress={() => router.replace("/tickets")} />
      </Screen>
    );

  return (
    <Screen>
      <Title>Describe your goal</Title>
      <Body muted>One goal per ticket. A physician or dietitian writes back within 48 hours. Tip: tap the mic on your keyboard to speak instead of typing.</Body>
      <Text style={{ color: C.navy, fontWeight: "700", marginTop: 14, marginBottom: 6 }}>What kind of goal?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        {GOALS.map(([id, label]) => (
          <Chip key={id} label={label} active={goalType === id} onPress={() => setGoalType(id)} />
        ))}
      </View>
      <Card>
        <Field label="What is your nutritional goal?" value={f.goal_statement} onChangeText={set("goal_statement")} placeholder="e.g. Hit 130 g of protein a day" />
        <Field label="What do you typically eat?" value={f.typical_diet} onChangeText={set("typical_diet")} multiline />
        <Field label="What setbacks do you face?" value={f.setbacks} onChangeText={set("setbacks")} multiline />
        <Field label="What specific target do you want to hit?" value={f.specific_target} onChangeText={set("specific_target")} placeholder="A number, a lab value, a date" />
        <ErrorText>{error}</ErrorText>
        <Button
          label="Continue"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              setDraft(await call<{ id: number; number: string; canRedeem: boolean }>("tickets", { goal_type: goalType, ...f }));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn't save your ticket.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>
    </Screen>
  );
}
