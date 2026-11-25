import { useRouter } from "expo-router";
import { useData } from "@/lib/useData";
import { useSession } from "@/lib/session";
import { dueText, type TicketSummary } from "@/lib/home";
import { Body, ErrorText, Loading, Screen, Title } from "@/components/UI";
import { Row, RowGroup, SectionLabel, type IconName, type Tone } from "@/components/Rows";

function look(t: TicketSummary): { icon: IconName; tone: Tone } {
  if (t.status === "responded") return { icon: "checkmark-circle", tone: "green" };
  if (dueText(t.dueAt)?.urgent) return { icon: "time", tone: "red" };
  if (t.status === "in_review") return { icon: "create", tone: "blue" };
  return { icon: "hourglass-outline", tone: "navy" };
}

export default function Tickets() {
  const { role } = useSession();
  const { data, error, loading } = useData<{ tickets: TicketSummary[] }>("tickets");
  const router = useRouter();
  if (loading && !data) return <Loading />;
  const list = data?.tickets ?? [];
  const open = list.filter((t) => t.status !== "responded");
  const done = list.filter((t) => t.status === "responded");

  const row = (t: TicketSummary) => {
    const due = t.status !== "responded" ? dueText(t.dueAt) : null;
    const who = role === "member" ? t.clinician ?? "Matching your clinician" : t.member;
    const extra = due ? ` · ${due.text}` : t.status === "responded" ? " · plan sent" : "";
    return (
      <Row
        key={t.id}
        {...look(t)}
        title={`${t.number} · ${t.goal}`}
        subtitle={`${who}${extra}${t.nudges ? ` · nudged ×${t.nudges}` : ""}`}
        subtitleTone={due?.urgent ? "red" : t.status === "responded" ? "green" : "muted"}
        onPress={() => router.push(`/tickets/${t.id}`)}
      />
    );
  };

  return (
    <Screen tab>
      <Title>{role === "member" ? "My tickets" : role === "clinician" ? "My queue" : "All tickets"}</Title>
      <ErrorText>{error}</ErrorText>
      {list.length === 0 && <Body muted>Nothing here yet.</Body>}
      {open.length > 0 && (
        <>
          <SectionLabel>{role === "member" ? "In progress" : "Open"}</SectionLabel>
          <RowGroup>{open.map(row)}</RowGroup>
        </>
      )}
      {done.length > 0 && (
        <>
          <SectionLabel>{role === "member" ? "Plans ready" : "Responded"}</SectionLabel>
          <RowGroup>{done.map(row)}</RowGroup>
        </>
      )}
    </Screen>
  );
}
