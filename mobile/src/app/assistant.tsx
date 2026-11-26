import { useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance, type TextInputInstance } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/web";
import { C } from "@/lib/theme";
import { Chip } from "@/components/Bubble";
import { Button } from "@/components/UI";
import { ListenButton } from "@/components/Voice";
import { inAppDictation, useDictation } from "@/lib/voice";

type Msg = { role: "user" | "assistant"; content: string; actions?: { label: string; href: string }[] };
const SUGGEST = ["Nudge my clinician", "Find a trainer near me", "Show me pharmacies", "What add-ons can I unlock?"];

export default function Assistant() {
  const { call } = useSession();
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);
  const input = useRef<TextInputInstance>(null);
  const [hint, setHint] = useState(false);
  const dictation = useDictation((t) => setText((s) => (s ? `${s.trimEnd()} ${t}` : t)));
  const mic = () => {
    if (inAppDictation) return dictation.listening ? dictation.stop() : dictation.start();
    input.current?.focus();
    setHint(true);
  };

  async function send(t: string) {
    const content = t.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const r = await call<{ reply: string; actions: { label: string; href: string }[] }>("assistant", { messages: next.map(({ role, content }) => ({ role, content })) });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply, actions: r.actions }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  const follow = (href: string) => {
    const m = href.match(/^\/tickets\/(\d+)/);
    if (m) router.push(`/tickets/${m[1]}`);
    else if (href.startsWith("/tickets/new")) router.push("/new-ticket");
    else if (href.startsWith("/marketplace")) router.push("/marketplace");
    else openWeb(call, href).catch(() => {});
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.mist }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {msgs.length === 0 && (
          <>
            <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 14, maxWidth: "88%" }}>
              <Text style={{ color: C.navy }}>Hi! I can find trainers and stores, unlock add-ons, check your tickets and nudge your clinician. For health questions, send a goal ticket so a clinician can answer.</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {SUGGEST.map((s) => (
                <Chip key={s} label={s} onPress={() => send(s)} />
              ))}
            </View>
          </>
        )}
        {msgs.map((m, i) => (
          <View key={i} style={{ alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <View style={{ backgroundColor: m.role === "user" ? C.blue : C.white, borderRadius: 18, padding: 12, maxWidth: "88%" }}>
              <Text style={{ color: m.role === "user" ? C.white : C.navy }}>{m.content}</Text>
            </View>
            {m.role === "assistant" && (
              <View style={{ marginTop: 6 }}>
                <ListenButton title={`NutriGoal assistant · reply ${i + 1}`} text={m.content} />
              </View>
            )}
            {m.actions?.map((a) => (
              <Chip key={a.href} label={`${a.label} →`} onPress={() => follow(a.href)} />
            ))}
          </View>
        ))}
        {busy && <Text style={{ color: C.muted }}>Thinking…</Text>}
      </ScrollView>
      {(dictation.listening || hint || dictation.error) && (
        <Text style={{ color: dictation.listening || dictation.error ? C.red : C.greenDeep, fontWeight: "700", fontSize: 12.5, paddingHorizontal: 14, paddingTop: 8, backgroundColor: C.white }}>
          {dictation.error ?? (dictation.listening ? `● Listening${dictation.interim ? `: “${dictation.interim}”` : "… speak now"}` : "Tap the 🎙 key on your keyboard and speak.")}
        </Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line }}>
        <Pressable
          onPress={mic}
          accessibilityRole="button"
          accessibilityLabel={dictation.listening ? "Stop dictating" : "Dictate your message"}
          style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dictation.listening ? C.red : C.line, backgroundColor: dictation.listening ? C.red : C.white }}
        >
          <Ionicons name={dictation.listening ? "stop" : "mic"} size={18} color={dictation.listening ? C.white : C.red} />
        </Pressable>
        <TextInput ref={input} onBlur={() => setHint(false)} value={text} onChangeText={setText} onSubmitEditing={() => send(text)} placeholder="Ask about trainers, stores or your tickets" placeholderTextColor={C.muted} style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, color: C.navy }} returnKeyType="send" />
        <View style={{ width: 90 }}>
          <Button label="Send" onPress={() => send(text)} disabled={!text.trim()} busy={busy} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
