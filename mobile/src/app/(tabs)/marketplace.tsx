import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { useData } from "@/lib/useData";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/web";
import { Body, Button, Loading, Screen, Title } from "@/components/UI";
import { HighlightCard, Row, RowGroup, SectionLabel, type IconName } from "@/components/Rows";

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

const NATIONAL: Record<string, { label: string; icon: IconName }> = {
  grocer: { label: "Grocers", icon: "cart" },
  retailer: { label: "Food retailers", icon: "basket" },
  pharmacy: { label: "Pharmacies", icon: "medkit" },
};

export default function Marketplace() {
  const { data } = useData<M>("marketplace");
  const { call } = useSession();
  const router = useRouter();
  const web = (next: string) => openWeb(call, next).catch(() => {});
  if (!data) return <Loading />;

  if (data.locked)
    return (
      <Screen tab>
        <Title>Marketplace</Title>
        <Body muted>Trainers within 5–10 miles, tracking-app picks, grocers, pharmacies and add-ons open with your first goal ticket or a membership.</Body>
        <HighlightCard icon="lock-open" kicker="Unlock the marketplace" title="Send a goal ticket" subtitle="$19.99 one-time, and the marketplace opens with it" action="Start" onPress={() => router.push("/new-ticket")} />
        <SectionLabel>Or</SectionLabel>
        <RowGroup>
          <Row icon="ribbon" tone="green" title="Become a member" subtitle="$29.99/mo or $300/yr, one ticket every month" onPress={() => web("/membership")} />
        </RowGroup>
      </Screen>
    );

  return (
    <Screen tab>
      <Title>Marketplace</Title>

      <SectionLabel>Trainers near you</SectionLabel>
      {data.location ? (
        <Body muted>Within {data.location.radius} miles of {data.location.label ?? "you"}</Body>
      ) : (
        <Button label="Set my location on the website" kind="ghost" onPress={() => web("/marketplace#trainers")} />
      )}
      {data.trainers.length > 0 && (
        <RowGroup>
          {data.trainers.map((t) => (
            <Row key={t.id} icon="fitness" tone="blue" title={t.name} subtitle={`${t.certification} · ${t.specialty}${t.price ? ` · ${t.price}/session` : ""}`} value={`${t.miles} mi`} />
          ))}
        </RowGroup>
      )}

      <SectionLabel>Track your food</SectionLabel>
      <RowGroup>
        {data.apps.map((a, i) => (
          <Row key={a.id} icon={i === 0 ? "star" : "nutrition"} tone={i === 0 ? "green" : "cyan"} title={a.name} subtitle={a.bestFor} onPress={() => Linking.openURL(a.url)} />
        ))}
      </RowGroup>

      <SectionLabel>Biggest names across the U.S.</SectionLabel>
      <RowGroup>
        {data.national.map((n) => (
          <Row key={n.category} icon={NATIONAL[n.category]?.icon ?? "storefront"} tone="navy" title={NATIONAL[n.category]?.label ?? n.category} subtitle={n.names.join(" · ")} />
        ))}
      </RowGroup>
      <Body muted>Public listings, not NutriGoal partners.</Body>

      <SectionLabel>Verified partners</SectionLabel>
      <RowGroup>
        {data.partners.map((p) => (
          <Row key={p.id} icon={p.saved ? "bookmark" : "shield-checkmark"} tone="green" title={p.name} subtitle={p.offer ?? p.tagline} subtitleTone={p.offer ? "green" : "muted"} onPress={() => web("/marketplace")} />
        ))}
      </RowGroup>
      <Button label="Open the full marketplace" kind="dark" onPress={() => web("/marketplace")} />
    </Screen>
  );
}
