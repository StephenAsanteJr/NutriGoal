import { Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/web";
import { useHome } from "@/lib/home";
import { C } from "@/lib/theme";
import { Body, Loading, Screen, Title } from "@/components/UI";
import { IconTile, Row, RowGroup, SectionLabel } from "@/components/Rows";

export default function Team() {
  const { data } = useHome();
  const { call } = useSession();
  if (data?.role !== "manager") return <Loading />;
  const max = Math.max(5, ...data.clinicians.map((c) => c.open));
  return (
    <Screen tab>
      <Title>Care team</Title>
      <Body muted>Open tickets per clinician. Bars turn red at 5 or more open tickets.</Body>
      <SectionLabel>Clinician load</SectionLabel>
      <View style={{ backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
        {data.clinicians.map((c, i) => (
          <View key={c.id} style={{ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
            <IconTile icon="medkit" tone="green" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.navy, fontSize: 15 }}>{c.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12.5 }}>{c.credential}</Text>
              <View style={{ height: 6, backgroundColor: "#e8ecef", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                <View style={{ width: `${(c.open / max) * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.open >= 5 ? C.red : C.blue }} />
              </View>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                <Text style={{ color: c.open >= 5 ? C.red : C.navy, fontWeight: "700" }}>{c.open} open</Text> · <Text style={{ color: C.greenDeep, fontWeight: "700" }}>{c.done} answered</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
      <SectionLabel>Manage</SectionLabel>
      <RowGroup>
        <Row icon="person-add" tone="blue" title="Applications" subtitle="Approve new clinicians and care managers (website)" onPress={() => openWeb(call, "/staff/team#applications").catch(() => {})} />
      </RowGroup>
    </Screen>
  );
}
