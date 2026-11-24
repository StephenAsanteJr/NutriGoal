import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useData } from "@/lib/useData";
import { useSession } from "@/lib/session";
import { C, serif } from "@/lib/theme";
import { Bubble, BubbleCluster } from "@/components/Bubble";
import { Body, Card, ErrorText, Eyebrow, Loading, Pill, Screen } from "@/components/UI";

type D = {
  ticket: { id: number; number: string; goal: string; goalType: string; status: string; statusLabel: string; member: string; clinician: string | null; dueAt: string | null; typicalDiet: string; setbacks: string; target: string; routing: string | null; nudges: number };
  response: { recommendation: string; steps: { title: string; detail: string; timeframe: string }[]; clinician: string; aiAssist: string; at: string } | null;
  canRespond: boolean;
};

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useData<D>(`tickets/${id}`);
  const { role, call } = useSession();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  if (loading && !data) return <Loading />;
  if (!data) return <Screen><ErrorText>{error}</ErrorText></Screen>;
  const t = data.ticket;
  const nudge = async () => {
    try {
      const r = await call<{ message: string }>(`tickets/${t.id}/nudge`, {});
      setMsg(r.message);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't send the nudge.");
    }
    reload();
  };

  return (
    <Screen>
      <Eyebrow>{t.number} · {t.goalType}</Eyebrow>
      <Text style={{ fontFamily: serif, fontSize: 26, color: C.navy, marginBottom: 8 }}>{t.goal}</Text>
      <Pill label={t.statusLabel} tone={t.status === "responded" ? "good" : "info"} />

      {data.response ? (
        <Card>
          <Eyebrow>Recommendation</Eyebrow>
          <Text style={{ fontFamily: serif, fontSize: 19, color: C.navy, lineHeight: 26 }}>{data.response.recommendation}</Text>
          <View style={{ marginTop: 12 }}>
            {data.response.steps.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: C.white, fontWeight: "800" }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: C.navy }}>{s.title}</Text>
                  <Text style={{ color: C.slate, marginTop: 2 }}>{s.detail}</Text>
                  <Text style={{ color: C.blue, fontWeight: "700", marginTop: 4, fontSize: 12 }}>⏱ {s.timeframe}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
            Written and reviewed by {data.response.clinician}. AI writing help: {data.response.aiAssist === "wording" ? "used for wording only" : "not used"}.
          </Text>
        </Card>
      ) : (
        <Card>
          <Body>{t.clinician ? `${t.clinician} has this ticket.` : "Matching a clinician."}{t.dueAt ? ` Response due ${new Date(t.dueAt).toLocaleString()}.` : ""}</Body>
          {t.nudges ? <Body muted>Nudged {t.nudges}×</Body> : null}
        </Card>
      )}

      {msg && <Card tone="good"><Body>{msg}</Body></Card>}

      {!data.response && (
        <BubbleCluster>
          {role === "member" && <Bubble size={120} label="Nudge clinician" icon="⚑" color="#ffb547" textColor={C.navy} onPress={nudge} />}
          {role === "manager" && <Bubble size={120} label="Send nudge" icon="⚑" color="#ffb547" textColor={C.navy} onPress={nudge} />}
          {data.canRespond && <Bubble size={140} label="Write response" icon="✍️" color={C.blue} onPress={() => router.push(`/respond/${t.id}`)} />}
        </BubbleCluster>
      )}

      <Card>
        <Eyebrow>{role === "member" ? "What you sent" : `From ${t.member}`}</Eyebrow>
        <Text style={{ fontWeight: "700", color: C.navy }}>Typical diet</Text>
        <Body>{t.typicalDiet}</Body>
        <Text style={{ fontWeight: "700", color: C.navy, marginTop: 8 }}>Setbacks</Text>
        <Body>{t.setbacks}</Body>
        <Text style={{ fontWeight: "700", color: C.navy, marginTop: 8 }}>Target</Text>
        <Body>{t.target}</Body>
        {t.routing && <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Routing: {t.routing}</Text>}
      </Card>
    </Screen>
  );
}
