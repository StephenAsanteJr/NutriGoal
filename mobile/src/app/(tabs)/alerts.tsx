import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useData } from "@/lib/useData";
import { useSession } from "@/lib/session";
import { useHome } from "@/lib/home";
import { C } from "@/lib/theme";
import { Body, Loading, Screen, Title } from "@/components/UI";
import { IconTile } from "@/components/Rows";

type N = { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };

export default function Alerts() {
  const { data, reload } = useData<{ notifications: N[] }>("notifications");
  const { call, role } = useSession();
  const home = useHome();
  const router = useRouter();
  if (!data) return <Loading />;
  const open = (link: string | null) => {
    const m = link?.match(/\/(?:staff\/)?tickets\/(\d+)/);
    if (m) router.push(`/tickets/${m[1]}`);
  };
  const unread = data.notifications.some((n) => !n.read_at);
  return (
    <Screen tab>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Title>Alerts</Title>
        {unread && (
          <Pressable onPress={async () => { await call("notifications/read", {}); await reload(); home.reload(); }} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: C.red, fontWeight: "700" }}>Mark all read</Text>
          </Pressable>
        )}
      </View>
      {data.notifications.length === 0 && <Body muted>You&apos;re all caught up.</Body>}
      {data.notifications.length > 0 && (
        <View style={{ backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden", marginTop: 8 }}>
          {data.notifications.map((n, i) => (
            <Pressable key={n.id} onPress={() => open(n.link)} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }, pressed && { backgroundColor: C.mist }]}>
              <IconTile icon={/nudge/i.test(n.title) ? "flag" : /ready|response|plan/i.test(n.title) ? "checkmark-circle" : "notifications"} tone={/nudge/i.test(n.title) ? "red" : /ready|response|plan/i.test(n.title) ? "green" : "navy"} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {!n.read_at && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} accessibilityLabel="Unread" />}
                  <Text style={{ fontWeight: "800", color: C.navy, flex: 1 }}>{n.title}</Text>
                </View>
                <Text style={{ color: C.slate, fontSize: 13.5, marginTop: 2 }}>{n.body}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {role !== "member" && <View style={{ marginTop: 12 }}><Body muted>Ticket alerts open the ticket; nudges show who asked and when.</Body></View>}
    </Screen>
  );
}
