import { Text, View } from "react-native";
import { useData } from "@/lib/useData";
import { C } from "@/lib/theme";
import { Card, Loading, Screen, Title } from "@/components/UI";

type H = { clinicians: { id: string; name: string; credential: string; open: number; done: number }[] };

export default function Team() {
  const { data } = useData<H>("home");
  if (!data?.clinicians) return <Loading />;
  const max = Math.max(5, ...data.clinicians.map((c) => c.open));
  return (
    <Screen>
      <Title>Clinician load</Title>
      {data.clinicians.map((c) => (
        <Card key={c.id}>
          <Text style={{ fontWeight: "800", color: C.navy, fontSize: 16 }}>{c.name}</Text>
          <Text style={{ color: C.slate }}>{c.credential}</Text>
          <View style={{ height: 8, backgroundColor: C.mist, borderRadius: 4, marginTop: 10, overflow: "hidden" }}>
            <View style={{ width: `${(c.open / max) * 100}%`, height: 8, backgroundColor: C.blue }} />
          </View>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>{c.open} open · {c.done} answered</Text>
        </Card>
      ))}
    </Screen>
  );
}
