import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/web";
import { initials, useHome } from "@/lib/home";
import { C, serif } from "@/lib/theme";
import { Body, Screen } from "@/components/UI";
import { Row, RowGroup, SectionLabel } from "@/components/Rows";

const ROLE_LABEL = { member: "Member", clinician: "Clinician", manager: "Care manager" } as const;

export default function Account() {
  const { name, role, signOut, call } = useSession();
  const { data } = useHome();
  const router = useRouter();
  const web = (next: string) => openWeb(call, next).catch(() => {});
  const member = data?.role === "member" ? data : null;
  const plan = member?.membership ? (member.membership.plan === "yearly" ? "Annual membership" : "Monthly membership") : null;
  const sub = data?.role === "clinician" ? data.credential : role ? ROLE_LABEL[role] : null;

  return (
    <Screen tab>
      <View style={{ alignItems: "center", marginTop: 16 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.white, fontWeight: "800", fontSize: 26 }}>{initials(name ?? "")}</Text>
        </View>
        <Text style={{ fontFamily: serif, fontSize: 26, color: C.navy, marginTop: 10 }}>{name}</Text>
        {sub && <Text style={{ color: C.muted, marginTop: 2 }}>{sub}</Text>}
      </View>

      {role === "member" && (
        <>
          <SectionLabel>Membership</SectionLabel>
          <RowGroup>
            <Row icon="ribbon" tone={plan ? "green" : "navy"} title={plan ?? "No membership yet"} subtitle={plan ? `${member!.membership!.credits} ticket credit${member!.membership!.credits === 1 ? "" : "s"} left` : "$29.99/mo or $300/yr, one ticket every month"} subtitleTone={plan ? "green" : "muted"} onPress={() => web("/membership")} />
            <Row icon="receipt" tone="blue" title="Payments and receipts" onPress={() => web("/payments")} />
            <Row icon="settings-outline" tone="navy" title="Goals, units and reminders" subtitle="Your settings, like MyFitnessPal's" onPress={() => web("/membership?tab=settings")} />
          </RowGroup>
        </>
      )}

      <SectionLabel>More</SectionLabel>
      <RowGroup>
        <Row icon="open-outline" tone="cyan" title="Open the full website" subtitle="Already signed in" onPress={() => web(role === "member" ? "/dashboard" : "/staff")} />
        {role === "member" && <Row icon="chatbubbles" tone="navy" title="Ask NutriGoal" subtitle="Support for orders, tickets and reminders" onPress={() => router.push("/assistant")} />}
        <Row icon="log-out-outline" tone="red" title="Sign out" onPress={signOut} />
      </RowGroup>
      <View style={{ marginTop: 16 }}>
        <Body muted>Real words from real people: every NutriGoal plan is written and signed by a licensed clinician.</Body>
      </View>
    </Screen>
  );
}
