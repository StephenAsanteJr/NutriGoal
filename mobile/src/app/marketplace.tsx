import { Linking, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useData } from "@/lib/useData";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/web";
import { C } from "@/lib/theme";
import { Bubble, BubbleCluster } from "@/components/Bubble";
import { Body, Button, Card, Eyebrow, Loading, Screen, Title } from "@/components/UI";

type M =
  | { locked: true }
  | {
      locked: false;
      location: { label: string | null; radius: number } | null;
      trainers: { id: string; name: string; certification: string; specialty: string; miles: number; price: string | null }[];
      apps: { id: string; name: string; bestFor: string; url: string }[];
      national: { category: string; names: string[] }[];
      partners: { id: string; name: string; category: string; tagline: string; offer: string | null; saved: boolean }[];
    };

export default function Marketplace() {
  const { data } = useData<M>("marketplace");
  const { call } = useSession();
  const router = useRouter();
  if (!data) return <Loading />;
  if (data.locked)
    return (
      <Screen>
        <Title>Unlock the marketplace</Title>
        <Body>Trainers within 5–10 miles, tracking-app picks, grocers, pharmacies and add-ons open with your first goal ticket or a membership.</Body>
        <BubbleCluster>
          <Bubble size={140} label="Send a ticket" icon="✨" color={C.blue} onPress={() => router.push("/new-ticket")} />
          <Bubble size={120} label="Membership" icon="⭐" color={C.navy} onPress={() => openWeb(call, "/membership")} />
        </BubbleCluster>
      </Screen>
    );
  return (
    <Screen>
      <Eyebrow>Trainers near you</Eyebrow>
      {data.location ? (
        <Body muted>Within {data.location.radius} miles of {data.location.label ?? "you"}</Body>
      ) : (
        <Button label="Set my location on the website" kind="ghost" onPress={() => openWeb(call, "/marketplace#trainers")} />
      )}
      {data.trainers.map((t) => (
        <Card key={t.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "800", color: C.navy, fontSize: 16 }}>{t.name}</Text>
            <Text style={{ color: C.blue, fontWeight: "800" }}>{t.miles} mi</Text>
          </View>
          <Text style={{ color: C.slate }}>{t.certification} · {t.specialty}</Text>
          {t.price && <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{t.price}/session · ✓ verified by NutriGoal</Text>}
        </Card>
      ))}

      <Eyebrow>Track your food</Eyebrow>
      <BubbleCluster>
        {data.apps.map((a, i) => (
          <Bubble key={a.id} size={i === 0 ? 120 : 100} label={a.name} icon={i === 0 ? "⭐" : "📱"} color={i === 0 ? C.blue : C.white} textColor={i === 0 ? C.white : C.navy} onPress={() => Linking.openURL(a.url)} />
        ))}
      </BubbleCluster>
      <Body muted>{data.apps[0]?.name}: {data.apps[0]?.bestFor}</Body>

      <Eyebrow>Biggest names across the U.S.</Eyebrow>
      <Card>
        {data.national.map((n) => (
          <Text key={n.category} style={{ color: C.slate, marginVertical: 3 }}>
            <Text style={{ fontWeight: "800", color: C.navy }}>{n.category === "grocer" ? "Grocers" : n.category === "retailer" ? "Food retailers" : "Pharmacies"}: </Text>
            {n.names.join(" · ")}
          </Text>
        ))}
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Public listings, not NutriGoal partners.</Text>
      </Card>

      <Eyebrow>Verified partners</Eyebrow>
      {data.partners.map((p) => (
        <Card key={p.id}>
          <Text style={{ fontWeight: "800", color: C.navy }}>{p.name}{p.saved ? "  ✓" : ""}</Text>
          <Text style={{ color: C.slate }}>{p.tagline}</Text>
          {p.offer && <Text style={{ color: C.blue, fontWeight: "700", marginTop: 4 }}>{p.offer}</Text>}
        </Card>
      ))}
      <Button label="Open the full marketplace" kind="dark" onPress={() => openWeb(call, "/marketplace")} />
    </Screen>
  );
}
