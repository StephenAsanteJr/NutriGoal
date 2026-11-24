import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useData } from "@/lib/useData";
import { useSession } from "@/lib/session";
import { C } from "@/lib/theme";
import { Body, Card, ErrorText, Loading, Pill, Screen, Title } from "@/components/UI";

const hoursUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 3600_000);

type T = { id: number; number: string; goal: string; goalType: string; status: string; statusLabel: string; member: string; clinician: string | null; dueAt: string | null; nudges: number };

export default function Tickets() {
  const { role } = useSession();
  const { data, error, loading } = useData<{ tickets: T[] }>("tickets");
  const router = useRouter();
  if (loading && !data) return <Loading />;
  const list = data?.tickets ?? [];
  return (
    <Screen>
      <Title>{role === "member" ? "My tickets" : role === "clinician" ? "My queue" : "All tickets"}</Title>
      <ErrorText>{error}</ErrorText>
      {list.length === 0 && <Body muted>Nothing here yet.</Body>}
      {list.map((t) => {
        const due = t.dueAt ? hoursUntil(t.dueAt) : null;
        return (
          <Pressable key={t.id} onPress={() => router.push(`/tickets/${t.id}`)} accessibilityRole="button">
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ color: C.muted, fontWeight: "700", fontSize: 12 }}>{t.number} · {t.goalType}</Text>
                <Pill label={t.statusLabel} tone={t.status === "responded" ? "good" : "info"} />
              </View>
              <Text style={{ color: C.navy, fontWeight: "800", fontSize: 16 }}>{t.goal}</Text>
              <Text style={{ color: C.slate, marginTop: 4, fontSize: 13 }}>
                {role === "member" ? t.clinician ?? "Matching clinician" : t.member}
                {t.status !== "responded" && due != null ? ` · ${due < 0 ? `overdue ${-due} h` : `due in ${due} h`}` : ""}
                {t.nudges ? ` · ⚑ nudged ×${t.nudges}` : ""}
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
