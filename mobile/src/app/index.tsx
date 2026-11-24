import { useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { apiBase } from "@/lib/api";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/session";
import { useData } from "@/lib/useData";
import { openWeb } from "@/lib/web";
import { C, serif } from "@/lib/theme";
import { Bubble, BubbleCluster } from "@/components/Bubble";
import { Body, Button, Card, ErrorText, Eyebrow, Field, Loading, Screen } from "@/components/UI";
import { Character, type Look } from "@/components/Character";

export default function Home() {
  const { token, ready } = useSession();
  if (!ready) return <Loading />;
  return token ? <RoleHome /> : <SignIn />;
}

function openSignup(role: "member" | "clinician" | "manager") {
  const url = `${apiBase()}/signup?role=${role}`;
  if (Platform.OS === "web") globalThis.open?.(url, "_blank");
  else WebBrowser.openBrowserAsync(url);
}

function SignIn() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 12, marginBottom: 18 }}>
        <Image source={require("../../assets/brand-mark.png")} style={{ width: 84, height: 84 }} />
        <Text style={{ fontWeight: "900", fontSize: 26, letterSpacing: 1, marginTop: 8 }}>
          <Text style={{ color: C.navy }}>NUTRI </Text>
          <Text style={{ color: C.blue }}>GOAL</Text>
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginTop: 4 }}>HEALTH • BALANCE • SUCCESS</Text>
      </View>
      <Card>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        <ErrorText>{error}</ErrorText>
        <Button
          label="Sign in"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await signIn(email.trim(), password);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Sign-in failed.");
            } finally {
              setBusy(false);
            }
          }}
        />
        <Body muted>Members, clinicians and managers all sign in here.</Body>
      </Card>
      <Text style={{ color: C.navy, fontWeight: "800", textAlign: "center", marginTop: 10 }}>New to NutriGoal? Sign up as a…</Text>
      <BubbleCluster>
        <Bubble size={104} label="Member" icon="🙋" color={C.blue} onPress={() => openSignup("member")} />
        <Bubble size={104} label="Clinician" icon="🩺" color={C.navy} onPress={() => openSignup("clinician")} />
        <Bubble size={104} label="Care manager" icon="📋" color={C.cyan} textColor={C.navy} onPress={() => openSignup("manager")} />
      </BubbleCluster>
      <Body muted>Sign-up opens on the website. Clinician and care manager accounts are approved by NutriGoal before they open.</Body>
      <Body muted>Real words from real people. Plans are written and signed by physicians, dietitians and nutritionists, never by AI.</Body>
    </Screen>
  );
}

type MemberHome = {
  role: "member"; name: string; unread: number; units: "imperial" | "metric";
  build: { weightKg: number; goalWeightKg: number; bodyFatPct: number; goalBodyFatPct: number; bmi: number; targetKcal: number; proteinG: number; weeks: number; sex: "male" | "female"; heightCm: number } | null;
  look: Look; membership: { plan: string; credits: number } | null; marketplace: boolean;
  nutrition: { avgKcal: number | null; avgProtein: number | null; insights: string[] } | null;
  tickets: { id: number; number: string; goal: string; statusLabel: string; status: string }[];
};
type Ticket = { id: number; number: string; goal: string; statusLabel: string; status: string; member: string; dueAt: string | null; nudges: number };
type StaffHome =
  | { role: "clinician"; name: string; credential: string; unread: number; counts: { open: number; dueSoon: number; nudged: number; responded: number }; queue: Ticket[] }
  | { role: "manager"; name: string; unread: number; kpis: { open: number; dueSoon: number; revenue30: string; members: number }; clinicians: { id: string; name: string; open: number }[]; queue: Ticket[] };

function RoleHome() {
  const { data, error, loading } = useData<MemberHome | StaffHome>("home");
  const { signOut, call } = useSession();
  const router = useRouter();
  if (loading && !data) return <Loading />;
  if (!data) return <Screen><ErrorText>{error}</ErrorText><Button label="Sign out" kind="ghost" onPress={signOut} /></Screen>;
  const first = data.name.replace("Dr. ", "Dr. ").split(" ").slice(0, data.name.startsWith("Dr.") ? 2 : 1).join(" ");
  const web = (next: string) => openWeb(call, next).catch(() => {});

  return (
    <Screen>
      <Eyebrow>{data.role === "member" ? "My NutriGoal" : data.role === "clinician" ? "Clinician" : "Operations"}</Eyebrow>
      <Text style={{ fontFamily: serif, fontSize: 30, color: C.navy }}>Hi, {first}</Text>

      {data.role === "member" && <MemberBubbles d={data} go={(p) => router.push(p as never)} web={web} />}
      {data.role === "clinician" && (
        <>
          <Body muted>{data.counts.open ? `${data.counts.open} ticket${data.counts.open === 1 ? "" : "s"} waiting for your response.` : "Your queue is clear."}</Body>
          <BubbleCluster>
            <Bubble size={150} label="My queue" icon="📥" badge={data.counts.open || null} color={C.navy} onPress={() => router.push("/tickets")} />
            <Bubble size={124} label="Respond next" icon="✍️" color={C.blue} onPress={() => data.queue[0] && router.push(`/respond/${data.queue[0].id}`)} sublabel={data.queue[0]?.number} />
            <Bubble size={112} label="Due soon" icon="⏱️" badge={data.counts.dueSoon || null} color={C.cyan} textColor={C.navy} onPress={() => router.push("/tickets")} />
            <Bubble size={104} label="Nudged" icon="⚑" badge={data.counts.nudged || null} color="#ffb547" textColor={C.navy} onPress={() => router.push("/tickets")} />
            <Bubble size={100} label="Alerts" icon="🔔" badge={data.unread || null} color={C.white} textColor={C.navy} onPress={() => router.push("/alerts")} />
            <Bubble size={100} label="Website" icon="🌐" color={C.navySoft} onPress={() => web("/staff")} />
          </BubbleCluster>
        </>
      )}
      {data.role === "manager" && (
        <>
          <Body muted>{data.kpis.open} open tickets · {data.kpis.dueSoon} due within 12 hours · {data.kpis.revenue30} in the last 30 days</Body>
          <BubbleCluster>
            <Bubble size={150} label="Open tickets" icon="📋" badge={data.kpis.open || null} color={C.navy} onPress={() => router.push("/tickets")} />
            <Bubble size={120} label="Due soon" icon="⏱️" badge={data.kpis.dueSoon || null} color={C.cyan} textColor={C.navy} onPress={() => router.push("/tickets")} />
            <Bubble size={120} label="Clinicians" icon="🩺" sublabel={`${data.clinicians.length} on roster`} color={C.blue} onPress={() => router.push("/team")} />
            <Bubble size={104} label="Revenue" icon="💵" sublabel={data.kpis.revenue30} color={C.white} textColor={C.navy} />
            <Bubble size={100} label="Alerts" icon="🔔" badge={data.unread || null} color={C.white} textColor={C.navy} onPress={() => router.push("/alerts")} />
            <Bubble size={100} label="Website" icon="🌐" color={C.navySoft} onPress={() => web("/staff")} />
          </BubbleCluster>
        </>
      )}

      <Pressable onPress={signOut} style={{ alignSelf: "center", marginTop: 18 }} accessibilityRole="button">
        <Text style={{ color: C.blue, fontWeight: "700" }}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

function MemberBubbles({ d, go, web }: { d: MemberHome; go: (p: string) => void; web: (next: string) => void }) {
  const b = d.build;
  const unit = d.units === "metric" ? "kg" : "lb";
  const w = (kg: number) => Math.round(d.units === "metric" ? kg : kg / 0.45359237);
  return (
    <>
      {b && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Character sex={b.sex} heightCm={b.heightCm} weightKg={b.weightKg} bodyFatPct={b.bodyFatPct} look={d.look} height={130} ghost={{ weightKg: b.goalWeightKg, bodyFatPct: b.goalBodyFatPct }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>TODAY → GOAL</Text>
              <Text style={{ fontFamily: serif, fontSize: 24, color: C.navy }}>{w(b.weightKg)} → {w(b.goalWeightKg)} {unit}</Text>
              <Text style={{ color: C.slate }}>{b.bodyFatPct}% → {b.goalBodyFatPct}% body fat · {b.weeks} weeks</Text>
              <Text style={{ color: C.blue, fontWeight: "800", marginTop: 6 }}>{b.targetKcal.toLocaleString()} kcal · {b.proteinG} g protein / day</Text>
            </View>
          </View>
        </Card>
      )}
      <BubbleCluster>
        <Bubble size={150} label="New ticket" icon="✨" color={C.blue} onPress={() => go("/new-ticket")} sublabel={d.membership && d.membership.credits > 0 ? "1 included" : "$19.99"} />
        <Bubble size={124} label="My tickets" icon="🎟️" badge={d.tickets.filter((t) => t.status !== "responded").length || null} color={C.navy} onPress={() => go("/tickets")} />
        <Bubble size={118} label="My build" icon="🧍" color={C.cyan} textColor={C.navy} onPress={() => go("/build")} />
        <Bubble size={108} label="Log weight" icon="⚖️" color={C.white} textColor={C.navy} onPress={() => go("/weigh-in")} />
        <Bubble size={118} label="Marketplace" icon="🛒" locked={!d.marketplace} color={C.navySoft} onPress={() => go("/marketplace")} />
        <Bubble size={108} label="Ask NutriGoal" icon="💬" color="#3a66ff" onPress={() => go("/assistant")} />
        <Bubble size={96} label="Alerts" icon="🔔" badge={d.unread || null} color={C.white} textColor={C.navy} onPress={() => go("/alerts")} />
        <Bubble size={96} label="Trends" icon="📈" color={C.white} textColor={C.navy} onPress={() => web("/data")} />
      </BubbleCluster>
      {d.nutrition && d.nutrition.insights.length > 0 && (
        <Card>
          <Eyebrow>Last 7 days</Eyebrow>
          {d.nutrition.insights.map((i) => (
            <Body key={i}>• {i}</Body>
          ))}
        </Card>
      )}
    </>
  );
}
