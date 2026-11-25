import { useCallback } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/web";
import { C, serif } from "@/lib/theme";
import { dueText, firstName, greeting, initials, useHome, type ClinicianHome, type ManagerHome, type MemberHome } from "@/lib/home";
import { Body, Button, Card, ErrorText, Loading, Screen } from "@/components/UI";
import { Badge, HighlightCard, Meter, Row, RowGroup, SectionLabel } from "@/components/Rows";
import { Character } from "@/components/Character";

type Go = (path: string) => void;

export default function HomeTab() {
  const { data, error, loading, reload } = useHome();
  const { signOut, call } = useSession();
  const router = useRouter();
  // The tab layout loads home once; refresh it whenever Home comes back into view.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (loading && !data) return <Loading />;
  if (!data) return <Screen tab><ErrorText>{error}</ErrorText><Button label="Sign out" kind="ghost" onPress={signOut} /></Screen>;
  const go: Go = (p) => router.push(p as never);
  const web = (next: string) => openWeb(call, next).catch(() => {});
  const question = data.role === "member" ? "What are we working on today?" : data.role === "clinician" ? "Who needs a plan today?" : "How is the care team doing?";

  return (
    <Screen tab>
      {/* Greeting row: name on the left, alerts bell and account avatar on the right */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
        <Text style={{ flex: 1, color: C.muted, fontSize: 14 }}>{greeting()}, {firstName(data.name)}</Text>
        <Pressable onPress={() => go("/alerts")} accessibilityRole="button" accessibilityLabel={`Alerts${data.unread ? `, ${data.unread} unread` : ""}`} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
          <Ionicons name="notifications-outline" size={20} color={C.navy} />
          {data.unread > 0 && (
            <View style={{ position: "absolute", top: -4, right: -4 }}>
              <Badge value={data.unread} />
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => go("/account")} accessibilityRole="button" accessibilityLabel="Account" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.white, fontWeight: "800" }}>{initials(data.name)}</Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: serif, fontSize: 28, lineHeight: 34, color: C.navy, marginTop: 6 }}>{question}</Text>

      {data.role === "member" && <Member d={data} go={go} web={web} />}
      {data.role === "clinician" && <Clinician d={data} go={go} web={web} />}
      {data.role === "manager" && <Manager d={data} go={go} web={web} />}
    </Screen>
  );
}

function Member({ d, go, web }: { d: MemberHome; go: Go; web: (next: string) => void }) {
  const b = d.build;
  const ready = d.tickets.find((t) => t.status === "responded");
  const open = d.tickets.find((t) => t.status !== "responded");
  const openCount = d.tickets.filter((t) => t.status !== "responded").length;
  const unit = d.units === "metric" ? "kg" : "lb";
  const w = (kg: number) => Math.round(d.units === "metric" ? kg : kg / 0.45359237);
  const due = open ? dueText(open.dueAt) : null;
  const included = d.membership && d.membership.credits > 0;

  return (
    <>
      {open ? (
        <HighlightCard icon="hourglass-outline" kicker={open.statusLabel} title={open.goal} subtitle={`${open.number} · ${open.clinician ?? "Matching your clinician"}${due ? ` · plan ${due.text}` : ""}`} action="View" onPress={() => go(`/tickets/${open.id}`)} />
      ) : ready ? (
        <HighlightCard icon="checkmark-circle" kicker="Your plan is ready" title={ready.goal} subtitle={ready.clinician ? `Written and signed by ${ready.clinician}` : null} action="View" onPress={() => go(`/tickets/${ready.id}`)} />
      ) : (
        <HighlightCard icon="add-circle" kicker="Start here" title="Send your first goal ticket" subtitle="A physician or dietitian writes back within 48 hours" action="Start" onPress={() => go("/new-ticket")} />
      )}

      <SectionLabel>Jump in</SectionLabel>
      <RowGroup>
        <Row icon="add-circle" tone="blue" title="New goal ticket" subtitle={included ? "1 ticket included with your membership" : "$19.99 one-time, or join for $29.99/mo"} subtitleTone={included ? "green" : "muted"} onPress={() => go("/new-ticket")} />
        <Row icon="document-text" tone="navy" title="My tickets" subtitle={openCount ? `${openCount} in progress` : ready ? "Plan ready to read" : "Your plans live here"} subtitleTone={!openCount && ready ? "green" : "muted"} badge={openCount || null} badgeTone="navy" onPress={() => go("/tickets")} />
        <Row icon="body" tone="green" title="My build" subtitle={b ? `${w(b.weightKg)} → ${w(b.goalWeightKg)} ${unit} · ${b.weeks} weeks` : "Today vs. your goal"} onPress={() => go("/build")} />
        <Row icon="barbell" tone="cyan" title="Log weight" subtitle="Keep your progress line current" onPress={() => go("/weigh-in")} />
        <Row icon="storefront" tone="blue" title="Marketplace" subtitle={d.marketplace ? "Trainers near you, grocers and pharmacies" : "Opens with a ticket or membership"} locked={!d.marketplace} onPress={() => go("/marketplace")} />
        <Row icon="chatbubbles" tone="navy" title="Ask NutriGoal" subtitle="Help with orders, tickets and reminders" onPress={() => go("/assistant")} />
        <Row icon="trending-up" tone="green" title="Nutrition trends" subtitle="Your tracker and lab history (website)" onPress={() => web("/data")} />
      </RowGroup>

      {b && (
        <>
          <SectionLabel>My progress</SectionLabel>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Character sex={b.sex} heightCm={b.heightCm} weightKg={b.weightKg} bodyFatPct={b.bodyFatPct} look={d.look} height={120} ghost={{ weightKg: b.goalWeightKg, bodyFatPct: b.goalBodyFatPct }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>TODAY → GOAL</Text>
                <Text style={{ fontFamily: serif, fontSize: 24, color: C.navy }}>{w(b.weightKg)} → {w(b.goalWeightKg)} {unit}</Text>
                <Text style={{ color: C.slate, fontSize: 13 }}>{b.bodyFatPct}% → {b.goalBodyFatPct}% body fat</Text>
                <Text style={{ color: C.blue, fontWeight: "800", fontSize: 13, marginTop: 6 }}>{b.targetKcal.toLocaleString()} kcal · {b.proteinG} g protein / day</Text>
              </View>
            </View>
            {d.nutrition?.avgKcal != null && <Meter label="Calories, 7-day avg" value={d.nutrition.avgKcal} target={b.targetKcal} unit="kcal" mode="range" />}
            {d.nutrition?.avgProtein != null && <Meter label="Protein, 7-day avg" value={d.nutrition.avgProtein} target={b.proteinG} unit="g" />}
          </Card>
        </>
      )}
      {d.nutrition && d.nutrition.insights.length > 0 && (
        <Card>
          <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 4 }}>LAST 7 DAYS</Text>
          {d.nutrition.insights.map((i) => (
            <Body key={i}>• {i}</Body>
          ))}
        </Card>
      )}
    </>
  );
}

function Clinician({ d, go, web }: { d: ClinicianHome; go: Go; web: (next: string) => void }) {
  const next = d.queue[0];
  const due = next ? dueText(next.dueAt) : null;
  return (
    <>
      {next ? (
        <HighlightCard icon="create" kicker="Respond next" title={next.goal} subtitle={`${next.number} · ${next.member}${due ? ` · ${due.text}` : ""}`} action="Write" onPress={() => go(`/respond/${next.id}`)} />
      ) : (
        <HighlightCard icon="checkmark-circle" kicker="All caught up" title="Your queue is clear" subtitle={`${d.counts.responded} plans sent so far`} />
      )}
      <SectionLabel>Jump in</SectionLabel>
      <RowGroup>
        <Row icon="file-tray-full" tone="blue" title="My queue" subtitle={d.counts.open ? `${d.counts.open} waiting for your response` : "Nothing waiting"} badge={d.counts.open || null} badgeTone="navy" onPress={() => go("/tickets")} />
        <Row icon="time" tone="red" title="Due within 12 hours" subtitle={d.counts.dueSoon ? "Keep the 48-hour promise" : "Nothing urgent"} subtitleTone={d.counts.dueSoon ? "red" : "muted"} badge={d.counts.dueSoon || null} onPress={() => go("/tickets")} />
        <Row icon="flag" tone="red" title="Nudged" subtitle="Members or managers asking for a look" badge={d.counts.nudged || null} onPress={() => go("/tickets")} />
        <Row icon="checkmark-circle" tone="green" title="Responded" subtitle="Plans you've written and signed" value={String(d.counts.responded)} />
        <Row icon="notifications" tone="navy" title="Alerts" subtitle={d.unread ? `${d.unread} unread` : "You're all caught up"} badge={d.unread || null} onPress={() => go("/alerts")} />
        <Row icon="globe-outline" tone="cyan" title="Clinician portal" subtitle="Full ticket view, notes and labs (website)" onPress={() => web("/staff")} />
      </RowGroup>
    </>
  );
}

function Manager({ d, go, web }: { d: ManagerHome; go: Go; web: (next: string) => void }) {
  const urgent = d.queue.filter((t) => dueText(t.dueAt)?.urgent);
  const first = urgent[0] ?? d.queue[0];
  return (
    <>
      {first ? (
        <HighlightCard
          icon={urgent.length ? "time" : "clipboard"}
          kicker={urgent.length ? `${urgent.length} due within 12 hours` : `${d.kpis.open} open tickets`}
          title={`${first.number}: ${first.goal}`}
          subtitle={`${first.clinician ?? "Unassigned"}${dueText(first.dueAt) ? ` · ${dueText(first.dueAt)!.text}` : ""}`}
          action="Review"
          onPress={() => go(`/tickets/${first.id}`)}
        />
      ) : (
        <HighlightCard icon="checkmark-circle" kicker="All caught up" title="No open tickets" subtitle="Every member has their plan" />
      )}
      <SectionLabel>Jump in</SectionLabel>
      <RowGroup>
        <Row icon="clipboard" tone="blue" title="Open tickets" subtitle="Routing, reassignments and nudges" badge={d.kpis.open || null} badgeTone="navy" onPress={() => go("/tickets")} />
        <Row icon="time" tone="red" title="Due within 12 hours" subtitle={d.kpis.dueSoon ? "At risk of missing 48 hours" : "Nothing at risk"} subtitleTone={d.kpis.dueSoon ? "red" : "muted"} badge={d.kpis.dueSoon || null} onPress={() => go("/tickets")} />
        <Row icon="people" tone="navy" title="Clinicians" subtitle={`${d.clinicians.length} on the roster · load and approvals`} onPress={() => go("/team")} />
        <Row icon="trending-up" tone="green" title="Revenue, last 30 days" value={d.kpis.revenue30} />
        <Row icon="person-circle" tone="cyan" title="Members" value={String(d.kpis.members)} />
        <Row icon="notifications" tone="navy" title="Alerts" subtitle={d.unread ? `${d.unread} unread` : "You're all caught up"} badge={d.unread || null} onPress={() => go("/alerts")} />
        <Row icon="globe-outline" tone="cyan" title="Operations portal" subtitle="Applications, payments and reports (website)" onPress={() => web("/staff")} />
      </RowGroup>
    </>
  );
}
