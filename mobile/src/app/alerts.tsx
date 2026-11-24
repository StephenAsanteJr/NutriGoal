import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useData } from "@/lib/useData";
import { useSession } from "@/lib/session";
import { C } from "@/lib/theme";
import { Body, Button, Card, Loading, Screen, Title } from "@/components/UI";

type N = { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };

export default function Alerts() {
  const { data, reload } = useData<{ notifications: N[] }>("notifications");
  const { call, role } = useSession();
  const router = useRouter();
  if (!data) return <Loading />;
  const open = (link: string | null) => {
    const m = link?.match(/\/(?:staff\/)?tickets\/(\d+)/);
    if (m) router.push(`/tickets/${m[1]}`);
  };
  return (
    <Screen>
      <Title>Alerts</Title>
      {data.notifications.some((n) => !n.read_at) && <Button label="Mark all as read" kind="ghost" onPress={async () => { await call("notifications/read", {}); reload(); }} />}
      {data.notifications.length === 0 && <Body muted>You&apos;re all caught up.</Body>}
      {data.notifications.map((n) => (
        <Pressable key={n.id} onPress={() => open(n.link)} accessibilityRole="button">
          <Card>
            <Text style={{ fontWeight: "800", color: C.navy }}>{!n.read_at ? "● " : ""}{n.title}</Text>
            <Body>{n.body}</Body>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</Text>
          </Card>
        </Pressable>
      ))}
      {role !== "member" && <Body muted>Ticket alerts open the ticket; nudges show who asked and when.</Body>}
    </Screen>
  );
}
