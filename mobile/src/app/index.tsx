import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Platform, Pressable, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Redirect } from "expo-router";
import { api, apiBase } from "@/lib/api";
import { useSession } from "@/lib/session";
import { C } from "@/lib/theme";
import { Body, Button, Card, ErrorText, Field, Loading, Screen } from "@/components/UI";
import { Row, RowGroup, SectionLabel } from "@/components/Rows";

export default function Index() {
  const { token, ready } = useSession();
  if (!ready) return <Loading />;
  return token ? <Redirect href="/home" /> : <SignIn />;
}

function openSignup(role: "member" | "clinician" | "manager") {
  const url = `${apiBase()}/signup?role=${role}`;
  if (Platform.OS === "web") globalThis.open?.(url, "_blank");
  else WebBrowser.openBrowserAsync(url);
}

type Provider = { id: "google" | "apple" | "sso"; label: string };

function ProviderButtons({ onError }: { onError: (msg: string | null) => void }) {
  const { signInWithProvider } = useSession();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    api<{ providers: Provider[] }>("auth/providers").then((r) => setProviders(r.providers)).catch(() => setProviders([]));
  }, []);
  if (!providers.length) return null;
  return (
    <View style={{ gap: 10, marginBottom: 14 }}>
      {providers.map((p) => {
        const dark = p.id === "apple";
        return (
          <Pressable
            key={p.id}
            disabled={!!busy}
            accessibilityRole="button"
            onPress={async () => {
              setBusy(p.id);
              onError(null);
              try {
                const r = await signInWithProvider(p.id);
                if (r?.continueUrl) {
                  onError("Welcome! Finish building your profile on the website, then come back here.");
                  await WebBrowser.openBrowserAsync(r.continueUrl);
                }
              } catch (e) {
                onError(e instanceof Error ? e.message : "Sign-in failed.");
              } finally {
                setBusy(null);
              }
            }}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 999, paddingVertical: 13,
              backgroundColor: dark ? "#000" : C.white, borderWidth: 1, borderColor: dark ? "#000" : p.id === "google" ? "#dadce0" : C.navy, opacity: pressed || busy === p.id ? 0.8 : 1,
            })}
          >
            <Ionicons name={p.id === "google" ? "logo-google" : p.id === "apple" ? "logo-apple" : "key"} size={18} color={dark ? C.white : p.id === "google" ? "#4285F4" : C.navy} />
            <Text style={{ color: dark ? C.white : C.navy, fontWeight: "800", fontSize: 15 }}>{busy === p.id ? "Opening…" : p.label}</Text>
          </Pressable>
        );
      })}
      <Text style={{ color: C.muted, textAlign: "center", fontSize: 12 }}>or sign in with email</Text>
    </View>
  );
}

function SignIn() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Screen tab>
      <View style={{ alignItems: "center", marginTop: 18, marginBottom: 18 }}>
        <Image source={require("../../assets/brand-mark.png")} style={{ width: 84, height: 84 }} />
        <Text style={{ fontWeight: "900", fontSize: 26, letterSpacing: 1, marginTop: 8 }}>
          <Text style={{ color: C.navy }}>NUTRI </Text>
          <Text style={{ color: C.blue }}>GOAL</Text>
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginTop: 4 }}>
          HEALTH <Text style={{ color: C.green }}>•</Text> BALANCE <Text style={{ color: C.red }}>•</Text> SUCCESS
        </Text>
      </View>
      <Card>
        <ProviderButtons onError={setError} />
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
        <Body muted>Members, clinicians and care managers all sign in here.</Body>
      </Card>

      <SectionLabel>New to NutriGoal? Sign up as a…</SectionLabel>
      <RowGroup>
        <Row icon="person-add" tone="blue" title="Member" subtitle="Get a written plan for one goal at a time" onPress={() => openSignup("member")} />
        <Row icon="medkit" tone="green" title="Clinician" subtitle="MD, DO, dietitian or nutritionist" onPress={() => openSignup("clinician")} />
        <Row icon="clipboard" tone="red" title="Care manager" subtitle="Run routing and the 48-hour promise" onPress={() => openSignup("manager")} />
      </RowGroup>
      <View style={{ marginTop: 12, gap: 6 }}>
        <Body muted>Sign-up opens on the website. Clinician and care manager accounts are approved by NutriGoal before they open.</Body>
        <Body muted>Real words from real people. Plans are written and signed by physicians, dietitians and nutritionists, never by AI.</Body>
      </View>
    </Screen>
  );
}
